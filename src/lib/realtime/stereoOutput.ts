export type OutputPanMode = 'left' | 'right' | 'both';

export function getStereoPanValue(mode: OutputPanMode) {
	return mode === 'left' ? -1 : mode === 'right' ? 1 : 0;
}

export class StereoOutputRouter {
	#audioContext?: AudioContext;
	#source?: MediaStreamAudioSourceNode;
	#panner?: StereoPannerNode;
	#fallbackElement?: HTMLAudioElement;

	async unlock() {
		const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
		if (!AudioContextCtor) {
			throw new Error('Web Audio is not available in this browser.');
		}

		this.#audioContext ??= new AudioContextCtor();
		if (this.#audioContext.state === 'suspended') {
			await this.#audioContext.resume();
		}
	}

	async play(stream: MediaStream, mode: OutputPanMode) {
		this.stop();
		await this.unlock();
		const audioContext = this.#audioContext;
		if (!audioContext) return;

		const source = audioContext.createMediaStreamSource(stream);
		const panner = audioContext.createStereoPanner();
		panner.pan.value = getStereoPanValue(mode);
		source.connect(panner).connect(audioContext.destination);

		this.#audioContext = audioContext;
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
		this.#fallbackElement?.pause();
		if (this.#fallbackElement) this.#fallbackElement.srcObject = null;
		this.#source = undefined;
		this.#panner = undefined;
		this.#fallbackElement = undefined;
	}

	close() {
		this.stop();
		const audioContext = this.#audioContext;
		this.#audioContext = undefined;
		void audioContext?.close().catch(() => {});
	}
}

declare global {
	interface Window {
		webkitAudioContext?: typeof AudioContext;
	}
}
