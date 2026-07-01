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
		<span class="key-texture" aria-hidden="true"></span>
		<span class="key-label">{@render children()}</span>
	</button>
</span>

<style>
	/* Blackish recessed socket the square cap seats into. */
	.key-mount {
		display: flex;
		width: 100%;
		padding: 2px 3px 3px 2px;
		border-radius: 0.7rem;
		background: var(--cap-socket);
		box-shadow: var(--cap-socket-shadow);
	}

	.key-mount[data-size='lg'] {
		border-radius: 0.8rem;
	}
	.key-mount[data-size='sm'] {
		border-radius: 0.6rem;
	}

	/* Square machined cap — same brushed-steel family as the PTT dial,
	   relit for a flat top: turned face + a crisp 4-sided milled edge. */
	.key {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
		border: 0;
		border-radius: 0.55rem;
		padding: 0.72rem 0.9rem;
		color: var(--cap-ink);
		overflow: hidden;
		background: var(--cap-face);
		box-shadow: var(--cap-shadow);
		transition:
			transform 80ms ease,
			box-shadow 80ms ease,
			background 120ms ease,
			filter 120ms ease;
	}

	.key[data-size='sm'] {
		padding: 0.56rem 0.65rem;
	}
	.key[data-size='lg'] {
		padding: 1rem 1.2rem;
	}

	/* Turned micro-grain + catchlights, and a thin inner chamfer highlight. */
	.key-texture {
		position: absolute;
		inset: 0;
		z-index: 0;
		border-radius: inherit;
		pointer-events: none;
		background: var(--cap-texture);
	}

	.key::after {
		content: '';
		position: absolute;
		inset: 1.5px;
		z-index: 0;
		border-radius: calc(0.55rem - 1.5px);
		pointer-events: none;
		box-shadow:
			inset 0 1px 0 oklch(1 0.002 250 / 0.5),
			inset 0 -1px 0 oklch(0.22 0.005 250 / 0.35);
	}

	.key-label {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-family: ui-monospace, 'SF Mono', Menlo, 'Roboto Mono', monospace;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--cap-ink);
		text-shadow: var(--cap-ink-shadow);
	}

	.key[data-size='sm'] .key-label {
		font-size: 0.7rem;
	}
	.key[data-size='lg'] .key-label {
		font-size: 0.82rem;
	}

	/* Orange (primary) — warm brushed-steel cap with an engraved warm glyph. */
	.key[data-tone='orange'] {
		background: var(--cap-warm-face);
		box-shadow: var(--cap-warm-shadow);
	}
	.key[data-tone='orange'] .key-label {
		color: oklch(0.2 0.06 48);
		text-shadow: 0 1px 0 oklch(1 0.06 74 / 0.4);
	}
	.key[data-tone='orange']::after {
		box-shadow:
			inset 0 1px 0 oklch(1 0.07 74 / 0.4),
			inset 0 -1px 0 oklch(0.28 0.12 46 / 0.4);
	}

	/* Red (danger) — warm-red cap in the same milled family. */
	.key[data-tone='red'] {
		color: oklch(0.18 0.05 28);
		background:
			radial-gradient(circle at 50% 44%, oklch(1 0.05 30 / 0.4), transparent 46%),
			conic-gradient(
				from 0deg,
				oklch(0.66 0.2 30) 0deg,
				oklch(0.5 0.21 28) 45deg,
				oklch(0.68 0.2 30) 90deg,
				oklch(0.8 0.16 34) 135deg,
				oklch(0.68 0.2 30) 180deg,
				oklch(0.5 0.21 28) 225deg,
				oklch(0.68 0.2 30) 270deg,
				oklch(0.8 0.16 34) 315deg,
				oklch(0.66 0.2 30) 360deg
			),
			radial-gradient(circle at 50% 50%, oklch(0.6 0.21 28) 0 100%);
		box-shadow:
			inset 0 1.5px 0 oklch(1 0.06 32 / 0.7),
			inset 0 -1.5px 1px oklch(0.28 0.12 28 / 0.6),
			inset 0 0 0 1px oklch(0.5 0.2 28 / 0.6),
			0 0 0 1px oklch(0.3 0.12 28 / 0.55),
			0 2px 2px oklch(0 0 0 / 0.3),
			0 5px 9px -2px oklch(0 0 0 / 0.32);
	}
	.key[data-tone='red'] .key-label {
		color: oklch(0.2 0.06 28);
		text-shadow: 0 1px 0 oklch(1 0.06 32 / 0.4);
	}

	.key:hover:not(:disabled) {
		filter: brightness(1.05);
	}

	.key:is(:active, .pressed):not(:disabled) {
		transform: translateY(2px);
		box-shadow: var(--cap-shadow-pressed);
	}
	.key[data-tone='orange']:is(:active, .pressed):not(:disabled),
	.key[data-tone='red']:is(:active, .pressed):not(:disabled) {
		box-shadow:
			inset 0 2px 5px oklch(0 0 0 / 0.5),
			inset 0 1px 0 oklch(0.5 0.1 45 / 0.3),
			0 1px 2px oklch(0 0 0 / 0.4);
	}

	.key:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		filter: saturate(0.5);
	}
</style>
