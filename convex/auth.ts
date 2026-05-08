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

export const createAuth = (ctx: GenericCtx<DataModel>) =>
	betterAuth({
		baseURL: process.env.SITE_URL,
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
					const apiKey = process.env.RESEND_API_KEY;
					const from = process.env.AUTH_EMAIL_FROM ?? 'LangLink <login@langlink.app>';

					if (!apiKey) {
						console.warn(`Magic link for ${email}: ${url}`);
						return;
					}

					const response = await fetch('https://api.resend.com/emails', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${apiKey}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							from,
							to: email,
							subject: 'Sign in to LangLink',
							html: `<p>Open this link on your phone to sign in to LangLink:</p><p><a href="${url}">Sign in to LangLink</a></p><p>This link expires in 10 minutes.</p>`,
							text: `Open this link on your phone to sign in to LangLink:\n\n${url}\n\nThis link expires in 10 minutes.`
						})
					});

					if (!response.ok) {
						throw new Error(`Resend failed with ${response.status}`);
					}
				}
			}),
			passkey({
				rpName: 'LangLink',
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
