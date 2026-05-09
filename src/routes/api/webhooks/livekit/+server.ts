import { error, json } from '@sveltejs/kit';
import { WebhookReceiver } from 'livekit-server-sdk';
import { endUsageSession, startUsageSession } from '$lib/server/billing';
import { getLiveKitEnv } from '$lib/server/env';
import type { RequestHandler } from './$types';

function participantSessionId(roomId: string, participantId: string) {
	return `livekit:participant:${roomId}:${participantId}`;
}

function roomSessionId(roomId: string) {
	return `livekit:room:${roomId}`;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const authHeader = request.headers.get('Authorization') ?? undefined;
	const { livekitApiKey, livekitApiSecret } = getLiveKitEnv();
	const receiver = new WebhookReceiver(livekitApiKey, livekitApiSecret);
	const event = await receiver.receive(body, authHeader).catch((cause) => {
		error(401, cause instanceof Error ? cause.message : 'Invalid LiveKit webhook');
	});

	const roomId = event.room?.name;
	const participantId = event.participant?.identity;

	if (!roomId) {
		return json({ ok: true, ignored: true });
	}

	if (event.event === 'room_started') {
		await startUsageSession({
			sessionId: roomSessionId(roomId),
			roomId,
			kind: 'livekit_room',
			startedAt: Number(event.createdAt) || Date.now(),
			source: 'livekit_webhook'
		});
	}

	if (event.event === 'room_finished') {
		await endUsageSession({
			sessionId: roomSessionId(roomId),
			endedAt: Number(event.createdAt) || Date.now(),
			source: 'livekit_webhook'
		});
	}

	if (participantId && event.event === 'participant_joined') {
		await startUsageSession({
			sessionId: participantSessionId(roomId, participantId),
			roomId,
			participantId,
			kind: 'livekit_participant',
			startedAt: Number(event.createdAt) || Date.now(),
			source: 'livekit_webhook'
		});
	}

	if (
		participantId &&
		(event.event === 'participant_left' || event.event === 'participant_connection_aborted')
	) {
		await endUsageSession({
			sessionId: participantSessionId(roomId, participantId),
			endedAt: Number(event.createdAt) || Date.now(),
			source: 'livekit_webhook'
		});
	}

	return json({ ok: true });
};
