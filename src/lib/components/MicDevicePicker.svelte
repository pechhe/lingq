<script lang="ts">
	import { isExternalMicLabel, listMicrophones } from '$lib/realtime/audioRouting';
	import { playClick } from '$lib/realtime/clickSound';
	import { X } from 'lucide-svelte';

	let {
		open = $bindable(false),
		selectedId,
		onSelect
	}: {
		open?: boolean;
		selectedId?: string;
		onSelect: (deviceId: string) => Promise<void> | void;
	} = $props();

	let devices = $state<MediaDeviceInfo[]>([]);
	let loading = $state(false);
	let error = $state('');
	let busyId = $state('');

	async function refresh() {
		loading = true;
		error = '';
		try {
			devices = await listMicrophones();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not list input devices.';
		} finally {
			loading = false;
		}
	}

	async function pick(deviceId: string) {
		if (busyId) return;
		busyId = deviceId;
		error = '';
		try {
			await onSelect(deviceId);
			open = false;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not switch microphone.';
		} finally {
			busyId = '';
		}
	}

	function close() {
		open = false;
	}

	$effect(() => {
		if (open) {
			void refresh();
		}
	});
</script>

{#if open}
	<div
		class="backdrop"
		role="presentation"
		onclick={close}
		onkeydown={(event) => {
			if (event.key === 'Escape') close();
		}}
	></div>

	<div class="sheet" role="dialog" aria-modal="true" aria-label="Microphone input">
		<header>
			<span class="title mono">MIC IN</span>
			<button
				class="close"
				type="button"
				aria-label="Close"
				onpointerdown={() => playClick('down')}
				onclick={close}
			>
				<X size={16} />
			</button>
		</header>

		<div class="body">
			{#if loading}
				<p class="note mono">Loading inputs…</p>
			{:else if error}
				<p class="note mono err">{error}</p>
			{:else if devices.length === 0}
				<p class="note mono">No microphones found.</p>
			{:else}
				<ul>
					{#each devices as device (device.deviceId)}
						{@const external = device.label ? isExternalMicLabel(device.label) : false}
						<li>
							<button
								type="button"
								class="device"
								class:selected={selectedId === device.deviceId}
								class:busy={busyId === device.deviceId}
								disabled={busyId !== '' && busyId !== device.deviceId}
								onpointerdown={() => playClick('down')}
								onclick={() => pick(device.deviceId)}
							>
								<span class="dot" aria-hidden="true"></span>
								<span class="name">{device.label || 'Unnamed device'}</span>
								<span class="tag mono">{external ? 'EXT' : 'BUILT-IN'}</span>
							</button>
						</li>
					{/each}
				</ul>
				<p class="hint mono">BUILT-IN PHONE MIC USUALLY SOUNDS BEST FOR TRANSLATION</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: oklch(0 0 0 / 0.6);
		backdrop-filter: blur(2px);
	}

	.sheet {
		position: fixed;
		left: 50%;
		bottom: clamp(1rem, 4vw, 2rem);
		transform: translateX(-50%);
		z-index: 51;
		width: min(92vw, 24rem);
		border-radius: 1rem;
		background: linear-gradient(180deg, var(--device-body-top), var(--device-body-bottom));
		padding: 1rem;
		box-shadow:
			0 1px 0 var(--device-edge-highlight) inset,
			0 0 0 1px oklch(0.32 0.005 250 / 0.5),
			0 24px 60px -12px oklch(0 0 0 / 0.7);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.6rem;
		border-bottom: 1px dashed oklch(0.4 0.005 250 / 0.35);
		margin-bottom: 0.6rem;
	}

	.title {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--screen-amber);
	}

	.close {
		display: grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		border: 0;
		border-radius: 0.4rem;
		background: oklch(0.22 0.005 250);
		color: var(--ink-muted);
		box-shadow: inset 0 1px 0 oklch(0.4 0.005 250 / 0.5);
	}

	.body ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}

	.device {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		text-align: left;
		padding: 0.65rem 0.75rem;
		border: 0;
		border-radius: 0.5rem;
		background: oklch(0.18 0.005 250);
		color: var(--ink);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.82rem;
		box-shadow: inset 0 1px 0 oklch(0.34 0.005 250 / 0.4);
	}

	.device:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.device:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--led-dim);
		box-shadow: inset 0 0 1px oklch(0 0 0 / 0.5);
		flex-shrink: 0;
	}

	.device.selected {
		background: oklch(0.22 0.04 60);
		color: var(--screen-amber);
	}

	.device.selected .dot {
		background: var(--led-orange);
		box-shadow: 0 0 6px var(--led-orange-glow);
	}

	.device.busy .dot {
		animation: pulse 0.9s ease-in-out infinite;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tag {
		flex-shrink: 0;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: var(--ink-muted);
		opacity: 0.8;
	}

	.note {
		margin: 0;
		font-size: 0.78rem;
		color: var(--ink-muted);
		line-height: 1.45;
	}

	.note.err {
		color: oklch(0.78 0.18 28);
	}

	.hint {
		margin: 0.7rem 0 0;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		color: var(--ink-muted);
		opacity: 0.6;
		text-align: center;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
</style>
