import { error, json } from '@sveltejs/kit';
import { createLiveKitToken } from '$lib/server/livekit';
import { assertParticipant } from '$lib/server/roomAuth';

export async function POST({ request }) {
	const body = await request.json().catch(() => null);

	if (!body?.roomId || !body?.participantId) {
		error(400, 'roomId and participantId are required');
	}

	await assertParticipant(body.roomId, body.participantId);

	return json(await createLiveKitToken({ roomId: body.roomId, participantId: body.participantId }));
}
