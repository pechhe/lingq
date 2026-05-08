import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const roomIdAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function createShortId() {
	let id = '';
	for (let index = 0; index < 6; index += 1) {
		id += roomIdAlphabet[Math.floor(Math.random() * roomIdAlphabet.length)];
	}
	return id;
}

function createParticipantId() {
	return crypto.randomUUID();
}

export const create = mutation({
	args: {
		spokenLanguage: v.string(),
		hearLanguage: v.string()
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		let roomId = createShortId();

		for (let attempt = 0; attempt < 5; attempt += 1) {
			const existing = await ctx.db
				.query('rooms')
				.withIndex('by_roomId', (q) => q.eq('roomId', roomId))
				.unique();
			if (!existing) break;
			roomId = createShortId();
		}

		const room = {
			roomId,
			createdAt: now,
			updatedAt: now,
			status: 'open' as const,
			creatorSpokenLanguage: args.spokenLanguage,
			creatorHearLanguage: args.hearLanguage,
			maxParticipants: 2
		};

		await ctx.db.insert('rooms', room);

		return room;
	}
});

export const get = query({
	args: {
		roomId: v.string()
	},
	handler: async (ctx, args) => {
		const room = await ctx.db
			.query('rooms')
			.withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
			.unique();

		if (!room) return null;

		const participants = await ctx.db
			.query('participants')
			.withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
			.take(10);

		return { room, participants };
	}
});

export const join = mutation({
	args: {
		roomId: v.string(),
		spokenLanguage: v.string(),
		hearLanguage: v.string(),
		participantId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const room = await ctx.db
			.query('rooms')
			.withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
			.unique();

		if (!room || room.status === 'ended') {
			throw new Error('Room not found');
		}

		if (args.participantId) {
			const existingParticipant = await ctx.db
				.query('participants')
				.withIndex('by_roomId_and_participantId', (q) =>
					q.eq('roomId', args.roomId).eq('participantId', args.participantId as string)
				)
				.unique();

			if (existingParticipant) {
				const participant = {
					...existingParticipant,
					spokenLanguage: args.spokenLanguage,
					hearLanguage: args.hearLanguage,
					lastSeenAt: now,
					status: 'active'
				} as const;
				await ctx.db.patch(existingParticipant._id, {
					spokenLanguage: participant.spokenLanguage,
					hearLanguage: participant.hearLanguage,
					lastSeenAt: participant.lastSeenAt,
					status: participant.status
				});
				return { room, participant };
			}
		}

		const activeParticipants = (
			await ctx.db
				.query('participants')
				.withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
				.take(10)
		).filter((participant) => participant.status === 'active');

		if (activeParticipants.length >= room.maxParticipants) {
			throw new Error('Room is full');
		}

		const side = activeParticipants.some((participant) => participant.side === 'A') ? 'B' : 'A';
		const participant = {
			roomId: args.roomId,
			participantId: createParticipantId(),
			side: side as 'A' | 'B',
			spokenLanguage: args.spokenLanguage,
			hearLanguage: args.hearLanguage,
			joinedAt: now,
			lastSeenAt: now,
			status: 'active' as const
		};

		await ctx.db.insert('participants', participant);
		await ctx.db.patch(room._id, {
			status: activeParticipants.length + 1 >= room.maxParticipants ? 'full' : 'open',
			updatedAt: now
		});

		return {
			room: { ...room, status: participant.side === 'B' ? ('full' as const) : room.status },
			participant
		};
	}
});

export const updateParticipantLanguages = mutation({
	args: {
		roomId: v.string(),
		participantId: v.string(),
		spokenLanguage: v.string(),
		hearLanguage: v.string()
	},
	handler: async (ctx, args) => {
		const participant = await ctx.db
			.query('participants')
			.withIndex('by_roomId_and_participantId', (q) =>
				q.eq('roomId', args.roomId).eq('participantId', args.participantId)
			)
			.unique();

		if (!participant || participant.status !== 'active') {
			throw new Error('Participant not found');
		}

		await ctx.db.patch(participant._id, {
			spokenLanguage: args.spokenLanguage,
			hearLanguage: args.hearLanguage,
			lastSeenAt: Date.now()
		});

		return { ok: true };
	}
});

export const leave = mutation({
	args: {
		roomId: v.string(),
		participantId: v.string()
	},
	handler: async (ctx, args) => {
		const participant = await ctx.db
			.query('participants')
			.withIndex('by_roomId_and_participantId', (q) =>
				q.eq('roomId', args.roomId).eq('participantId', args.participantId)
			)
			.unique();

		if (!participant) return { ok: true };

		await ctx.db.patch(participant._id, {
			status: 'left',
			lastSeenAt: Date.now()
		});

		const room = await ctx.db
			.query('rooms')
			.withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
			.unique();

		if (room) {
			await ctx.db.patch(room._id, { status: 'open', updatedAt: Date.now() });
		}

		return { ok: true };
	}
});

export const recordLatencyEvents = mutation({
	args: {
		roomId: v.string(),
		participantId: v.string(),
		traceId: v.string(),
		events: v.array(
			v.object({
				name: v.string(),
				elapsedMs: v.number(),
				at: v.number()
			})
		),
		userAgent: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const participant = await ctx.db
			.query('participants')
			.withIndex('by_roomId_and_participantId', (q) =>
				q.eq('roomId', args.roomId).eq('participantId', args.participantId)
			)
			.unique();

		if (!participant || participant.status !== 'active') {
			throw new Error('Participant not found');
		}

		const events = args.events.slice(0, 40);
		for (const event of events) {
			await ctx.db.insert('latencyEvents', {
				roomId: args.roomId,
				participantId: args.participantId,
				traceId: args.traceId,
				name: event.name,
				elapsedMs: Math.round(event.elapsedMs),
				at: event.at,
				userAgent: args.userAgent?.slice(0, 240)
			});
		}

		return { ok: true, count: events.length };
	}
});
