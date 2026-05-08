export async function requestMicrophone() {
	return await navigator.mediaDevices.getUserMedia({
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true
		}
	});
}

export function stopStream(stream?: MediaStream) {
	stream?.getTracks().forEach((track) => track.stop());
}

export async function unlockAudioPlayback() {
	const audioContext = new AudioContext();
	if (audioContext.state === 'suspended') {
		await audioContext.resume();
	}
	await audioContext.close();
}
