import { error, redirect } from '@sveltejs/kit';
import {
	createAnonymousAccountId,
	ensureBillingAccount,
	getRequestAccount,
	setAccountCookie
} from '$lib/server/access';
import { createRoom } from '$lib/server/rooms';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	try {
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
			adminFullAccess: requestAccount?.isAdmin
		});

		const room = await createRoom({
			spokenLanguage: 'en',
			hearLanguage: 'en',
			origin: url.origin,
			accountId,
			accessMode: 'test'
		});

		redirect(303, `/room/${room.roomId}`);
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'status' in cause) {
			throw cause;
		}

		console.error('Demo room creation failed', cause);
		error(503, 'Room service is temporarily unavailable. Check the Convex deployment.');
	}
};
