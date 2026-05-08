import { error, json } from '@sveltejs/kit';
import { isSupportedLanguage } from '$lib/constants/languages';
import { createRoom } from '$lib/server/rooms';

export async function POST({ request, url }) {
	const body = await request.json().catch(() => null);

	const spokenLanguage = body?.spokenLanguage ?? 'en';

	if (!isSupportedLanguage(spokenLanguage)) {
		error(400, 'Invalid language');
	}

	return json(
		await createRoom({
			spokenLanguage,
			hearLanguage: spokenLanguage,
			origin: url.origin
		})
	);
}
