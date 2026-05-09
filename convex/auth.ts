import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth/minimal';
import { magicLink } from 'better-auth/plugins';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { query } from './_generated/server';
import authConfig from './auth.config';

export const authComponent = createClient<DataModel>(components.betterAuth);

const getTrustedOrigins = () =>
	[
		process.env.SITE_URL,
		'https://lingk.world',
		'https://langlink-two.vercel.app',
		'http://localhost:5173',
		'http://localhost:5174',
		'http://localhost:5175',
		'http://127.0.0.1:5173',
		'http://127.0.0.1:5174',
		'http://127.0.0.1:5175'
	].filter((origin): origin is string => Boolean(origin));

export const createAuth = (ctx: GenericCtx<DataModel>) =>
	betterAuth({
		baseURL: process.env.SITE_URL,
		secret: process.env.BETTER_AUTH_SECRET,
		trustedOrigins: getTrustedOrigins(),
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false
		},
		plugins: [
			convex({ authConfig }),
			magicLink({
				expiresIn: 10 * 60,
				sendMagicLink: async ({ email, url }) => {
					const serverToken = process.env.POSTMARK_SERVER_TOKEN;
					const from = process.env.AUTH_EMAIL_FROM ?? 'Lingk <login@lingk.world>';

					if (!serverToken) {
						console.warn(`Magic link for ${email}: ${url}`);
						return;
					}

					const response = await fetch('https://api.postmarkapp.com/email', {
						method: 'POST',
						headers: {
							'X-Postmark-Server-Token': serverToken,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							From: from,
							To: email,
							Subject: 'Sign in to Lingk',
							HtmlBody: `<p>Open this link on your phone to sign in to Lingk:</p><p><a href="${url}">Sign in to Lingk</a></p><p>This link expires in 10 minutes.</p>`,
							TextBody: `Open this link on your phone to sign in to Lingk:\n\n${url}\n\nThis link expires in 10 minutes.`,
							MessageStream: 'outbound'
						})
					});

					if (!response.ok) {
						throw new Error(`Postmark failed with ${response.status}`);
					}
				}
			}),
			passkey({
				rpName: 'Lingk',
				authenticatorSelection: {
					authenticatorAttachment: 'platform',
					residentKey: 'preferred',
					userVerification: 'preferred'
				}
			})
		]
	});

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return (await authComponent.safeGetAuthUser(ctx)) ?? null;
	}
});

export const getCurrentAccountId = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		return user ? `auth_${user._id}` : null;
	}
});

export const getCurrentAccount = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		return user
			? {
					accountId: `auth_${user._id}`,
					email: user.email,
					isAdmin: user.email.toLowerCase() === 'hfpetch@gmail.com'
				}
			: null;
	}
});
