export type OutputPanMode = 'left' | 'right' | 'both';

export function getStereoPanValue(mode: OutputPanMode) {
	return mode === 'left' ? -1 : mode === 'right' ? 1 : 0;
}

let sharedAudioContext: AudioContext | undefined;

async function getSharedAudioContext(): Promise<AudioContext> {
	const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
	if (!AudioContextCtor) {
		throw new Error('Web Audio is not available in this browser.');
	}

	if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
		sharedAudioContext = new AudioContextCtor();
	}
	if (sharedAudioContext.state === 'suspended') {
		await sharedAudioContext.resume();
	}
	return sharedAudioContext;
}

export class StereoOutputRouter {
	#source?: MediaStreamAudioSourceNode;
	#panner?: StereoPannerNode;
	#keepAliveElement?: HTMLAudioElement;
	#fallbackElement?: HTMLAudioElement;

	async unlock() {
		await getSharedAudioContext();
	}

	async play(stream: MediaStream, mode: OutputPanMode) {
		this.stop();
		const audioContext = await getSharedAudioContext();

		// Chromium bug: audio from a remote WebRTC MediaStream is silent inside
		// a Web Audio graph unless the stream is also attached to a media
		// element. Keep a muted element alive as a sink (crbug.com/121673).
		const keepAlive = new Audio();
		keepAlive.muted = true;
		keepAlive.setAttribute('playsinline', '');
		keepAlive.srcObject = stream;
		void keepAlive.play().catch(() => {});
		this.#keepAliveElement = keepAlive;

		const source = audioContext.createMediaStreamSource(stream);
		const panner = audioContext.createStereoPanner();
		panner.pan.value = getStereoPanValue(mode);
		source.connect(panner).connect(audioContext.destination);

		this.#source = source;
		this.#panner = panner;
	}

	async playFallback(stream: MediaStream) {
		this.#fallbackElement?.pause();
		const audioElement = new Audio();
		audioElement.autoplay = true;
		audioElement.setAttribute('playsinline', '');
		audioElement.srcObject = stream;
		await audioElement.play();
		this.#fallbackElement = audioElement;
	}

	setMode(mode: OutputPanMode) {
		if (!this.#panner) return;
		this.#panner.pan.value = getStereoPanValue(mode);
	}

	stop() {
		this.#source?.disconnect();
		this.#panner?.disconnect();
		this.#keepAliveElement?.pause();
		if (this.#keepAliveElement) this.#keepAliveElement.srcObject = null;
		this.#fallbackElement?.pause();
		if (this.#fallbackElement) this.#fallbackElement.srcObject = null;
		this.#source = undefined;
		this.#panner = undefined;
		this.#keepAliveElement = undefined;
		this.#fallbackElement = undefined;
	}

	close() {
		this.stop();
	}
}

declare global {
	interface Window {
		webkitAudioContext?: typeof AudioContext;
	}
}
