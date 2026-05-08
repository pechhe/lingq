import { error, json } from '@sveltejs/kit';
import { getRoom } from '$lib/server/rooms';

export async function GET({ params }) {
	if (!params.roomId) error(400, 'roomId is required');

	const room = await getRoom(params.roomId);
	if (!room) error(404, 'Room not found');

	return json(room);
}
