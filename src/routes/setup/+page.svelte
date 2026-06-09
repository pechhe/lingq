<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import DeviceButton from '$lib/components/DeviceButton.svelte';
	import DeviceFrame from '$lib/components/DeviceFrame.svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import LanguagePicker from '$lib/components/LanguagePicker.svelte';
	import QrCode from '$lib/components/QrCode.svelte';
	import { defaultHearLanguage } from '$lib/constants/languages';
	import { playClick, unlockClickAudio } from '$lib/realtime/clickSound';

	let spokenLanguage = $state(defaultHearLanguage('en'));
	let pending = $state(false);
	let error = $state('');
	let createdRoom = $state<{ roomId: string; joinUrl: string } | null>(null);
	let copied = $state(false);
	let languagePickerOpen = $state(false);

	async function createRoom() {
		unlockClickAudio();
		pending = true;
		error = '';
		createdRoom = null;

		const response = await fetch('/api/rooms/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				spokenLanguage,
				hasOpenAIKey: Boolean(localStorage.getItem('lingk:openai-api-key')),
				accessMode:
					page.url.searchParams.get('access') === 'trial'
						? 'trial'
						: page.url.searchParams.get('access') === 'test'
							? 'test'
							: undefined
			})
		});

		pending = false;

		if (!response.ok) {
			error = await response.text();
			return;
		}

		createdRoom = await response.json();
		if (createdRoom) {
			try {
				localStorage.setItem(`lingk:${createdRoom.roomId}:host-lang`, spokenLanguage);
			} catch {
				// localStorage blocked; host will see the language picker on the room page as a fallback
			}
		}
	}

	function joinCreatedRoom() {
		if (!createdRoom) return;
		goto(resolve(`/room/${createdRoom.roomId}`));
	}

	function startOnePhoneMode() {
		goto(resolve('/one-phone'));
	}

	function setBrowserLanguage() {
		spokenLanguage = defaultHearLanguage(navigator.language);
	}

	async function copyLink() {
		if (!createdRoom) return;
		try {
			await navigator.clipboard.writeText(createdRoom.joinUrl);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// clipboard blocked
		}
	}
</script>

<svelte:head>
	<title>Lingk</title>
	<meta
		name="description"
		content="Create a two-person mobile room for push-to-talk spoken translation."
	/>
</svelte:head>

<svelte:window onload={setBrowserLanguage} />

