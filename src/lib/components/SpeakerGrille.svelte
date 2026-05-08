<script lang="ts">
	let { level = 0, label = 'Speaker' }: { level?: number; label?: string } = $props();

	let clamped = $derived(Math.min(1, Math.max(0, level)));
</script>

<div class="grille" role="img" aria-label={label} style="--level: {clamped}">
	<div class="dots" aria-hidden="true"></div>
	<div class="glow" aria-hidden="true"></div>
	<div class="ring" aria-hidden="true"></div>
</div>

<style>
	.grille {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1;
		max-height: 22rem;
		justify-self: center;
		align-self: center;
		border-radius: clamp(0.9rem, 2vw, 1.3rem);
		background: radial-gradient(
			circle at 50% 50%,
			oklch(0.18 0.005 250) 0%,
			oklch(0.12 0.005 250) 70%,
			oklch(0.08 0.005 250) 100%
		);
		box-shadow:
			inset 0 2px 4px oklch(0 0 0 / 0.7),
			inset 0 -1px 1px oklch(0.3 0.005 250 / 0.4);
		overflow: hidden;
	}

	.dots {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle, oklch(0 0 0) 1.2px, transparent 1.6px) 0 0 /
			clamp(7px, 1.4vw, 9px) clamp(7px, 1.4vw, 9px);
		mask: radial-gradient(circle at 50% 50%, oklch(0 0 0) 0%, oklch(0 0 0) 62%, transparent 92%);
	}

	.glow {
		position: absolute;
		inset: 8%;
		border-radius: 999px;
		background: radial-gradient(
			circle at 50% 50%,
			var(--led-orange-glow) 0%,
			oklch(0.55 0.18 55 / 0.6) 25%,
			transparent 60%
		);
		opacity: calc(0.06 + var(--level, 0) * 0.55);
		mix-blend-mode: screen;
		filter: blur(calc(2px + var(--level, 0) * 6px));
		transition: opacity 90ms linear;
		animation: idle-pulse 3.6s ease-in-out infinite;
	}

	.ring {
		position: absolute;
		inset: 4%;
		border-radius: 999px;
		border: 1px solid oklch(0.06 0 0 / 0.6);
		box-shadow:
			inset 0 0 0 1px oklch(0.3 0.005 250 / 0.18),
			inset 0 1px 2px oklch(0 0 0 / 0.6);
		pointer-events: none;
	}

	@keyframes idle-pulse {
		0%,
		100% {
			transform: scale(0.94);
		}
		50% {
			transform: scale(1);
		}
	}
</style>
