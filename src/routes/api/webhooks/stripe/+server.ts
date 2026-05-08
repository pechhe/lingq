import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { ensureBillingAccount } from '$lib/server/access';
import { upsertSubscription, type PlanId } from '$lib/server/billing';
import { getStripeEnv } from '$lib/server/env';

function normaliseStatus(status: Stripe.Subscription.Status) {
	if (status === 'canceled') return 'cancelled';
	if (status === 'incomplete_expired') return 'cancelled';
	if (status === 'paused') return 'paused';
	return status;
}

function getPlanId(subscription: Stripe.Subscription): PlanId | null {
	const metadataPlan = subscription.metadata.planId;
	if (metadataPlan === 'talk_1h' || metadataPlan === 'talk_5h') return metadataPlan;

	const priceId = subscription.items.data[0]?.price.id;
	const env = getStripeEnv();
	if (priceId === env.oneHourPriceId) return 'talk_1h';
	if (priceId === env.fiveHourPriceId) return 'talk_5h';
	return null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
	const periodSubscription = subscription as Stripe.Subscription & {
		current_period_start?: number;
		current_period_end?: number;
	};
	const accountId = subscription.metadata.accountId;
	const planId = getPlanId(subscription);

	if (!accountId || !planId) {
		return { ok: false, ignored: true };
	}

	const customerId =
		typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

	await ensureBillingAccount({ accountId, stripeCustomerId: customerId });
	await upsertSubscription({
		accountId,
		stripeCustomerId: customerId,
		stripeSubscriptionId: subscription.id,
		status: normaliseStatus(subscription.status),
		planId,
		currentPeriodStart: (periodSubscription.current_period_start ?? 0) * 1000,
		currentPeriodEnd: (periodSubscription.current_period_end ?? 0) * 1000
	});

	return { ok: true };
}

export async function POST({ request }) {
	const stripeEnv = getStripeEnv();
	const stripe = new Stripe(stripeEnv.secretKey);
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		error(400, 'Missing Stripe signature');
	}

	const body = await request.text();
	const event = await stripe.webhooks
		.constructEventAsync(body, signature, stripeEnv.webhookSecret)
		.catch((cause) => {
			error(400, cause instanceof Error ? cause.message : 'Invalid Stripe webhook');
		});

	if (
		event.type === 'customer.subscription.created' ||
		event.type === 'customer.subscription.updated' ||
		event.type === 'customer.subscription.deleted'
	) {
		return json(await syncSubscription(event.data.object));
	}

	return json({ ok: true, ignored: true });
}
