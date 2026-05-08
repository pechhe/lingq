<script lang="ts">
	import { createSvelteAuthClient } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { authClient } from '$lib/auth-client';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	createSvelteAuthClient({ authClient });

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
