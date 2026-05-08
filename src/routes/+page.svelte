<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DeviceButton from '$lib/components/DeviceButton.svelte';
	import DeviceFrame from '$lib/components/DeviceFrame.svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import { authClient } from '$lib/auth-client';

	type PlanId = 'talk_1h' | 'talk_5h';

	let openaiApiKey = $state('');
	let billingEmail = $state('');
	let authName = $state('');
	let authPassword = $state('');
	let authMode = $state<'link' | 'sign-in' | 'password'>('link');
	let pendingPlan = $state<PlanId | null>(null);
	let error = $state('');
	let notice = $state('');

	function useOwnKey() {
		error = '';
		const trimmedKey = openaiApiKey.trim();

		if (!trimmedKey.startsWith('sk-')) {
			error = 'Enter a valid OpenAI API key';
			return;
		}

		localStorage.setItem('langlink:openai-api-key', trimmedKey);
		goto(resolve('/setup'));
	}

	function tryNow() {
		goto(resolve('/setup?access=trial'));
	}

	function useInstalledKey() {
		goto(resolve('/setup?access=test'));
	}

	async function sendEmailLink(planId: PlanId) {
		const email = billingEmail.trim();

		if (!email) {
			throw new Error('Enter your email');
		}

		const client = authClient as typeof authClient & {
			signIn: {
				magicLink(input: {
					email: string;
					name?: string;
					callbackURL?: string;
					newUserCallbackURL?: string;
					errorCallbackURL?: string;
				}): Promise<{ error?: { message?: string } }>;
				email(input: {
					email: string;
					password: string;
				}): Promise<{ error?: { message?: string } }>;
				passkey(input?: { autoFill?: boolean }): Promise<{ error?: { message?: string } }>;
			};
			passkey: {
				addPasskey(input?: {
					name?: string;
					authenticatorAttachment?: 'platform' | 'cross-platform';
				}): Promise<{ error?: { message?: string } }>;
			};
		};

		if (authMode === 'sign-in') {
			const result = await client.signIn.passkey();
			if (result.error) {
				throw new Error(result.error.message ?? 'Could not sign in with passkey');
			}
			return;
		}

		if (authMode === 'password') {
			if (authPassword.trim().length < 8) {
				throw new Error('Enter your fallback password');
			}
			const result = await client.signIn.email({ email, password: authPassword.trim() });
			if (result.error) {
				throw new Error(result.error.message ?? 'Could not sign in with password');
			}
			return;
		}

		const callbackURL = `/?auth=verified&plan=${planId}`;
		const result = await client.signIn.magicLink({
			email,
			name: authName.trim() || email,
			callbackURL,
			newUserCallbackURL: callbackURL,
			errorCallbackURL: '/?auth=error'
		});

		if (result.error) {
			throw new Error(result.error.message ?? 'Could not send sign-in link');
		}

		notice = 'Check your email on this phone, then open the LangLink link.';
		throw new Error('Check your email for the sign-in link');
	}

	async function savePasskey() {
		error = '';
		notice = '';
		const client = authClient as typeof authClient & {
			passkey: {
				addPasskey(input?: {
					name?: string;
					authenticatorAttachment?: 'platform' | 'cross-platform';
				}): Promise<{ error?: { message?: string } }>;
			};
		};
		const passkeyResult = await client.passkey.addPasskey({
			name: 'LangLink passkey',
			authenticatorAttachment: 'platform'
		});
		if (passkeyResult.error) {
			error = passkeyResult.error.message ?? 'Could not create passkey';
			return;
		}
		const plan = page.url.searchParams.get('plan');
		if (plan === 'talk_1h' || plan === 'talk_5h') {
			await startCheckout(plan);
			return;
		}
		notice = 'Passkey saved.';
	}

	async function startCheckout(planId: PlanId) {
		pendingPlan = planId;
		const response = await fetch('/api/billing/checkout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ planId, email: billingEmail.trim() || undefined })
		});

		pendingPlan = null;

		if (!response.ok) {
			error = await response.text();
			return;
		}

		const { url } = await response.json();
		location.href = url;
	}

	async function subscribe(planId: PlanId) {
		error = '';
		notice = '';
		pendingPlan = planId;

		try {
			await sendEmailLink(planId);
			await startCheckout(planId);
		} catch (cause) {
			pendingPlan = null;
			if (!notice) {
				error = cause instanceof Error ? cause.message : 'Could not authenticate';
			}
		}
	}
</script>

<svelte:head>
	<title>LangLink Access</title>
	<meta
		name="description"
		content="Choose an OpenAI key or a LangLink talk-time subscription before creating a translation room."
	/>
</svelte:head>

