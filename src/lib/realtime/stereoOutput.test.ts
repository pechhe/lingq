import { describe, expect, it } from 'vite-plus/test';
import { getStereoPanValue } from './stereoOutput';

describe('getStereoPanValue', () => {
	it('maps output modes to Web Audio stereo pan values', () => {
		expect(getStereoPanValue('left')).toBe(-1);
		expect(getStereoPanValue('right')).toBe(1);
		expect(getStereoPanValue('both')).toBe(0);
	});
});
