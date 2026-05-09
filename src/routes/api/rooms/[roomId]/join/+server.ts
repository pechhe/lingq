import { error, json } from '@sveltejs/kit';
import { isSupportedLanguage } from '$lib/constants/languages';
import { joinRoom } from '$lib/server/rooms';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json().catch(() => null);

	if (!body || !params.roomId || !isSupportedLanguage(body.spokenLanguage)) {
		error(400, 'Invalid join request');
	}

	try {
		return json(
			await joinRoom({
				roomId: params.roomId,
				spokenLanguage: body.spokenLanguage,
				hearLanguage: body.spokenLanguage,
				participantId: typeof body.participantId === 'string' ? body.participantId : undefined
			})
		);
	} catch (cause) {
		error(409, cause instanceof Error ? cause.message : 'Could not join room');
	}
};
