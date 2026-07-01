<script lang="ts">
	import { playClick } from '$lib/realtime/clickSound';

	let {
		disabled = false,
		active = false,
		idleLabel = 'HOLD TO TALK',
		activeLabel = 'TRANSMITTING',
		onstart,
		onstop
	}: {
		disabled?: boolean;
		active?: boolean;
		idleLabel?: string;
		activeLabel?: string;
		onstart: () => void;
		onstop: () => void;
	} = $props();

	let pressed = false;

	// Ready = armed (enabled, not yet held): the engraved waveform lights orange.
	let ready = $derived(!disabled && !active);

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
		class:ready
		{disabled}
		aria-pressed={active}
		onpointerdown={begin}
		onpointerup={end}
		onpointercancel={end}
	>
		<span class="ptt-texture" aria-hidden="true"></span>
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
				<span class="wave-bar wave-bar--6"></span>
				<span class="wave-bar wave-bar--5"></span>
				<span class="wave-bar wave-bar--4"></span>
				<span class="wave-bar wave-bar--3"></span>
				<span class="wave-bar wave-bar--2"></span>
				<span class="wave-bar wave-bar--1"></span>
				<span class="wave-line wave-line--short"></span>
				<span class="wave-line wave-line--edge"></span>
			</span>
			<span class="label">{active ? activeLabel : idleLabel}</span>
		</span>
	</button>
</div>

<style>
	/* Blackish round socket the machined cap sits into. */
	.ptt-mount {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: clamp(0.5rem, 2vw, 0.85rem) 0 clamp(0.35rem, 1.5vw, 0.7rem);
	}

	.ptt {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: clamp(9rem, 30vh, 16.5rem);
		height: clamp(9rem, 30vh, 16.5rem);
		padding: 0;
		border: 0;
		border-radius: 999px;
		color: var(--cap-ink);
		background: var(--cap-face);
		box-shadow:
			var(--cap-shadow),
			/* recessed socket seat around the cap */
			0 0 0 6px oklch(0.06 0.004 250 / 0.55),
			0 0 0 7px oklch(0.5 0.004 250 / 0.12);
		touch-action: none;
		user-select: none;
		overflow: hidden;
		transition:
			transform 90ms ease,
			box-shadow 120ms ease,
			background 160ms ease,
			color 160ms ease;
	}

	/* Turned-metal micro grain + catchlights. */
	.ptt-texture {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
		pointer-events: none;
		background: var(--cap-texture);
	}

	.ptt-inner {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(0.7rem, 2.4vw, 1.05rem);
		width: 100%;
		padding: 1rem;
	}

	/* Engraved waveform: bright lower edge + dark upper edge = stamped metal. */
	.ptt-waveform {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: clamp(0.14rem, 0.9vw, 0.3rem);
		width: min(72%, 15rem);
		height: clamp(2.6rem, 9vw, 4.4rem);
		color: var(--cap-ink);
		filter:
			drop-shadow(0 1px 0 oklch(1 0.002 250 / 0.5))
			drop-shadow(0 -0.5px 0.5px oklch(0.22 0.005 250 / 0.55));
		transition:
			color 160ms ease,
			filter 160ms ease;
	}

	.wave-bar,
	.wave-line {
		display: block;
		flex: 0 0 auto;
		border-radius: 999px;
		background: currentColor;
	}

	.wave-line {
		width: clamp(0.7rem, 2.6vw, 1.3rem);
		height: clamp(0.16rem, 0.7vw, 0.24rem);
		opacity: 0.8;
	}

	.wave-line--short {
		width: clamp(0.24rem, 1.2vw, 0.44rem);
	}

	.wave-bar {
		width: clamp(0.24rem, 1vw, 0.42rem);
	}

	.wave-bar--1 {
		height: 24%;
	}
	.wave-bar--2 {
		height: 42%;
	}
	.wave-bar--3 {
		height: 58%;
	}
	.wave-bar--4 {
		height: 82%;
	}
	.wave-bar--5 {
		height: 52%;
	}
	.wave-bar--6 {
		height: 68%;
	}
	.wave-bar--7 {
		height: 100%;
		width: clamp(0.3rem, 1.2vw, 0.5rem);
	}

	/* Engraved label. */
	.label {
		font-family: ui-monospace, 'SF Mono', Menlo, 'Roboto Mono', monospace;
		font-size: clamp(0.66rem, 2.2vw, 0.82rem);
		font-weight: 700;
		letter-spacing: 0.28em;
		color: var(--cap-ink);
		text-shadow: var(--cap-ink-shadow);
	}

	/* Ready (armed): the waveform lights orange while the cap stays steel. */
	.ptt.ready .ptt-waveform {
		color: var(--accent-orange);
		filter:
			drop-shadow(0 1px 0 oklch(1 0.002 250 / 0.4))
			drop-shadow(0 0 6px oklch(0.78 0.2 55 / 0.55));
	}

	.ptt:hover:not(:disabled) {
		filter: brightness(1.03);
	}

	/* Transmitting: cap presses in + warms to orange metal with a glow. */
	.ptt.active {
		transform: translateY(2px);
		color: oklch(0.18 0.05 50);
		background: var(--cap-warm-face);
		box-shadow:
			var(--cap-warm-shadow),
			0 0 0 6px oklch(0.06 0.004 250 / 0.55),
			0 0 0 7px oklch(0.5 0.16 55 / 0.18),
			0 0 40px oklch(0.78 0.21 55 / 0.4);
	}

	.ptt.active .ptt-waveform {
		color: oklch(0.2 0.08 48);
		filter:
			drop-shadow(0 1px 0 oklch(1 0.06 74 / 0.45))
			drop-shadow(0 -1px 0 oklch(0.27 0.11 46 / 0.5));
	}

	.ptt.active .label {
		color: oklch(0.22 0.07 48);
		text-shadow: 0 1px 0 oklch(1 0.06 74 / 0.4);
	}

	.ptt:disabled {
		cursor: not-allowed;
		opacity: 0.55;
		filter: saturate(0.6);
	}
</style>
