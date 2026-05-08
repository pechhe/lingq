import { env } from '$env/dynamic/private';

function readRequired(name: string) {
	const value = env[name];
	if (!value) {
		throw new Error(`${name} is not configured`);
	}
	return value;
}

export function getServerEnv() {
	return {
		openaiApiKey: readRequired('OPENAI_API_KEY'),
		livekitApiKey: readRequired('LIVEKIT_API_KEY'),
		livekitApiSecret: readRequired('LIVEKIT_API_SECRET'),
		livekitUrl: readRequired('LIVEKIT_URL'),
		convexUrl: readRequired('CONVEX_URL')
	};
}

export function getOpenAIEnv() {
	return {
		openaiApiKey: readRequired('OPENAI_API_KEY')
	};
}

export function getStripeEnv() {
	return {
		secretKey: readRequired('STRIPE_SECRET_KEY'),
		webhookSecret: readRequired('STRIPE_WEBHOOK_SECRET'),
		oneHourPriceId: readRequired('STRIPE_PRICE_TALK_1H'),
		fiveHourPriceId: readRequired('STRIPE_PRICE_TALK_5H')
	};
}

export function getLiveKitEnv() {
	return {
		livekitApiKey: readRequired('LIVEKIT_API_KEY'),
		livekitApiSecret: readRequired('LIVEKIT_API_SECRET'),
		livekitUrl: readRequired('LIVEKIT_URL')
	};
}

export function getConvexEnv() {
	return {
		convexUrl: readRequired('CONVEX_URL')
	};
}

export function getHealthConfig() {
	return {
		openaiApiKey: Boolean(env.OPENAI_API_KEY),
		livekitApiKey: Boolean(env.LIVEKIT_API_KEY),
		livekitApiSecret: Boolean(env.LIVEKIT_API_SECRET),
		livekitUrl: Boolean(env.LIVEKIT_URL),
		convexUrl: Boolean(env.CONVEX_URL),
		stripeSecretKey: Boolean(env.STRIPE_SECRET_KEY),
		stripeWebhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
		stripeOneHourPriceId: Boolean(env.STRIPE_PRICE_TALK_1H),
		stripeFiveHourPriceId: Boolean(env.STRIPE_PRICE_TALK_5H)
	};
}
