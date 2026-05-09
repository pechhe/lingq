import { defineConfig } from 'vite-plus';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		noExternal: ['@mmailaender/convex-better-auth-svelte', '@mmailaender/convex-svelte']
	},
	fmt: {
		ignorePatterns: ['.svelte-kit/**', 'build/**', 'convex/_generated/**', 'node_modules/**'],
		useTabs: true,
		printWidth: 100,
		singleQuote: true,
		semi: true,
		trailingComma: 'none',
		sortPackageJson: false
	},
	lint: {
		ignorePatterns: ['.svelte-kit/**', 'build/**', 'convex/_generated/**', 'node_modules/**'],
		options: {
			typeAware: true,
			typeCheck: true
		}
	},
	staged: {
		'*.{js,ts,svelte}': 'vp check --fix'
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
