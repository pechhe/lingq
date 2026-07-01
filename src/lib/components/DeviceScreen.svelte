<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		tone = 'amber',
		children
	}: {
		tone?: 'amber' | 'green';
		children: Snippet;
	} = $props();
</script>

<div class="screen" data-tone={tone}>
	<svg class="filter-defs" aria-hidden="true">
		<filter id="crt-rgb-split" color-interpolation-filters="sRGB">
			<feColorMatrix
				in="SourceGraphic"
				type="matrix"
				values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
				result="r"
			></feColorMatrix>
			<feColorMatrix
				in="SourceGraphic"
				type="matrix"
				values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
				result="g"
			></feColorMatrix>
			<feColorMatrix
				in="SourceGraphic"
				type="matrix"
				values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
				result="b"
			></feColorMatrix>
			<feOffset in="r" dx="-0.75" result="r-off"></feOffset>
			<feOffset in="b" dx="0.85" result="b-off"></feOffset>
			<feBlend in="r-off" in2="g" mode="screen" result="rg"></feBlend>
			<feBlend in="rg" in2="b-off" mode="screen"></feBlend>
		</filter>
	</svg>

	<div class="screen-inner">
		<div class="readout">
			<div class="content">{@render children()}</div>
		</div>
		<div class="scan-v" aria-hidden="true"></div>
		<div class="scan-h" aria-hidden="true"></div>
		<div class="scan-beam" aria-hidden="true"></div>
		<div class="vignette" aria-hidden="true"></div>
		<div class="glare" aria-hidden="true"></div>
	</div>

</div>

