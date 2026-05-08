<script lang="ts">
	import type { StatusLevel } from '$lib/realtime/roomStateMachine';

	let { label, level = 'idle' }: { label: string; level?: StatusLevel } = $props();
</script>

<span class="status" data-level={level}>
	<span class="led" aria-hidden="true"></span>
	<span class="label">{label}</span>
</span>

<style>
	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--screen-green-dim);
	}

	.led {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--led-dim);
		box-shadow: inset 0 0 1px oklch(0 0 0 / 0.5);
		transition:
			background 200ms ease,
			box-shadow 200ms ease;
	}

	.status[data-level='ready'] {
		color: var(--screen-green);
	}

	.status[data-level='ready'] .led {
		background: var(--led-green);
		box-shadow: 0 0 6px oklch(0.78 0.2 150 / 0.7);
	}

	.status[data-level='pending'] {
		color: var(--led-amber);
	}

	.status[data-level='pending'] .led {
		background: var(--led-amber);
		box-shadow: 0 0 6px oklch(0.82 0.16 80 / 0.6);
		animation: blink 1.2s ease-in-out infinite;
	}

	.status[data-level='blocked'] .led,
	.status[data-level='error'] .led {
		background: var(--led-red);
		box-shadow: 0 0 6px oklch(0.66 0.22 28 / 0.7);
	}

	.status[data-level='blocked'],
	.status[data-level='error'] {
		color: oklch(0.78 0.18 28);
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
</style>
