import { describe, expect, it } from 'vite-plus/test';
import { buildTranslationClientSecretRequest } from './openai';

describe('buildTranslationClientSecretRequest', () => {
	it('uses the dedicated realtime translation session shape', () => {
		const body = buildTranslationClientSecretRequest('es');

		expect(body.session).toMatchObject({
			model: 'gpt-realtime-translate',
			audio: {
				input: {
					noise_reduction: { type: 'near_field' }
				},
				output: {
					language: 'es'
				}
			}
		});
		expect(body).not.toHaveProperty('session.instructions');
	});

	it('supports far-field noise reduction for shared-phone capture', () => {
		const body = buildTranslationClientSecretRequest('es', 'far_field');

		expect(body.session.audio.input.noise_reduction).toEqual({ type: 'far_field' });
	});

	it('normalises Brazilian Portuguese to OpenAI translation language code', () => {
		const body = buildTranslationClientSecretRequest('pt-BR');

		expect(body.session.audio.output.language).toBe('pt');
	});
});
