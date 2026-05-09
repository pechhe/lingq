import { describe, expect, it } from 'vite-plus/test';
import { canPushToTalk, statusLevelFor } from './roomStateMachine';

describe('roomStateMachine', () => {
	it('allows push-to-talk only during connected translation states', () => {
		expect(canPushToTalk('connected')).toBe(true);
		expect(canPushToTalk('speaking')).toBe(true);
		expect(canPushToTalk('receiving_translation')).toBe(true);
		expect(canPushToTalk('idle')).toBe(false);
		expect(canPushToTalk('paused')).toBe(false);
	});

	it('maps user-facing states to compact status levels', () => {
		expect(statusLevelFor('connected')).toBe('ready');
		expect(statusLevelFor('requesting_microphone')).toBe('pending');
		expect(statusLevelFor('microphone_denied')).toBe('blocked');
		expect(statusLevelFor('error')).toBe('error');
	});
});
