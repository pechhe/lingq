<script lang="ts">
	import { playClick } from '$lib/realtime/clickSound';

	let {
		disabled = false,
		active = false,
		idleLabel = 'HOLD TO TALK',
		activeLabel = 'TRANSMITTING',
		tone = 'orange',
		onstart,
		onstop
	}: {
		disabled?: boolean;
		active?: boolean;
		idleLabel?: string;
		activeLabel?: string;
		tone?: 'orange' | 'green' | 'blue';
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
		if (!pressed) return;
		pressed = false;
		(event.currentTarget as HTMLButtonElement).releasePointerCapture(event.pointerId);
		playClick('up');
		onstop();
	}
</script>

<div class="ptt-mount">
	<button
		class="ptt"
		class:active
		{disabled}
		data-tone={tone}
		aria-pressed={active}
		onpointerdown={begin}
		onpointerup={end}
		onpointercancel={end}
	>
		<span class="ptt-grain" aria-hidden="true"></span>
		<span class="ptt-sheen" aria-hidden="true"></span>
		<span class="ptt-inner">
			<span class="ptt-waveform" aria-hidden="true">
				<span class="wave-line wave-line--edge"></span>
				<span class="wave-line wave-line--short"></span>
				<span class="wave-bar wave-bar--1"></span>
				<span class="wave-bar wave-bar--2"></span>
				<span class="wave-bar wave-bar--3"></span>
				<span class="wave-bar wave-bar--4"></span>
				<span class="wave-bar wave-bar--5"></span>
				<span class="wave-bar wave-bar--6"></span>
				<span class="wave-bar wave-bar--7"></span>
				<span class="wave-bar wave-bar--8"></span>
				<span class="wave-bar wave-bar--9"></span>
				<span class="wave-bar wave-bar--10"></span>
				<span class="wave-bar wave-bar--11"></span>
				<span class="wave-bar wave-bar--12"></span>
				<span class="wave-bar wave-bar--13"></span>
				<span class="wave-line wave-line--short"></span>
				<span class="wave-line wave-line--edge"></span>
			</span>
			<span class="label">{active ? activeLabel : idleLabel}</span>
		</span>
	</button>
</div>

