<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AudioVisualizer from '$lib/components/AudioVisualizer.svelte';
	import DeviceButton from '$lib/components/DeviceButton.svelte';
	import DeviceFrame from '$lib/components/DeviceFrame.svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import LanguagePicker from '$lib/components/LanguagePicker.svelte';
	import PushToTalkButton from '$lib/components/PushToTalkButton.svelte';
	import {
		defaultHearLanguage,
		getLanguageLabel,
		getOpenAITranslationLanguage,
		type LanguageCode
	} from '$lib/constants/languages';
	import {
		requestMicrophone,
		stopStream,
		unlockAudioPlayback
	} from '$lib/realtime/audioRouting';
	import { playClick, unlockClickAudio } from '$lib/realtime/clickSound';
	import { OpenAIRealtimeClient } from '$lib/realtime/openaiRealtimeClient';
	import { StereoOutputRouter, type OutputPanMode } from '$lib/realtime/stereoOutput';
	import { Headphones, LogOut, RotateCcw } from 'lucide-svelte';

	type Side = 'me' | 'them';
	type UiState =
		| 'setup'
		| 'requesting_microphone'
		| 'ready'
		| 'speaking_me'
		| 'speaking_them'
		| 'receiving'
		| 'error';
	type DiagnosticState = {
		status: string;
		events: string[];
		error: string;
		track: boolean;
		audio: string;
		input: boolean;
	};
	type DiagnosticsSnapshot = Record<Side, DiagnosticState>;

	const sideLabel: Record<Side, string> = {
		me: 'ME',
		them: 'THEM'
	};
	const createDiagnosticState = (): DiagnosticState => ({
		status: 'idle',
		events: [],
		error: '',
		track: false,
		audio: 'idle',
		input: false
	});

	let myLanguage = $state<LanguageCode>(defaultHearLanguage('en'));
	let theirLanguage = $state<LanguageCode>('es');
	let uiState = $state<UiState>('setup');
	let detail = $state('Choose both languages, then start one-phone mode.');
	let error = $state('');
	let splitOutput = $state(true);
	let activeSide = $state<Side | undefined>(undefined);
	let translatedStream = $state<MediaStream | undefined>(undefined);
	let diagnostics = $state<DiagnosticsSnapshot>({
		me: createDiagnosticState(),
		them: createDiagnosticState()
	});

	let micStream = $state<MediaStream | undefined>(undefined);
	let idleDisconnectTimer: ReturnType<typeof setTimeout> | undefined;
	let sessionNonce = 0;
	let diagnosticSessionId = crypto.randomUUID();
	const translationClients = new Map<Side, OpenAIRealtimeClient>();
	const translationTracks = new Map<Side, MediaStreamTrack>();
	const connectingSides = new Map<Side, Promise<void>>();
	const outputRouters = new Map<Side, StereoOutputRouter>();
	const watchedOutputTracks = new WeakSet<MediaStreamTrack>();

	let topLed = $derived<'idle' | 'ready' | 'speaking' | 'error'>(
		uiState === 'error'
			? 'error'
			: uiState === 'speaking_me' || uiState === 'speaking_them'
				? 'speaking'
				: uiState === 'ready' || uiState === 'receiving'
					? 'ready'
					: 'idle'
	);
	let activeOutputMode = $derived<OutputPanMode>(
		!splitOutput
			? 'both'
			: activeSide === 'me'
				? 'right'
				: activeSide === 'them'
					? 'left'
					: 'both'
	);
	let vizStream = $derived(
		uiState === 'speaking_me' || uiState === 'speaking_them' ? micStream : translatedStream
	);
	let vizColor = $derived<'orange' | 'blue' | 'purple'>(
		activeSide === 'them' ? 'blue' : activeSide === 'me' ? 'orange' : 'purple'
	);
	let canSpeak = $derived(uiState === 'ready' || uiState === 'receiving');
	let meButtonLabel = $derived(getLanguageLabel(myLanguage).toUpperCase());
	let themButtonLabel = $derived(getLanguageLabel(theirLanguage).toUpperCase());
	let receivingSide = $derived<Side | undefined>(
		uiState === 'receiving' && activeSide ? (activeSide === 'me' ? 'them' : 'me') : undefined
	);

	async function start() {
		logDiagnostic('start');
		unlockClickAudio();
		error = '';
		uiState = 'requesting_microphone';
		detail = 'Requesting microphone permission.';

		try {
			await unlockAudioPlayback();
			micStream = await requestMicrophone();
			logDiagnostic('mic:granted', {
				tracks: micStream.getAudioTracks().map((track) => describeTrack(track))
			});
			await Promise.all([ensureOutputRouter('me').unlock(), ensureOutputRouter('them').unlock()]);
			logDiagnostic('output:unlocked');
			setSideStatus('me', 'warming');
			setSideStatus('them', 'warming');
			uiState = 'ready';
			detail = 'Connecting translation channels.';
			void warmTranslationChannels();
		} catch (cause) {
			logDiagnostic('start:error', { error: errorMessage(cause) });
			uiState = 'error';
			error = cause instanceof Error ? cause.message : 'Microphone permission was denied.';
			detail = 'Microphone access is required for one-phone mode.';
		}
	}

	async function beginSide(side: Side) {
		if (!canSpeak || !micStream) return;
		logDiagnostic('press:start', { side });
		clearIdleDisconnectTimer();
		activeSide = side;
		error = '';
		uiState = side === 'me' ? 'speaking_me' : 'speaking_them';
		detail = '';

		const currentNonce = sessionNonce;
		try {
			await connectSideTranslation(side, currentNonce);
			if (currentNonce !== sessionNonce) return;
			setActiveInputSide(side);
		} catch (cause) {
			logDiagnostic('press:error', { side, error: errorMessage(cause) });
			if (currentNonce !== sessionNonce) return;
			uiState = 'error';
			error = cause instanceof Error ? cause.message : 'Could not start translation.';
			muteTranslationTracks();
			disconnectAllTranslation();
		}
	}

	function endSide(side: Side) {
		if (activeSide !== side || !micStream) return;
		logDiagnostic('press:end', { side });
		muteTranslationTracks();
		uiState = translatedStream ? 'receiving' : 'ready';
		scheduleIdleDisconnect();
	}

	function toggleOutputMode() {
		splitOutput = !splitOutput;
		logDiagnostic('output:mode', { splitOutput });
		updateOutputModes();
	}

	function swapLanguages() {
		const next = myLanguage;
		myLanguage = theirLanguage;
		theirLanguage = next;
	}

	function resetSession() {
		logDiagnostic('reset');
		clearIdleDisconnectTimer();
		sessionNonce += 1;
		diagnosticSessionId = crypto.randomUUID();
		muteTranslationTracks();
		disconnectAllTranslation();
		diagnostics = {
			me: createDiagnosticState(),
			them: createDiagnosticState()
		};
		activeSide = undefined;
		translatedStream = undefined;
		uiState = micStream ? 'ready' : 'setup';
		detail = micStream ? 'Connecting translation channels.' : 'Choose both languages.';
		if (micStream) void warmTranslationChannels();
	}

	function leave() {
		logDiagnostic('leave');
		clearIdleDisconnectTimer();
		sessionNonce += 1;
		disconnectAllTranslation(true);
		stopStream(micStream);
		micStream = undefined;
		goto(resolve('/setup'));
	}

	async function warmTranslationChannels() {
		const currentNonce = sessionNonce;
		logDiagnostic('warm:start');
		const results = await Promise.allSettled([
			connectSideTranslation('me', currentNonce),
			connectSideTranslation('them', currentNonce)
		]);
		const rejected = results.find((result) => result.status === 'rejected');
		if (rejected && currentNonce === sessionNonce) {
			logDiagnostic('warm:error', { error: errorMessage(rejected.reason) });
			uiState = 'error';
			error =
				rejected.reason instanceof Error
					? rejected.reason.message
					: 'Could not connect translation channels.';
			detail = 'Translation setup failed.';
			disconnectAllTranslation();
			return;
		}
		if (currentNonce === sessionNonce && uiState === 'ready') {
			logDiagnostic('warm:ready');
			detail = '';
		}
	}

	async function connectSideTranslation(side: Side, currentNonce = sessionNonce) {
		if (translationClients.has(side)) return;
		const inFlight = connectingSides.get(side);
		if (inFlight) return await inFlight;
		if (!micStream) return;

		const sourceTrack = getTranslationTrack(side);

		const targetLanguage = side === 'me' ? theirLanguage : myLanguage;
		const connection = (async () => {
			logDiagnostic('connect:start', {
				side,
				targetLanguage,
				track: describeTrack(sourceTrack)
			});
			setSideStatus(side, 'connecting');
			const client = new OpenAIRealtimeClient({
				roomId: 'one-phone',
				participantId: `one-phone-${side}`,
				tokenEndpoint: '/api/openai/local-realtime-token',
				targetLanguage,
				openAITranslationLanguage: getOpenAITranslationLanguage(targetLanguage),
				sourceTrack,
				onTranslatedAudio: async (stream) => {
					if (currentNonce !== sessionNonce) return;
					logDiagnostic('output:track', {
						side,
						streamActive: stream.active,
						tracks: stream.getAudioTracks().map((track) => describeTrack(track))
					});
					watchOutputStream(side, stream);
					translatedStream = stream;
					setSideTrack(side, true);
					setSideAudio(side, `play:${outputModeForSide(side)}`);
					try {
						await ensureOutputRouter(side).play(stream, outputModeForSide(side));
						logDiagnostic('output:playing', { side, mode: outputModeForSide(side) });
						setSideAudio(side, `playing:${outputModeForSide(side)}`);
					} catch (cause) {
						logDiagnostic('output:play-error', { side, error: errorMessage(cause) });
						setSideAudio(side, 'fallback');
						recordSideEvent(
							side,
							cause instanceof Error ? `playback:${cause.message}` : 'playback:failed'
						);
						try {
							await ensureOutputRouter(side).playFallback(stream);
							logDiagnostic('output:fallback-playing', { side });
							setSideAudio(side, 'playing:fallback');
						} catch (fallbackCause) {
							logDiagnostic('output:fallback-error', {
								side,
								error: errorMessage(fallbackCause)
							});
							setSideAudio(side, 'blocked');
							setSideError(
								side,
								fallbackCause instanceof Error
									? fallbackCause.message
									: 'Audio playback failed'
							);
						}
					}
				},
				onOutputState: (state) => {
					if (currentNonce !== sessionNonce) return;
					logDiagnostic('output:state', { side, state });
					if (state === 'streaming') {
						activeSide = side;
						uiState = translationTracks.get(side)?.enabled ? uiState : 'receiving';
					}
					if (state === 'complete') {
						scheduleIdleDisconnect();
					}
				},
				onError: (nextError) => {
					if (currentNonce !== sessionNonce) return;
					logDiagnostic('connect:error', { side, error: nextError.message });
					setSideError(side, nextError.message);
					uiState = 'error';
					error = nextError.message;
					detail = 'Translation connection dropped.';
					muteTranslationTracks();
					disconnectAllTranslation();
				},
				onRealtimeEvent: (type) => {
					logDiagnostic('realtime:event', { side, type });
					recordSideEvent(side, type);
				},
				onStatus: (status) => {
					logDiagnostic('connect:status', { side, status });
					setSideStatus(side, status);
				}
			});

			await client.connect();
			if (currentNonce !== sessionNonce) {
				client.disconnect();
				return;
			}
			translationClients.set(side, client);
			logDiagnostic('connect:ready', { side });
			setSideStatus(side, 'connected');
		})();

		connectingSides.set(side, connection);
		try {
			await connection;
		} finally {
			connectingSides.delete(side);
		}
	}

	function outputModeForSide(side: Side): OutputPanMode {
		if (!splitOutput) return 'both';
		return side === 'me' ? 'right' : 'left';
	}

	function ensureOutputRouter(side: Side) {
		const existing = outputRouters.get(side);
		if (existing) return existing;
		const router = new StereoOutputRouter();
		outputRouters.set(side, router);
		return router;
	}

	function watchOutputStream(side: Side, stream: MediaStream) {
		for (const track of stream.getAudioTracks()) {
			if (watchedOutputTracks.has(track)) continue;
			watchedOutputTracks.add(track);
			track.onmute = () => logDiagnostic('output:track-muted', { side, track: describeTrack(track) });
			track.onunmute = () =>
				logDiagnostic('output:track-unmuted', { side, track: describeTrack(track) });
			track.onended = () => logDiagnostic('output:track-ended', { side, track: describeTrack(track) });
		}
	}

	function getTranslationTrack(side: Side) {
		const existing = translationTracks.get(side);
		if (existing) return existing;
		const [sourceTrack] = micStream?.getAudioTracks() ?? [];
		if (!sourceTrack) throw new Error('Selected microphone has no audio track.');
		const track = sourceTrack.clone();
		track.enabled = false;
		translationTracks.set(side, track);
		return track;
	}

	function setActiveInputSide(side: Side) {
		for (const [candidate, track] of translationTracks) {
			track.enabled = candidate === side;
		}
		logDiagnostic('input:active', {
			side,
			tracks: [...translationTracks].map(([candidate, track]) => ({
				side: candidate,
				...describeTrack(track)
			}))
		});
		setSideInput('me', side === 'me');
		setSideInput('them', side === 'them');
	}

	function muteTranslationTracks() {
		for (const track of translationTracks.values()) {
			track.enabled = false;
		}
		logDiagnostic('input:muted');
		setSideInput('me', false);
		setSideInput('them', false);
	}

	function setSideStatus(side: Side, status: string) {
		diagnostics = {
			...diagnostics,
			[side]: { ...diagnostics[side], status }
		};
		publishDiagnostics();
	}

	function setSideTrack(side: Side, track: boolean) {
		diagnostics = {
			...diagnostics,
			[side]: { ...diagnostics[side], track }
		};
		publishDiagnostics();
	}

	function setSideAudio(side: Side, audio: string) {
		diagnostics = {
			...diagnostics,
			[side]: { ...diagnostics[side], audio }
		};
		publishDiagnostics();
	}

	function setSideInput(side: Side, input: boolean) {
		diagnostics = {
			...diagnostics,
			[side]: { ...diagnostics[side], input }
		};
		publishDiagnostics();
	}

	function setSideError(side: Side, nextError: string) {
		diagnostics = {
			...diagnostics,
			[side]: { ...diagnostics[side], error: nextError }
		};
		publishDiagnostics();
	}

	function recordSideEvent(side: Side, event: string) {
		diagnostics = {
			...diagnostics,
			[side]: {
				...diagnostics[side],
				events: [...diagnostics[side].events, event].slice(-4)
			}
		};
		publishDiagnostics();
	}

	function stopPlayback() {
		logDiagnostic('output:stop');
		for (const router of outputRouters.values()) {
			router.stop();
		}
	}

	function disconnectAllTranslation(closeOutput = false) {
		logDiagnostic('disconnect', { closeOutput });
		for (const client of translationClients.values()) {
			client.disconnect();
		}
		translationClients.clear();
		connectingSides.clear();
		for (const track of translationTracks.values()) {
			track.stop();
		}
		translationTracks.clear();
		if (closeOutput) {
			for (const router of outputRouters.values()) {
				router.close();
			}
			outputRouters.clear();
		} else {
			stopPlayback();
		}
	}

	function updateOutputModes() {
		for (const [side, router] of outputRouters) {
			router.setMode(outputModeForSide(side));
		}
	}

	function publishDiagnostics() {
		if (typeof window === 'undefined') return;
		(window as Window & { __LINGK_ONE_PHONE_DIAG__?: unknown }).__LINGK_ONE_PHONE_DIAG__ = {
			activeSide,
			uiState,
			splitOutput,
			diagnostics,
			translationClients: [...translationClients.keys()],
			connectingSides: [...connectingSides.keys()],
			outputRouters: [...outputRouters.keys()],
			translationTracks: [...translationTracks].map(([side, track]) => ({
				side,
				...describeTrack(track)
			}))
		};
	}

	function logDiagnostic(event: string, details: Record<string, unknown> = {}) {
		if (typeof console === 'undefined') return;
		const payload = {
			at: new Date().toISOString(),
			sessionId: diagnosticSessionId,
			event,
			uiState,
			activeSide,
			...details
		};
		console.info('[one-phone]', payload);
		sendDiagnostic(payload);
		publishDiagnostics();
	}

	function sendDiagnostic(payload: Record<string, unknown>) {
		if (typeof navigator === 'undefined') return;
		const body = JSON.stringify(payload);
		const blob = new Blob([body], { type: 'application/json' });
		if (navigator.sendBeacon?.('/api/diagnostics/one-phone', blob)) return;
		void fetch('/api/diagnostics/one-phone', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
			keepalive: true
		}).catch(() => {});
	}

	function describeTrack(track: MediaStreamTrack) {
		return {
			id: track.id,
			label: track.label,
			enabled: track.enabled,
			muted: track.muted,
			readyState: track.readyState
		};
	}

	function errorMessage(cause: unknown) {
		return cause instanceof Error ? cause.message : String(cause);
	}

	function scheduleIdleDisconnect(delay = 20_000) {
		clearIdleDisconnectTimer();
		idleDisconnectTimer = setTimeout(() => {
			disconnectAllTranslation();
			translatedStream = undefined;
			activeSide = undefined;
			uiState = micStream ? 'ready' : 'setup';
			detail = '';
		}, delay);
	}

	function clearIdleDisconnectTimer() {
		if (!idleDisconnectTimer) return;
		clearTimeout(idleDisconnectTimer);
		idleDisconnectTimer = undefined;
	}

	$effect(() => {
		updateOutputModes();
	});

	$effect(() => {
		return () => {
			clearIdleDisconnectTimer();
			sessionNonce += 1;
			disconnectAllTranslation(true);
			stopStream(micStream);
		};
	});
