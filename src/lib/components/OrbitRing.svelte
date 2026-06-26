<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    text = "send char some love",
    separator = "✦",
    diameter = 360,
    fontSize = 21,
    duration = 38,
    children,
  }: {
    text?: string;
    separator?: string;
    diameter?: number;
    fontSize?: number;
    duration?: number;
    children?: Snippet;
  } = $props();

  const c = $derived(diameter / 2);
  const r = $derived(diameter / 2 - fontSize); // inset so glyphs sit inside the box
  const circ = $derived(2 * Math.PI * r);
  // circle path starting at the left, going clockwise
  const pathD = $derived(
    `M ${c} ${c} m ${-r} 0 a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0`,
  );
  // repeat the phrase to roughly fill the ring; textLength then fills it exactly
  const phrase = $derived(`${text} ${separator} `);
  const reps = $derived(
    Math.max(2, Math.round(circ / (phrase.length * fontSize * 0.52))),
  );
  const ringText = $derived(phrase.repeat(reps));
</script>

<div class="orbit" style:width="{diameter}px" style:height="{diameter}px">
  <svg
    class="ring"
    viewBox="0 0 {diameter} {diameter}"
    style:--dur="{duration}s"
    aria-label={text}
  >
    <defs><path id="orbit-ring-path" d={pathD} fill="none" /></defs>
    <text font-size={fontSize}>
      <textPath
        href="#orbit-ring-path"
        textLength={circ}
        lengthAdjust="spacing"
        startOffset="0"
      >
        {ringText}
      </textPath>
    </text>
  </svg>
  <div class="center">{@render children?.()}</div>
</div>

<style>
  .orbit {
    position: relative;
    display: grid;
    place-items: center;
  }
  .ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform-origin: 50% 50%;
    animation: spin var(--dur, 38s) linear infinite;
    /* I had to add this here because the damn ring wouldn't go away */
    box-shadow: none !important;
  }
  .ring text {
    font-family: var(--font-serif);
    fill: var(--ink);
    letter-spacing: 0.04em;
    text-transform: lowercase;
    /* glow on the glyphs only (not a filter on the <svg>, which would clip to
		   the square viewport and draw a box) */
    filter: drop-shadow(0 0 6px rgba(232, 161, 60, 0.35));
  }
  .center {
    position: relative;
    z-index: 1;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ring {
      animation: none;
    }
  }
</style>
