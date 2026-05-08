export interface AudioLevelMeter {
	level: () => number;
	stop: () => void;
}

export function createAudioLevelMeter(stream: MediaStream): AudioLevelMeter {
	const AudioContextCtor: typeof AudioContext | undefined =
		typeof window === 'undefined'
			? undefined
			: (window.AudioContext ??
				(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);

	if (!AudioContextCtor) {
		return { level: () => 0, stop: () => {} };
	}

	const context = new AudioContextCtor();
	const source = context.createMediaStreamSource(stream);
	const analyser = context.createAnalyser();
	analyser.fftSize = 512;
	analyser.smoothingTimeConstant = 0.65;

	source.connect(analyser);

	const buffer = new Uint8Array(analyser.fftSize);

	let stopped = false;

	function read(): number {
		if (stopped) return 0;
		analyser.getByteTimeDomainData(buffer);
		let sumSquares = 0;
		for (let index = 0; index < buffer.length; index += 1) {
			const centered = (buffer[index] - 128) / 128;
			sumSquares += centered * centered;
		}
		const rms = Math.sqrt(sumSquares / buffer.length);
		return Math.min(1, rms * 2.4);
	}

	function stop() {
		if (stopped) return;
		stopped = true;
		try {
			source.disconnect();
			analyser.disconnect();
		} catch {
			// no-op
		}
		void context.close().catch(() => {});
	}

	return { level: read, stop };
}
