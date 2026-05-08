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
	<span class="ptt-grain" aria-hidden="true"></span>
	<span class="ptt-sheen" aria-hidden="true"></span>
	<span class="ptt-inner">
		<span class="ptt-icon" aria-hidden="true">
			<Mic size={64} strokeWidth={2.2} />
		</span>
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
		border-radius: 1.2rem;
		color: oklch(0.18 0.05 50);
		background:
			repeating-linear-gradient(
				90deg,
				oklch(1 0 0 / 0.04) 0px,
				oklch(1 0 0 / 0.04) 1px,
				transparent 1px,
				transparent 3px
			),
			linear-gradient(
				180deg,
				oklch(0.86 0.16 65) 0%,
				oklch(0.78 0.18 60) 22%,
				oklch(0.65 0.21 55) 60%,
				oklch(0.5 0.21 50) 100%
			);
		box-shadow:
			inset 0 4px 0 -1px oklch(0.98 0.06 75 / 0.95),
			inset 0 8px 12px -6px oklch(1 0.05 70 / 0.7),
			inset 0 -5px 0 -1px oklch(0.32 0.12 50 / 0.95),
			inset 0 -10px 14px -6px oklch(0.22 0.1 50 / 0.55),
			inset 0 0 0 1px oklch(0.5 0.18 50 / 0.85),
			0 8px 0 -2px oklch(0.32 0.12 50),
			0 14px 0 -4px oklch(0.22 0.1 50),
			0 22px 36px -10px oklch(0 0 0 / 0.7),
			0 0 36px oklch(0.7 0.18 55 / 0.28);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		touch-action: none;
		user-select: none;
		overflow: hidden;
		transition:
			transform 80ms ease,
			box-shadow 80ms ease,
			background 120ms ease;
	}

	.ptt-grain {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
		pointer-events: none;
		opacity: 0.45;
		mix-blend-mode: overlay;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch' seed='3'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
		background-size: 180px 180px;
	}

	.ptt-sheen {
		position: absolute;
		inset: 0;
		z-index: 2;
		border-radius: inherit;
		pointer-events: none;
		background:
			radial-gradient(ellipse 80% 38% at 50% 14%, oklch(1 0.04 75 / 0.55) 0%, transparent 70%),
			radial-gradient(ellipse 60% 22% at 50% 90%, oklch(1 0.04 70 / 0.18) 0%, transparent 70%);
	}

	.ptt-inner {
		position: relative;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.1rem;
		width: 100%;
		min-height: inherit;
		padding: 1.5rem 1rem;
		text-shadow: 0 1px 0 oklch(1 0.04 70 / 0.4);
	}

	.ptt-icon {
		display: grid;
		place-items: center;
		width: clamp(4.5rem, 16vw, 6rem);
		height: clamp(4.5rem, 16vw, 6rem);
		border-radius: 999px;
		color: oklch(0.18 0.06 50);
		background: radial-gradient(
			circle at 35% 30%,
			oklch(0.96 0.06 70 / 0.55) 0%,
			oklch(0.7 0.16 55 / 0.05) 60%,
			transparent 80%
		);
		filter: drop-shadow(0 1px 0 oklch(1 0.04 70 / 0.5))
			drop-shadow(0 -1px 0 oklch(0.18 0.08 50 / 0.4));
	}

	.label {
		font-size: clamp(1.05rem, 4.5vw, 1.45rem);
		font-weight: 700;
		letter-spacing: 0.22em;
	}

	.ptt:hover:not(:disabled) .ptt-sheen {
		filter: brightness(1.1);
	}

	.ptt.active {
		transform: translateY(8px);
		background:
			repeating-linear-gradient(
				90deg,
				oklch(1 0 0 / 0.05) 0px,
				oklch(1 0 0 / 0.05) 1px,
				transparent 1px,
				transparent 3px
			),
			linear-gradient(
				180deg,
				oklch(0.7 0.18 55) 0%,
				oklch(0.6 0.2 52) 50%,
				oklch(0.45 0.21 48) 100%
			);
		box-shadow:
			inset 0 4px 8px oklch(0 0 0 / 0.6),
			inset 0 -2px 0 oklch(0.5 0.16 55 / 0.4),
			inset 0 0 0 1px oklch(0.42 0.16 50 / 0.85),
			0 2px 0 -1px oklch(0.32 0.12 50),
			0 6px 14px -4px oklch(0 0 0 / 0.55),
			0 0 48px oklch(0.78 0.21 55 / 0.55);
	}

	.ptt.active .ptt-sheen {
		opacity: 0.55;
		background: radial-gradient(
			ellipse 70% 50% at 50% 50%,
			oklch(1 0.06 70 / 0.5) 0%,
			transparent 70%
		);
	}

	.ptt:disabled {
		cursor: not-allowed;
		opacity: 0.45;
		filter: saturate(0.55);
	}
</style>
