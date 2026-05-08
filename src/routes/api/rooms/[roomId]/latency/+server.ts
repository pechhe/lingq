import { error, json } from '@sveltejs/kit';
import { recordLatencyEvents } from '$lib/server/rooms';

export async function POST({ params, request }) {
	const body = await request.json().catch(() => null);

	if (
		!params.roomId ||
		typeof body?.participantId !== 'string' ||
		typeof body?.traceId !== 'string' ||
		!Array.isArray(body?.events)
	) {
		error(400, 'Invalid latency payload');
	}

	const events = body.events
		.slice(0, 40)
		.map((event: { name?: unknown; elapsedMs?: unknown; at?: unknown }) => ({
			name: typeof event.name === 'string' ? event.name.slice(0, 80) : '',
			elapsedMs: typeof event.elapsedMs === 'number' ? event.elapsedMs : Number.NaN,
			at: typeof event.at === 'number' ? event.at : Number.NaN
		}))
		.filter(
			(event: { name: string; elapsedMs: number; at: number }) =>
				event.name && Number.isFinite(event.elapsedMs) && Number.isFinite(event.at)
		);

	if (!events.length) {
		return json({ ok: true, count: 0 });
	}

	try {
		return json(
			await recordLatencyEvents({
				roomId: params.roomId,
				participantId: body.participantId,
				traceId: body.traceId.slice(0, 80),
				events,
				userAgent: request.headers.get('user-agent') ?? undefined
			})
		);
	} catch (cause) {
		error(403, cause instanceof Error ? cause.message : 'Could not record latency events');
	}
}
