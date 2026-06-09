<script lang="ts">
	type State = 'idle' | 'receiving' | 'done';

	let {
		state = 'idle',
		activeBars = 0,
		totalBars = 13
	}: {
		state?: State;
		activeBars?: number;
		totalBars?: number;
	} = $props();
</script>

<div class="meter" data-state={state} aria-hidden="true">
	<span class="title mono">TRANSLATING</span>
	<div class="bar-stack">
		{#each Array.from({ length: totalBars }) as _, index (index)}
			<span
				class="bar"
				data-active={index < activeBars ? 'true' : 'false'}
				style:--bar-index={index}
			></span>
		{/each}
	</div>
	<span class="status mono">
		<span class="dot"></span>
		{state === 'done' ? 'COMPLETE' : state === 'receiving' ? 'ACTIVE' : 'STANDBY'}
	</span>
</div>


<style>
	.meter {
		display: grid;
		grid-template-rows: auto 1fr auto;
		justify-items: center;
		gap: clamp(0.2rem, 0.6vw, 0.32rem);
		width: 100%;
		height: 100%;
		min-height: 0;
		pointer-events: none;
	}

	.title,
	.status {
		font-size: clamp(0.38rem, 1.05vw, 0.46rem);
		font-weight: 800;
		letter-spacing: 0.06em;
		color: oklch(0.72 0.005 250);
		text-shadow: 0 0 4px oklch(0 0 0 / 0.85);
	}

	.bar-stack {
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		justify-content: stretch;
		gap: clamp(0.1rem, 0.32vw, 0.18rem);
		width: 100%;
		min-height: 0;
		padding: 0.05rem 0;
	}

	.bar {
		display: block;
		width: clamp(0.9rem, 2.2vw, 1.15rem);
		flex: 1 1 0;
		min-height: 0.14rem;
		max-height: 0.5rem;
		border-radius: 999px;
		background: oklch(0.3 0.005 250 / 0.55);
		box-shadow: inset 0 1px 1px oklch(1 0 0 / 0.08);
		opacity: 0.55;
		transition:
			background 180ms ease,
			box-shadow 180ms ease,
			opacity 180ms ease;
	}

	.meter[data-state='receiving'] .bar[data-active='true'] {
		background: linear-gradient(180deg, oklch(0.92 0.13 78), oklch(0.82 0.16 80) 60%, oklch(0.68 0.18 62));
		box-shadow:
			0 0 6px oklch(0.82 0.16 80 / 0.78),
			0 0 16px oklch(0.82 0.16 80 / 0.24);
		opacity: 1;
		animation: bar-pulse 900ms ease-in-out infinite alternate;
		animation-delay: calc(var(--bar-index) * -55ms);
	}

	.meter[data-state='done'] .bar[data-active='true'] {
		background: linear-gradient(180deg, oklch(0.9 0.17 145), oklch(0.78 0.2 145) 60%, oklch(0.64 0.18 145));
		box-shadow:
			0 0 7px oklch(0.78 0.2 145 / 0.78),
			0 0 18px oklch(0.78 0.2 145 / 0.28);
		opacity: 1;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.22rem;
	}

	.dot {
		width: 0.3rem;
		height: 0.3rem;
		border-radius: 999px;
		background: oklch(0.66 0.005 250);
		box-shadow: inset 0 0 2px oklch(0 0 0 / 0.58);
	}

	.meter[data-state='receiving'] .title,
	.meter[data-state='receiving'] .status {
		color: oklch(0.78 0.18 70);
		text-shadow: 0 0 6px oklch(0.75 0.18 70 / 0.45);
	}

	.meter[data-state='receiving'] .dot {
		background: var(--led-amber);
		box-shadow:
			0 0 5px oklch(0.82 0.16 80 / 0.78),
			0 0 12px oklch(0.82 0.16 80 / 0.3);
	}

	.meter[data-state='done'] .title,
	.meter[data-state='done'] .status {
		color: oklch(0.78 0.2 145);
		text-shadow: 0 0 6px oklch(0.72 0.2 145 / 0.45);
	}

	.meter[data-state='done'] .dot {
		background: oklch(0.78 0.2 145);
		box-shadow:
			0 0 5px oklch(0.78 0.2 145 / 0.78),
			0 0 12px oklch(0.78 0.2 145 / 0.28);
	}

	@keyframes bar-pulse {
		0% {
			filter: brightness(0.82);
		}
		100% {
			filter: brightness(1.3);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.meter[data-state='receiving'] .bar[data-active='true'] {
			animation-duration: 1ms;
		}
	}
</style>
