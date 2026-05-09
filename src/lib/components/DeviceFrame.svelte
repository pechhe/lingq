<script lang="ts">
	import type { Snippet } from 'svelte';

	type LedTone = 'idle' | 'ready' | 'speaking' | 'error';
	type RxState = 'idle' | 'receiving' | 'done';

	let {
		display,
		front,
		surfaceTop,
		footer,
		rxState,
		topLed = 'idle',
		topLabel = 'LINGK'
	}: {
		display: Snippet;
		front: Snippet;
		surfaceTop?: Snippet;
		footer?: Snippet;
		rxState?: RxState;
		topLed?: LedTone;
		topLabel?: string;
	} = $props();
</script>

<div class="stage">
	<div class="device" data-led={topLed}>
		<div class="rail" aria-hidden="true">
			<span class="rail-button rail-button--orange"></span>
			<span class="rail-button"></span>
			<span class="rail-button"></span>
		</div>

		<header class="device-top">
			<span class="led" aria-hidden="true"></span>
			<span class="device-label mono">{topLabel}</span>
			<span class="signal mono" aria-hidden="true">▮▮▮</span>
			<span class="screw" aria-hidden="true"></span>
		</header>

		{#if surfaceTop}
			<div class="surface-top">
				{@render surfaceTop()}
			</div>
		{/if}

		<div class="display-area">
			{@render display()}
		</div>

		{#if rxState}
			<div class="rx-module" data-rx={rxState} aria-hidden="true">
				<span class="rx-title mono">RX</span>
				<span class="rx-row rx-row--in">
					<span class="rx-bulb"></span>
					<span class="mono">IN</span>
				</span>
				<span class="rx-row rx-row--done">
					<span class="rx-bulb"></span>
					<span class="mono">DONE</span>
				</span>
			</div>
		{/if}

		<div class="front">
			{@render front()}
		</div>

		<footer class="device-bottom" aria-hidden="true">
			<span class="brand mono">∅ LINGK</span>
			<span class="vent"></span>
		</footer>
	</div>

	{#if footer}
		<div class="page-footer mono">{@render footer()}</div>
	{/if}
</div>

<style>
	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		min-height: 100svh;
		padding: calc(env(safe-area-inset-top, 0px) + clamp(0.15rem, 1vw, 1.25rem))
			clamp(0.5rem, 2vw, 1.5rem)
			calc(env(safe-area-inset-bottom, 0px) + clamp(0.15rem, 1vw, 1.25rem));
	}

	@media (min-width: 26rem) {
		.stage {
			padding-left: clamp(1.5rem, 3vw, 2.25rem);
			padding-right: clamp(0.5rem, 2vw, 1.5rem);
			gap: 0.85rem;
		}
	}

	.device {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: clamp(0.4rem, 1.4vw, 0.85rem);
		width: 100%;
		max-width: 26rem;
		flex: 1;
		min-height: 0;
		padding: clamp(0.55rem, 2vw, 1.05rem) clamp(0.7rem, 2.6vw, 1.15rem)
			clamp(0.45rem, 1.8vw, 0.85rem);
		border-radius: clamp(1.4rem, 3.5vw, 2.2rem);
		background: linear-gradient(
			180deg,
			var(--device-body-top) 0%,
			var(--device-body) 38%,
			var(--device-body-bottom) 100%
		);
		box-shadow:
			0 1px 0 var(--device-edge-highlight) inset,
			1px 0 0 oklch(0.48 0.006 250 / 0.75) inset,
			-1px 0 0 oklch(0.08 0 0 / 0.75) inset,
			0 -1px 0 oklch(0.06 0 0) inset,
			0 0 0 1px oklch(0.32 0.005 250 / 0.5),
			0 30px 80px -20px oklch(0 0 0 / 0.85),
			0 8px 20px -8px oklch(0 0 0 / 0.6);
		overflow: visible;
	}

	.device::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		background: radial-gradient(
			ellipse at 30% -10%,
			oklch(0.32 0.006 250 / 0.55) 0%,
			transparent 55%
		);
	}

	.device::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		background: repeating-linear-gradient(
			90deg,
			oklch(1 0 0 / 0.012) 0px,
			oklch(1 0 0 / 0.012) 1px,
			transparent 1px,
			transparent 3px
		);
		opacity: 0.6;
	}

	.rail {
		position: absolute;
		left: clamp(-0.34rem, -0.82vw, -0.24rem);
		top: clamp(3.2rem, 8vw, 4.5rem);
		display: flex;
		flex-direction: column;
		gap: clamp(0.9rem, 2.4vw, 1.45rem);
		pointer-events: none;
		z-index: 3;
	}

	.rail-button {
		position: relative;
		display: block;
		width: clamp(0.3rem, 0.78vw, 0.4rem);
		height: clamp(1.8rem, 4.4vw, 2.35rem);
		border-radius: 0.28rem 0.07rem 0.07rem 0.28rem;
		background: linear-gradient(
			180deg,
			oklch(0.34 0.004 250) 0%,
			oklch(0.27 0.004 250) 20%,
			oklch(0.2 0.004 250) 100%
		);
		box-shadow:
			inset 1px 0 0 oklch(0.5 0.005 250 / 0.32),
			inset 0 1px 0 oklch(0.5 0.005 250 / 0.48),
			inset 0 -2px 0 oklch(0.03 0 0 / 0.75),
			-1px 0 0 oklch(0.5 0.005 250 / 0.25),
			0 3px 5px -4px oklch(0 0 0 / 0.9),
			-2px 4px 7px -6px oklch(0 0 0 / 0.82);
	}

	.rail-button::after {
		content: '';
		position: absolute;
		top: 0.2rem;
		right: -1px;
		bottom: 0.18rem;
		width: 1px;
		background: oklch(0.08 0 0 / 0.65);
	}

	.rail-button--orange {
		background: linear-gradient(
			180deg,
			oklch(0.86 0.11 70) 0%,
			oklch(0.7 0.18 58) 18%,
			oklch(0.58 0.2 52) 66%,
			oklch(0.45 0.18 46) 100%
		);
		box-shadow:
			inset 1px 0 0 oklch(0.96 0.08 76 / 0.58),
			inset 0 1px 0 oklch(0.96 0.08 76 / 0.68),
			inset 0 -2px 0 oklch(0.3 0.12 45 / 0.8),
			-1px 0 0 oklch(0.96 0.08 76 / 0.45),
			0 3px 5px -4px oklch(0.26 0.09 45 / 0.86),
			-3px 5px 10px -7px oklch(0.52 0.19 52 / 0.45),
			-7px 0 18px -12px oklch(0.6 0.2 52 / 0.35);
	}

	.device-top {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.15rem 0.35rem 0.15rem 0.05rem;
		min-height: 1.2rem;
	}

	.led {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--led-dim);
		box-shadow: inset 0 0 2px oklch(0 0 0 / 0.6);
		transition:
			background 220ms ease,
			box-shadow 220ms ease;
	}

	.device[data-led='ready'] .led {
		background: var(--led-green);
		box-shadow:
			inset 0 0 2px oklch(0 0 0 / 0.4),
			0 0 6px oklch(0.78 0.2 150 / 0.7);
	}

	.device[data-led='speaking'] .led {
		background: var(--led-orange);
		box-shadow:
			inset 0 0 2px oklch(0 0 0 / 0.4),
			0 0 8px var(--led-orange-glow);
	}

	.device[data-led='error'] .led {
		background: var(--led-red);
		box-shadow:
			inset 0 0 2px oklch(0 0 0 / 0.4),
			0 0 6px oklch(0.66 0.22 28 / 0.7);
	}

	.device-label {
		flex: 1;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--ink-muted);
		text-transform: uppercase;
	}

	.signal {
		font-size: 0.6rem;
		letter-spacing: 0.05em;
		color: var(--ink-muted);
		opacity: 0.5;
	}

	.screw {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: radial-gradient(
			circle at 35% 35%,
			oklch(0.45 0.005 250) 0%,
			oklch(0.18 0.005 250) 80%
		);
		box-shadow: inset 0 0 0 1px oklch(0 0 0 / 0.5);
	}

	.display-area {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: clamp(0.6rem, 2vw, 0.9rem);
		flex: 1;
		min-height: 0;
	}

	.surface-top {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.rx-module {
		position: absolute;
		z-index: 4;
		right: clamp(0.18rem, 0.9vw, 0.42rem);
		top: clamp(19rem, 46svh, 24.5rem);
		display: grid;
		gap: 0.34rem;
		width: clamp(3.1rem, 8vw, 3.7rem);
		padding: 0.62rem 0.42rem 0.58rem;
		border: 1px solid oklch(0.38 0.005 250 / 0.8);
		border-radius: 0.5rem;
		background:
			linear-gradient(180deg, oklch(0.17 0.004 250), oklch(0.095 0.004 250)),
			repeating-linear-gradient(
				90deg,
				oklch(1 0 0 / 0.018) 0,
				oklch(1 0 0 / 0.018) 1px,
				transparent 1px,
				transparent 3px
			);
		box-shadow:
			inset 0 1px 0 oklch(1 0 0 / 0.08),
			inset 0 -1px 0 oklch(0 0 0 / 0.82),
			0 0 0 1px oklch(0 0 0 / 0.7),
			0 8px 16px -10px oklch(0 0 0 / 0.9);
		pointer-events: none;
	}

	.rx-title {
		justify-self: center;
		margin-bottom: 0.12rem;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		color: oklch(0.68 0.005 250);
	}

	.rx-row {
		display: grid;
		grid-template-columns: 0.55rem 1fr;
		align-items: center;
		gap: 0.28rem;
		font-size: 0.46rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: oklch(0.48 0.005 250);
	}

	.rx-bulb {
		width: 0.48rem;
		height: 0.48rem;
		border-radius: 999px;
		background: var(--led-dim);
		box-shadow: inset 0 0 2px oklch(0 0 0 / 0.75);
		transition:
			background 180ms ease,
			box-shadow 180ms ease,
			opacity 180ms ease;
	}

	.rx-module[data-rx='receiving'] .rx-row--in {
		color: oklch(0.78 0.12 75);
	}

	.rx-module[data-rx='receiving'] .rx-row--in .rx-bulb {
		background: var(--led-amber);
		box-shadow:
			inset 0 0 2px oklch(0 0 0 / 0.35),
			0 0 7px oklch(0.82 0.16 80 / 0.75),
			0 0 16px oklch(0.82 0.16 80 / 0.32);
		animation: rx-pulse 820ms ease-in-out infinite;
	}

	.rx-module[data-rx='done'] .rx-row--done {
		color: oklch(0.82 0.16 145);
	}

	.rx-module[data-rx='done'] .rx-row--done .rx-bulb {
		background: var(--led-green);
		box-shadow:
			inset 0 0 2px oklch(0 0 0 / 0.35),
			0 0 8px oklch(0.78 0.2 150 / 0.82),
			0 0 20px oklch(0.78 0.2 150 / 0.36);
	}

	.front {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.device-bottom {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.25rem 0.4rem 0;
		min-height: 0.9rem;
	}

	.brand {
		font-size: 0.6rem;
		letter-spacing: 0.18em;
		color: var(--ink-muted);
		opacity: 0.55;
	}

	.vent {
		flex: 1;
		max-width: 5rem;
		height: 0.3rem;
		border-radius: 999px;
		background:
			radial-gradient(circle, oklch(0 0 0) 0.55px, transparent 0.8px) 0 0 / 3px 3px,
			oklch(0.13 0.005 250);
		box-shadow: inset 0 1px 1px oklch(0 0 0 / 0.6);
	}

	.page-footer {
		text-align: center;
		color: var(--ink-muted);
		font-size: 0.62rem;
		letter-spacing: 0.18em;
		opacity: 0.7;
	}

	@media (min-width: 32rem) {
		.device {
			flex: 0 0 auto;
			height: min(94svh, 56rem);
		}
	}

	@keyframes rx-pulse {
		0%,
		100% {
			filter: brightness(0.82);
			opacity: 0.68;
		}
		45% {
			filter: brightness(1.35);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rx-module[data-rx='receiving'] .rx-row--in .rx-bulb {
			animation-duration: 1ms;
		}
	}
</style>
