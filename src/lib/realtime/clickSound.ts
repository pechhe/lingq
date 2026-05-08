type ClickKind = 'down' | 'up';

let context: AudioContext | undefined;
let masterGain: GainNode | undefined;

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

export function playClick(kind: ClickKind) {
	const ctx = getContext();
	if (!ctx || !masterGain) return;
	if (ctx.state === 'suspended') {
		void ctx.resume().catch(() => {});
	}

	const now = ctx.currentTime;
	const params =
		kind === 'down'
			? {
					oscStart: 1800,
					oscEnd: 520,
					oscPeak: 0.22,
					oscDecay: 0.05,
					noiseFreq: 3400,
					noisePeak: 0.32,
					noiseEnv: 0.012
				}
			: {
					oscStart: 950,
					oscEnd: 320,
					oscPeak: 0.16,
					oscDecay: 0.07,
					noiseFreq: 2100,
					noisePeak: 0.18,
					noiseEnv: 0.018
				};

	const osc = ctx.createOscillator();
	osc.type = 'square';
	osc.frequency.setValueAtTime(params.oscStart, now);
	osc.frequency.exponentialRampToValueAtTime(params.oscEnd, now + params.oscDecay);

	const oscGain = ctx.createGain();
	oscGain.gain.setValueAtTime(0, now);
	oscGain.gain.linearRampToValueAtTime(params.oscPeak, now + 0.001);
	oscGain.gain.exponentialRampToValueAtTime(0.0001, now + params.oscDecay);

	osc.connect(oscGain).connect(masterGain);
	osc.start(now);
	osc.stop(now + params.oscDecay + 0.02);

	const noiseDuration = 0.05;
	const noiseLen = Math.max(1, Math.floor(ctx.sampleRate * noiseDuration));
	const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	const decaySamples = Math.max(1, Math.floor(ctx.sampleRate * params.noiseEnv));
	for (let i = 0; i < noiseLen; i += 1) {
		data[i] = (Math.random() * 2 - 1) * Math.exp(-i / decaySamples);
	}

	const noise = ctx.createBufferSource();
	noise.buffer = buffer;

	const filter = ctx.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.value = params.noiseFreq;
	filter.Q.value = 1.6;

	const noiseGain = ctx.createGain();
	noiseGain.gain.value = params.noisePeak;

	noise.connect(filter).connect(noiseGain).connect(masterGain);
	noise.start(now);
	noise.stop(now + noiseDuration + 0.01);
}

export function unlockClickAudio() {
	const ctx = getContext();
	if (ctx?.state === 'suspended') {
		void ctx.resume().catch(() => {});
	}
}
