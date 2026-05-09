import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	rooms: defineTable({
		roomId: v.string(),
		accountId: v.optional(v.string()),
		accessMode: v.optional(
			v.union(
				v.literal('byok'),
				v.literal('subscription'),
				v.literal('trial'),
				v.literal('test'),
				v.literal('free')
			)
		),
		createdAt: v.number(),
		updatedAt: v.number(),
		status: v.union(v.literal('open'), v.literal('full'), v.literal('ended')),
		creatorSpokenLanguage: v.string(),
		creatorHearLanguage: v.string(),
		maxParticipants: v.number()
	})
		.index('by_roomId', ['roomId'])
		.index('by_accountId', ['accountId']),
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
		.index('by_roomId_and_status', ['roomId', 'status'])
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
		.index('by_traceId', ['traceId']),
	billingAccounts: defineTable({
		accountId: v.string(),
		email: v.optional(v.string()),
		stripeCustomerId: v.optional(v.string()),
		trialAllowanceMinutes: v.optional(v.number()),
		adminFullAccess: v.optional(v.boolean()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_accountId', ['accountId'])
		.index('by_stripeCustomerId', ['stripeCustomerId']),
	subscriptions: defineTable({
		accountId: v.string(),
		stripeCustomerId: v.optional(v.string()),
		stripeSubscriptionId: v.optional(v.string()),
		status: v.union(
			v.literal('incomplete'),
			v.literal('trialing'),
			v.literal('active'),
			v.literal('past_due'),
			v.literal('cancelled'),
			v.literal('unpaid'),
			v.literal('paused')
		),
		planId: v.union(v.literal('talk_1h'), v.literal('talk_5h')),
		allowanceMinutes: v.number(),
		currentPeriodStart: v.number(),
		currentPeriodEnd: v.number(),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_accountId', ['accountId'])
		.index('by_accountId_and_status_and_currentPeriodEnd', [
			'accountId',
			'status',
			'currentPeriodEnd'
		])
		.index('by_stripeSubscriptionId', ['stripeSubscriptionId']),
	usageSessions: defineTable({
		sessionId: v.string(),
		accountId: v.string(),
		roomId: v.string(),
		participantId: v.optional(v.string()),
		kind: v.union(
			v.literal('livekit_room'),
			v.literal('livekit_participant'),
			v.literal('openai_session')
		),
		startedAt: v.number(),
		endedAt: v.optional(v.number()),
		billableSeconds: v.optional(v.number()),
		source: v.string()
	})
		.index('by_sessionId', ['sessionId'])
		.index('by_accountId', ['accountId'])
		.index('by_roomId_and_kind', ['roomId', 'kind']),
	usageLedger: defineTable({
		accountId: v.string(),
		roomId: v.string(),
		sessionId: v.string(),
		kind: v.union(
			v.literal('livekit_room'),
			v.literal('livekit_participant'),
			v.literal('openai_session')
		),
		seconds: v.number(),
		minutes: v.number(),
		at: v.number(),
		source: v.string()
	})
		.index('by_accountId', ['accountId'])
		.index('by_accountId_and_kind_and_at', ['accountId', 'kind', 'at'])
		.index('by_roomId', ['roomId'])
});
