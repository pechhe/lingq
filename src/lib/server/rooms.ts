import { api } from '../../../convex/_generated/api';
import { getConvexClient } from './convex';

export type CreateRoomInput = {
	spokenLanguage: string;
	hearLanguage: string;
	origin: string;
};

export type JoinRoomInput = {
	roomId: string;
	spokenLanguage: string;
	hearLanguage: string;
	participantId?: string;
};

export async function createRoom(input: CreateRoomInput) {
	const room = await getConvexClient().mutation(api.rooms.create, {
		spokenLanguage: input.spokenLanguage,
		hearLanguage: input.hearLanguage
	});

	return {
		roomId: room.roomId as string,
		joinUrl: `${input.origin}/room/${room.roomId}`,
		room
	};
}

export async function joinRoom(input: JoinRoomInput) {
	return await getConvexClient().mutation(api.rooms.join, input);
}

export async function getRoom(roomId: string) {
	return await getConvexClient().query(api.rooms.get, { roomId });
}

export async function updateParticipantLanguages(input: {
	roomId: string;
	participantId: string;
	spokenLanguage: string;
	hearLanguage: string;
}) {
	return await getConvexClient().mutation(api.rooms.updateParticipantLanguages, input);
}

export async function recordLatencyEvents(input: {
	roomId: string;
	participantId: string;
	traceId: string;
	events: Array<{ name: string; elapsedMs: number; at: number }>;
	userAgent?: string;
}) {
	return await getConvexClient().mutation(api.rooms.recordLatencyEvents, input);
}
