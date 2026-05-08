import { error, json } from '@sveltejs/kit';
import { isSupportedLanguage } from '$lib/constants/languages';
import { createRealtimeClientSecret } from '$lib/server/openai';
import { assertParticipant } from '$lib/server/roomAuth';

export async function POST({ request }) {
	const body = await request.json().catch(() => null);

	if (!body?.roomId || !body?.participantId || !isSupportedLanguage(body.targetLanguage)) {
		error(400, 'Invalid realtime token request');
	}

	await assertParticipant(body.roomId, body.participantId);

	try {
		return json(
			await createRealtimeClientSecret({
				targetLanguage: body.targetLanguage
			})
		);
	} catch (cause) {
		error(502, cause instanceof Error ? cause.message : 'Could not create Realtime token');
	}
}
