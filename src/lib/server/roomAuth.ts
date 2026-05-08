import { error } from '@sveltejs/kit';
import { getRoom } from './rooms';

export async function assertParticipant(roomId: string, participantId: string) {
	const result = await getRoom(roomId);
	const participant = result?.participants?.find(
		(candidate: { participantId: string; status: string }) =>
			candidate.participantId === participantId && candidate.status === 'active'
	);

	if (!result?.room || !participant) {
		error(403, 'Participant is not active in this room');
	}

	return { room: result.room, participant };
}
