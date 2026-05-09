const MIC_STORAGE_KEY = 'lingk:mic-input';

const EXTERNAL_MIC_PATTERN =
	/airpods|bluetooth|headphone|headset|earbuds|speakerphone|hands[- ]?free|carplay|external/i;

const STANDARD_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
	echoCancellation: true,
	noiseSuppression: true,
	autoGainControl: true
};

export async function requestMicrophone(deviceId?: string): Promise<MediaStream> {
	if (deviceId) {
		return navigator.mediaDevices.getUserMedia({
			audio: { ...STANDARD_AUDIO_CONSTRAINTS, deviceId: { exact: deviceId } }
		});
	}

	const initialStream = await navigator.mediaDevices.getUserMedia({
		audio: STANDARD_AUDIO_CONSTRAINTS
	});

	const targetId = await pickPreferredMicId();
	if (!targetId) return initialStream;

	const currentId = initialStream.getAudioTracks()[0]?.getSettings().deviceId;
	if (currentId === targetId) return initialStream;

	stopStream(initialStream);
	return navigator.mediaDevices.getUserMedia({
		audio: { ...STANDARD_AUDIO_CONSTRAINTS, deviceId: { exact: targetId } }
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

export async function listMicrophones(): Promise<MediaDeviceInfo[]> {
	if (typeof navigator === 'undefined') return [];
	if (typeof navigator.mediaDevices?.enumerateDevices !== 'function') return [];
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices.filter((device) => device.kind === 'audioinput');
}

export function readStoredMicId(): string | undefined {
	if (typeof localStorage === 'undefined') return undefined;
	try {
		const stored = localStorage.getItem(MIC_STORAGE_KEY);
		return stored && stored !== 'default' ? stored : undefined;
	} catch {
		return undefined;
	}
}

export function persistMicSelection(deviceId: string) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(MIC_STORAGE_KEY, deviceId);
	} catch {
		// no-op
	}
}

export function isExternalMicLabel(label: string): boolean {
	return EXTERNAL_MIC_PATTERN.test(label);
}

async function pickPreferredMicId(): Promise<string | undefined> {
	const inputs = await listMicrophones();
	if (inputs.length === 0) return undefined;

	const stored = readStoredMicId();
	if (stored && inputs.some((device) => device.deviceId === stored)) {
		return stored;
	}

	const builtIn = inputs.find(
		(device) =>
			device.deviceId !== 'default' &&
			device.deviceId !== 'communications' &&
			device.label &&
			!isExternalMicLabel(device.label)
	);
	return builtIn?.deviceId;
}
