import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	rooms: defineTable({
		roomId: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
		status: v.union(v.literal('open'), v.literal('full'), v.literal('ended')),
		creatorSpokenLanguage: v.string(),
		creatorHearLanguage: v.string(),
		maxParticipants: v.number()
	}).index('by_roomId', ['roomId']),
	participants: defineTable({
		roomId: v.string(),
		participantId: v.string(),
		side: v.string(),
		spokenLanguage: v.string(),
		hearLanguage: v.string(),
		joinedAt: v.number(),
		lastSeenAt: v.number(),
		status: v.union(v.literal('active'), v.literal('left'))
	})
		.index('by_roomId', ['roomId'])
		.index('by_roomId_and_participantId', ['roomId', 'participantId']),
	latencyEvents: defineTable({
		roomId: v.string(),
		participantId: v.string(),
		traceId: v.string(),
		name: v.string(),
		elapsedMs: v.number(),
		at: v.number(),
		userAgent: v.optional(v.string())
	})
		.index('by_roomId', ['roomId'])
		.index('by_traceId', ['traceId'])
});
