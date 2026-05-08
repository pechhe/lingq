<script lang="ts">
	import DeviceButton from '$lib/components/DeviceButton.svelte';
	import { Headphones, LogOut, Mic, Pause, Play, Volume2, VolumeX } from 'lucide-svelte';

	let {
		muted = false,
		paused = false,
		onmute,
		onpause,
		onmicdevice,
		onaudiodevice,
		onleave
	}: {
		muted?: boolean;
		paused?: boolean;
		onmute: () => void;
		onpause: () => void;
		onmicdevice: () => void;
		onaudiodevice: () => void;
		onleave: () => void;
	} = $props();
</script>

<div class="controls">
	<DeviceButton
		ariaLabel={muted ? 'Unmute output' : 'Mute output'}
		ariaPressed={muted}
		pressed={muted}
		onclick={onmute}
	>
		{#if muted}
			<VolumeX size={18} />
		{:else}
			<Volume2 size={18} />
		{/if}
		<span>MUTE</span>
	</DeviceButton>

	<DeviceButton
		ariaLabel={paused ? 'Resume translation' : 'Pause translation'}
		ariaPressed={paused}
		pressed={paused}
		onclick={onpause}
	>
		{#if paused}
			<Play size={18} />
		{:else}
			<Pause size={18} />
		{/if}
		<span>{paused ? 'RESUME' : 'PAUSE'}</span>
	</DeviceButton>

	<DeviceButton ariaLabel="Choose microphone input device" onclick={onmicdevice}>
		<Mic size={18} />
		<span>MIC</span>
	</DeviceButton>

	<DeviceButton ariaLabel="Choose audio output device" onclick={onaudiodevice}>
		<Headphones size={18} />
		<span>AUDIO</span>
	</DeviceButton>

	<DeviceButton ariaLabel="Leave room" tone="red" onclick={onleave}>
		<LogOut size={18} />
		<span>END</span>
	</DeviceButton>
</div>

<style>
	.controls {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.4rem;
	}

	.controls :global(.key) {
		flex-direction: column;
		gap: 0.3rem;
		min-height: 4rem;
		padding: 0.55rem 0.3rem;
	}

	.controls :global(.key span) {
		font-size: 0.58rem;
	}

	@media (max-width: 380px) {
		.controls :global(.key span) {
			display: none;
		}

		.controls :global(.key) {
			min-height: 3.4rem;
		}
	}
</style>
