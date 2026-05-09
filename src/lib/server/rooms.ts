import { api } from '../../../convex/_generated/api';
import { normaliseRoomId } from '$lib/roomIds';
import { getConvexClient } from './convex';

export type CreateRoomInput = {
	spokenLanguage: string;
	hearLanguage: string;
	origin: string;
	accountId?: string;
	accessMode?: 'byok' | 'subscription' | 'trial' | 'test' | 'free';
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
		hearLanguage: input.hearLanguage,
		accountId: input.accountId,
		accessMode: input.accessMode
	});

	return {
		roomId: room.roomId as string,
		joinUrl: `${input.origin}/room/${room.roomId}`,
		room
	};
}

export async function joinRoom(input: JoinRoomInput) {
	return await getConvexClient().mutation(api.rooms.join, {
		...input,
		roomId: normaliseRoomId(input.roomId)
	});
}

export async function getRoom(roomId: string) {
	return await getConvexClient().query(api.rooms.get, { roomId: normaliseRoomId(roomId) });
}

export async function updateParticipantLanguages(input: {
	roomId: string;
	participantId: string;
	spokenLanguage: string;
	hearLanguage: string;
}) {
	return await getConvexClient().mutation(api.rooms.updateParticipantLanguages, {
		...input,
		roomId: normaliseRoomId(input.roomId)
	});
}

export async function recordLatencyEvents(input: {
	roomId: string;
	participantId: string;
	traceId: string;
	events: Array<{ name: string; elapsedMs: number; at: number }>;
	userAgent?: string;
}) {
	return await getConvexClient().mutation(api.rooms.recordLatencyEvents, {
		...input,
		roomId: normaliseRoomId(input.roomId)
	});
}
