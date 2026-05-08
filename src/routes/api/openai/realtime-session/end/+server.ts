import { error, json } from '@sveltejs/kit';
import { endUsageSession } from '$lib/server/billing';

export async function POST({ request }) {
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
}
