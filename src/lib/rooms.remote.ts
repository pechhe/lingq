import * as v from 'valibot';
import { command, getRequestEvent, query } from '$app/server';
import {
	createRoom as createRoomOnServer,
	getRoom as getRoomOnServer,
	joinRoom as joinRoomOnServer,
	updateParticipantLanguages as updateParticipantLanguagesOnServer
} from '$lib/server/rooms';

const languagePairSchema = v.object({
	spokenLanguage: v.string()
});

export const createRoom = command(languagePairSchema, async ({ spokenLanguage }) => {
	return await createRoomOnServer({
		spokenLanguage,
		hearLanguage: spokenLanguage,
		origin: getRequestEvent().url.origin
	});
});

export const getRoom = query(v.string(), async (roomId) => {
	return await getRoomOnServer(roomId);
});

export const joinRoom = command(
	v.object({
		roomId: v.string(),
		participantId: v.optional(v.string()),
		spokenLanguage: v.string()
	}),
	async (input) => {
		return await joinRoomOnServer({ ...input, hearLanguage: input.spokenLanguage });
	}
);

export const updateParticipantLanguages = command(
	v.object({
		roomId: v.string(),
		participantId: v.string(),
		spokenLanguage: v.string(),
		hearLanguage: v.string()
	}),
	async (input) => {
		return await updateParticipantLanguagesOnServer(input);
	}
);
