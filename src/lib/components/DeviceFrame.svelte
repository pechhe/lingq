<script lang="ts">
	import type { Snippet } from 'svelte';

	type LedTone = 'idle' | 'ready' | 'speaking' | 'error';

	let {
		display,
		front,
		footer,
		topLed = 'idle',
		topLabel = 'LANGLINK'
	}: {
		display: Snippet;
		front: Snippet;
		footer?: Snippet;
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

		<div class="display-area">
			{@render display()}
		</div>

		<div class="front">
			{@render front()}
		</div>

		<footer class="device-bottom" aria-hidden="true">
			<span class="brand mono">∅ LANGLINK</span>
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
		gap: 0.85rem;
		width: 100%;
		min-height: 100svh;
		padding: calc(env(safe-area-inset-top, 0px) + clamp(0.5rem, 2vw, 1.5rem))
			clamp(0.5rem, 2vw, 1.5rem) calc(env(safe-area-inset-bottom, 0px) + clamp(0.5rem, 2vw, 1.5rem));
	}

	.device {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: clamp(0.6rem, 2vw, 0.9rem);
		width: 100%;
		max-width: 26rem;
		flex: 1;
		min-height: 0;
		padding: clamp(0.85rem, 3vw, 1.2rem) clamp(0.85rem, 3vw, 1.2rem) clamp(0.7rem, 2.5vw, 0.95rem);
		padding-left: clamp(2.2rem, 7vw, 2.8rem);
		border-radius: clamp(1.6rem, 4vw, 2.4rem);
		background: linear-gradient(
			180deg,
			var(--device-body-top) 0%,
			var(--device-body) 38%,
			var(--device-body-bottom) 100%
		);
		box-shadow:
			0 1px 0 var(--device-edge-highlight) inset,
			0 -1px 0 oklch(0.06 0 0) inset,
			0 0 0 1px oklch(0.32 0.005 250 / 0.5),
			0 30px 80px -20px oklch(0 0 0 / 0.85),
			0 8px 20px -8px oklch(0 0 0 / 0.6);
		overflow: hidden;
	}

	.device::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
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
		left: clamp(0.5rem, 1.6vw, 0.8rem);
		top: clamp(2.4rem, 7vw, 3.2rem);
		display: flex;
		flex-direction: column;
		gap: clamp(0.85rem, 2.5vw, 1.4rem);
		pointer-events: none;
		z-index: 3;
	}

	.rail-button {
		display: block;
		width: clamp(0.5rem, 1.4vw, 0.7rem);
		height: clamp(1.4rem, 3.5vw, 1.8rem);
		border-radius: 0.2rem;
		background: linear-gradient(180deg, oklch(0.36 0.006 250) 0%, oklch(0.22 0.006 250) 100%);
		box-shadow:
			inset 0 1px 0 oklch(0.5 0.006 250 / 0.5),
			inset 0 -1px 0 oklch(0 0 0 / 0.5),
			-1px 0 2px oklch(0 0 0 / 0.4);
	}

	.rail-button--orange {
		background: linear-gradient(180deg, var(--led-orange-glow) 0%, oklch(0.55 0.18 55) 100%);
		box-shadow:
			inset 0 1px 0 oklch(0.92 0.12 70 / 0.7),
			inset 0 -1px 0 oklch(0.3 0.1 50 / 0.6),
			-1px 0 4px oklch(0.55 0.18 55 / 0.45);
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
</style>