</script>

<svelte:window
	onerror={(event) =>
		logDiagnostic('window:error', {
			error: event.message,
			source: event.filename,
			line: event.lineno,
			column: event.colno
		})}
	onunhandledrejection={(event) =>
		logDiagnostic('window:unhandled-rejection', { error: errorMessage(event.reason) })}
/>

<svelte:head>
	<title>One Phone Mode · Lingk</title>
	<meta
		name="description"
		content="Share one phone for push-to-talk live translation with split earbud output."
	/>
</svelte:head>

<DeviceFrame topLabel="LINGK · ONE PHONE" {topLed}>
	{#snippet surfaceTop()}
		{#if uiState !== 'setup' && uiState !== 'requesting_microphone' && uiState !== 'error'}
			<div class="them-surface-button">
				<PushToTalkButton
					disabled={!canSpeak && uiState !== 'speaking_them'}
					active={uiState === 'speaking_them'}
					idleLabel={themButtonLabel}
					activeLabel={themButtonLabel}
					tone="blue"
					onstart={() => beginSide('them')}
					onstop={() => endSide('them')}
				/>
			</div>
			<div
				class="translate-lamp translate-lamp--them"
				class:active={receivingSide === 'them'}
				aria-label="Them translating indicator"
			>
				<span class="lamp-dot" aria-hidden="true"></span>
				<span>TRANSLATING</span>
			</div>
		{/if}
	{/snippet}

	{#snippet display()}
		{#if uiState === 'setup' || uiState === 'requesting_microphone' || uiState === 'error'}
			<DeviceScreen tone="green">
				<div class="screen-stack">
					<header class="screen-head crt-fringe">
						<span>ONE PHONE</span>
						<span>{uiState === 'requesting_microphone' ? 'STARTING' : 'SETUP'}</span>
					</header>
					<div class="language-grid">
						<LanguagePicker bind:value={myLanguage} label="Me" />
						<LanguagePicker bind:value={theirLanguage} label="Them" />
					</div>
					<button
						type="button"
						class="swap crt-fringe"
						onpointerdown={() => playClick('down')}
						onclick={swapLanguages}
					>
						<RotateCcw size={16} />
						<span>SWAP LANGUAGES</span>
					</button>
					<div class="detail crt-fringe">{detail}</div>

					{#if error}
						<p class="error crt-fringe">⚠ {error}</p>
					{/if}
				</div>
			</DeviceScreen>
		{:else}
			<DeviceScreen tone="green">
				<div class="screen-stack">
					<div class="shared-screen">
						<AudioVisualizer stream={vizStream} color={vizColor} />
							<span class="viz-label mono crt-fringe">
								{#if uiState === 'speaking_me'}
									▶ TX · {meButtonLabel}
								{:else if uiState === 'speaking_them'}
									▶ TX · {themButtonLabel}
								{:else if uiState === 'receiving'}
									◀ RX · {activeOutputMode.toUpperCase()}
								{:else}
									— STANDBY
								{/if}
							</span>
						</div>
				</div>
			</DeviceScreen>
		{/if}
	{/snippet}

	{#snippet front()}
		{#if uiState === 'setup' || uiState === 'requesting_microphone' || uiState === 'error'}
			<div class="start-row">
				<DeviceButton
					tone="orange"
					size="lg"
					disabled={uiState === 'requesting_microphone'}
					onclick={start}
				>
					<span>{uiState === 'requesting_microphone' ? 'STARTING…' : 'START ONE PHONE'}</span>
				</DeviceButton>
			</div>
		{:else}
			<div class="handoff-deck">
				<div class="me-end">
					<div
						class="translate-lamp translate-lamp--me"
						class:active={receivingSide === 'me'}
						aria-label="Me translating indicator"
					>
						<span class="lamp-dot" aria-hidden="true"></span>
						<span>TRANSLATING</span>
					</div>
					<PushToTalkButton
						disabled={!canSpeak && uiState !== 'speaking_me'}
						active={uiState === 'speaking_me'}
						idleLabel={meButtonLabel}
						activeLabel={meButtonLabel}
						onstart={() => beginSide('me')}
						onstop={() => endSide('me')}
					/>
					<div class="mode-controls" aria-label="One phone controls">
						<DeviceButton
							ariaLabel={splitOutput ? 'Use both-ear output' : 'Use split earbud output'}
							ariaPressed={splitOutput}
							pressed={splitOutput}
							onclick={toggleOutputMode}
						>
							<Headphones size={18} />
							<span>{splitOutput ? 'SPLIT' : 'BOTH'}</span>
						</DeviceButton>
						<DeviceButton ariaLabel="Reset one phone session" onclick={resetSession}>
							<RotateCcw size={18} />
							<span>RESET</span>
						</DeviceButton>
						<DeviceButton ariaLabel="Leave one phone mode" tone="red" onclick={leave}>
							<LogOut size={18} />
							<span>EXIT</span>
						</DeviceButton>
					</div>
				</div>
			</div>
		{/if}
	{/snippet}
</DeviceFrame>

<style>
	.screen-stack {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		height: 100%;
		min-height: 0;
		overflow-y: auto;
	}

	.screen-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--screen-green-dim);
		text-transform: uppercase;
	}

	.language-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.7rem;
	}

	.swap {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		width: 100%;
		padding: 0.65rem 0.75rem;
		border: 1px solid oklch(0.42 0.1 145 / 0.45);
		border-radius: 0.35rem;
		background: oklch(0.1 0.025 145);
		color: var(--screen-green);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.16em;
	}

	.translate-lamp {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.38rem;
		min-width: 0;
		border-radius: 0;
		background: transparent;
		box-shadow:
			inset 0 1px 0 oklch(1 0 0 / 0.035),
			inset 0 -1px 0 oklch(0 0 0 / 0.46);
		color: oklch(0.5 0.005 250);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.48rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		min-height: 1.15rem;
		padding: 0.08rem 0.45rem;
		opacity: 0.78;
	}

	.translate-lamp--them {
		transform: rotate(180deg);
	}

	.lamp-dot {
		display: block;
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 999px;
		background: var(--led-dim);
		box-shadow:
			inset 0 0 2px oklch(0 0 0 / 0.8),
			0 0 0 1px oklch(0 0 0 / 0.42);
		transition:
			background 160ms ease,
			box-shadow 160ms ease;
	}

	.translate-lamp.active {
		color: oklch(0.8 0.16 145);
	}

	.translate-lamp.active .lamp-dot {
		background: var(--led-green);
		box-shadow:
			inset 0 0 2px oklch(0 0 0 / 0.35),
			0 0 8px oklch(0.78 0.2 150 / 0.82),
			0 0 20px oklch(0.78 0.2 150 / 0.36);
	}

	.shared-screen {
		position: relative;
		display: grid;
		grid-template-rows: minmax(6.5rem, 1fr);
		flex: 1;
		min-height: 10.5rem;
		border-radius: 0.4rem;
		background: oklch(0.055 0.012 145);
		box-shadow:
			inset 0 0 0 1px oklch(0.4 0.1 145 / 0.18),
			inset 0 1px 4px oklch(0 0 0 / 0.6);
		overflow: hidden;
	}

	.them-surface-button {
		transform: rotate(180deg);
	}

	.them-surface-button :global(.ptt) {
		min-height: clamp(8.5rem, 20vh, 12rem);
		border-radius: 0.9rem;
	}

	.them-surface-button :global(.ptt-mount) {
		border-radius: 1rem;
	}

	.them-surface-button :global(.ptt-inner) {
		gap: 0.7rem;
		min-height: inherit;
		padding: 1rem 0.55rem;
	}

	.them-surface-button :global(.ptt-icon) {
		width: clamp(4rem, 14vw, 5rem);
		height: clamp(4rem, 14vw, 5rem);
	}

	.them-surface-button :global(.ptt-icon svg) {
		width: 52px;
		height: 52px;
	}

	.them-surface-button :global(.label) {
		font-size: clamp(1.08rem, 4vw, 1.32rem);
		letter-spacing: 0.16em;
	}

	.shared-screen :global(canvas) {
		min-height: 6.5rem;
	}

	.viz-label {
		position: absolute;
		top: 50%;
		left: 0.55rem;
		z-index: 3;
		transform: translateY(-50%);
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--screen-green-dim);
		pointer-events: none;
		text-transform: uppercase;
	}

	.detail {
		min-height: 2.6rem;
		padding: 0.55rem 0.62rem;
		border-left: 2px solid oklch(0.55 0.13 145 / 0.65);
		color: var(--screen-green-dim);
		font-size: 0.72rem;
		line-height: 1.35;
	}

	.error {
		margin: 0;
		color: oklch(0.78 0.18 28);
		font-size: 0.78rem;
	}

	.start-row {
		display: block;
		width: 100%;
	}

	.handoff-deck {
		display: grid;
		gap: 0.7rem;
	}

	.me-end {
		display: grid;
		gap: 0.55rem;
	}

	.handoff-deck :global(.ptt) {
		min-height: clamp(8.5rem, 20vh, 12rem);
		border-radius: 0.9rem;
	}

	.handoff-deck :global(.ptt-mount) {
		border-radius: 1rem;
	}

	.handoff-deck :global(.ptt-inner) {
		gap: 0.7rem;
		padding: 1rem 0.55rem;
	}

	.handoff-deck :global(.ptt-icon) {
		width: clamp(4rem, 14vw, 5rem);
		height: clamp(4rem, 14vw, 5rem);
	}

	.handoff-deck :global(.ptt-icon svg) {
		width: 52px;
		height: 52px;
	}

	.handoff-deck :global(.label) {
		font-size: clamp(1.08rem, 4vw, 1.32rem);
		letter-spacing: 0.16em;
	}

	.mode-controls {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.35rem;
	}

	.mode-controls :global(.key) {
		flex-direction: column;
		gap: 0.26rem;
		min-height: 3.45rem;
		padding: 0.46rem 0.22rem;
	}

	.mode-controls :global(.key span) {
		font-size: 0.52rem;
		letter-spacing: 0.12em;
	}

	@media (min-width: 680px) {
		.language-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 380px) {
		.mode-controls :global(.key span) {
			display: none;
		}
	}
</style>
