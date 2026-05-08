<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { StatusLevel } from '$lib/realtime/roomStateMachine';

	let {
		mic,
		participant,
		translation,
		detail
	}: {
		mic: StatusLevel;
		participant: StatusLevel;
		translation: StatusLevel;
		detail: string;
	} = $props();
</script>

<section aria-label="Connection status" class="status-panel">
	<div class="row">
		<StatusBadge label="MIC" level={mic} />
		<StatusBadge label="LINK" level={participant} />
		<StatusBadge label="XLATE" level={translation} />
	</div>
	<p class="detail">{detail}</p>
</section>

<style>
	.status-panel {
		display: grid;
		gap: 0.55rem;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem 1.1rem;
		padding-bottom: 0.55rem;
		border-bottom: 1px dashed oklch(0.4 0.005 250 / 0.35);
	}

	.detail {
		margin: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.78rem;
		line-height: 1.45;
		color: var(--screen-green);
		min-height: 2rem;
	}
</style>
