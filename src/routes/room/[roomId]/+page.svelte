<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AudioDevicePicker from '$lib/components/AudioDevicePicker.svelte';
	import AudioVisualizer from '$lib/components/AudioVisualizer.svelte';
	import DeviceFrame from '$lib/components/DeviceFrame.svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import MicDevicePicker from '$lib/components/MicDevicePicker.svelte';
	import PushToTalkButton from '$lib/components/PushToTalkButton.svelte';
	import QrCode from '$lib/components/QrCode.svelte';
	import {
		defaultHearLanguage,
		getLanguageLabel,
		getOpenAITranslationLanguage,
		isSupportedLanguage,
		languages
	} from '$lib/constants/languages';
	import {
		persistMicSelection,
		requestMicrophone,
		stopStream,
		unlockAudioPlayback
	} from '$lib/realtime/audioRouting';
	import { playClick, unlockClickAudio } from '$lib/realtime/clickSound';
	import { LiveKitRoomClient } from '$lib/realtime/livekitRoomClient';
	import { OpenAIRealtimeClient } from '$lib/realtime/openaiRealtimeClient';
	import {
		canPushToTalk,
		type RoomUiState,
		type StatusLevel
	} from '$lib/realtime/roomStateMachine';
	import RoomControls from './RoomControls.svelte';
	import RoomStatus from './RoomStatus.svelte';

	let { params } = $props();

	let spokenLanguage = $state(defaultHearLanguage('en'));
	let targetLanguage = $state('');
	let participantId = $state('');
	let uiState = $state<RoomUiState>('idle');
	let detail = $state('Choose a language, then start the room from this phone.');
	let error = $state('');
	let muted = $state(false);
	let paused = $state(false);
	let participantCount = $state(1);
	let livekitStatus = $state('idle');
	let translationStatus = $state('idle');
	let translatedAudioStream = $state<MediaStream>();
	let remoteAudioElement = $state<HTMLAudioElement>();
	let audioPickerOpen = $state(false);
	let micPickerOpen = $state(false);
	let remoteMicrophoneTrackId = '';
	let joinUrl = $state('');
	let qrCopied = $state(false);
	let latencyMarks = $state<Record<string, number>>({});

	let micStream = $state<MediaStream | undefined>(undefined);
	let remoteMicrophoneTrack: MediaStreamTrack | undefined;
	let livekitClient: LiveKitRoomClient | undefined;
	let openaiClient: OpenAIRealtimeClient | undefined;
	let idleDisconnectTimer: ReturnType<typeof setTimeout> | undefined;
	let latencyTraceId = '';
	let latencyFlushTimer: ReturnType<typeof setTimeout> | undefined;
	let latencyEventBuffer: Array<{ name: string; elapsedMs: number; at: number }> = [];

	let roomId = $derived(params.roomId);
	let storageKey = $derived(`langlink:${roomId}:participant`);

	let micLevel = $derived<StatusLevel>(
		uiState === 'microphone_denied'
			? 'blocked'
			: micStream
				? 'ready'
				: uiState === 'requesting_microphone'
					? 'pending'
					: 'idle'
	);
	let participantLevel = $derived<StatusLevel>(
		participantCount > 1 ? 'ready' : livekitStatus === 'idle' ? 'idle' : 'pending'
	);
	let translationLevel = $derived<StatusLevel>(
		translationStatus === 'connected' ? 'ready' : translationStatus === 'idle' ? 'idle' : 'pending'
	);
	let pushDisabled = $derived(!canPushToTalk(uiState) || paused);
	let topLed = $derived<'idle' | 'ready' | 'speaking' | 'error'>(
		uiState === 'speaking'
			? 'speaking'
			: uiState === 'error' || uiState === 'microphone_denied'
				? 'error'
				: uiState === 'connected' || uiState === 'receiving_translation'
					? 'ready'
					: 'idle'
	);
	let isInSetup = $derived(
		uiState === 'idle' || uiState === 'microphone_denied' || uiState === 'error'
	);
	let isHost = $state(false);
	let vizStream = $derived(
		uiState === 'speaking'
			? micStream
			: translatedAudioStream && !muted
				? translatedAudioStream
				: undefined
	);
	let vizColor = $derived<'green' | 'purple'>(uiState === 'speaking' ? 'green' : 'purple');
	let currentMicDeviceId = $derived(micStream?.getAudioTracks()[0]?.getSettings().deviceId);

	$effect(() => {
		const id = roomId;
		if (typeof localStorage === 'undefined') return;
		const stored = localStorage.getItem(`langlink:${id}:host-lang`);
		if (stored && isSupportedLanguage(stored)) {
			spokenLanguage = stored;
			isHost = true;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		joinUrl = `${window.location.origin}/room/${roomId}`;
	});

	async function copyJoinLink() {
		if (!joinUrl) return;
		try {
			await navigator.clipboard.writeText(joinUrl);
			qrCopied = true;
			setTimeout(() => (qrCopied = false), 1500);
		} catch {
			// clipboard blocked
		}
	}

	async function join() {
		unlockClickAudio();
		uiState = 'requesting_microphone';
		error = '';
		detail = 'Requesting microphone permission.';

		try {
			await unlockAudioPlayback();
			micStream = await requestMicrophone();
		} catch (cause) {
			uiState = 'microphone_denied';
			error = cause instanceof Error ? cause.message : 'Microphone permission was denied.';
			detail = 'Microphone access is required for live translation.';
			return;
		}

		uiState = 'joining_room';
		detail = 'Joining the room.';

		const storedParticipantId = localStorage.getItem(storageKey);
		const joinResponse = await fetch(`/api/rooms/${roomId}/join`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				spokenLanguage,
				participantId: storedParticipantId
			})
		});

		if (!joinResponse.ok) {
			uiState = 'error';
			error = await joinResponse.text();
			detail = 'The room could not be joined.';
			return;
		}

		const joinResult = await joinResponse.json();
		participantId = joinResult.participant.participantId;
		targetLanguage = spokenLanguage;
		localStorage.setItem(storageKey, participantId);

		await connectLiveKit();
		await waitForOtherParticipant();
	}

	async function connectLiveKit() {
		uiState = 'connecting_livekit';
		detail = 'Connecting the room audio path.';

		livekitClient = new LiveKitRoomClient({
			roomId,
			participantId,
			onParticipantCount: (count) => {
				participantCount = count;
				if (count < 2 && uiState === 'connected') {
					disconnectTranslationSession();
					uiState = 'waiting_for_other_participant';
					detail = 'Waiting for the other phone to connect.';
				} else if (count > 1 && uiState === 'waiting_for_other_participant') {
					uiState = 'connected';
					detail = 'Hold the button while speaking. The other phone hears the translation.';
				}
			},
			onRemoteMicrophone: (track, publication) => {
				remoteMicrophoneTrack = track;
				if (!paused && participantCount > 1 && uiState === 'waiting_for_other_participant') {
					uiState = 'connected';
					detail = 'Hold the button while speaking. The other phone hears the translation.';
				}
				if (!publication.isMuted) {
					void connectTranslation(track);
				}
			},
			onRemoteMicrophoneMuted: () => {
				markLatency('livekit_remote_ptt_off');
				scheduleIdleDisconnect();
			},
			onRemoteMicrophoneUnmuted: () => {
				resetLatency('remote_speech');
				markLatency('livekit_remote_ptt_on');
				clearIdleDisconnectTimer();
				if (!paused && !openaiClient && remoteMicrophoneTrack) {
					void connectTranslation(remoteMicrophoneTrack);
				}
			},
			onStatus: (status) => {
				livekitStatus = status;
				if (status.startsWith('disconnected') && uiState !== 'ended') {
					uiState = 'reconnecting';
					detail = 'Room connection dropped. Rejoin if it does not recover.';
				}
			},
			onError: (nextError) => {
				error = nextError.message;
				uiState = 'error';
			}
		});

		await livekitClient.connect();
		const [microphoneTrack] = micStream?.getAudioTracks() ?? [];
		if (microphoneTrack) {
			await livekitClient.publishMicrophoneTrack(microphoneTrack);
		}
	}

	async function waitForOtherParticipant() {
		uiState = 'waiting_for_other_participant';
		detail = 'Waiting for the other phone to connect.';

		for (let attempt = 0; attempt < 90; attempt += 1) {
			const roomResponse = await fetch(`/api/rooms/${roomId}`);
			if (roomResponse.ok) {
				const room = await roomResponse.json();
				const otherParticipant = room.participants?.find(
					(participant: { participantId: string; status: string; spokenLanguage: string }) =>
						participant.participantId !== participantId && participant.status === 'active'
				);

				if (otherParticipant?.spokenLanguage) {
					uiState = 'connected';
					detail = `Ready to hear translations in ${getLanguageLabel(targetLanguage)}.`;
					return;
				}
			}

			await new Promise((resolvePoll) => setTimeout(resolvePoll, 1000));
		}

		detail = 'Still waiting for the other phone.';
	}

	async function connectTranslation(sourceTrack: MediaStreamTrack) {
		remoteMicrophoneTrack = sourceTrack;
		if (!livekitClient || paused || remoteMicrophoneTrackId === sourceTrack.id) return;

		remoteMicrophoneTrackId = sourceTrack.id;
		clearIdleDisconnectTimer();
		openaiClient?.disconnect();
		uiState = 'connecting_translation';
		detail = `Connecting translation into ${getLanguageLabel(targetLanguage)}.`;
		markLatency('translation_connect_requested');

		openaiClient = new OpenAIRealtimeClient({
			roomId,
			participantId,
			targetLanguage,
			openAITranslationLanguage: getOpenAITranslationLanguage(targetLanguage),
			sourceTrack,
			onMetric: (name) => markLatency(name),
			onTranslatedAudio: (stream) => {
				markLatency('translated_audio_stream_ready');
				translatedAudioStream = stream;
				uiState = 'receiving_translation';
				detail = 'Receiving translated audio.';
			},
			onStatus: (status) => {
				translationStatus = status;
				if (
					status === 'connected' &&
					participantCount > 1 &&
					uiState === 'connecting_translation'
				) {
					uiState = 'connected';
					detail = 'Hold the button while speaking. The other phone hears the translation.';
				}
			},
			onError: async (nextError) => {
				error = nextError.message;
				uiState = 'reconnecting';
				detail = 'Translation connection dropped. Reconnecting.';
				await openaiClient?.reconnect().catch((cause) => {
					uiState = 'error';
					error = cause instanceof Error ? cause.message : 'Could not reconnect translation.';
				});
			}
		});

		await openaiClient.connect();
		uiState = participantCount > 1 ? 'connected' : 'waiting_for_other_participant';
		detail =
			participantCount > 1
				? 'Hold the button while speaking. The other phone hears the translation.'
				: 'Waiting for the other phone to connect.';
	}

	function startSpeaking() {
		if (pushDisabled) return;
		uiState = 'speaking';
		detail = 'Speaking. The other phone will translate your voice.';
		livekitClient?.setMicrophoneEnabled(true);
	}

	function stopSpeaking() {
		livekitClient?.setMicrophoneEnabled(false);
		uiState = 'connected';
		detail = 'Mic closed. Hold again to speak.';
	}

	function toggleMute() {
		muted = !muted;
		if (remoteAudioElement) remoteAudioElement.muted = muted;
	}

	function togglePause() {
		paused = !paused;
		if (paused) {
			livekitClient?.setMicrophoneEnabled(false);
			disconnectTranslationSession();
			uiState = 'paused';
			detail = 'Translation is paused. OpenAI session disconnected.';
		} else {
			detail = 'Translation resumed. Reconnecting when the other phone is ready.';
			if (remoteMicrophoneTrack) {
				void connectTranslation(remoteMicrophoneTrack);
			} else {
				uiState = participantCount > 1 ? 'connected' : 'waiting_for_other_participant';
			}
		}
	}

	function openAudioDevices() {
		audioPickerOpen = true;
	}

	function openMicDevices() {
		micPickerOpen = true;
	}

	async function switchMicrophone(deviceId: string) {
		if (currentMicDeviceId === deviceId) {
			persistMicSelection(deviceId);
			return;
		}
		const wasSpeaking = uiState === 'speaking';
		if (wasSpeaking) livekitClient?.setMicrophoneEnabled(false);

		const previous = micStream;
		const nextStream = await requestMicrophone(deviceId);
		const [nextTrack] = nextStream.getAudioTracks();
		if (!nextTrack) {
			stopStream(nextStream);
			throw new Error('Selected microphone has no audio track.');
		}

		micStream = nextStream;
		stopStream(previous);
		persistMicSelection(deviceId);

		if (livekitClient) {
			await livekitClient.publishMicrophoneTrack(nextTrack);
		}
		if (wasSpeaking) livekitClient?.setMicrophoneEnabled(true);
	}

	async function reconnectTranslation() {
		if (remoteMicrophoneTrack) {
			disconnectTranslationSession();
			await connectTranslation(remoteMicrophoneTrack);
		}
	}

	function leave() {
		uiState = 'ended';
		disconnectTranslationSession();
		livekitClient?.disconnect();
		stopStream(micStream);
		goto(resolve('/'));
	}

	function disconnectTranslationSession() {
		clearIdleDisconnectTimer();
		openaiClient?.disconnect();
		openaiClient = undefined;
		translationStatus = 'idle';
		translatedAudioStream = undefined;
		remoteMicrophoneTrackId = '';
		if (remoteAudioElement) {
			remoteAudioElement.pause();
			remoteAudioElement.srcObject = null;
		}
	}

	function scheduleIdleDisconnect() {
		clearIdleDisconnectTimer();
		if (!openaiClient || paused || uiState === 'ended') return;

		idleDisconnectTimer = setTimeout(() => {
			if (!openaiClient || paused || uiState === 'ended' || uiState === 'speaking') return;
			disconnectTranslationSession();
			uiState = participantCount > 1 ? 'connected' : 'waiting_for_other_participant';
			detail = 'Translation idle. OpenAI session disconnected until needed again.';
		}, 60_000);
	}

	function clearIdleDisconnectTimer() {
		if (idleDisconnectTimer) {
			clearTimeout(idleDisconnectTimer);
			idleDisconnectTimer = undefined;
		}
	}

	$effect(() => {
		if (remoteAudioElement && translatedAudioStream) {
			remoteAudioElement.srcObject = translatedAudioStream;
			markLatency('playback_attempt');
			void remoteAudioElement
				.play()
				.then(() => {
					markLatency('playback_started');
				})
				.catch(() => {
					detail = 'Tap the screen if your browser blocks translated audio playback.';
				});
		}
	});

	function resetLatency(reason: string) {
		latencyMarks = { latency_reset: performance.now() };
		latencyTraceId = crypto.randomUUID();
		latencyEventBuffer = [];
		recordLatencyEvent(`trace:${reason}`, 0);
	}

	function markLatency(name: string) {
		const now = performance.now();
		if (latencyMarks[name] !== undefined) return;

		latencyMarks = { ...latencyMarks, [name]: now };
		recordLatencyEvent(name, now - (latencyMarks.latency_reset ?? now));
	}

	function recordLatencyEvent(name: string, elapsedMs: number) {
		if (!participantId || !latencyTraceId) return;
		latencyEventBuffer = [
			...latencyEventBuffer,
			{
				name,
				elapsedMs,
				at: Date.now()
			}
		].slice(-40);
		scheduleLatencyFlush();
	}

	function scheduleLatencyFlush() {
		if (latencyFlushTimer) return;
		latencyFlushTimer = setTimeout(() => {
			latencyFlushTimer = undefined;
			flushLatencyEvents();
		}, 1500);
	}

	function flushLatencyEvents() {
		if (!participantId || !latencyTraceId || !latencyEventBuffer.length) return;

		const payload = {
			participantId,
			traceId: latencyTraceId,
			events: latencyEventBuffer
		};
		latencyEventBuffer = [];

		const json = JSON.stringify(payload);
		const url = `/api/rooms/${roomId}/latency`;
		if (navigator.sendBeacon) {
			const sent = navigator.sendBeacon(url, new Blob([json], { type: 'application/json' }));
			if (sent) return;
		}

		void fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: json,
			keepalive: true
		}).catch(() => {});
	}

	$effect(() => {
		return () => {
			if (latencyFlushTimer) {
				clearTimeout(latencyFlushTimer);
				latencyFlushTimer = undefined;
			}
			flushLatencyEvents();
			disconnectTranslationSession();
			livekitClient?.disconnect();
			stopStream(micStream);
		};
	});
