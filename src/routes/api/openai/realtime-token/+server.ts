import { error, json } from '@sveltejs/kit';
import { isSupportedLanguage } from '$lib/constants/languages';
import { getAccountId, getEntitlement } from '$lib/server/access';
import { endUsageSession, startUsageSession } from '$lib/server/billing';
import { createRealtimeClientSecret } from '$lib/server/openai';
import { assertParticipant } from '$lib/server/roomAuth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const body = await request.json().catch(() => null);

	if (!body?.roomId || !body?.participantId || !isSupportedLanguage(body.targetLanguage)) {
		error(400, 'Invalid realtime token request');
	}

	const { room } = await assertParticipant(body.roomId, body.participantId);
	const openaiApiKey =
		typeof body.openaiApiKey === 'string' && body.openaiApiKey.startsWith('sk-')
			? body.openaiApiKey
			: undefined;

	if (!openaiApiKey && room.accessMode === 'byok') {
		error(402, 'OpenAI API key is required for this room');
	}

	if (!openaiApiKey && room.accessMode !== 'test') {
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

	const sessionId =
		typeof body.usageSessionId === 'string'
			? body.usageSessionId
			: `openai:${body.roomId}:${body.participantId}:${crypto.randomUUID()}`;

	try {
		await startUsageSession({
			sessionId,
			accountId: room.accountId,
			roomId: body.roomId,
			participantId: body.participantId,
			kind: 'openai_session',
			source: openaiApiKey ? 'byok_openai_token' : 'hosted_openai_token'
		});
		const token = await createRealtimeClientSecret({
			targetLanguage: body.targetLanguage,
			openaiApiKey
		});
		return json({ ...token, usageSessionId: sessionId });
	} catch (cause) {
		await endUsageSession({ sessionId, source: 'openai_token_failed' }).catch(() => null);
		error(502, cause instanceof Error ? cause.message : 'Could not create Realtime token');
	}
};
