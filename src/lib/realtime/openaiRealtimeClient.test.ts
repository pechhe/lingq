import { describe, expect, it } from 'vite-plus/test';
import { getTranslationOutputState } from './openaiRealtimeClient';

describe('getTranslationOutputState', () => {
	it('marks realtime translation output deltas as streaming', () => {
		expect(getTranslationOutputState('session.output_audio.delta')).toBe('streaming');
		expect(getTranslationOutputState('session.output_transcript.delta')).toBe('streaming');
	});

	it('marks translation session completion events as complete', () => {
		expect(getTranslationOutputState('session.closed')).toBe('complete');
		expect(getTranslationOutputState('session.output_audio.done')).toBe('complete');
		expect(getTranslationOutputState('session.output_transcript.done')).toBe('complete');
	});

	it('ignores voice-agent response events for translation sessions', () => {
		expect(getTranslationOutputState('response.done')).toBeUndefined();
		expect(getTranslationOutputState('response.output_audio.done')).toBeUndefined();
		expect(getTranslationOutputState('response.output_audio_transcript.done')).toBeUndefined();
	});
});
