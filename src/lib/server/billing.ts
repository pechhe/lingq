import { api } from '../../../convex/_generated/api';
import { normaliseRoomId } from '$lib/roomIds';
import { getConvexClient } from './convex';

export const planPriceMap = {
	talk_1h: 'oneHourPriceId',
	talk_5h: 'fiveHourPriceId'
} as const;

export const pricePlanMap = {
	oneHourPriceId: 'talk_1h',
	fiveHourPriceId: 'talk_5h'
} as const;

export type PlanId = keyof typeof planPriceMap;

export function getPlanAllowanceMinutes(planId: PlanId) {
	return planId === 'talk_1h' ? 60 : 300;
}

export async function startUsageSession(input: {
	sessionId: string;
	accountId?: string;
	roomId: string;
	participantId?: string;
	kind: 'livekit_room' | 'livekit_participant' | 'openai_session';
	startedAt?: number;
	source: string;
}) {
	return await getConvexClient().mutation(api.billing.startUsageSession, {
		...input,
		roomId: normaliseRoomId(input.roomId)
	});
}

export async function endUsageSession(input: {
	sessionId: string;
	endedAt?: number;
	source: string;
}) {
	return await getConvexClient().mutation(api.billing.endUsageSession, input);
}

export async function upsertSubscription(input: {
	accountId: string;
	stripeCustomerId?: string;
	stripeSubscriptionId?: string;
	status: 'incomplete' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'paused';
	planId: PlanId;
	currentPeriodStart: number;
	currentPeriodEnd: number;
}) {
	return await getConvexClient().mutation(api.billing.upsertSubscription, input);
}
