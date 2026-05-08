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
	<div class="screen-inner">
		<div class="content">{@render children()}</div>
		<div class="scanlines" aria-hidden="true"></div>
		<div class="vignette" aria-hidden="true"></div>
		<div class="glare" aria-hidden="true"></div>
	</div>
</div>

<style>
	.screen {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		min-height: 0;
		flex: 1;
		padding: 4px;
		border-radius: clamp(0.7rem, 1.5vw, 1rem);
		background: linear-gradient(180deg, oklch(0.06 0.005 250) 0%, oklch(0.1 0.005 250) 100%);
		box-shadow:
			inset 0 2px 4px oklch(0 0 0 / 0.8),
			inset 0 -1px 1px oklch(0.3 0.005 250 / 0.3),
			0 0 0 1px oklch(0.32 0.005 250 / 0.4);
	}

	.screen-inner {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: inherit;
		border-radius: clamp(0.5rem, 1.2vw, 0.75rem);
		background: var(--screen-bg-deep);
		overflow: hidden;
	}

	.content {
		position: relative;
		z-index: 2;
		width: 100%;
		height: 100%;
		min-height: inherit;
		padding: clamp(0.85rem, 2vw, 1.15rem);
		font-family: ui-monospace, 'SF Mono', Menlo, 'Roboto Mono', monospace;
		letter-spacing: 0.02em;
	}

	.screen[data-tone='amber'] .content {
		color: var(--screen-amber);
	}

	.screen[data-tone='green'] .content {
		color: var(--screen-green);
	}

	.scanlines {
		position: absolute;
		inset: 0;
		z-index: 3;
		background: repeating-linear-gradient(
			0deg,
			oklch(0 0 0 / 0.18) 0px,
			oklch(0 0 0 / 0.18) 1px,
			transparent 1px,
			transparent 3px
		);
		pointer-events: none;
		mix-blend-mode: multiply;
	}

	.vignette {
		position: absolute;
		inset: 0;
		z-index: 4;
		background: radial-gradient(ellipse at 50% 40%, transparent 50%, oklch(0 0 0 / 0.45) 100%);
		pointer-events: none;
	}

	.glare {
		position: absolute;
		inset: 0;
		z-index: 5;
		background: linear-gradient(170deg, oklch(1 0 0 / 0.04) 0%, transparent 35%);
		pointer-events: none;
	}
</style>
