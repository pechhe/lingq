<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import DeviceButton from '$lib/components/DeviceButton.svelte';
	import DeviceFrame from '$lib/components/DeviceFrame.svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let pending = $state(false);
	let error = $state('');
	let notice = $state('');
	let registering = $state(false);
	let emailInput = $state<HTMLInputElement>();

	async function tryNow() {
		if (registering) {
			await register();
			return;
		}

		registering = true;
		error = '';
		notice = '';
		await tick();
		emailInput?.focus();
	}

	async function register() {
		const trimmedEmail = email.trim();
		error = '';
		notice = '';

		if (!trimmedEmail) {
			error = 'Enter your email';
			return;
		}

		pending = true;

		const client = authClient as typeof authClient & {
			signIn: {
				magicLink(input: {
					email: string;
					name?: string;
					callbackURL?: string;
					newUserCallbackURL?: string;
					errorCallbackURL?: string;
				}): Promise<{ error?: { message?: string } }>;
			};
		};

		const result = await client.signIn.magicLink({
			email: trimmedEmail,
			name: trimmedEmail,
			callbackURL: '/account?auth=verified',
			newUserCallbackURL: '/account?auth=verified',
			errorCallbackURL: '/?auth=error'
		});

		pending = false;

		if (result.error) {
			console.warn('Magic-link email failed; continuing trial flow for now.', result.error);
		}

		goto(resolve('/setup?access=trial'));
	}
</script>

<svelte:head>
	<title>Lingk</title>
	<meta name="description" content="Try live two-phone spoken translation in a few taps." />
</svelte:head>

<DeviceFrame topLed="ready" topLabel="LINGK · ACCESS">
	{#snippet display()}
		<div class="earpiece" aria-hidden="true">
			<span class="earpiece-bar"></span>
		</div>

		<DeviceScreen tone="amber">
			<div class="screen-stack">
				{#if !registering}
					<section class="product-brief">
						<picture>
							<img
								class="product-infographic"
								src="/images/home-product-infographic.png"
								width="916"
								height="1717"
								decoding="async"
								fetchpriority="high"
								alt="Lingk. Live translation in real time. Face to face. Group discussions. Speeches and events. Weddings. Talk naturally, hear your language."
							/>
						</picture>
						<p class="sr-only">
							Lingk provides live translation in real time for face-to-face conversations, group
							discussions, speeches, events and weddings. Talk naturally and hear your language.
						</p>
					</section>
				{:else}
					<section class="panel" aria-label="Register for Lingk access">
						<label class="field">
							<span class="field-label crt-fringe">EMAIL</span>
							<input
								bind:this={emailInput}
								bind:value={email}
								type="email"
								placeholder="you@example.com"
								autocomplete="email"
								disabled={pending}
								onkeydown={(event) => {
									if (event.key === 'Enter') register();
								}}
							/>
						</label>
					</section>
				{/if}

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
		justify-content: center;
		gap: 0.85rem;
		height: 100%;
		min-height: inherit;
		overflow: hidden;
	}

	:global(.screen[data-tone='amber'] .content) {
		padding: 0;
	}

	.product-brief {
		position: relative;
		flex: 1 1 auto;
		width: 100%;
		height: 100%;
		min-height: 0;
		margin: 0;
		border-radius: 0;
		background: oklch(0.045 0.015 145);
		overflow: hidden;
	}

	.product-brief picture {
		display: block;
		width: 100%;
		height: 100%;
	}

	.product-brief::before,
	.product-brief::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		background-image: url('/images/home-product-infographic.png');
		background-position: center;
		background-size: contain;
		background-repeat: no-repeat;
		mix-blend-mode: screen;
	}

	.product-brief::before {
		opacity: 0.22;
		filter: hue-rotate(135deg) saturate(2.1) contrast(1.15);
		transform: translateX(-1.8px);
	}

	.product-brief::after {
		opacity: 0.18;
		filter: hue-rotate(260deg) saturate(2) contrast(1.12);
		transform: translateX(2px);
	}

	.product-infographic {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.panel {
		display: grid;
		gap: 0.6rem;
		width: min(100% - 1.7rem, 33rem);
		margin: auto;
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
