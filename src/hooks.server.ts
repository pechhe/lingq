import type { Handle } from '@sveltejs/kit';
import { withServerConvexToken } from '@mmailaender/convex-svelte/sveltekit/server';
import { getToken } from '$lib/convex-better-auth-sveltekit';

export const handle: Handle = async ({ event, resolve }) => {
	const token = getToken(event.cookies);
	event.locals.token = token;
	return withServerConvexToken(token, () => resolve(event));
};
