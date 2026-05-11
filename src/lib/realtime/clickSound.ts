type ClickKind = 'down' | 'up';
type KeyPhase = 'press' | 'release';

const CLICK_URL = '/sounds/click.mp3';
const KEY_URLS = ['/sounds/key-on.mp3', '/sounds/key-off.mp3'];

const CLICK_RATE: Record<ClickKind, number> = { down: 0.78, up: 1 };

let context: AudioContext | undefined;
let masterGain: GainNode | undefined;

let clickBuffer: AudioBuffer | undefined;
let keyBuffers: Array<{ press: AudioBuffer; release: AudioBuffer }> = [];

let loadPromise: Promise<void> | undefined;

let keyRotateIdx = 0;
let lastKeyPressIdx = 0;

function getContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!context) {
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		context = new Ctor();
		masterGain = context.createGain();
		masterGain.gain.value = 0.7;
		masterGain.connect(context.destination);
	}
	return context;
}

async function fetchBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | undefined> {
	try {
		const response = await fetch(url);
		if (!response.ok) return undefined;
		const data = await response.arrayBuffer();
		return await ctx.decodeAudioData(data);
	} catch {
		return undefined;
	}
}

function computeEnvelope(channel: Float32Array, windowSize: number): Float32Array {
	const numWindows = Math.floor(channel.length / windowSize);
	const envelope = new Float32Array(numWindows);
	for (let w = 0; w < numWindows; w += 1) {
		let sumSq = 0;
		const start = w * windowSize;
		for (let i = 0; i < windowSize; i += 1) {
			const sample = channel[start + i];
			sumSq += sample * sample;
		}
		envelope[w] = Math.sqrt(sumSq / windowSize);
	}
	return envelope;
}

function sliceBuffer(
	ctx: AudioContext,
	source: AudioBuffer,
	startSample: number,
	endSample: number
): AudioBuffer {
	const length = Math.max(1, endSample - startSample);
	const out = ctx.createBuffer(source.numberOfChannels, length, source.sampleRate);
	for (let ch = 0; ch < source.numberOfChannels; ch += 1) {
		const data = source.getChannelData(ch).subarray(startSample, startSample + length);
		out.copyToChannel(data, ch);
	}
	return out;
}

function trimSilence(ctx: AudioContext, buffer: AudioBuffer): AudioBuffer {
	const channel = buffer.getChannelData(0);
	const sampleRate = buffer.sampleRate;
	const windowSize = Math.max(1, Math.floor(sampleRate * 0.003));
	const envelope = computeEnvelope(channel, windowSize);

	let peak = 0;
	for (let i = 0; i < envelope.length; i += 1) {
		if (envelope[i] > peak) peak = envelope[i];
	}
	if (peak === 0) return buffer;
	const threshold = peak * 0.04;

	let firstWindow = 0;
	while (firstWindow < envelope.length && envelope[firstWindow] < threshold) firstWindow += 1;

	let lastWindow = envelope.length - 1;
	while (lastWindow > firstWindow && envelope[lastWindow] < threshold) lastWindow -= 1;

	const lead = Math.floor(sampleRate * 0.002);
	const tail = Math.floor(sampleRate * 0.025);
	const start = Math.max(0, firstWindow * windowSize - lead);
	const end = Math.min(channel.length, (lastWindow + 1) * windowSize + tail);
	if (end - start < windowSize * 2) return buffer;

	return sliceBuffer(ctx, buffer, start, end);
}

