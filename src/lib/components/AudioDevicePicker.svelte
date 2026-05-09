<script lang="ts">
	import { playClick } from '$lib/realtime/clickSound';
	import { X } from 'lucide-svelte';

	const STORAGE_KEY = 'lingk:audio-output';

	type SinkAudioElement = HTMLAudioElement & {
		setSinkId?: (sinkId: string) => Promise<void>;
		sinkId?: string;
	};

	let {
		open = $bindable(false),
		audioElement
	}: {
		open?: boolean;
		audioElement?: HTMLAudioElement;
	} = $props();

	let devices = $state<MediaDeviceInfo[]>([]);
	let selectedId = $state<string>('default');
	let supported = $state(true);
	let error = $state('');
	let loading = $state(false);

	async function refresh() {
		loading = true;
		error = '';

		const sinkAudio = audioElement as SinkAudioElement | undefined;
		if (!sinkAudio || typeof sinkAudio.setSinkId !== 'function') {
			supported = false;
			devices = [];
			loading = false;
			return;
		}
		supported = true;

		try {
			if (typeof navigator.mediaDevices?.enumerateDevices !== 'function') {
				supported = false;
				return;
			}
			const all = await navigator.mediaDevices.enumerateDevices();
			devices = all.filter((device) => device.kind === 'audiooutput');
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored && devices.some((device) => device.deviceId === stored)) {
				selectedId = stored;
			} else if (sinkAudio.sinkId) {
				selectedId = sinkAudio.sinkId || 'default';
			} else {
				selectedId = 'default';
			}
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not list audio devices.';
		} finally {
			loading = false;
		}
	}

	async function pick(deviceId: string) {
		const sinkAudio = audioElement as SinkAudioElement | undefined;
		if (!sinkAudio?.setSinkId) return;
		try {
			await sinkAudio.setSinkId(deviceId);
			selectedId = deviceId;
			localStorage.setItem(STORAGE_KEY, deviceId);
			open = false;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not switch audio output.';
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

	export async function applyStored(audio: HTMLAudioElement | undefined) {
		if (!audio) return;
		const sinkAudio = audio as SinkAudioElement;
		if (typeof sinkAudio.setSinkId !== 'function') return;
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored || stored === 'default') return;
		try {
			await sinkAudio.setSinkId(stored);
		} catch {
			// device may not be present any more
		}
	}
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

	<div class="sheet" role="dialog" aria-modal="true" aria-label="Audio output device">
		<header>
			<span class="title mono">AUDIO OUT</span>
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
			{#if !supported}
				<p class="note mono">
					This browser doesn't expose output device switching. Use the system output picker.
				</p>
			{:else if loading}
				<p class="note mono">Loading devices…</p>
			{:else if error}
				<p class="note mono error">{error}</p>
			{:else if devices.length === 0}
				<p class="note mono">No output devices found.</p>
			{:else}
				<ul>
					{#each devices as device (device.deviceId)}
						<li>
							<button
								type="button"
								class="device"
								class:selected={selectedId === device.deviceId}
								onpointerdown={() => playClick('down')}
								onclick={() => pick(device.deviceId)}
							>
								<span class="dot" aria-hidden="true"></span>
								<span class="name">{device.label || 'Unnamed device'}</span>
							</button>
						</li>
					{/each}
				</ul>
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

	.device:hover {
		filter: brightness(1.1);
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

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.note {
		margin: 0;
		font-size: 0.78rem;
		color: var(--ink-muted);
		line-height: 1.45;
	}

	.note.error {
		color: oklch(0.78 0.18 28);
	}
</style>
