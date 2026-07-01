import { getOpenAITranslationLanguage } from '$lib/constants/languages';
import { getOpenAIEnv } from './env';

export type NoiseReductionType = 'near_field' | 'far_field';

export function buildTranslationClientSecretRequest(
	targetLanguage: string,
	noiseReduction: NoiseReductionType = 'near_field'
) {
	return {
		expires_after: {
			anchor: 'created_at',
			seconds: 600
		},
		session: {
			model: 'gpt-realtime-translate',
			audio: {
				input: {
					noise_reduction: { type: noiseReduction }
				},
				output: {
					language: getOpenAITranslationLanguage(targetLanguage)
				}
			}
		}
	};
}

export async function createRealtimeClientSecret(input: {
	targetLanguage: string;
	openaiApiKey?: string;
	noiseReduction?: NoiseReductionType;
}) {
	const response = await fetch('https://api.openai.com/v1/realtime/translations/client_secrets', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${input.openaiApiKey || getOpenAIEnv().openaiApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(
			buildTranslationClientSecretRequest(input.targetLanguage, input.noiseReduction)
		)
	});

	if (!response.ok) {
		throw new Error(`OpenAI token request failed with ${response.status}`);
	}

	return await response.json();
}
