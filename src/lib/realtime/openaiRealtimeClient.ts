export type TranslationOutputState = 'streaming' | 'complete' | 'interrupted';

export type OpenAIRealtimeClientOptions = {
	roomId: string;
	participantId: string;
	targetLanguage: string;
	openAITranslationLanguage: string;
	sourceTrack: MediaStreamTrack;
	tokenEndpoint?: string;
	onTranslatedAudio: (stream: MediaStream) => void | Promise<void>;
	onMetric?: (name: string) => void;
	onOutputState?: (state: TranslationOutputState) => void;
	onRealtimeEvent?: (type: string) => void;
	onStatus?: (status: string) => void;
	onError?: (error: Error) => void;
};

export const TRANSLATION_OUTPUT_IDLE_MS = 1200;

export function getTranslationOutputState(eventType: string): TranslationOutputState | undefined {
	if (
		eventType === 'session.output_audio.delta' ||
		eventType === 'session.output_transcript.delta'
	) {
		return 'streaming';
	}
	if (
		eventType === 'session.closed' ||
		eventType === 'session.output_audio.done' ||
		eventType === 'session.output_transcript.done'
	) {
		return 'complete';
	}
	return undefined;
}

function getStoredOpenAIKey() {
	try {
		return localStorage.getItem('lingk:openai-api-key') || undefined;
	} catch {
		return undefined;
	}
}

export class OpenAIRealtimeClient {
	#pc?: RTCPeerConnection;
	#dataChannel?: RTCDataChannel;
	#sourceTrack: MediaStreamTrack;
	#options: OpenAIRealtimeClientOptions;
	#usageSessionId = '';
	#outputIdleTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(options: OpenAIRealtimeClientOptions) {
		this.#options = options;
		this.#sourceTrack = options.sourceTrack;
	}

	async connect() {
		this.#options.onMetric?.('openai_connect_start');
		this.#options.onStatus?.('fetching_token');
		this.#options.onMetric?.('openai_token_start');
		const usageSessionId = `openai:${this.#options.roomId}:${this.#options.participantId}:${crypto.randomUUID()}`;
		const tokenResponse = await fetch(this.#options.tokenEndpoint ?? '/api/openai/realtime-token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				roomId: this.#options.roomId,
				participantId: this.#options.participantId,
				targetLanguage: this.#options.targetLanguage,
				openaiApiKey: getStoredOpenAIKey(),
				usageSessionId
			})
		});

		if (!tokenResponse.ok) {
			throw new Error(await tokenResponse.text());
		}

		this.#options.onRealtimeEvent?.(`token:${tokenResponse.status}`);
		const token = await tokenResponse.json();
		this.#usageSessionId = token.usageSessionId ?? usageSessionId;
		this.#options.onMetric?.('openai_token_end');
		const clientSecret = token?.value ?? token?.client_secret?.value;
		if (!clientSecret) {
			throw new Error('OpenAI Realtime token response did not include a client secret');
		}

		this.#options.onStatus?.('connecting');
		const pc = new RTCPeerConnection();
		this.#pc = pc;
		this.#dataChannel = pc.createDataChannel('oai-events');
		this.#dataChannel.onopen = () => {
			this.#options.onMetric?.('openai_data_channel_open');
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
		this.#dataChannel.onmessage = (event) => {
			void this.#handleRealtimeEvent(event.data);
		};
		pc.addTrack(this.#sourceTrack, new MediaStream([this.#sourceTrack]));

		pc.ontrack = (event) => {
			const stream =
				event.streams[0] ??
				(event.track.kind === 'audio' ? new MediaStream([event.track]) : undefined);
			if (stream) {
				this.#options.onMetric?.('openai_translated_track');
				void this.#options.onTranslatedAudio(stream);
			}
		};

		pc.onconnectionstatechange = () => {
			this.#options.onStatus?.(pc.connectionState);
			if (pc.connectionState === 'connected') {
				this.#options.onMetric?.('openai_peer_connected');
			}
			if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
				this.#options.onError?.(new Error(`OpenAI peer connection ${pc.connectionState}`));
			}
		};

		this.#options.onMetric?.('openai_offer_start');
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		this.#options.onMetric?.('openai_offer_end');

		this.#options.onMetric?.('openai_sdp_start');
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
		this.#options.onRealtimeEvent?.(`sdp:${sdpResponse.status}`);
		this.#options.onMetric?.('openai_sdp_end');

		await pc.setRemoteDescription({
			type: 'answer',
			sdp: await sdpResponse.text()
		});

		this.#options.onMetric?.('openai_remote_description_set');
		this.#options.onStatus?.('connected');
	}

	async reconnect() {
		this.disconnect();
		await this.connect();
	}

	disconnect() {
		const usageSessionId = this.#usageSessionId;
		this.#clearOutputIdleTimer();
		this.#dataChannel?.close();
		this.#pc?.close();
		this.#dataChannel = undefined;
		this.#pc = undefined;
		this.#usageSessionId = '';
		if (usageSessionId) {
			navigator.sendBeacon?.(
				'/api/openai/realtime-session/end',
				new Blob([JSON.stringify({ usageSessionId })], { type: 'application/json' })
			);
		}
	}

	#sendEvent(event: Record<string, unknown>) {
		if (this.#dataChannel?.readyState === 'open') {
			this.#dataChannel.send(JSON.stringify(event));
		}
	}

	#clearOutputIdleTimer() {
		if (this.#outputIdleTimer) {
			clearTimeout(this.#outputIdleTimer);
			this.#outputIdleTimer = undefined;
		}
	}

	#markOutputStreaming() {
		this.#clearOutputIdleTimer();
		this.#options.onOutputState?.('streaming');
		this.#outputIdleTimer = setTimeout(() => {
			this.#outputIdleTimer = undefined;
			this.#options.onOutputState?.('complete');
		}, TRANSLATION_OUTPUT_IDLE_MS);
	}

	#markOutputComplete() {
		this.#clearOutputIdleTimer();
		this.#options.onOutputState?.('complete');
	}

	async #handleRealtimeEvent(payload: unknown) {
		const text =
			typeof payload === 'string' ? payload : payload instanceof Blob ? await payload.text() : '';
		if (!text) return;

		try {
			const event = JSON.parse(text) as { type?: unknown };
			if (typeof event.type !== 'string') return;

			this.#options.onRealtimeEvent?.(event.type);
			if (event.type === 'session.output_audio.delta') {
				this.#options.onMetric?.('openai_first_output_audio_delta');
			}
			if (event.type === 'session.output_transcript.delta') {
				this.#options.onMetric?.('openai_first_output_transcript_delta');
			}

			const outputState = getTranslationOutputState(event.type);
			if (outputState === 'streaming') {
				this.#markOutputStreaming();
			} else if (outputState === 'complete') {
				this.#markOutputComplete();
			}
		} catch {
			// Ignore malformed diagnostics payloads.
		}
	}
}
