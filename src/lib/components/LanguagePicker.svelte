<script lang="ts">
	import { Check, Search, X } from 'lucide-svelte';
	import { getLanguageLabel, languages, type LanguageCode } from '$lib/constants/languages';
	import { playClick } from '$lib/realtime/clickSound';

	let {
		value = $bindable<LanguageCode>(),
		label = 'Language',
		tone = 'green'
	}: {
		value: LanguageCode;
		label?: string;
		tone?: 'amber' | 'green';
	} = $props();

	let open = $state(false);
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
		class="backdrop"
		role="presentation"
		onclick={close}
		onkeydown={(event) => {
			if (event.key === 'Escape') close();
		}}
	></div>

	<div class="sheet" class:amber={tone === 'amber'} role="dialog" aria-modal="true" aria-label={label}>
		<header>
			<span class="title mono">{label}</span>
			<button
				class="close"
				type="button"
				aria-label="Close"
				onpointerdown={() => playClick('down')}
				onclick={close}
			>
				<X size={16} />
			</button>
		</header>

		<label class="search">
			<Search size={15} />
			<span class="sr-only">Search languages</span>
			<input bind:value={query} placeholder="Search languages" autocomplete="off" />
		</label>

		<div class="body">
			{#if filteredLanguages.length === 0}
				<p class="note mono">No languages found.</p>
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
								<span class="dot" aria-hidden="true"></span>
								<span class="name">{language.label}</span>
								<span class="code mono">{language.code}</span>
								{#if value === language.code}
									<Check size={15} />
								{/if}
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

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: oklch(0 0 0 / 0.6);
		backdrop-filter: blur(2px);
	}

	.sheet {
		position: fixed;
		left: 50%;
		bottom: clamp(1rem, 4vw, 2rem);
		transform: translateX(-50%);
		z-index: 51;
		display: grid;
		gap: 0.75rem;
		width: min(92vw, 24rem);
		max-height: min(36rem, 84svh);
		border-radius: 1rem;
		background: linear-gradient(180deg, var(--device-body-top), var(--device-body-bottom));
		padding: 1rem;
		box-shadow:
			0 1px 0 var(--device-edge-highlight) inset,
			0 0 0 1px oklch(0.32 0.005 250 / 0.5),
			0 24px 60px -12px oklch(0 0 0 / 0.7);
		--accent: var(--screen-green);
		--accent-dim: var(--screen-green-dim);
		--selected-bg: oklch(0.22 0.04 145);
	}

	.sheet.amber {
		--accent: var(--screen-amber);
		--accent-dim: var(--screen-amber-dim);
		--selected-bg: oklch(0.22 0.04 60);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.6rem;
		border-bottom: 1px dashed oklch(0.4 0.005 250 / 0.35);
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
		width: 1.8rem;
		height: 1.8rem;
		border: 0;
		border-radius: 0.4rem;
		background: oklch(0.22 0.005 250);
		color: var(--ink-muted);
		box-shadow: inset 0 1px 0 oklch(0.4 0.005 250 / 0.5);
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.65rem 0.75rem;
		border-radius: 0.5rem;
		background: oklch(0.13 0.005 250);
		color: var(--accent-dim);
		box-shadow:
			inset 0 1px 0 oklch(0.34 0.005 250 / 0.3),
			0 0 0 1px oklch(0.36 0.005 250 / 0.35);
	}

	.search input {
		width: 100%;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--ink);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.82rem;
	}

	.search input::placeholder {
		color: var(--ink-muted);
		opacity: 0.75;
	}

	.body {
		min-height: 0;
		overflow: auto;
		padding-right: 0.1rem;
	}

	.body ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}

	.language {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		min-height: 2.75rem;
		padding: 0.65rem 0.75rem;
		border: 0;
		border-radius: 0.5rem;
		background: oklch(0.18 0.005 250);
		color: var(--ink);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.82rem;
		text-align: left;
		box-shadow: inset 0 1px 0 oklch(0.34 0.005 250 / 0.4);
	}

	.language:hover {
		filter: brightness(1.1);
	}

	.language.selected {
		background: var(--selected-bg);
		color: var(--accent);
	}

	.dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--led-dim);
		box-shadow: inset 0 0 1px oklch(0 0 0 / 0.5);
		flex-shrink: 0;
	}

	.language.selected .dot {
		background: var(--led-orange);
		box-shadow: 0 0 6px var(--led-orange-glow);
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
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: var(--ink-muted);
		text-transform: uppercase;
	}

	.note {
		margin: 0;
		font-size: 0.78rem;
		color: var(--ink-muted);
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