<DeviceFrame topLed="ready" topLabel="LANGLINK · ACCESS">
	{#snippet display()}
		<div class="earpiece" aria-hidden="true">
			<span class="earpiece-bar"></span>
		</div>

		<DeviceScreen tone="amber">
			<div class="screen-stack">
				<header class="screen-head crt-fringe">
					<span>ACCESS</span>
					<span class="status">▮ READY</span>
				</header>

				<section class="intro crt-fringe">
					<p class="kicker">START TALKING</p>
					<h1>Try two mins.<br />Pay with wallet<br />or use a key.</h1>
				</section>

				<section class="panel">
					<label class="field">
						<span class="field-label crt-fringe">OPENAI API KEY</span>
						<input
							bind:value={openaiApiKey}
							type="password"
							placeholder="sk-..."
							autocomplete="off"
							spellcheck="false"
						/>
					</label>
					<DeviceButton tone="orange" size="sm" onclick={useOwnKey}>
						<span>USE MY KEY</span>
					</DeviceButton>
					<DeviceButton size="sm" onclick={useInstalledKey}>
						<span>TEST INSTALLED KEY</span>
					</DeviceButton>
				</section>

				<section class="panel account">
					<div class="mode-row">
						<button
							type="button"
							class:active={authMode === 'link'}
							onclick={() => (authMode = 'link')}>EMAIL LINK</button
						>
						<button
							type="button"
							class:active={authMode === 'sign-in'}
							onclick={() => (authMode = 'sign-in')}>PASSKEY</button
						>
						<button
							type="button"
							class:active={authMode === 'password'}
							onclick={() => (authMode = 'password')}>PASSWORD</button
						>
					</div>
					{#if authMode === 'link'}
						<label class="field">
							<span class="field-label crt-fringe">NAME</span>
							<input
								bind:value={authName}
								type="text"
								placeholder="Your name"
								autocomplete="name"
							/>
						</label>
					{/if}
					<label class="field">
						<span class="field-label crt-fringe">EMAIL</span>
						<input
							bind:value={billingEmail}
							type="email"
							placeholder="you@example.com"
							autocomplete="email"
						/>
					</label>
					<label class="field">
						<span class="field-label crt-fringe">PASSWORD</span>
						<input
							bind:value={authPassword}
							type="password"
							placeholder="Fallback only"
							autocomplete="current-password"
							disabled={authMode !== 'password'}
						/>
					</label>
					{#if page.url.searchParams.get('auth') === 'verified'}
						<DeviceButton tone="orange" size="sm" onclick={savePasskey}>
							<span>SAVE PASSKEY</span>
						</DeviceButton>
					{/if}
					<div class="plan-grid">
						<button type="button" class="plan" onclick={() => subscribe('talk_1h')}>
							<span>£2</span>
							<strong>{pendingPlan === 'talk_1h' ? 'WAIT' : '1 HR'}</strong>
						</button>
						<button type="button" class="plan" onclick={() => subscribe('talk_5h')}>
							<span>£10</span>
							<strong>{pendingPlan === 'talk_5h' ? 'WAIT' : '5 HRS'}</strong>
						</button>
					</div>
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
		<div class="primary-row">
			<DeviceButton tone="orange" size="lg" onclick={tryNow}>
				<span>TRY NOW</span>
			</DeviceButton>
			<DeviceButton size="lg" onclick={() => subscribe('talk_1h')}>
				<span>PAY/BYOK</span>
			</DeviceButton>
		</div>
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
		gap: 0.7rem;
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

	.screen-head .status,
	.plan strong {
		color: var(--screen-amber);
	}

	.intro {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
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
		font-size: clamp(1.05rem, 5vw, 1.55rem);
		font-weight: 600;
		line-height: 1.18;
		color: var(--screen-amber);
		letter-spacing: 0;
	}

	.panel {
		display: grid;
		gap: 0.5rem;
		padding: 0.65rem;
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
		padding: 0.65rem 0.75rem;
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

	.mode-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.4rem;
	}

	.mode-row button {
		padding: 0.45rem 0.5rem;
		border: 1px solid oklch(0.45 0.1 70 / 0.35);
		border-radius: 0.3rem;
		background: oklch(0.12 0.02 60);
		color: var(--screen-amber-dim);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.mode-row button.active {
		color: var(--screen-amber);
		border-color: oklch(0.55 0.13 70 / 0.7);
	}

	.plan-grid,
	.primary-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.plan {
		display: grid;
		gap: 0.2rem;
		padding: 0.6rem;
		border: 1px solid oklch(0.45 0.1 70 / 0.45);
		border-radius: 0.35rem;
		background: oklch(0.12 0.02 60);
		color: var(--screen-amber-dim);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		text-align: left;
	}

	.plan span {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.plan strong {
		font-size: 0.95rem;
		letter-spacing: 0.14em;
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
