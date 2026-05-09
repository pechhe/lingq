import { describe, expect, it } from 'vite-plus/test';
import { normaliseRoomId } from '$lib/roomIds';

describe('normaliseRoomId', () => {
	it('canonicalises room ids accepted from URLs and copied codes', () => {
		expect(normaliseRoomId(' v8rtb9 ')).toBe('V8RTB9');
	});
});
