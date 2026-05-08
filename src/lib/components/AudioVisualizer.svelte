<script lang="ts">
	type Color = 'green' | 'purple';

	const PALETTES: Record<Color, { trace: string; glow: string; baseline: string }> = {
		green: {
			trace: 'rgb(140, 240, 165)',
			glow: 'rgba(140, 240, 165, 0.7)',
			baseline: 'rgba(140, 240, 165, 0.18)'
		},
		purple: {
			trace: 'rgb(205, 140, 255)',
			glow: 'rgba(205, 140, 255, 0.7)',
			baseline: 'rgba(205, 140, 255, 0.18)'
		}
	};

	let {
		stream,
		color = 'green'
	}: {
		stream?: MediaStream;
		color?: Color;
	} = $props();

	let canvas = $state<HTMLCanvasElement>();
	let wrapper = $state<HTMLDivElement>();

	let audioContext: AudioContext | undefined;
	let analyser: AnalyserNode | undefined;
	let sourceNode: MediaStreamAudioSourceNode | undefined;
	let timeBuffer: Uint8Array<ArrayBuffer> | undefined;
	let rafId: number | undefined;
	let resizeObserver: ResizeObserver | undefined;
	let canvasContext: CanvasRenderingContext2D | null = null;
	let phaseOffset = 0;

	function ensureAudioContext() {
		if (audioContext) return audioContext;
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return undefined;
		audioContext = new Ctor();
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 1024;
		analyser.smoothingTimeConstant = 0.55;
		timeBuffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
		return audioContext;
	}

	function attachStream(next: MediaStream | undefined) {
		if (!next) {
			detachStream();
			return;
		}
		const ctx = ensureAudioContext();
		if (!ctx || !analyser) return;
		if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
		try {
			sourceNode?.disconnect();
		} catch {
			// no-op
		}
		try {
			sourceNode = ctx.createMediaStreamSource(next);
			sourceNode.connect(analyser);
		} catch {
			sourceNode = undefined;
		}
	}

	function detachStream() {
		try {
			sourceNode?.disconnect();
		} catch {
			// no-op
		}
		sourceNode = undefined;
	}

	function resizeCanvas() {
		if (!canvas || !wrapper) return;
		const dpr = Math.max(1, window.devicePixelRatio || 1);
		const rect = wrapper.getBoundingClientRect();
		canvas.width = Math.max(1, Math.floor(rect.width * dpr));
		canvas.height = Math.max(1, Math.floor(rect.height * dpr));
		canvas.style.width = `${rect.width}px`;
		canvas.style.height = `${rect.height}px`;
		if (canvasContext) canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function tick() {
		if (!canvas || !canvasContext || !wrapper) {
			rafId = requestAnimationFrame(tick);
			return;
		}
		const rect = wrapper.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;

		const palette = PALETTES[color];

		canvasContext.fillStyle = 'rgba(0, 0, 0, 0.22)';
		canvasContext.fillRect(0, 0, w, h);

		canvasContext.strokeStyle = palette.baseline;
		canvasContext.lineWidth = 1;
		canvasContext.beginPath();
		canvasContext.moveTo(0, h / 2);
		canvasContext.lineTo(w, h / 2);
		canvasContext.stroke();

		if (analyser && timeBuffer && sourceNode) {
			analyser.getByteTimeDomainData(timeBuffer);
			drawWaveform(timeBuffer, w, h, palette);
		} else {
			drawIdle(w, h, palette);
		}

		rafId = requestAnimationFrame(tick);
	}

	function drawWaveform(
		data: Uint8Array,
		w: number,
		h: number,
		palette: { trace: string; glow: string }
	) {
		if (!canvasContext) return;
		const ctx = canvasContext;
		const sliceWidth = w / data.length;

		ctx.shadowBlur = 12;
		ctx.shadowColor = palette.glow;
		ctx.strokeStyle = palette.trace;
		ctx.lineWidth = 1.6;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		let x = 0;
		for (let i = 0; i < data.length; i += 1) {
			const v = (data[i] - 128) / 128;
			const y = h / 2 + v * (h / 2) * 0.85;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
			x += sliceWidth;
		}
		ctx.stroke();
		ctx.shadowBlur = 0;
	}

	function drawIdle(w: number, h: number, palette: { trace: string; glow: string }) {
		if (!canvasContext) return;
		const ctx = canvasContext;
		phaseOffset += 0.018;
		ctx.shadowBlur = 8;
		ctx.shadowColor = palette.glow;
		ctx.strokeStyle = palette.trace;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		const segments = 80;
		for (let i = 0; i <= segments; i += 1) {
			const t = i / segments;
			const x = t * w;
			const wobble = Math.sin(t * Math.PI * 2 + phaseOffset) * 1.1;
			const y = h / 2 + wobble;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.shadowBlur = 0;
	}

	$effect(() => {
		if (!canvas || !wrapper) return;
		canvasContext = canvas.getContext('2d');
		resizeCanvas();
		resizeObserver = new ResizeObserver(() => resizeCanvas());
		resizeObserver.observe(wrapper);
		rafId = requestAnimationFrame(tick);

		return () => {
			if (rafId !== undefined) cancelAnimationFrame(rafId);
			rafId = undefined;
			resizeObserver?.disconnect();
			resizeObserver = undefined;
			detachStream();
			void audioContext?.close().catch(() => {});
			audioContext = undefined;
			analyser = undefined;
			timeBuffer = undefined;
		};
	});

	$effect(() => {
		attachStream(stream);
	});
</script>

<div class="viz" data-color={color} bind:this={wrapper}>
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.viz {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		border-radius: 0.35rem;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
