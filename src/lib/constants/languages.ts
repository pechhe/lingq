export type LanguageCode = (typeof languages)[number]['code'];

export const languages = [
	{ code: 'en', label: 'English' },
	{ code: 'es', label: 'Spanish' },
	{ code: 'fr', label: 'French' },
	{ code: 'de', label: 'German' },
	{ code: 'it', label: 'Italian' },
	{ code: 'pt', label: 'Portuguese' },
	{ code: 'pt-BR', label: 'Portuguese (Brazil)' },
	{ code: 'ja', label: 'Japanese' },
	{ code: 'ko', label: 'Korean' },
	{ code: 'zh', label: 'Mandarin Chinese' },
	{ code: 'ar', label: 'Arabic' },
	{ code: 'hi', label: 'Hindi' },
	{ code: 'pl', label: 'Polish' }
] as const;

export function getLanguageLabel(code: string) {
	return languages.find((language) => language.code === code)?.label ?? code;
}

export function getOpenAITranslationLanguage(code: string) {
	return code === 'pt-BR' ? 'pt' : code;
}

export function isSupportedLanguage(code: string): code is LanguageCode {
	return languages.some((language) => language.code === code);
}

export function defaultHearLanguage(locale = 'en') {
	const exact = languages.find((language) => language.code.toLowerCase() === locale.toLowerCase());
	if (exact) return exact.code;
	const base = locale.toLowerCase().split('-')[0] ?? 'en';
	return isSupportedLanguage(base) ? base : 'en';
}
