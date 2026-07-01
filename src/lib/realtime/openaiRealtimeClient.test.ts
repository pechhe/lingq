import { describe, expect, it } from 'vite-plus/test';
import { formatTokenError, getTranslationOutputState } from './openaiRealtimeClient';

describe('formatTokenError', () => {
	it('extracts a message from JSON error bodies', () => {
		expect(formatTokenError('{"message":"Internal Error"}', 500)).toBe(
			'Could not start translation (500): Internal Error'
		);
		expect(formatTokenError('{"error":{"message":"Bad key"}}', 401)).toBe(
			'Could not start translation (401): Bad key'
		);
	});

	it('falls back to the raw body or status for non-JSON errors', () => {
		expect(formatTokenError('No trial minutes remaining', 402)).toBe('No trial minutes remaining');
		expect(formatTokenError('', 502)).toBe('Could not start translation (502)');
	});
});

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
