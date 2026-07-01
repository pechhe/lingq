import { error, json } from '@sveltejs/kit';
import { isSupportedLanguage } from '$lib/constants/languages';
import {
	createAnonymousAccountId,
	ensureBillingAccount,
	getEntitlement,
	getRequestAccount,
	setAccountCookie
} from '$lib/server/access';
import { endUsageSession, startUsageSession } from '$lib/server/billing';
import { createRealtimeClientSecret } from '$lib/server/openai';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals, request }) => {
	const body = await request.json().catch(() => null);

	if (!isSupportedLanguage(body?.targetLanguage)) {
		error(400, 'Invalid realtime token request');
	}

	const openaiApiKey =
		typeof body.openaiApiKey === 'string' && body.openaiApiKey.startsWith('sk-')
			? body.openaiApiKey
			: undefined;

	const requestAccount = await getRequestAccount({ cookies, token: locals.token });
	let accountId = requestAccount?.accountId;

	if (!accountId) {
		accountId = createAnonymousAccountId();
		setAccountCookie(cookies, accountId);
	}

	await ensureBillingAccount({
		accountId,
		email: requestAccount?.email,
		trialAllowanceMinutes: 2,
		adminFullAccess:
			requestAccount?.isAdmin || requestAccount?.email?.toLowerCase() === 'hfpetch@gmail.com'
	});

	if (!openaiApiKey) {
		const entitlement = await getEntitlement(accountId);
		if (!entitlement.active || entitlement.remainingMinutes <= 0) {
			error(402, 'Add an OpenAI key or subscribe before using one-phone mode');
		}
	}

	const sessionId =
		typeof body?.usageSessionId === 'string'
			? body.usageSessionId
			: `openai:one-phone:${accountId}:${crypto.randomUUID()}`;

	try {
		await startUsageSession({
			sessionId,
			accountId,
			roomId: 'one-phone',
			participantId:
				typeof body?.participantId === 'string' ? body.participantId.slice(0, 80) : undefined,
			kind: 'openai_session',
			source: openaiApiKey ? 'byok_one_phone_token' : 'hosted_one_phone_token'
		});
		const token = await createRealtimeClientSecret({
			targetLanguage: body.targetLanguage,
			openaiApiKey,
			// One-phone mode shares a single handset between two speakers, so the
			// mic is further from the mouth than a normal close-talking phone.
			noiseReduction: 'far_field'
		});
		return json({ ...token, usageSessionId: sessionId });
	} catch (cause) {
		await endUsageSession({ sessionId, source: 'one_phone_token_failed' }).catch(() => null);
		error(502, cause instanceof Error ? cause.message : 'Could not create Realtime token');
	}
};
