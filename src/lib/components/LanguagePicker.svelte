<script lang="ts">
	import { Search, X } from 'lucide-svelte';
	import { getLanguageLabel, languages, type LanguageCode } from '$lib/constants/languages';
	import { playClick } from '$lib/realtime/clickSound';

	let {
		value = $bindable<LanguageCode>(),
		open = $bindable(false),
		label = 'Language',
		tone = 'green'
	}: {
		value: LanguageCode;
		open?: boolean;
		label?: string;
		tone?: 'amber' | 'green';
	} = $props();
	let query = $state('');

	let selectedLabel = $derived(getLanguageLabel(value));
	let normalisedQuery = $derived(query.trim().toLowerCase());
	let filteredLanguages = $derived(
		normalisedQuery
			? languages.filter(
					(language) =>
						language.label.toLowerCase().includes(normalisedQuery) ||
						language.code.toLowerCase().includes(normalisedQuery)
				)
			: languages
	);

	function choose(code: LanguageCode) {
		value = code;
		open = false;
		query = '';
	}

	function close() {
		open = false;
		query = '';
	}
</script>

<div class="picker" class:amber={tone === 'amber'}>
	<span class="picker-label crt-fringe">{label}</span>
	<button
		type="button"
		class="trigger"
		aria-haspopup="dialog"
		aria-expanded={open}
		onpointerdown={() => playClick('down')}
		onclick={() => (open = true)}
	>
		<span>{selectedLabel}</span>
		<span class="chevrons" aria-hidden="true"></span>
	</button>
</div>

{#if open}
	<div
		class="overlay"
		class:amber={tone === 'amber'}
		role="dialog"
		aria-modal="true"
		aria-label={label}
		onkeydown={(event) => {
			if (event.key === 'Escape') close();
		}}
	>
		<header>
			<span class="title">{label}</span>
			<button
				class="close"
				type="button"
				aria-label="Close"
				onpointerdown={() => playClick('down')}
				onclick={close}
			>
				<X size={15} />
			</button>
		</header>

		<label class="search">
			<Search size={15} />
			<span class="sr-only">Search languages</span>
			<input bind:value={query} placeholder="Search languages" autocomplete="off" />
		</label>

		<div class="body">
			{#if filteredLanguages.length === 0}
				<p class="note">No languages found.</p>
			{:else}
				<ul>
					{#each filteredLanguages as language (language.code)}
						<li>
							<button
								type="button"
								class="language"
								class:selected={value === language.code}
								onpointerdown={() => playClick('down')}
								onclick={() => choose(language.code)}
							>
								<span class="marker" aria-hidden="true">{value === language.code ? '>' : ' '}</span>
								<span class="name">{language.label}</span>
								<span class="code">{language.code}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		--accent: var(--screen-green);
		--accent-dim: var(--screen-green-dim);
		--accent-bg: oklch(0.1 0.02 145);
		--accent-border: oklch(0.45 0.12 145 / 0.4);
	}

	.picker.amber {
		--accent: var(--screen-amber);
		--accent-dim: var(--screen-amber-dim);
		--accent-bg: oklch(0.12 0.02 60);
		--accent-border: oklch(0.45 0.1 70 / 0.45);
	}

	.picker-label {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--accent-dim);
		text-transform: uppercase;
	}

	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.7rem;
		width: 100%;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--accent-border);
		border-radius: 0.4rem;
		background: var(--accent-bg);
		color: var(--accent);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.9rem;
		font-weight: 500;
		text-align: left;
	}

	.trigger span:first-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevrons {
		position: relative;
		width: 0.8rem;
		height: 0.8rem;
		flex-shrink: 0;
	}

	.chevrons::before,
	.chevrons::after {
		position: absolute;
		top: 50%;
		width: 0.42rem;
		height: 0.42rem;
		border-right: 2px solid var(--accent);
		border-bottom: 2px solid var(--accent);
		content: '';
	}

	.chevrons::before {
		left: 0;
		transform: translateY(-65%) rotate(45deg);
	}

	.chevrons::after {
		right: 0;
		transform: translateY(-65%) rotate(45deg);
	}

	/* In-screen CRT overlay — confined to the phosphor screen, painted below
	   the scanline/vignette layers so it glows like the rest of the readout. */
	.overlay {
		position: absolute;
		inset: 0;
		z-index: 20;
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr);
		gap: 0.6rem;
		padding: clamp(0.85rem, 2vw, 1.15rem);
		background: linear-gradient(180deg, oklch(0.1 0.02 145 / 0.98), oklch(0.06 0.012 145 / 0.99));
		font-family: ui-monospace, 'SF Mono', Menlo, 'Roboto Mono', monospace;
		color: var(--accent);
		animation: overlay-in 120ms ease-out;
		--accent: var(--screen-green);
		--accent-dim: var(--screen-green-dim);
		--accent-line: oklch(0.5 0.13 145 / 0.4);
		--accent-wash: oklch(0.5 0.13 145 / 0.12);
	}

	.overlay.amber {
		background: linear-gradient(180deg, oklch(0.11 0.02 70 / 0.98), oklch(0.06 0.012 70 / 0.99));
		--accent: var(--screen-amber);
		--accent-dim: var(--screen-amber-dim);
		--accent-line: oklch(0.5 0.1 70 / 0.4);
		--accent-wash: oklch(0.5 0.1 70 / 0.12);
	}

	@keyframes overlay-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.5rem;
		border-bottom: 1px dashed var(--accent-line);
	}

	.title {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--accent);
		text-transform: uppercase;
	}

	.close {
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		border: 1px solid var(--accent-line);
		border-radius: 0.3rem;
		background: transparent;
		color: var(--accent);
	}

	.close:hover {
		background: var(--accent-wash);
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--accent-line);
		border-radius: 0.35rem;
		background: oklch(0 0 0 / 0.35);
		color: var(--accent-dim);
	}

	.search input {
		width: 100%;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--accent);
		caret-color: var(--accent);
		font-family: inherit;
		font-size: 0.82rem;
		letter-spacing: 0.02em;
	}

	.search input::placeholder {
		color: var(--accent-dim);
		opacity: 0.6;
	}

	.body {
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding-right: 0.1rem;
	}

	.body ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.language {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		min-height: 2.6rem;
		padding: 0.55rem 0.4rem;
		border: 0;
		border-bottom: 1px solid oklch(0.4 0.1 145 / 0.12);
		background: transparent;
		color: var(--accent-dim);
		font-family: inherit;
		font-size: 0.86rem;
		letter-spacing: 0.02em;
		text-align: left;
	}

	.language:hover {
		color: var(--accent);
		background: var(--accent-wash);
	}

	.language.selected {
		color: var(--accent);
		background: var(--accent-wash);
	}

	.marker {
		flex-shrink: 0;
		width: 1ch;
		color: var(--accent);
		font-weight: 700;
		text-align: center;
		white-space: pre;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.code {
		flex-shrink: 0;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--accent-dim);
		opacity: 0.7;
		text-transform: uppercase;
	}

	.note {
		margin: 0;
		font-size: 0.8rem;
		color: var(--accent-dim);
		line-height: 1.45;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
