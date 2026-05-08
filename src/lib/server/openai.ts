import { getOpenAITranslationLanguage } from '$lib/constants/languages';
import { getOpenAIEnv } from './env';

export function buildTranslationClientSecretRequest(targetLanguage: string) {
	return {
		expires_after: {
			anchor: 'created_at',
			seconds: 600
		},
		session: {
			model: 'gpt-realtime-translate',
			audio: {
				input: {
					noise_reduction: { type: 'near_field' }
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
}) {
	const response = await fetch('https://api.openai.com/v1/realtime/translations/client_secrets', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${input.openaiApiKey || getOpenAIEnv().openaiApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(buildTranslationClientSecretRequest(input.targetLanguage))
	});

	if (!response.ok) {
		throw new Error(`OpenAI token request failed with ${response.status}`);
	}

	return await response.json();
}
