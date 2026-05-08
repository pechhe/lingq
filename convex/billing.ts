import { v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';

const planAllowances = {
	talk_1h: 60,
	talk_5h: 300
} as const;

function roundUpMinutes(seconds: number) {
	return Math.max(1, Math.ceil(seconds / 60));
}

async function getRoomAccount(ctx: MutationCtx, roomId: string) {
	const room = await ctx.db
		.query('rooms')
		.withIndex('by_roomId', (q) => q.eq('roomId', roomId))
		.unique();

	if (!room?.accountId) {
		throw new Error('Room is not linked to a billing account');
	}

	return { room, accountId: room.accountId };
}

export const upsertAccount = mutation({
	args: {
		accountId: v.string(),
		email: v.optional(v.string()),
		stripeCustomerId: v.optional(v.string()),
		trialAllowanceMinutes: v.optional(v.number()),
		adminFullAccess: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const existing = await ctx.db
			.query('billingAccounts')
			.withIndex('by_accountId', (q) => q.eq('accountId', args.accountId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				email: args.email ?? existing.email,
				stripeCustomerId: args.stripeCustomerId ?? existing.stripeCustomerId,
				trialAllowanceMinutes: args.trialAllowanceMinutes ?? existing.trialAllowanceMinutes,
				adminFullAccess:
					args.adminFullAccess ??
					(args.email?.toLowerCase() === 'hfpetch@gmail.com' ? true : existing.adminFullAccess),
				updatedAt: now
			});
			return { ...existing, ...args, updatedAt: now };
		}

		await ctx.db.insert('billingAccounts', {
			accountId: args.accountId,
			email: args.email,
			stripeCustomerId: args.stripeCustomerId,
			trialAllowanceMinutes: args.trialAllowanceMinutes ?? 2,
			adminFullAccess:
				args.adminFullAccess ??
				(args.email?.toLowerCase() === 'hfpetch@gmail.com' ? true : undefined),
			createdAt: now,
			updatedAt: now
		});

		return { accountId: args.accountId };
	}
});

export const upsertSubscription = mutation({
	args: {
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
		currentPeriodStart: v.number(),
		currentPeriodEnd: v.number()
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const allowanceMinutes = planAllowances[args.planId];
		const existing = args.stripeSubscriptionId
			? await ctx.db
					.query('subscriptions')
					.withIndex('by_stripeSubscriptionId', (q) =>
						q.eq('stripeSubscriptionId', args.stripeSubscriptionId)
					)
					.unique()
			: null;

		if (existing) {
			await ctx.db.patch(existing._id, {
				...args,
				allowanceMinutes,
				updatedAt: now
			});
			return { ok: true };
		}

		await ctx.db.insert('subscriptions', {
			...args,
			allowanceMinutes,
			createdAt: now,
			updatedAt: now
		});

		return { ok: true };
	}
});

export const getEntitlement = query({
	args: { accountId: v.string() },
	handler: async (ctx, args) => {
		const now = Date.now();
		const account = await ctx.db
			.query('billingAccounts')
			.withIndex('by_accountId', (q) => q.eq('accountId', args.accountId))
			.unique();

		if (account?.adminFullAccess) {
			return {
				active: true,
				kind: 'admin' as const,
				allowanceMinutes: Number.MAX_SAFE_INTEGER,
				usedMinutes: 0,
				remainingMinutes: Number.MAX_SAFE_INTEGER
			};
		}

		const subscriptions = await ctx.db
			.query('subscriptions')
			.withIndex('by_accountId', (q) => q.eq('accountId', args.accountId))
			.collect();
		const subscription = subscriptions
			.filter(
				(candidate) =>
					(candidate.status === 'active' || candidate.status === 'trialing') &&
					candidate.currentPeriodStart <= now &&
					candidate.currentPeriodEnd > now
			)
			.sort((a, b) => b.currentPeriodEnd - a.currentPeriodEnd)[0];

		if (!subscription) {
			const trialAllowanceMinutes = account?.trialAllowanceMinutes ?? 2;
			const trialLedger = await ctx.db
				.query('usageLedger')
				.withIndex('by_accountId', (q) => q.eq('accountId', args.accountId))
				.collect();
			const trialUsedMinutes = trialLedger
				.filter((entry) => entry.kind === 'livekit_room')
				.reduce((total, entry) => total + entry.minutes, 0);
			return {
				active: trialUsedMinutes < trialAllowanceMinutes,
				kind: 'trial' as const,
				allowanceMinutes: trialAllowanceMinutes,
				usedMinutes: trialUsedMinutes,
				remainingMinutes: Math.max(0, trialAllowanceMinutes - trialUsedMinutes)
			};
		}

		const ledger = await ctx.db
			.query('usageLedger')
			.withIndex('by_accountId', (q) => q.eq('accountId', args.accountId))
			.collect();
		const usedMinutes = ledger
			.filter(
				(entry) => entry.kind === 'livekit_room' && entry.at >= subscription.currentPeriodStart
			)
			.reduce((total, entry) => total + entry.minutes, 0);

		return {
			active: true,
			kind: 'subscription' as const,
			planId: subscription.planId,
			allowanceMinutes: subscription.allowanceMinutes,
			usedMinutes,
			remainingMinutes: Math.max(0, subscription.allowanceMinutes - usedMinutes),
			currentPeriodEnd: subscription.currentPeriodEnd
		};
	}
});

export const startUsageSession = mutation({
	args: {
		sessionId: v.string(),
		accountId: v.optional(v.string()),
		roomId: v.string(),
		participantId: v.optional(v.string()),
		kind: v.union(
			v.literal('livekit_room'),
			v.literal('livekit_participant'),
			v.literal('openai_session')
		),
		startedAt: v.optional(v.number()),
		source: v.string()
	},
	handler: async (ctx, args) => {
		const accountId = args.accountId ?? (await getRoomAccount(ctx, args.roomId)).accountId;
		const existing = await ctx.db
			.query('usageSessions')
			.withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
			.unique();

		if (existing) return { ok: true, sessionId: args.sessionId };

		await ctx.db.insert('usageSessions', {
			sessionId: args.sessionId,
			accountId,
			roomId: args.roomId,
			participantId: args.participantId,
			kind: args.kind,
			startedAt: args.startedAt ?? Date.now(),
			source: args.source
		});

		return { ok: true, sessionId: args.sessionId };
	}
});

export const endUsageSession = mutation({
	args: {
		sessionId: v.string(),
		endedAt: v.optional(v.number()),
		source: v.string()
	},
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query('usageSessions')
			.withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
			.unique();

		if (!session || session.endedAt) return { ok: true };

		const endedAt = args.endedAt ?? Date.now();
		const seconds = Math.max(0, Math.ceil((endedAt - session.startedAt) / 1000));
		const minutes = roundUpMinutes(seconds);

		await ctx.db.patch(session._id, {
			endedAt,
			billableSeconds: seconds,
			source: args.source
		});
		await ctx.db.insert('usageLedger', {
			accountId: session.accountId,
			roomId: session.roomId,
			sessionId: session.sessionId,
			kind: session.kind,
			seconds,
			minutes,
			at: endedAt,
			source: args.source
		});

		return { ok: true, seconds, minutes };
	}
});