function splitKeySample(
	ctx: AudioContext,
	buffer: AudioBuffer
): { press: AudioBuffer; release: AudioBuffer } {
	const channel = buffer.getChannelData(0);
	const sampleRate = buffer.sampleRate;
	const windowSize = Math.max(1, Math.floor(sampleRate * 0.003));
	const envelope = computeEnvelope(channel, windowSize);

	let peakAIdx = 0;
	let peakAVal = 0;
	for (let i = 0; i < envelope.length; i += 1) {
		if (envelope[i] > peakAVal) {
			peakAVal = envelope[i];
			peakAIdx = i;
		}
	}

	const minGap = Math.max(1, Math.floor(0.04 / 0.003));
	const valleyThreshold = peakAVal * 0.08;
	let valleyIdx = peakAIdx + minGap;
	while (valleyIdx < envelope.length && envelope[valleyIdx] >= valleyThreshold) valleyIdx += 1;
	if (valleyIdx >= envelope.length) {
		const whole = trimSilence(ctx, buffer);
		return { press: whole, release: whole };
	}

	let peakBIdx = valleyIdx;
	let peakBVal = 0;
	for (let i = valleyIdx; i < envelope.length; i += 1) {
		if (envelope[i] > peakBVal) {
			peakBVal = envelope[i];
			peakBIdx = i;
		}
	}

	if (peakBVal < peakAVal * 0.1) {
		const whole = trimSilence(ctx, buffer);
		return { press: whole, release: whole };
	}

	let splitWindowIdx = peakBIdx;
	let splitVal = envelope[peakBIdx];
	for (let i = peakAIdx + minGap; i < peakBIdx; i += 1) {
		if (envelope[i] < splitVal) {
			splitVal = envelope[i];
			splitWindowIdx = i;
		}
	}

	const lead = Math.floor(sampleRate * 0.003);
	const tail = Math.floor(sampleRate * 0.025);

	const pressStart = Math.max(0, peakAIdx * windowSize - lead);
	const splitSample = splitWindowIdx * windowSize;
	const pressEnd = Math.min(channel.length, splitSample + Math.floor(sampleRate * 0.01));

	const releaseStart = Math.max(splitSample, peakBIdx * windowSize - lead);
	let releaseEndWindow = envelope.length - 1;
	const tailThreshold = peakBVal * 0.08;
	while (releaseEndWindow > peakBIdx && envelope[releaseEndWindow] < tailThreshold) {
		releaseEndWindow -= 1;
	}
	const releaseEnd = Math.min(channel.length, (releaseEndWindow + 1) * windowSize + tail);

	return {
		press: sliceBuffer(ctx, buffer, pressStart, pressEnd),
		release: sliceBuffer(ctx, buffer, releaseStart, releaseEnd)
	};
}

function loadAll(): Promise<void> {
	if (loadPromise) return loadPromise;
	const ctx = getContext();
	if (!ctx) {
		loadPromise = Promise.resolve();
		return loadPromise;
	}

	loadPromise = (async () => {
		const [rawClick, ...rawKeys] = await Promise.all([
			fetchBuffer(ctx, CLICK_URL),
			...KEY_URLS.map((url) => fetchBuffer(ctx, url))
		]);
		if (rawClick) clickBuffer = trimSilence(ctx, rawClick);
		keyBuffers = rawKeys
			.filter((b): b is AudioBuffer => Boolean(b))
			.map((b) => splitKeySample(ctx, b));
	})();

	return loadPromise;
}

async function ensureContextRunning(ctx: AudioContext): Promise<boolean> {
	if (ctx.state === 'running') return true;
	try {
		await ctx.resume();
		return true;
	} catch {
		return false;
	}
}

async function fire(buffer: AudioBuffer, rate = 1) {
	const ctx = getContext();
	if (!ctx || !masterGain) return;
	if (!(await ensureContextRunning(ctx))) return;
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.playbackRate.value = rate;
	source.connect(masterGain);
	source.start();
}

export function playClick(kind: ClickKind) {
	if (clickBuffer) {
		void fire(clickBuffer, CLICK_RATE[kind]);
		return;
	}
	void loadAll().then(() => {
		if (clickBuffer) void fire(clickBuffer, CLICK_RATE[kind]);
	});
}

export function playKey(phase: KeyPhase) {
	if (keyBuffers.length === 0) {
		void loadAll().then(() => {
			if (keyBuffers.length > 0) playKey(phase);
		});
		return;
	}

	if (phase === 'press') {
		const idx = keyRotateIdx % keyBuffers.length;
		keyRotateIdx = (keyRotateIdx + 1) % keyBuffers.length;
		lastKeyPressIdx = idx;
		void fire(keyBuffers[idx].press);
	} else {
		void fire(keyBuffers[lastKeyPressIdx].release);
	}
}

export async function unlockClickAudio() {
	const ctx = getContext();
	if (ctx) await ensureContextRunning(ctx);
	await loadAll();
}
