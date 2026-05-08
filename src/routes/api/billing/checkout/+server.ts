import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import {
	createAnonymousAccountId,
	ensureBillingAccount,
	getAccountId,
	getAuthAccount,
	setAccountCookie
} from '$lib/server/access';
import { getStripeEnv } from '$lib/server/env';

const plans = {
	talk_1h: { label: '1 hour talk time', envKey: 'oneHourPriceId' },
	talk_5h: { label: '5 hours talk time', envKey: 'fiveHourPriceId' }
} as const;

type PlanId = keyof typeof plans;

function isPlanId(value: unknown): value is PlanId {
	return typeof value === 'string' && value in plans;
}

export async function POST({ cookies, locals, request, url }) {
	const body = await request.json().catch(() => null);
	const requestedPlan = body?.planId;

	if (!isPlanId(requestedPlan)) {
		error(400, 'Choose a valid subscription plan');
	}
	const planId = requestedPlan;

	let stripeEnv: ReturnType<typeof getStripeEnv>;
	try {
		stripeEnv = getStripeEnv();
	} catch {
		error(503, 'Stripe checkout is not configured yet');
	}

	const stripe = new Stripe(stripeEnv.secretKey);
	const authAccount = await getAuthAccount(locals.token);
	const accountId = authAccount?.accountId ?? getAccountId(cookies) ?? createAnonymousAccountId();
	setAccountCookie(cookies, accountId);
	await ensureBillingAccount({
		accountId,
		email:
			authAccount?.email ?? (typeof body.email === 'string' && body.email ? body.email : undefined),
		adminFullAccess: authAccount?.isAdmin
	});

	const plan = plans[planId];
	const successUrl = new URL('/setup', url.origin);
	successUrl.searchParams.set('checkout', 'success');
	const cancelUrl = new URL('/', url.origin);
	cancelUrl.searchParams.set('checkout', 'cancelled');

	const session = await stripe.checkout.sessions.create({
		mode: 'subscription',
		customer_email: typeof body.email === 'string' && body.email ? body.email : undefined,
		line_items: [{ price: stripeEnv[plan.envKey], quantity: 1 }],
		success_url: successUrl.toString(),
		cancel_url: cancelUrl.toString(),
		metadata: {
			accountId,
			planId,
			planLabel: plan.label
		},
		subscription_data: {
			metadata: {
				accountId,
				planId
			}
		}
	});

	if (!session.url) {
		error(502, 'Stripe did not return a checkout URL');
	}

	return json({ url: session.url });
}
