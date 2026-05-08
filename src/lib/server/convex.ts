import { ConvexHttpClient } from 'convex/browser';
import { getConvexEnv } from './env';

let client: ConvexHttpClient | undefined;

export function getConvexClient() {
	client ??= new ConvexHttpClient(getConvexEnv().convexUrl);
	return client;
}

export function getAuthenticatedConvexClient(token: string) {
	const authenticatedClient = new ConvexHttpClient(getConvexEnv().convexUrl);
	authenticatedClient.setAuth(token);
	return authenticatedClient;
}
