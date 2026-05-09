import { error, json } from '@sveltejs/kit';
import { getAccountId, getEntitlement } from '$lib/server/access';
import { createLiveKitToken } from '$lib/server/livekit';
import { assertParticipant } from '$lib/server/roomAuth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const body = await request.json().catch(() => null);

	if (!body?.roomId || !body?.participantId) {
		error(400, 'roomId and participantId are required');
	}

	const { room } = await assertParticipant(body.roomId, body.participantId);

	if (room.accessMode === 'subscription' || room.accessMode === 'trial') {
		const accountId = room.accountId ?? getAccountId(cookies);
		if (!accountId) {
			error(402, 'Subscription account is required');
		}
		const entitlement = await getEntitlement(accountId);
		if (!entitlement.active || entitlement.remainingMinutes <= 0) {
			error(
				402,
				room.accessMode === 'trial'
					? 'No trial minutes remaining'
					: 'No subscription minutes remaining'
			);
		}
		if (
			room.accessMode === 'subscription' &&
			entitlement.kind !== 'subscription' &&
			entitlement.kind !== 'admin'
		) {
			error(402, 'Subscription is required');
		}
	}

	return json(await createLiveKitToken({ roomId: body.roomId, participantId: body.participantId }));
};
