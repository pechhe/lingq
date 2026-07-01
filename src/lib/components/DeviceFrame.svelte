<script lang="ts">
	import type { Snippet } from 'svelte';

	type LedTone = 'idle' | 'ready' | 'speaking' | 'error';

	let {
		display,
		front,
		surfaceTop,
		footer,
		topLed = 'idle',
		topLabel = 'LINGK'
	}: {
		display: Snippet;
		front: Snippet;
		surfaceTop?: Snippet;
		footer?: Snippet;
		topLed?: LedTone;
		topLabel?: string;
	} = $props();
</script>

<div class="stage">
	<div class="device" data-led={topLed}>
		<header class="device-top">
			<span class="led" aria-hidden="true"></span>
			<span class="device-label mono">{topLabel}</span>
		</header>

		{#if surfaceTop}
			<div class="surface-top">
				{@render surfaceTop()}
			</div>
		{/if}

		<div class="display-area">
			{@render display()}
		</div>

		<div class="front">
			{@render front()}
		</div>

		<footer class="device-bottom" aria-hidden="true">
			<span class="brand mono">∅ LINGK</span>
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
			gap: 0.85rem;
		}
	}

	/* Machined chassis — brushed metal body, crisp milled edge at the border. */
	.device {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: clamp(0.4rem, 1.4vw, 0.85rem);
		width: 100%;
		max-width: 26rem;
		flex: 1;
		min-height: 0;
		padding: clamp(0.6rem, 2.2vw, 1.1rem) clamp(0.7rem, 2.6vw, 1.15rem)
			clamp(0.5rem, 1.8vw, 0.9rem);
		border-radius: clamp(1.1rem, 3vw, 1.7rem);
		isolation: isolate;
		background: var(--chassis-surface);
		background-blend-mode: var(--chassis-blend);
		box-shadow: var(--chassis-shadow);
		overflow: visible;
	}

	/* Sheen + edge catchlight overlay. */
	.device::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		border-radius: inherit;
		opacity: var(--chassis-overlay-opacity);
		background: var(--chassis-overlay);
	}

	.device-top {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.1rem 0.3rem 0.05rem;
		min-height: 1.1rem;
	}

	.led {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--led-dim);
		box-shadow:
			inset 0 0 2px oklch(0 0 0 / 0.6),
			0 1px 0 oklch(1 0.002 250 / 0.4);
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

	/* Engraved label — dark ink debossed into the brushed metal. */
	.device-label {
		flex: 1;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--cap-ink);
		text-shadow: var(--cap-ink-shadow);
		text-transform: uppercase;
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
		justify-content: center;
		padding: 0.3rem 0.4rem 0;
		min-height: 0.8rem;
	}

	.brand {
		font-size: 0.58rem;
		letter-spacing: 0.22em;
		color: var(--cap-ink);
		text-shadow: var(--cap-ink-shadow);
		opacity: 0.75;
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
