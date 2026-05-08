<script lang="ts">
	import QRCode from 'qrcode';

	let {
		value,
		dark = '#0d0d0d',
		light = '#f0b97a'
	}: { value: string; dark?: string; light?: string } = $props();
	let dataUrl = $state('');

	$effect(() => {
		let cancelled = false;
		QRCode.toDataURL(value, {
			margin: 1,
			width: 240,
			color: { dark, light }
		}).then((nextDataUrl) => {
			if (!cancelled) dataUrl = nextDataUrl;
		});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if dataUrl}
	<img src={dataUrl} alt="Room QR code" />
{/if}

<style>
	img {
		display: block;
		width: 100%;
		max-width: 13rem;
		border-radius: 0.4rem;
		image-rendering: pixelated;
	}
</style>