<DeviceFrame topLed={createdRoom ? 'ready' : 'idle'} topLabel="LINGK · STANDBY">
	{#snippet display()}
		<div class="earpiece" aria-hidden="true">
			<span class="earpiece-bar"></span>
		</div>

		<DeviceScreen tone="amber">
			{#if !createdRoom}
				<div class="screen-stack">
					<header class="screen-head crt-fringe">
						<span>SETUP</span>
						<span class="status">▮ READY</span>
					</header>
					<div class="hero crt-fringe">
						<p class="kicker">LIVE TWO-PHONE TRANSLATION</p>
						<h1>Hold to speak.<br />They hear you<br />in their language.</h1>
					</div>
					<LanguagePicker
						bind:value={spokenLanguage}
						bind:open={languagePickerOpen}
						label="Your language"
						tone="amber"
					/>
					{#if error}
						<p class="error crt-fringe">⚠ {error}</p>
					{/if}
				</div>
			{:else}
				<div class="screen-stack">
					<header class="screen-head crt-fringe">
						<span>ROOM</span>
						<span class="status">▮ OPEN</span>
					</header>
					<div class="qr-block">
						<QrCode value={createdRoom.joinUrl} />
					</div>
					<div class="room-meta crt-fringe">
						<p class="kicker">SCAN OR TAP</p>
						<p class="room-id">{createdRoom.roomId}</p>
						<button
							type="button"
							class="link"
							onpointerdown={() => playClick('down')}
							onclick={copyLink}
						>
							<span>{createdRoom.joinUrl}</span>
							<span class="copy">{copied ? 'COPIED' : 'COPY'}</span>
						</button>
					</div>
				</div>
			{/if}
		</DeviceScreen>
	{/snippet}

	{#snippet front()}
		{#if !createdRoom}
			{#if !languagePickerOpen}
				<div class="setup-actions">
					<DeviceButton tone="orange" size="lg" disabled={pending} onclick={createRoom}>
						<span>{pending ? 'CREATING…' : 'CREATE ROOM'}</span>
					</DeviceButton>
					<DeviceButton disabled={pending} onclick={startOnePhoneMode}>
						<span>ONE PHONE</span>
					</DeviceButton>
				</div>
			{/if}
		{:else}
			<div class="primary-row">
				<DeviceButton tone="orange" size="lg" onclick={joinCreatedRoom}>
					<span>JOIN NOW</span>
				</DeviceButton>
				<DeviceButton onclick={() => (createdRoom = null)}>
					<span>NEW</span>
				</DeviceButton>
			</div>
		{/if}
	{/snippet}
</DeviceFrame>

<style>
	.earpiece {
		display: flex;
		justify-content: center;
		padding: 0.25rem 0;
	}

	.earpiece-bar {
		width: clamp(4rem, 22vw, 5.5rem);
		height: 0.5rem;
		border-radius: 999px;
		background:
			radial-gradient(circle, oklch(0 0 0) 0.6px, transparent 0.9px) 0 0 / 3.5px 3.5px,
			oklch(0.1 0.005 250);
		box-shadow:
			inset 0 1px 2px oklch(0 0 0 / 0.7),
			0 1px 0 oklch(0.32 0.005 250 / 0.4);
	}

	:global(.screen[data-tone='amber'] .content) {
		padding: clamp(1.1rem, 4.2vw, 1.45rem) clamp(1rem, 4vw, 1.35rem) clamp(1rem, 3.8vw, 1.25rem);
	}

	.screen-stack {
		display: flex;
		flex-direction: column;
		gap: clamp(0.9rem, 3vw, 1.25rem);
		height: 100%;
		min-height: inherit;
		overflow: hidden;
	}

	.screen-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.1rem 0.05rem 0;
		font-size: clamp(0.56rem, 2.2vw, 0.62rem);
		letter-spacing: 0.16em;
		color: var(--screen-amber-dim);
		text-transform: uppercase;
	}

	.screen-head .status {
		color: var(--screen-amber);
	}

	.hero {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		flex: 1;
		justify-content: center;
		min-width: 0;
		padding-inline: 0.05rem;
	}

	.kicker {
		margin: 0;
		font-size: clamp(0.54rem, 2.15vw, 0.62rem);
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--screen-amber-dim);
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: clamp(1.1rem, 5vw, 1.55rem);
		font-weight: 600;
		line-height: 1.24;
		color: var(--screen-amber);
		letter-spacing: -0.015em;
	}

	.error {
		margin: 0;
		color: oklch(0.78 0.18 28);
		font-size: 0.78rem;
	}

	.qr-block {
		display: flex;
		justify-content: center;
		flex: 1;
		align-items: center;
	}

	.qr-block :global(img) {
		max-width: min(100%, 13rem);
		width: 100%;
	}

	.room-meta {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		text-align: center;
	}

	.room-id {
		margin: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: clamp(1.6rem, 7vw, 2.2rem);
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--screen-amber);
		font-feature-settings: 'tnum';
	}

	.link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.55rem 0.65rem;
		border: 1px solid oklch(0.45 0.1 70 / 0.4);
		border-radius: 0.35rem;
		background: oklch(0.1 0.02 60);
		color: var(--screen-amber-dim);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.7rem;
		text-align: left;
		min-width: 0;
	}

	.link span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.link .copy {
		flex-shrink: 0;
		color: var(--screen-amber);
		font-weight: 700;
		letter-spacing: 0.1em;
	}

	.primary-row {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 0.5rem;
	}

	.setup-actions {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(6.6rem, 1fr);
		gap: clamp(0.55rem, 2vw, 0.75rem);
	}

	@media (max-width: 23rem) {
		:global(.screen[data-tone='amber'] .content) {
			padding-inline: 0.85rem;
		}

		.setup-actions {
			grid-template-columns: 1fr;
		}
	}
</style>
