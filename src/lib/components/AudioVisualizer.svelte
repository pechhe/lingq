<script lang="ts">
	type Color = 'green' | 'purple' | 'orange' | 'blue';

	type Palette = {
		trace: string;
		glow: string;
		halo: string;
		core: string;
		baseline: string;
		grid: string;
		gridStrong: string;
		r: string;
		b: string;
	};

	const PALETTES: Record<Color, Palette> = {
		green: {
			trace: 'rgb(140, 240, 165)',
			glow: 'rgba(140, 240, 165, 0.55)',
			halo: 'rgba(140, 240, 165, 0.22)',
			core: 'rgba(225, 255, 235, 0.95)',
			baseline: 'rgba(140, 240, 165, 0.16)',
			grid: 'rgba(140, 240, 165, 0.07)',
			gridStrong: 'rgba(140, 240, 165, 0.13)',
			r: 'rgba(255, 70, 90, 0.55)',
			b: 'rgba(70, 90, 255, 0.55)'
		},
		purple: {
			trace: 'rgb(205, 140, 255)',
			glow: 'rgba(205, 140, 255, 0.55)',
			halo: 'rgba(205, 140, 255, 0.22)',
			core: 'rgba(245, 220, 255, 0.95)',
			baseline: 'rgba(205, 140, 255, 0.16)',
			grid: 'rgba(205, 140, 255, 0.07)',
			gridStrong: 'rgba(205, 140, 255, 0.13)',
			r: 'rgba(255, 70, 130, 0.5)',
			b: 'rgba(120, 90, 255, 0.55)'
		},
		orange: {
			trace: 'rgb(255, 170, 60)',
			glow: 'rgba(255, 170, 60, 0.56)',
			halo: 'rgba(255, 135, 35, 0.24)',
			core: 'rgba(255, 236, 198, 0.95)',
			baseline: 'rgba(255, 170, 60, 0.16)',
			grid: 'rgba(255, 170, 60, 0.07)',
			gridStrong: 'rgba(255, 170, 60, 0.13)',
			r: 'rgba(255, 80, 45, 0.52)',
			b: 'rgba(255, 210, 90, 0.48)'
		},
		blue: {
			trace: 'rgb(120, 175, 255)',
			glow: 'rgba(120, 175, 255, 0.55)',
			halo: 'rgba(120, 175, 255, 0.22)',
			core: 'rgba(220, 238, 255, 0.95)',
			baseline: 'rgba(120, 175, 255, 0.16)',
			grid: 'rgba(120, 175, 255, 0.07)',
			gridStrong: 'rgba(120, 175, 255, 0.13)',
			r: 'rgba(80, 150, 255, 0.48)',
			b: 'rgba(80, 95, 255, 0.55)'
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
	let lastDrawAt = 0;

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

	function drawGrid(w: number, h: number, palette: Palette) {
		if (!canvasContext) return;
		const ctx = canvasContext;
		ctx.save();
		ctx.lineWidth = 1;
		ctx.setLineDash([2, 4]);
		ctx.strokeStyle = palette.grid;

		const verticalDivisions = 8;
		for (let i = 1; i < verticalDivisions; i += 1) {
			const x = Math.round((w / verticalDivisions) * i) + 0.5;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}

		const horizontalDivisions = 4;
		for (let i = 1; i < horizontalDivisions; i += 1) {
			const y = Math.round((h / horizontalDivisions) * i) + 0.5;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}

		ctx.setLineDash([]);
		ctx.restore();
	}

	function drawBaseline(w: number, h: number, palette: Palette) {
		if (!canvasContext) return;
		const ctx = canvasContext;
		ctx.strokeStyle = palette.gridStrong;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, h / 2);
		ctx.lineTo(w, h / 2);
		ctx.stroke();
	}

	function tracePath(data: Uint8Array, w: number, h: number, offsetX: number) {
		if (!canvasContext) return;
		const ctx = canvasContext;
		const sliceWidth = w / data.length;
		ctx.beginPath();
		let x = offsetX;
		for (let i = 0; i < data.length; i += 1) {
			const v = (data[i] - 128) / 128;
			const y = h / 2 + v * (h / 2) * 0.85;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
			x += sliceWidth;
		}
		ctx.stroke();
	}

	function idlePath(w: number, h: number, offsetX: number) {
		if (!canvasContext) return;
		const ctx = canvasContext;
		ctx.beginPath();
		const segments = 80;
		for (let i = 0; i <= segments; i += 1) {
			const t = i / segments;
			const x = t * w + offsetX;
			const wobble = Math.sin(t * Math.PI * 2 + phaseOffset) * 1.1;
			const y = h / 2 + wobble;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}

	function drawCRTWaveform(drawTrace: (offsetX: number) => void, palette: Palette, live: boolean) {
		if (!canvasContext) return;
		const ctx = canvasContext;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// Outer halo — soft, wide blur
		ctx.shadowBlur = 18;
		ctx.shadowColor = palette.halo;
		ctx.strokeStyle = palette.halo;
		ctx.lineWidth = live ? 5.5 : 3.5;
		drawTrace(0);

		// Mid trace — phosphor body
		ctx.shadowBlur = 9;
		ctx.shadowColor = palette.glow;
		ctx.strokeStyle = palette.glow;
		ctx.lineWidth = live ? 2.5 : 1.8;
		drawTrace(0);

		// Chromatic aberration — RGB-shifted ghosts using lighter composite
		ctx.shadowBlur = 0;
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineWidth = live ? 1.2 : 0.9;
		ctx.strokeStyle = palette.r;
		drawTrace(-1.2);
		ctx.strokeStyle = palette.b;
		drawTrace(1.4);

		// Bright core — the sharp inner trace
		ctx.strokeStyle = palette.core;
		ctx.lineWidth = live ? 1 : 0.8;
		drawTrace(0);

		ctx.globalCompositeOperation = 'source-over';
		ctx.shadowBlur = 0;
	}

	function tick(now: number) {
		if (!canvas || !canvasContext || !wrapper) {
			rafId = requestAnimationFrame(tick);
			return;
		}

		const isLive = Boolean(analyser && timeBuffer && sourceNode);
		const minFrameMs = isLive ? 16 : 50;
		if (now - lastDrawAt < minFrameMs) {
			rafId = requestAnimationFrame(tick);
			return;
		}
		lastDrawAt = now;

		const rect = wrapper.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;

		const palette = PALETTES[color];

		// Phosphor decay — longer trail, gives the persistent CRT feel
		canvasContext.fillStyle = 'rgba(0, 0, 0, 0.16)';
		canvasContext.fillRect(0, 0, w, h);

		drawGrid(w, h, palette);
		drawBaseline(w, h, palette);

		if (isLive && analyser && timeBuffer && sourceNode) {
			analyser.getByteTimeDomainData(timeBuffer);
			const data = timeBuffer;
			drawCRTWaveform((offsetX) => tracePath(data, w, h, offsetX), palette, true);
		} else {
			phaseOffset += 0.018;
			drawCRTWaveform((offsetX) => idlePath(w, h, offsetX), palette, false);
		}

		rafId = requestAnimationFrame(tick);
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
