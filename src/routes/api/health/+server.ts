import { json } from '@sveltejs/kit';
import { getHealthConfig } from '$lib/server/env';

export function GET() {
	return json({
		ok: true,
		dependencies: getHealthConfig()
	});
}
