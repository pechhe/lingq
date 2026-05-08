import { ConvexHttpClient } from 'convex/browser';
import { getConvexEnv } from './env';

let client: ConvexHttpClient | undefined;

export function getConvexClient() {
	client ??= new ConvexHttpClient(getConvexEnv().convexUrl);
	return client;
}
