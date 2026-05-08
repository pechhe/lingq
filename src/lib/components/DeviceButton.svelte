<script lang="ts">
	import { playClick } from '$lib/realtime/clickSound';
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
		playClick('down');
	}

	function handlePointerUp() {
		if (disabled) return;
		playClick('up');
	}
</script>

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

<style>
	.key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-width: 0;
		border: 0;
		border-radius: 0.55rem;
		padding: 0.7rem 0.9rem;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink);
		background: linear-gradient(180deg, oklch(0.3 0.005 250) 0%, oklch(0.22 0.005 250) 100%);
		box-shadow:
			inset 0 1px 0 oklch(0.42 0.006 250 / 0.7),
			inset 0 -1px 0 oklch(0 0 0 / 0.5),
			0 1px 2px oklch(0 0 0 / 0.45);
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
		background: linear-gradient(180deg, oklch(0.82 0.18 60) 0%, oklch(0.62 0.19 50) 100%);
		box-shadow:
			inset 0 1px 0 oklch(0.92 0.12 70 / 0.85),
			inset 0 -1px 0 oklch(0.32 0.1 50 / 0.6),
			0 2px 4px oklch(0 0 0 / 0.45),
			0 0 12px oklch(0.7 0.18 55 / 0.25);
	}

	.key[data-tone='red'] {
		color: oklch(0.18 0.04 28);
		background: linear-gradient(180deg, oklch(0.74 0.18 28) 0%, oklch(0.52 0.2 28) 100%);
		box-shadow:
			inset 0 1px 0 oklch(0.88 0.13 30 / 0.7),
			inset 0 -1px 0 oklch(0.28 0.1 28 / 0.6),
			0 2px 4px oklch(0 0 0 / 0.45);
	}

	.key:hover:not(:disabled) {
		filter: brightness(1.06);
	}

	.key:active:not(:disabled),
	.key.pressed:not(:disabled) {
		transform: translateY(1px);
		box-shadow:
			inset 0 1px 2px oklch(0 0 0 / 0.5),
			inset 0 -1px 0 oklch(0.4 0.005 250 / 0.4),
			0 0 0 oklch(0 0 0 / 0);
	}

	.key.pressed[data-tone='orange'] {
		background: linear-gradient(180deg, oklch(0.7 0.2 55) 0%, oklch(0.55 0.2 50) 100%);
	}

	.key:disabled {
		cursor: not-allowed;
		opacity: 0.45;
		filter: saturate(0.5);
	}
</style>
