import { AccessToken } from 'livekit-server-sdk';
import { getLiveKitEnv } from './env';

export async function createLiveKitToken(input: { roomId: string; participantId: string }) {
	const { livekitApiKey, livekitApiSecret, livekitUrl } = getLiveKitEnv();
	const token = new AccessToken(livekitApiKey, livekitApiSecret, {
		identity: input.participantId,
		ttl: '45m'
	});

	token.addGrant({
		room: input.roomId,
		roomJoin: true,
		canPublish: true,
		canPublishData: true,
		canSubscribe: true
	});

	return {
		url: livekitUrl,
		token: await token.toJwt()
	};
}
