<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import DeviceButton from '$lib/components/DeviceButton.svelte';
	import DeviceFrame from '$lib/components/DeviceFrame.svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import { authClient } from '$lib/auth-client';

	let password = $state('');
	let pendingAction = $state<'passkey' | 'password' | null>(null);
	let error = $state('');
	let notice = $state('');

	function tryNow() {
		goto(resolve('/setup?access=trial'));
	}

	async function savePasskey() {
		error = '';
		notice = '';
		pendingAction = 'passkey';

		const client = authClient as typeof authClient & {
			passkey: {
				addPasskey(input?: {
					name?: string;
					authenticatorAttachment?: 'platform' | 'cross-platform';
				}): Promise<{ error?: { message?: string } }>;
			};
		};

		const result = await client.passkey.addPasskey({
			name: 'Lingk passkey',
			authenticatorAttachment: 'platform'
		});

		pendingAction = null;

		if (result.error) {
			error = result.error.message ?? 'Could not create passkey';
			return;
		}

		notice = 'Passkey saved.';
	}

	async function savePassword() {
		const nextPassword = password.trim();
		error = '';
		notice = '';

		if (nextPassword.length < 8) {
			error = 'Use at least 8 characters';
			return;
		}

		pendingAction = 'password';

		const client = authClient as typeof authClient & {
			setPassword(input: { newPassword: string }): Promise<{ error?: { message?: string } }>;
		};

		const result = await client.setPassword({ newPassword: nextPassword });

		pendingAction = null;

		if (result.error) {
			error = result.error.message ?? 'Could not save password';
			return;
		}

		password = '';
		notice = 'Password saved.';
	}
</script>

<svelte:head>
	<title>Lingk Account</title>
	<meta name="description" content="Finish setting up your Lingk account." />
</svelte:head>

<DeviceFrame topLed="ready" topLabel="LINGK · ACCOUNT">
	{#snippet display()}
		<div class="earpiece" aria-hidden="true">
			<span class="earpiece-bar"></span>
		</div>

		<DeviceScreen tone="amber">
			<div class="screen-stack">
				<header class="screen-head crt-fringe">
					<span>ACCOUNT</span>
					<span class="status">▮ VERIFIED</span>
				</header>

				<section class="intro crt-fringe">
					<p class="kicker">SECURE SIGN-IN</p>
					<h1>Add a passkey.<br />Or set a<br />password.</h1>
				</section>

				<section class="panel">
					<DeviceButton tone="orange" size="sm" disabled={pendingAction !== null} onclick={savePasskey}>
						<span>{pendingAction === 'passkey' ? 'SAVING' : 'ADD PASSKEY'}</span>
					</DeviceButton>

					<label class="field">
						<span class="field-label crt-fringe">PASSWORD</span>
						<input
							bind:value={password}
							type="password"
							placeholder="Fallback only"
							autocomplete="new-password"
							onkeydown={(event) => {
								if (event.key === 'Enter') savePassword();
							}}
						/>
					</label>

					<DeviceButton size="sm" disabled={pendingAction !== null} onclick={savePassword}>
						<span>{pendingAction === 'password' ? 'SAVING' : 'SAVE PASSWORD'}</span>
					</DeviceButton>
				</section>

				{#if error}
					<p class="error crt-fringe">⚠ {error}</p>
				{/if}
				{#if notice}
					<p class="notice crt-fringe">{notice}</p>
				{/if}
			</div>
		</DeviceScreen>
	{/snippet}

	{#snippet front()}
		<DeviceButton tone="orange" size="lg" onclick={tryNow}>
			<span>TRY NOW</span>
		</DeviceButton>
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

	.intro {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: center;
		gap: 0.55rem;
		min-height: 8rem;
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
		font-size: clamp(1.25rem, 5.7vw, 1.75rem);
		font-weight: 600;
		line-height: 1.16;
		color: var(--screen-amber);
		letter-spacing: 0;
	}

	.panel {
		display: grid;
		gap: 0.6rem;
		padding: 0.7rem;
		border: 1px solid oklch(0.45 0.1 70 / 0.35);
		border-radius: 0.4rem;
		background: oklch(0.1 0.02 60 / 0.7);
	}

	.field {
		display: grid;
		gap: 0.35rem;
	}

	.field-label {
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--screen-amber-dim);
		text-transform: uppercase;
	}

	input {
		width: 100%;
		min-width: 0;
		padding: 0.7rem 0.75rem;
		border: 1px solid oklch(0.45 0.1 70 / 0.45);
		border-radius: 0.35rem;
		background: oklch(0.12 0.02 60);
		color: var(--screen-amber);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.8rem;
		letter-spacing: 0.02em;
	}

	input::placeholder {
		color: var(--screen-amber-dim);
	}

	.error,
	.notice {
		margin: 0;
		font-size: 0.78rem;
	}

	.error {
		color: oklch(0.78 0.18 28);
	}

	.notice {
		color: var(--screen-amber);
	}
</style>
