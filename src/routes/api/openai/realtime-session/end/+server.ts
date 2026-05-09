import { error, json } from '@sveltejs/kit';
import { endUsageSession } from '$lib/server/billing';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);

	if (typeof body?.usageSessionId !== 'string') {
		error(400, 'usageSessionId is required');
	}

	return json(
		await endUsageSession({
			sessionId: body.usageSessionId,
			source: 'browser_openai_disconnect'
		})
	);
};