</script>

<svelte:head>
	<title>Room {roomId} · LangLink</title>
</svelte:head>

<DeviceFrame topLabel="ROOM {roomId.toUpperCase()}" {topLed}>
	{#snippet display()}
		<DeviceScreen tone="green">
			<div class="screen-stack">
				<RoomStatus
					mic={micLevel}
					participant={participantLevel}
					translation={translationLevel}
					{detail}
				/>

				{#if isInSetup}
					{#if !isHost}
						<label class="lang">
							<span class="lang-label">YOUR LANGUAGE</span>
							<select bind:value={spokenLanguage}>
								{#each languages as language (language.code)}
									<option value={language.code}>{language.label}</option>
								{/each}
							</select>
						</label>
					{:else}
						<p class="host-lang mono">
							<span class="dim">YOU SPEAK</span>
							<span class="value">{getLanguageLabel(spokenLanguage)}</span>
						</p>
					{/if}
					<button
						class="start"
						type="button"
						onpointerdown={() => playClick('down')}
						onclick={join}
					>
						{uiState === 'error' ? '↻ TRY AGAIN' : '▶ START ON THIS PHONE'}
					</button>
				{:else}
					<dl class="meta-grid">
						<div>
							<dt>HEARING</dt>
							<dd>{getLanguageLabel(targetLanguage || spokenLanguage)}</dd>
						</div>
						<div>
							<dt>PEERS</dt>
							<dd>{participantCount}/2</dd>
						</div>
					</dl>
					<div class="viz-area">
						<AudioVisualizer stream={vizStream} color={vizColor} />
						<span class="viz-label mono">
							{#if uiState === 'speaking'}
								▶ TX · YOU
							{:else if translatedAudioStream && !muted}
								◀ RX · TRANSLATION
							{:else}
								— STANDBY
							{/if}
						</span>
					</div>
				{/if}

				{#if error}
					<p class="error">⚠ {error}</p>
				{/if}

				{#if uiState === 'reconnecting'}
					<button
						class="reconnect"
						type="button"
						onpointerdown={() => playClick('down')}
						onclick={reconnectTranslation}
					>
						↻ RECONNECT TRANSLATION
					</button>
				{/if}
			</div>
		</DeviceScreen>
	{/snippet}

	{#snippet front()}
		<RoomControls
			{muted}
			{paused}
			onmute={toggleMute}
			onpause={togglePause}
			onmicdevice={openMicDevices}
			onaudiodevice={openAudioDevices}
			onleave={leave}
		/>
		<PushToTalkButton
			disabled={pushDisabled}
			active={uiState === 'speaking'}
			onstart={startSpeaking}
			onstop={stopSpeaking}
		/>
	{/snippet}
</DeviceFrame>

<AudioDevicePicker bind:open={audioPickerOpen} audioElement={remoteAudioElement} />
<MicDevicePicker
	bind:open={micPickerOpen}
	selectedId={currentMicDeviceId}
	onSelect={switchMicrophone}
/>

<audio bind:this={remoteAudioElement} class="audio-host" autoplay playsinline {muted}></audio>

<style>
	.screen-stack {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		height: 100%;
		min-height: 0;
	}

	.viz-area {
		position: relative;
		flex: 1;
		min-height: 4rem;
		border-radius: 0.4rem;
		background: oklch(0.06 0.01 145);
		box-shadow:
			inset 0 0 0 1px oklch(0.4 0.1 145 / 0.18),
			inset 0 1px 4px oklch(0 0 0 / 0.6);
		overflow: hidden;
	}

	.viz-label {
		position: absolute;
		top: 0.4rem;
		left: 0.5rem;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--screen-green-dim);
		text-transform: uppercase;
		pointer-events: none;
		text-shadow: 0 0 4px oklch(0 0 0 / 0.8);
	}

	.lang {
		display: grid;
		gap: 0.4rem;
	}

	.lang-label {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--screen-green-dim);
		text-transform: uppercase;
	}

	.host-lang {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin: 0;
		padding: 0.55rem 0.75rem;
		border-radius: 0.4rem;
		background: oklch(0.1 0.02 145);
		border: 1px solid oklch(0.4 0.1 145 / 0.25);
	}

	.host-lang .dim {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--screen-green-dim);
		text-transform: uppercase;
	}

	.host-lang .value {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--screen-green);
	}

	.lang select {
		appearance: none;
		width: 100%;
		padding: 0.7rem 0.9rem;
		border: 1px solid oklch(0.45 0.12 145 / 0.4);
		border-radius: 0.4rem;
		background: oklch(0.1 0.02 145);
		color: var(--screen-green);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.9rem;
		font-weight: 500;
		background-image:
			linear-gradient(45deg, transparent 50%, var(--screen-green) 50%),
			linear-gradient(135deg, var(--screen-green) 50%, transparent 50%);
		background-position:
			calc(100% - 1.1rem) 50%,
			calc(100% - 0.7rem) 50%;
		background-size:
			0.4rem 0.4rem,
			0.4rem 0.4rem;
		background-repeat: no-repeat;
	}

	.lang select option {
		color: oklch(0.92 0 0);
		background: oklch(0.12 0.005 250);
	}

	.start,
	.reconnect {
		display: block;
		width: 100%;
		padding: 0.75rem;
		border: 1px solid oklch(0.45 0.12 145 / 0.5);
		border-radius: 0.4rem;
		background: oklch(0.14 0.06 145);
		color: var(--screen-green);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.reconnect {
		background: oklch(0.18 0.08 60);
		border-color: oklch(0.45 0.12 60 / 0.5);
		color: var(--screen-amber);
	}

	.meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
		margin: 0;
	}

	.meta-grid > div {
		display: grid;
		gap: 0.2rem;
		padding: 0.55rem 0.65rem;
		border-radius: 0.35rem;
		background: oklch(0.1 0.02 145);
		border: 1px solid oklch(0.4 0.1 145 / 0.25);
	}

	.meta-grid dt {
		margin: 0;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		color: var(--screen-green-dim);
	}

	.meta-grid dd {
		margin: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--screen-green);
	}

	.error {
		margin: 0;
		font-size: 0.78rem;
		color: oklch(0.78 0.18 28);
	}

	.audio-host {
		position: fixed;
		inset: auto;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
</style>
