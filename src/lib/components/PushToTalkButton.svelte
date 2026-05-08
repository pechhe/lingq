<script lang="ts">
	import { playClick } from '$lib/realtime/clickSound';
	import { Mic } from 'lucide-svelte';

	let {
		disabled = false,
		active = false,
		onstart,
		onstop
	}: {
		disabled?: boolean;
		active?: boolean;
		onstart: () => void;
		onstop: () => void;
	} = $props();

	let pressed = false;

	function begin(event: PointerEvent) {
		if (disabled) return;
		(event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
		pressed = true;
		playClick('down');
		onstart();
	}

	function end(event: PointerEvent) {
		if (disabled || !pressed) return;
		pressed = false;
		(event.currentTarget as HTMLButtonElement).releasePointerCapture(event.pointerId);
		playClick('up');
		onstop();
	}
</script>

<button
	class="ptt"
	class:active
	{disabled}
	aria-pressed={active}
	onpointerdown={begin}
	onpointerup={end}
	onpointercancel={end}
>
	<span class="ptt-glow" aria-hidden="true"></span>
	<span class="ptt-inner">
		<Mic size={26} strokeWidth={2.4} />
		<span class="label">{active ? 'TRANSMITTING' : 'HOLD TO TALK'}</span>
	</span>
</button>

<style>
	.ptt {
		position: relative;
		display: block;
		width: 100%;
		min-height: clamp(11rem, 38vh, 22rem);
		padding: 0;
		border: 0;
		border-radius: 1.1rem;
		background: linear-gradient(180deg, oklch(0.82 0.18 60) 0%, oklch(0.6 0.2 50) 100%);
		color: oklch(0.16 0.04 50);
		box-shadow:
			inset 0 2px 0 oklch(0.92 0.12 70 / 0.85),
			inset 0 -2px 0 oklch(0.32 0.1 50 / 0.7),
			0 6px 0 -1px oklch(0.32 0.08 50 / 0.6),
			0 14px 24px -8px oklch(0 0 0 / 0.7),
			0 0 0 1px oklch(0.32 0.08 50 / 0.5),
			0 0 28px oklch(0.7 0.18 55 / 0.25);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		touch-action: none;
		user-select: none;
		transition:
			transform 70ms ease,
			box-shadow 70ms ease,
			background 120ms ease;
	}

	.ptt-inner {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		width: 100%;
		min-height: inherit;
		padding: 1.5rem 1rem;
	}

	.label {
		font-size: clamp(1.1rem, 5vw, 1.6rem);
		font-weight: 700;
		letter-spacing: 0.18em;
	}

	.ptt-glow {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
		background: radial-gradient(ellipse at 50% 30%, oklch(1 0.05 70 / 0.55) 0%, transparent 55%);
		opacity: 0.35;
		pointer-events: none;
		transition: opacity 120ms ease;
	}

	.ptt:hover:not(:disabled) .ptt-glow {
		opacity: 0.55;
	}

	.ptt.active {
		transform: translateY(4px);
		background: linear-gradient(180deg, oklch(0.74 0.2 55) 0%, oklch(0.55 0.21 50) 100%);
		box-shadow:
			inset 0 3px 6px oklch(0 0 0 / 0.45),
			inset 0 -1px 0 oklch(0.4 0.1 50 / 0.5),
			0 2px 0 -1px oklch(0.32 0.08 50 / 0.6),
			0 6px 12px -4px oklch(0 0 0 / 0.5),
			0 0 0 1px oklch(0.32 0.08 50 / 0.5),
			0 0 36px oklch(0.78 0.21 55 / 0.55);
	}

	.ptt.active .ptt-glow {
		opacity: 0.9;
		background: radial-gradient(ellipse at 50% 50%, oklch(1 0.06 70 / 0.7) 0%, transparent 60%);
	}

	.ptt:disabled {
		cursor: not-allowed;
		opacity: 0.45;
		filter: saturate(0.5);
	}
</style>