<style>
	/* Recessed display well: the machined chassis dips down into the glass.
	   Bright metal rim on the outside, dark sunken bezel inside. */
	.screen {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		min-height: 0;
		flex: 1;
		padding: 5px 6px 6px;
		border-radius: clamp(0.7rem, 1.5vw, 1rem);
		background: var(--screen-frame);
		box-shadow: var(--screen-frame-shadow);
	}

	.filter-defs {
		position: absolute;
		width: 0;
		height: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.screen-inner {
		--crt-hue-green: 140 240 165;
		--crt-hue-amber: 245 195 110;
		--crt-px: 2px;
		--crt-grid-v: 0.055;
		--crt-grid-h: 0.26;
		--crt-scan-ms: 17ms;
		--crt-scan-strength: 1.025;
		--crt-beam-strength: 0.12;
		--crt-grid-bg: rgba(8, 6, 4, 0.55);

		--crt-hue: var(--crt-hue-amber);
		--crt-bright: rgb(var(--crt-hue));
		--crt-mid: rgb(var(--crt-hue) / 0.85);
		--crt-dim: rgb(var(--crt-hue) / 0.62);
		--crt-glow: rgb(var(--crt-hue) / 0.32);
		--crt-glow-soft: rgb(var(--crt-hue) / 0.12);

		position: relative;
		width: 100%;
		height: 100%;
		min-height: inherit;
		border-radius: clamp(0.5rem, 1.2vw, 0.75rem);
		background: var(--screen-bg-deep);
		overflow: hidden;
		isolation: isolate;
		animation: crt-flicker 7s step-end infinite;
	}

	.screen[data-tone='green'] .screen-inner {
		--crt-hue: var(--crt-hue-green);
	}

	.readout {
		position: relative;
		z-index: 1;
		width: 100%;
		height: 100%;
		min-height: inherit;
	}

	.content {
		width: 100%;
		height: 100%;
		min-height: inherit;
		padding: clamp(0.85rem, 2vw, 1.15rem);
		font-family: ui-monospace, 'SF Mono', Menlo, 'Roboto Mono', monospace;
		letter-spacing: 0.02em;
		text-shadow:
			0 0 3px var(--crt-glow-soft),
			0 0 10px var(--crt-glow);
	}

	.screen[data-tone='amber'] .content {
		color: var(--crt-bright);
	}

	.screen[data-tone='green'] .content {
		color: var(--crt-bright);
	}

	/* Vertical phosphor grid — narrow dark stripes every 2px */
	.scan-v {
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		opacity: var(--crt-grid-v);
		background-image: repeating-linear-gradient(
			to right,
			transparent 0,
			transparent calc(var(--crt-px) - 1px),
			var(--crt-grid-bg) calc(var(--crt-px) - 1px),
			var(--crt-grid-bg) var(--crt-px)
		);
		background-size: var(--crt-px) 100%;
	}

	/* Horizontal scanlines — visible dark stripes every 2px */
	.scan-h {
		position: absolute;
		inset: 0;
		z-index: 3;
		pointer-events: none;
		opacity: var(--crt-grid-h);
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0,
			transparent calc(var(--crt-px) - 1px),
			var(--crt-grid-bg) calc(var(--crt-px) - 1px),
			var(--crt-grid-bg) var(--crt-px)
		);
		background-size: 100% var(--crt-px);
	}

	/* Sweeping CRT raster beam — frame-locked at 60Hz */
	.scan-beam {
		position: absolute;
		inset: 0;
		z-index: 4;
		pointer-events: none;
		backdrop-filter: brightness(var(--crt-scan-strength));
		-webkit-backdrop-filter: brightness(var(--crt-scan-strength));
		mask-image:
			linear-gradient(
				to bottom,
				transparent 45%,
				rgba(0, 0, 0, var(--crt-beam-strength)) 49%,
				rgba(0, 0, 0, var(--crt-beam-strength)) 51%,
				transparent 55%
			),
			linear-gradient(
				to bottom,
				transparent,
				rgba(0, 0, 0, 0.18) 35%,
				rgba(0, 0, 0, 0.18) 65%,
				transparent
			);
		mask-size:
			100% 6%,
			100% 40%;
		mask-repeat: no-repeat;
		mask-composite: add;
		-webkit-mask-image:
			linear-gradient(
				to bottom,
				transparent 45%,
				rgba(0, 0, 0, var(--crt-beam-strength)) 49%,
				rgba(0, 0, 0, var(--crt-beam-strength)) 51%,
				transparent 55%
			),
			linear-gradient(
				to bottom,
				transparent,
				rgba(0, 0, 0, 0.18) 35%,
				rgba(0, 0, 0, 0.18) 65%,
				transparent
			);
		-webkit-mask-size:
			100% 6%,
			100% 40%;
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-composite: source-over;
		animation: crt-scanbeam var(--crt-scan-ms) linear infinite;
	}

	.vignette {
		position: absolute;
		inset: 0;
		z-index: 5;
		background: radial-gradient(ellipse at 50% 40%, transparent 50%, oklch(0 0 0 / 0.48) 100%);
		pointer-events: none;
	}

	.glare {
		position: absolute;
		inset: 0;
		z-index: 6;
		background: linear-gradient(170deg, oklch(1 0 0 / 0.04) 0%, transparent 35%);
		pointer-events: none;
	}

	/* Per-token phosphor glow + chromatic aberration on tagged text */
	:global(.crt-text) {
		text-shadow:
			0 0 3px var(--crt-glow-soft),
			0 0 10px var(--crt-glow),
			0 0 18px var(--crt-glow-soft);
	}

	:global(.crt-text-strong) {
		text-shadow:
			0 0 3px var(--crt-glow-soft),
			0 0 10px var(--crt-glow),
			0 0 18px var(--crt-glow);
		filter: url(#crt-rgb-split);
	}

	:global(.crt-fringe) {
		filter: url(#crt-rgb-split);
	}

	@keyframes crt-flicker {
		0% {
			opacity: 1;
		}
		42% {
			opacity: 1;
		}
		43% {
			opacity: 0.95;
		}
		44% {
			opacity: 1;
		}
		78% {
			opacity: 1;
		}
		79% {
			opacity: 0.9;
		}
		80% {
			opacity: 0.97;
		}
		81% {
			opacity: 1;
		}
		96% {
			opacity: 1;
		}
		96.8% {
			opacity: 0.94;
		}
		97.5% {
			opacity: 1;
		}
		100% {
			opacity: 1;
		}
	}

	@keyframes crt-scanbeam {
		0% {
			mask-position:
				0 -6%,
				0 -40%;
			-webkit-mask-position:
				0 -6%,
				0 -40%;
		}
		100% {
			mask-position:
				0 106%,
				0 140%;
			-webkit-mask-position:
				0 106%,
				0 140%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.screen-inner {
			animation: none;
		}
		.scan-beam {
			animation: none;
			mask-position:
				0 50%,
				0 50%;
			-webkit-mask-position:
				0 50%,
				0 50%;
		}
	}

	@media (max-width: 640px), (pointer: coarse) {
		.screen-inner {
			--crt-grid-v: 0.035;
			--crt-grid-h: 0.14;
			--crt-scan-strength: 1.01;
			--crt-beam-strength: 0.06;
			animation: none;
		}

		.content,
		:global(.crt-text),
		:global(.crt-text-strong) {
			text-shadow: 0 0 5px var(--crt-glow-soft);
		}

		:global(.crt-text-strong),
		:global(.crt-fringe) {
			filter: none;
		}

		.scan-beam {
			animation: none;
			opacity: 0.35;
		}

		.vignette {
			background: radial-gradient(ellipse at 50% 40%, transparent 58%, oklch(0 0 0 / 0.32) 100%);
		}
	}
</style>
