<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { browser, dev } from '$app/environment';
	import { Agentation, type AnnotationProps } from 'sv-agentation';

	let { children } = $props();

	const annotationProps: AnnotationProps = {
		workspaceRoot: '/Users/admin/Documents/2. coding projects.nosync/langlink'
	};

	onMount(() => {
		if (!('serviceWorker' in navigator)) return;

		void navigator.serviceWorker.getRegistrations().then((registrations) => {
			for (const registration of registrations) {
				const workers = [registration.installing, registration.waiting, registration.active];
				const isAblyPushWorker = workers.some((worker) =>
					worker?.scriptURL.endsWith('/ably-push-sw.js')
				);

				if (isAblyPushWorker) {
					void registration.unregister();
				}
			}
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

{#if browser && dev}
	<Agentation {...annotationProps} />
{/if}
