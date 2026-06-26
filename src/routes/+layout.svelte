<script lang="ts">
  import "./layout.css";
  import "../app.css";
  import { onMount } from "svelte";
  import { toggleTheme, getTheme, type Theme } from "$lib/theme";
  import Heart from "$lib/components/Heart.svelte";
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();

  let theme = $state<Theme>("dark");
  onMount(() => (theme = getTheme()));
  function flip() {
    theme = toggleTheme();
  }
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<header class="pt-2 px-4 w-full absolute top-0 mix-blend-difference">
  <span class="font-bold text-2xl">W<Heart /></span>
</header>
<button
  class="theme-toggle"
  onclick={flip}
  aria-label="Toggle light or dark theme"
  title="Toggle light/dark"
>
  {theme === "dark" ? "☀️" : "🌙"}
</button>
{@render children()}

<style>
  header {
    color: #f4dca0;
  }
  .theme-toggle {
    position: fixed;
    top: 0.5rem;
    right: 0.75rem;
    z-index: 50;
    width: 2.25rem;
    height: 2.25rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    font-size: 1.1rem;
    line-height: 1;
    background: color-mix(in srgb, var(--ink) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
    cursor: pointer;
  }
  .theme-toggle:hover {
    background: color-mix(in srgb, var(--ink) 20%, transparent);
  }
</style>
