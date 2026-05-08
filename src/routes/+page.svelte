<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import DeviceButton from '$lib/components/DeviceButton.svelte';
	import DeviceFrame from '$lib/components/DeviceFrame.svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import QrCode from '$lib/components/QrCode.svelte';
	import { defaultHearLanguage, languages } from '$lib/constants/languages';
	import { playClick, unlockClickAudio } from '$lib/realtime/clickSound';

	let spokenLanguage = $state(defaultHearLanguage('en'));
	let pending = $state(false);
	let error = $state('');
	let createdRoom = $state<{ roomId: string; joinUrl: string } | null>(null);
	let copied = $state(false);

	async function createRoom() {
		unlockClickAudio();
		pending = true;
		error = '';
		createdRoom = null;

		const response = await fetch('/api/rooms/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ spokenLanguage })
		});

		pending = false;

		if (!response.ok) {
			error = await response.text();
			return;
		}

		createdRoom = await response.json();
		if (createdRoom) {
			try {
				localStorage.setItem(`langlink:${createdRoom.roomId}:host-lang`, spokenLanguage);
			} catch {
				// localStorage blocked; host will see the language picker on the room page as a fallback
			}
		}
	}

	function joinCreatedRoom() {
		if (!createdRoom) return;
		goto(resolve(`/room/${createdRoom.roomId}`));
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
	<title>LangLink</title>
	<meta
		name="description"
		content="Create a two-person mobile room for push-to-talk spoken translation."
	/>
</svelte:head>

<svelte:window onload={setBrowserLanguage} />

<DeviceFrame topLed={createdRoom ? 'ready' : 'idle'} topLabel="LANGLINK · STANDBY">
	{#snippet display()}
		<div class="earpiece" aria-hidden="true">
			<span class="earpiece-bar"></span>
		</div>

		<DeviceScreen tone="amber">
			{#if !createdRoom}
				<div class="screen-stack">
					<header class="screen-head">
						<span>SETUP</span>
						<span class="status">▮ READY</span>
					</header>
					<div class="hero">
						<p class="kicker">LIVE TWO-PHONE TRANSLATION</p>
						<h1>Hold to speak.<br />They hear you<br />in their language.</h1>
					</div>
					<label class="lang">
						<span class="lang-label">YOUR LANGUAGE</span>
						<select bind:value={spokenLanguage}>
							{#each languages as language (language.code)}
								<option value={language.code}>{language.label}</option>
							{/each}
						</select>
					</label>
					{#if error}
						<p class="error">⚠ {error}</p>
					{/if}
				</div>
			{:else}
				<div class="screen-stack">
					<header class="screen-head">
						<span>ROOM</span>
						<span class="status">▮ OPEN</span>
					</header>
					<div class="qr-block">
						<QrCode value={createdRoom.joinUrl} />
					</div>
					<div class="room-meta">
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
			<DeviceButton tone="orange" size="lg" disabled={pending} onclick={createRoom}>
				<span>{pending ? 'CREATING…' : 'CREATE ROOM'}</span>
			</DeviceButton>
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

	.screen-stack {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		height: 100%;
		min-height: inherit;
	}

	.screen-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.62rem;
		letter-spacing: 0.18em;
		color: var(--screen-amber-dim);
		text-transform: uppercase;
	}

	.screen-head .status {
		color: var(--screen-amber);
	}

	.hero {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		flex: 1;
		justify-content: center;
	}

	.kicker {
		margin: 0;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--screen-amber-dim);
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: clamp(1.2rem, 5.5vw, 1.7rem);
		font-weight: 600;
		line-height: 1.2;
		color: var(--screen-amber);
		letter-spacing: 0;
	}

	.lang {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.lang-label {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--screen-amber-dim);
		text-transform: uppercase;
	}

	.lang select {
		appearance: none;
		width: 100%;
		padding: 0.85rem 0.9rem;
		border: 1px solid oklch(0.45 0.1 70 / 0.45);
		border-radius: 0.4rem;
		background: oklch(0.12 0.02 60);
		color: var(--screen-amber);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		background-image:
			linear-gradient(45deg, transparent 50%, var(--screen-amber) 50%),
			linear-gradient(135deg, var(--screen-amber) 50%, transparent 50%);
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
</style>
