import { JWT_COOKIE_NAME } from '@convex-dev/better-auth/plugins';
import { env } from '$env/dynamic/public';
import type { Cookies, RequestHandler } from '@sveltejs/kit';

const DEFAULT_CONVEX_JWT_COOKIE_NAME = `better-auth.${JWT_COOKIE_NAME}`;
const DEFAULT_CONVEX_JWT_COOKIE_NAMES = [
	`__Secure-${DEFAULT_CONVEX_JWT_COOKIE_NAME}`,
	DEFAULT_CONVEX_JWT_COOKIE_NAME
];

const FORWARDED_AUTH_HEADER_NAMES = new Set([
	'accept',
	'authorization',
	'better-auth-cookie',
	'content-type',
	'cookie',
	'origin',
	'referer',
	'user-agent'
]);

const buildForwardedAuthHeaders = (headers: Headers, nextUrl: string, requestUrl: URL) => {
	const forwardedHeaders = new Headers();

	for (const [headerName, headerValue] of headers.entries()) {
		if (FORWARDED_AUTH_HEADER_NAMES.has(headerName.toLowerCase())) {
			forwardedHeaders.set(headerName, headerValue);
		}
	}

	forwardedHeaders.set('host', new URL(nextUrl).host);
	forwardedHeaders.set('x-forwarded-host', requestUrl.host);
	forwardedHeaders.set('x-forwarded-proto', requestUrl.protocol.replace(/:$/, ''));
	forwardedHeaders.set('x-better-auth-forwarded-host', requestUrl.host);
	forwardedHeaders.set('x-better-auth-forwarded-proto', requestUrl.protocol.replace(/:$/, ''));
	forwardedHeaders.set('accept-encoding', 'identity');

	return forwardedHeaders;
};

const getTokenFromKnownCookieNames = (cookies: Cookies, cookieNames: string[]) => {
	for (const cookieName of cookieNames) {
		const token = cookies.get(cookieName);
		if (token) return token;
	}

	return undefined;
};

export function getToken(cookies: Cookies) {
	return getTokenFromKnownCookieNames(cookies, DEFAULT_CONVEX_JWT_COOKIE_NAMES);
}

export function createSvelteKitHandler(opts?: { convexSiteUrl?: string }) {
	const requestHandler: RequestHandler = async ({ request }) => {
		const requestUrl = new URL(request.url);
		const convexSiteUrl = opts?.convexSiteUrl ?? env.PUBLIC_CONVEX_SITE_URL;

		if (!convexSiteUrl) {
			throw new Error('PUBLIC_CONVEX_SITE_URL environment variable is not set');
		}

		const nextUrl = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;
		const newRequest = new Request(nextUrl, request);
		const forwardedHeaders = buildForwardedAuthHeaders(request.headers, nextUrl, requestUrl);

		let headerName = newRequest.headers.keys().next().value;
		while (headerName) {
			newRequest.headers.delete(headerName);
			headerName = newRequest.headers.keys().next().value;
		}

		for (const [headerName, headerValue] of forwardedHeaders.entries()) {
			newRequest.headers.set(headerName, headerValue);
		}

		return fetch(newRequest, { method: request.method, redirect: 'manual' });
	};

	return {
		GET: requestHandler,
		POST: requestHandler
	};
}
