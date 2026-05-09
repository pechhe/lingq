import { error, json } from '@sveltejs/kit';
import { isSupportedLanguage } from '$lib/constants/languages';
import {
	createAnonymousAccountId,
	ensureBillingAccount,
	getEntitlement,
	getRequestAccount,
	setAccountCookie
} from '$lib/server/access';
import { createRoom } from '$lib/server/rooms';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals, request, url }) => {
	try {
		const body = await request.json().catch(() => null);

		const spokenLanguage = body?.spokenLanguage ?? 'en';
		const hasOpenAIKey = body?.hasOpenAIKey === true;
		const requestedAccessMode =
			body?.accessMode === 'trial' || body?.accessMode === 'test' ? body.accessMode : undefined;

		if (!isSupportedLanguage(spokenLanguage)) {
			error(400, 'Invalid language');
		}

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

		const accessMode = hasOpenAIKey
			? 'byok'
			: requestedAccessMode === 'trial'
				? 'trial'
				: requestedAccessMode === 'test'
					? 'test'
					: 'subscription';

		if (accessMode !== 'byok' && accessMode !== 'test') {
			const entitlement = await getEntitlement(accountId);
			const isAdmin = entitlement.kind === 'admin';
			if (!entitlement.active || entitlement.remainingMinutes <= 0) {
				error(
					402,
					accessMode === 'trial'
						? 'Your trial minutes have been used'
						: 'Add an OpenAI key or subscribe before creating a room'
				);
			}
			if (accessMode === 'subscription' && entitlement.kind !== 'subscription' && !isAdmin) {
				error(402, 'Subscribe before creating a paid room');
			}
		}

		return json(
			await createRoom({
				spokenLanguage,
				hearLanguage: spokenLanguage,
				origin: url.origin,
				accountId,
				accessMode
			})
		);
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'status' in cause) {
			throw cause;
		}

		console.error('Room creation failed', cause);
		return new Response('Room service is temporarily unavailable. Check the Convex deployment.', {
			status: 503
		});
	}
};
