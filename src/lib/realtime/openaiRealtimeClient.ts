export type OpenAIRealtimeClientOptions = {
	roomId: string;
	participantId: string;
	targetLanguage: string;
	openAITranslationLanguage: string;
	sourceTrack: MediaStreamTrack;
	onTranslatedAudio: (stream: MediaStream) => void | Promise<void>;
	onStatus?: (status: string) => void;
	onError?: (error: Error) => void;
};

export class OpenAIRealtimeClient {
	#pc?: RTCPeerConnection;
	#dataChannel?: RTCDataChannel;
	#sourceTrack: MediaStreamTrack;
	#options: OpenAIRealtimeClientOptions;

	constructor(options: OpenAIRealtimeClientOptions) {
		this.#options = options;
		this.#sourceTrack = options.sourceTrack;
	}

	async connect() {
		this.#options.onStatus?.('fetching_token');
		const tokenResponse = await fetch('/api/openai/realtime-token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				roomId: this.#options.roomId,
				participantId: this.#options.participantId,
				targetLanguage: this.#options.targetLanguage
			})
		});

		if (!tokenResponse.ok) {
			throw new Error(await tokenResponse.text());
		}

		const token = await tokenResponse.json();
		const clientSecret = token?.value ?? token?.client_secret?.value;
		if (!clientSecret) {
			throw new Error('OpenAI Realtime token response did not include a client secret');
		}

		this.#options.onStatus?.('connecting');
		const pc = new RTCPeerConnection();
		this.#pc = pc;
		this.#dataChannel = pc.createDataChannel('oai-events');
		this.#dataChannel.onopen = () => {
			this.#sendEvent({
				type: 'session.update',
				session: {
					audio: {
						output: {
							language: this.#options.openAITranslationLanguage
						}
					}
				}
			});
		};
		pc.addTrack(this.#sourceTrack, new MediaStream([this.#sourceTrack]));

		pc.ontrack = (event) => {
			const stream =
				event.streams[0] ??
				(event.track.kind === 'audio' ? new MediaStream([event.track]) : undefined);
			if (stream) {
				void this.#options.onTranslatedAudio(stream);
			}
		};

		pc.onconnectionstatechange = () => {
			this.#options.onStatus?.(pc.connectionState);
			if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
				this.#options.onError?.(new Error(`OpenAI peer connection ${pc.connectionState}`));
			}
		};

		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);

		const sdpResponse = await fetch('https://api.openai.com/v1/realtime/translations/calls', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${clientSecret}`,
				'Content-Type': 'application/sdp'
			},
			body: offer.sdp
		});

		if (!sdpResponse.ok) {
			throw new Error(`OpenAI SDP exchange failed with ${sdpResponse.status}`);
		}

		await pc.setRemoteDescription({
			type: 'answer',
			sdp: await sdpResponse.text()
		});

		this.#options.onStatus?.('connected');
	}

	async reconnect() {
		this.disconnect();
		await this.connect();
	}

	disconnect() {
		this.#dataChannel?.close();
		this.#pc?.close();
		this.#dataChannel = undefined;
		this.#pc = undefined;
	}

	#sendEvent(event: Record<string, unknown>) {
		if (this.#dataChannel?.readyState === 'open') {
			this.#dataChannel.send(JSON.stringify(event));
		}
	}
}
