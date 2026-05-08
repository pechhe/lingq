import {
	DisconnectReason,
	Room,
	RoomEvent,
	Track,
	type LocalTrackPublication,
	type Participant,
	type RemoteAudioTrack,
	type RemoteParticipant,
	type RemoteTrack,
	type RemoteTrackPublication,
	type TrackPublication
} from 'livekit-client';

export type LiveKitRoomClientOptions = {
	roomId: string;
	participantId: string;
	onParticipantCount?: (count: number) => void;
	onRemoteMicrophone?: (track: MediaStreamTrack, publication: RemoteTrackPublication) => void;
	onRemoteMicrophoneMuted?: () => void;
	onRemoteMicrophoneUnmuted?: (publication: TrackPublication) => void;
	onStatus?: (status: string) => void;
	onError?: (error: Error) => void;
};

export class LiveKitRoomClient {
	#room = new Room({ adaptiveStream: true, dynacast: true });
	#options: LiveKitRoomClientOptions;
	#publishedMicrophoneTrack?: MediaStreamTrack;
	#publishedMicrophone?: LocalTrackPublication;

	constructor(options: LiveKitRoomClientOptions) {
		this.#options = options;
	}

	get room() {
		return this.#room;
	}

	async connect() {
		const response = await fetch('/api/livekit-token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				roomId: this.#options.roomId,
				participantId: this.#options.participantId
			})
		});

		if (!response.ok) {
			throw new Error(await response.text());
		}

		const { url, token } = await response.json();
		this.#wireEvents();
		this.#options.onStatus?.('connecting');
		await this.#room.connect(url, token, { autoSubscribe: true });
		this.#options.onStatus?.('connected');
		this.#emitParticipantCount();
	}

	async publishMicrophoneTrack(track: MediaStreamTrack) {
		if (this.#publishedMicrophoneTrack?.id === track.id) return;

		if (this.#publishedMicrophoneTrack) {
			this.#room.localParticipant.unpublishTrack(this.#publishedMicrophoneTrack);
		}

		track.enabled = false;
		this.#publishedMicrophoneTrack = track;
		this.#publishedMicrophone = await this.#room.localParticipant.publishTrack(track, {
			name: `microphone-${this.#options.participantId}`,
			source: Track.Source.Microphone
		});
		await this.#publishedMicrophone.mute();
	}

	setMicrophoneEnabled(enabled: boolean) {
		if (enabled) {
			void this.#publishedMicrophone?.unmute();
		} else {
			void this.#publishedMicrophone?.mute();
		}
	}

	disconnect() {
		if (this.#publishedMicrophoneTrack) {
			this.#room.localParticipant.unpublishTrack(this.#publishedMicrophoneTrack);
			this.#publishedMicrophoneTrack = undefined;
			this.#publishedMicrophone = undefined;
		}
		this.#room.disconnect();
	}

	#wireEvents() {
		this.#room.on(RoomEvent.ParticipantConnected, () => this.#emitParticipantCount());
		this.#room.on(RoomEvent.ParticipantDisconnected, () => this.#emitParticipantCount());
		this.#room.on(
			RoomEvent.TrackSubscribed,
			(track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
				if (
					track.kind !== Track.Kind.Audio ||
					participant.identity === this.#options.participantId
				) {
					return;
				}

				if (publication.source !== Track.Source.Microphone) return;

				this.#options.onRemoteMicrophone?.(
					(track as RemoteAudioTrack).mediaStreamTrack,
					publication
				);
			}
		);
		this.#room.on(
			RoomEvent.TrackUnmuted,
			(publication: TrackPublication, participant: Participant) => {
				if (
					participant.identity === this.#options.participantId ||
					publication.kind !== Track.Kind.Audio ||
					publication.source !== Track.Source.Microphone
				) {
					return;
				}

				this.#options.onRemoteMicrophoneUnmuted?.(publication);
			}
		);
		this.#room.on(
			RoomEvent.TrackMuted,
			(publication: TrackPublication, participant: Participant) => {
				if (
					participant.identity === this.#options.participantId ||
					publication.kind !== Track.Kind.Audio ||
					publication.source !== Track.Source.Microphone
				) {
					return;
				}

				this.#options.onRemoteMicrophoneMuted?.();
			}
		);
		this.#room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
			this.#options.onStatus?.(`disconnected:${reason ?? 'unknown'}`);
		});
	}

	#emitParticipantCount() {
		this.#options.onParticipantCount?.(this.#room.remoteParticipants.size + 1);
	}
}
