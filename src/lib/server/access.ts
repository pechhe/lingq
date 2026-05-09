import { api } from '../../../convex/_generated/api';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getAuthenticatedConvexClient, getConvexClient } from './convex';

const accountCookieName = 'lingk_account';

export function getAccountId(cookies: Cookies) {
	return cookies.get(accountCookieName);
}

export async function getAuthAccountId(token: string | undefined) {
	if (!token) return null;

	return await getAuthenticatedConvexClient(token)
		.query(api.auth.getCurrentAccountId, {})
		.catch(() => null);
}

export async function getAuthAccount(token: string | undefined) {
	if (!token) return null;

	return await getAuthenticatedConvexClient(token)
		.query(api.auth.getCurrentAccount, {})
		.catch(() => null);
}

export async function getRequestAccount(input: { cookies: Cookies; token?: string }) {
	const authAccount = await getAuthAccount(input.token);
	if (authAccount) return authAccount;

	const accountId = getAccountId(input.cookies);
	return accountId ? { accountId, email: undefined, isAdmin: false } : null;
}

export function createAnonymousAccountId() {
	return `anon_${crypto.randomUUID()}`;
}

export function setAccountCookie(cookies: Cookies, accountId: string) {
	cookies.set(accountCookieName, accountId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 365
	});
}

export async function getEntitlement(accountId: string) {
	return await getConvexClient().query(api.billing.getEntitlement, { accountId });
}

export async function ensureBillingAccount(input: {
	accountId: string;
	email?: string;
	stripeCustomerId?: string;
	trialAllowanceMinutes?: number;
	adminFullAccess?: boolean;
}) {
	return await getConvexClient().mutation(api.billing.upsertAccount, input);
}
