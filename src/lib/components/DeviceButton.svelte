<script lang="ts">
	import { playKey } from '$lib/realtime/clickSound';
	import type { Snippet } from 'svelte';

	let {
		tone = 'neutral',
		size = 'md',
		pressed = false,
		disabled = false,
		ariaLabel,
		ariaPressed,
		onclick,
		children
	}: {
		tone?: 'neutral' | 'orange' | 'red';
		size?: 'sm' | 'md' | 'lg';
		pressed?: boolean;
		disabled?: boolean;
		ariaLabel?: string;
		ariaPressed?: boolean;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	} = $props();

	function handlePointerDown() {
		if (disabled) return;
		playKey('press');
	}

	function handlePointerUp() {
		if (disabled) return;
		playKey('release');
	}
</script>

<span class="key-mount" data-size={size}>
	<button
		type="button"
		class="key"
		data-tone={tone}
		data-size={size}
		class:pressed
		{disabled}
		aria-label={ariaLabel}
		aria-pressed={ariaPressed}
		onpointerdown={handlePointerDown}
		onpointerup={handlePointerUp}
		{onclick}
	>
		{@render children()}
	</button>
</span>

<style>
	.key-mount {
		display: flex;
		width: 100%;
		padding: 2px 3px 3px 2px;
		border-radius: 0.65rem;
		background: linear-gradient(135deg, oklch(0.05 0.005 250) 0%, oklch(0.075 0.005 250) 100%);
		box-shadow:
			inset 1px 1px 1.5px oklch(0 0 0 / 0.6),
			inset -1px -1px 1px oklch(0.3 0.005 250 / 0.16),
			inset 0 0 0 1px oklch(0 0 0 / 0.45);
	}

	.key-mount[data-size='lg'],
	.key-mount[data-size='sm'] {
		padding: 2px 3px 3px 2px;
	}

	.key-mount[data-size='lg'] {
		border-radius: 0.75rem;
	}

	.key-mount[data-size='sm'] {
		border-radius: 0.55rem;
	}

	.key {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
		border: 0;
		border-radius: 0.5rem;
		padding: 0.7rem 0.9rem;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink);
		overflow: hidden;
		background: linear-gradient(
			160deg,
			oklch(0.32 0.005 250) 0%,
			oklch(0.26 0.005 250) 55%,
			oklch(0.21 0.005 250) 100%
		);
		box-shadow:
			inset 1px 1px 0 oklch(0.46 0.005 250 / 0.5),
			inset 0 1px 0 oklch(0.5 0.005 250 / 0.55),
			inset -1px -1px 0 oklch(0 0 0 / 0.4),
			inset 0 -1px 0 oklch(0 0 0 / 0.5),
			0 1px 1px oklch(0 0 0 / 0.35);
		transition:
			transform 80ms ease,
			box-shadow 80ms ease,
			background 120ms ease;
	}

	.key[data-size='sm'] {
		padding: 0.55rem 0.65rem;
		font-size: 0.7rem;
	}

	.key[data-size='lg'] {
		padding: 1rem 1.2rem;
		font-size: 0.82rem;
	}

	.key[data-tone='orange'] {
		color: oklch(0.16 0.04 50);
		background: var(--orange-metal-bg);
		box-shadow: var(--orange-metal-shadow);
	}

	.key[data-tone='orange']::before,
	.key[data-tone='orange']::after {
		content: '';
		position: absolute;
		pointer-events: none;
	}

	.key[data-tone='orange']::before {
		inset: 0;
		border-radius: inherit;
		background: var(--orange-metal-sheen);
	}

	.key[data-tone='orange']::after {
		inset: 0.18rem;
		border-radius: calc(0.5rem - 0.08rem);
		box-shadow:
			inset 1px 1px 0 oklch(1 0.07 74 / 0.24),
			inset -1px -1px 0 oklch(0.28 0.12 46 / 0.26);
	}

	.key[data-tone='orange'] :global(*) {
		position: relative;
		z-index: 1;
	}

	.key[data-tone='red'] {
		color: oklch(0.18 0.04 28);
		background: linear-gradient(
			145deg,
			oklch(0.78 0.16 30) 0%,
			oklch(0.62 0.19 28) 50%,
			oklch(0.46 0.2 28) 100%
		);
		box-shadow:
			inset 1px 1px 0 oklch(0.92 0.12 32 / 0.75),
			inset 0 1px 0 oklch(0.88 0.13 30 / 0.6),
			inset -1px -1px 0 oklch(0.26 0.1 28 / 0.55),
			inset 0 -1px 0 oklch(0.26 0.1 28 / 0.5),
			0 1px 2px oklch(0 0 0 / 0.4);
	}

	.key:hover:not(:disabled) {
		filter: brightness(1.06);
	}

	.key:active:not(:disabled),
	.key.pressed:not(:disabled) {
		transform: translateY(1px);
		box-shadow:
			inset 1px 1px 2px oklch(0 0 0 / 0.45),
			inset -1px -1px 0 oklch(0.4 0.005 250 / 0.25),
			0 0 0 oklch(0 0 0 / 0);
	}

	.key.pressed[data-tone='orange'] {
		background:
			repeating-linear-gradient(
				90deg,
				oklch(1 0.03 74 / 0.06) 0px,
				oklch(1 0.03 74 / 0.06) 1px,
				transparent 1px,
				transparent 5px
			),
			linear-gradient(180deg, oklch(0.68 0.22 55) 0%, oklch(0.52 0.2 50) 100%);
	}

	.key:disabled {
		cursor: not-allowed;
		opacity: 0.45;
		filter: saturate(0.5);
	}
</style>