<style>
	.ptt-mount {
		display: flex;
		width: 100%;
		padding: 2px 4px 4px 2px;
		border-radius: 1.28rem;
		background: linear-gradient(135deg, oklch(0.04 0.005 250) 0%, oklch(0.07 0.005 250) 100%);
		box-shadow:
			inset 1px 1px 3px oklch(0 0 0 / 0.85),
			inset -1px -1px 1px oklch(0.32 0.005 250 / 0.22),
			inset 0 0 0 1px oklch(0 0 0 / 0.55);
	}

	.ptt {
		position: relative;
		display: block;
		flex: 1;
		width: 100%;
		min-height: clamp(8.5rem, 26vh, 18rem);
		padding: 0;
		border: 0;
		border-radius: 1.15rem;
		color: oklch(0.18 0.05 50);
		background: var(--orange-metal-bg);
		box-shadow: var(--orange-metal-shadow);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		touch-action: none;
		user-select: none;
		overflow: hidden;
		transition:
			transform 80ms ease,
			box-shadow 80ms ease,
			background 120ms ease;
	}

	.ptt[data-tone='green'] {
		color: oklch(0.1 0.06 145);
		background:
			repeating-linear-gradient(
				90deg,
				oklch(1 0 0 / 0.045) 0px,
				oklch(1 0 0 / 0.045) 1px,
				transparent 1px,
				transparent 3px
			),
			linear-gradient(
				145deg,
				oklch(0.83 0.14 145) 0%,
				oklch(0.64 0.18 145) 34%,
				oklch(0.43 0.16 150) 70%,
				oklch(0.28 0.12 155) 100%
			);
		box-shadow:
			inset 1px 1px 0 oklch(0.96 0.08 145 / 0.88),
			inset 0 4px 0 -1px oklch(0.88 0.1 145 / 0.78),
			inset -1px -1px 0 oklch(0.12 0.08 155 / 0.75),
			inset 0 -4px 0 -1px oklch(0.14 0.09 155 / 0.85),
			inset 0 0 0 1px oklch(0.35 0.14 150 / 0.9),
			0 1px 2px oklch(0 0 0 / 0.4),
			0 0 28px oklch(0.62 0.18 145 / 0.18);
	}

	.ptt[data-tone='blue'] {
		color: oklch(0.13 0.05 235);
		background:
			repeating-linear-gradient(
				90deg,
				oklch(1 0 0 / 0.045) 0px,
				oklch(1 0 0 / 0.045) 1px,
				transparent 1px,
				transparent 3px
			),
			linear-gradient(
				145deg,
				oklch(0.78 0.1 235) 0%,
				oklch(0.6 0.13 235) 34%,
				oklch(0.39 0.12 240) 70%,
				oklch(0.26 0.1 245) 100%
			);
		box-shadow:
			inset 1px 1px 0 oklch(0.92 0.06 230 / 0.86),
			inset 0 4px 0 -1px oklch(0.82 0.08 230 / 0.75),
			inset -1px -1px 0 oklch(0.12 0.07 245 / 0.75),
			inset 0 -4px 0 -1px oklch(0.13 0.08 245 / 0.85),
			inset 0 0 0 1px oklch(0.34 0.11 240 / 0.9),
			0 1px 2px oklch(0 0 0 / 0.4),
			0 0 28px oklch(0.58 0.13 235 / 0.18);
	}

	.ptt[data-tone='green'] .ptt-waveform,
	.ptt[data-tone='blue'] .ptt-waveform {
		color: currentColor;
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

	.ptt::before {
		content: '';
		position: absolute;
		inset: clamp(0.22rem, 0.85vw, 0.42rem);
		z-index: 2;
		border-radius: calc(1.15rem - 0.14rem);
		pointer-events: none;
		box-shadow:
			inset 1px 1px 0 oklch(1 0.07 74 / 0.28),
			inset -1px -1px 0 oklch(0.28 0.12 46 / 0.3);
	}

	.ptt-sheen {
		position: absolute;
		inset: 0;
		z-index: 2;
		border-radius: inherit;
		pointer-events: none;
		background: var(--orange-metal-sheen);
	}

	.ptt-inner {
		position: relative;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(0.85rem, 3vw, 1.15rem);
		width: 100%;
		min-height: inherit;
		padding: 1.5rem 1rem;
		text-shadow: 0 1px 0 oklch(1 0.04 70 / 0.4);
	}

	.ptt-waveform {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: clamp(0.18rem, 1.1vw, 0.36rem);
		width: min(88%, 22rem);
		height: clamp(3.1rem, 11vw, 5.2rem);
		color: oklch(0.19 0.08 48);
		filter: drop-shadow(0 1px 0 oklch(1 0.06 74 / 0.36));
	}

	.wave-bar,
	.wave-line {
		display: block;
		flex: 0 0 auto;
		border-radius: 999px;
		background: currentColor;
		box-shadow:
			inset 0 1px 0 oklch(0 0 0 / 0.5),
			0 1px 0 oklch(1 0.07 74 / 0.34),
			0 -1px 0 oklch(0.27 0.11 46 / 0.52);
	}

	.wave-line {
		width: clamp(1rem, 4vw, 1.85rem);
		height: clamp(0.18rem, 0.8vw, 0.28rem);
		opacity: 0.82;
	}

	.wave-line--short {
		width: clamp(0.28rem, 1.5vw, 0.54rem);
	}

	.wave-bar {
		width: clamp(0.28rem, 1.2vw, 0.48rem);
	}

	.wave-bar--1,
	.wave-bar--13 {
		height: 24%;
	}

	.wave-bar--2,
	.wave-bar--12 {
		height: 42%;
	}

	.wave-bar--3,
	.wave-bar--11 {
		height: 58%;
	}

	.wave-bar--4,
	.wave-bar--10 {
		height: 82%;
	}

	.wave-bar--5,
	.wave-bar--9 {
		height: 52%;
	}

	.wave-bar--6,
	.wave-bar--8 {
		height: 68%;
	}

	.wave-bar--7 {
		height: 100%;
		width: clamp(0.34rem, 1.5vw, 0.58rem);
	}

	.label {
		font-size: clamp(0.76rem, 2.75vw, 1rem);
		font-weight: 700;
		letter-spacing: 0.34em;
	}

	.ptt:hover:not(:disabled) .ptt-sheen {
		filter: brightness(1.1);
	}

	.ptt.active {
		transform: translate(0.5px, 3px);
		background:
			repeating-linear-gradient(
				90deg,
				oklch(1 0 0 / 0.05) 0px,
				oklch(1 0 0 / 0.05) 1px,
				transparent 1px,
				transparent 3px
			),
			linear-gradient(
				145deg,
				oklch(0.7 0.18 55) 0%,
				oklch(0.6 0.2 52) 50%,
				oklch(0.45 0.21 48) 100%
			);
		box-shadow:
			inset 1px 1px 4px oklch(0 0 0 / 0.55),
			inset 0 4px 8px oklch(0 0 0 / 0.5),
			inset -1px -1px 0 oklch(0.5 0.16 55 / 0.3),
			inset 0 0 0 1px oklch(0.42 0.16 50 / 0.85),
			0 0 0 oklch(0 0 0 / 0),
			0 0 36px oklch(0.78 0.21 55 / 0.5);
	}

	.ptt[data-tone='green'].active {
		background:
			repeating-linear-gradient(
				90deg,
				oklch(1 0 0 / 0.05) 0px,
				oklch(1 0 0 / 0.05) 1px,
				transparent 1px,
				transparent 3px
			),
			linear-gradient(145deg, oklch(0.62 0.18 145), oklch(0.28 0.13 155));
		box-shadow:
			inset 1px 1px 4px oklch(0 0 0 / 0.55),
			inset 0 4px 8px oklch(0 0 0 / 0.5),
			inset 0 0 0 1px oklch(0.32 0.14 150 / 0.9),
			0 0 36px oklch(0.66 0.18 145 / 0.4);
	}

	.ptt[data-tone='blue'].active {
		background:
			repeating-linear-gradient(
				90deg,
				oklch(1 0 0 / 0.05) 0px,
				oklch(1 0 0 / 0.05) 1px,
				transparent 1px,
				transparent 3px
			),
			linear-gradient(145deg, oklch(0.58 0.13 235), oklch(0.26 0.1 245));
		box-shadow:
			inset 1px 1px 4px oklch(0 0 0 / 0.55),
			inset 0 4px 8px oklch(0 0 0 / 0.5),
			inset 0 0 0 1px oklch(0.32 0.11 240 / 0.9),
			0 0 36px oklch(0.62 0.14 235 / 0.38);
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
