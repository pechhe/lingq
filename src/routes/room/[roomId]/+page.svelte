<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AudioDevicePicker from '$lib/components/AudioDevicePicker.svelte';
	import DeviceFrame from '$lib/components/DeviceFrame.svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import PushToTalkButton from '$lib/components/PushToTalkButton.svelte';
	import {
		defaultHearLanguage,
		getLanguageLabel,
		getOpenAITranslationLanguage,
		languages
	} from '$lib/constants/languages';
	import { requestMicrophone, stopStream, unlockAudioPlayback } from '$lib/realtime/audioRouting';
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
	let speakerLevel = $state(0);
	let remoteMicrophoneTrackId = '';

	let micStream: MediaStream | undefined;
	let remoteMicrophoneTrack: MediaStreamTrack | undefined;
	let livekitClient: LiveKitRoomClient | undefined;
	let openaiClient: OpenAIRealtimeClient | undefined;
	let idleDisconnectTimer: ReturnType<typeof setTimeout> | undefined;
	let levelMeter: AudioLevelMeter | undefined;
	let levelRaf: number | undefined;

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
				}
			},
			onRemoteMicrophone: (track, publication) => {
				remoteMicrophoneTrack = track;
				if (!publication.isMuted) {
					void connectTranslation(track);
				}
			},
			onRemoteMicrophoneMuted: () => {
				scheduleIdleDisconnect();
			},
			onRemoteMicrophoneUnmuted: () => {
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
					detail = `Ready to hear translations in ${getLanguageLabel(targetLanguage)}.`;
					if (translationStatus === 'connected') {
						uiState = 'connected';
					}
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

		openaiClient = new OpenAIRealtimeClient({
			roomId,
			participantId,
			targetLanguage,
			openAITranslationLanguage: getOpenAITranslationLanguage(targetLanguage),
			sourceTrack,
			onTranslatedAudio: (stream) => {
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

	function stopLevelMeter() {
		if (levelRaf !== undefined) {
			cancelAnimationFrame(levelRaf);
			levelRaf = undefined;
		}
		levelMeter?.stop();
		levelMeter = undefined;
		speakerLevel = 0;
	}

	$effect(() => {
		if (remoteAudioElement && translatedAudioStream) {
			remoteAudioElement.srcObject = translatedAudioStream;
			void remoteAudioElement.play().catch(() => {
				detail = 'Tap the screen if your browser blocks translated audio playback.';
			});
		}
	});

	$effect(() => {
		if (!translatedAudioStream || muted) {
			stopLevelMeter();
			return;
		}
		stopLevelMeter();
		levelMeter = createAudioLevelMeter(translatedAudioStream);
		const tick = () => {
			if (!levelMeter) return;
			speakerLevel = levelMeter.level();
			levelRaf = requestAnimationFrame(tick);
		};
		levelRaf = requestAnimationFrame(tick);
		return () => stopLevelMeter();
	});

	$effect(() => {
		return () => {
			stopLevelMeter();
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
		<div class="grille-wrap">
			<SpeakerGrille level={speakerLevel} label="Translated audio output" />
		</div>
		<DeviceScreen tone="green">
			<div class="screen-stack">
				<RoomStatus
					mic={micLevel}
					participant={participantLevel}
					translation={translationLevel}
					{detail}
				/>

				{#if isInSetup}
					<label class="lang">
						<span class="lang-label">YOUR LANGUAGE</span>
						<select bind:value={spokenLanguage}>
							{#each languages as language (language.code)}
								<option value={language.code}>{language.label}</option>
							{/each}
						</select>
					</label>
					<button class="start" type="button" onclick={join}>
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
				{/if}

				{#if error}
					<p class="error">⚠ {error}</p>
				{/if}

				{#if uiState === 'reconnecting'}
					<button class="reconnect" type="button" onclick={reconnectTranslation}>
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

	{#snippet footer()}
		HEADPHONES RECOMMENDED · ONE PHONE PER PERSON
	{/snippet}
</DeviceFrame>

<AudioDevicePicker bind:open={audioPickerOpen} audioElement={remoteAudioElement} />

<audio bind:this={remoteAudioElement} class="audio-host" autoplay playsinline {muted}></audio>

<style>
	.grille-wrap {
		display: flex;
		justify-content: center;
		flex-shrink: 0;
	}

	.grille-wrap :global(.grille) {
		width: clamp(8rem, 44vw, 12rem);
	}

	.screen-stack {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		height: 100%;
		min-height: 0;
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
