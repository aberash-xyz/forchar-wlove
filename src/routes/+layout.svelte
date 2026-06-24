<script lang="ts">
  import "./layout.css";
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<header class="pt-2 px-4 w-full absolute top-0 mix-blend-difference">
  <span class="font-bold text-2xl">W❤️</span>
</header>
{@render children()}

<style>
  header {
    color: #f4dca0;
  }
</style>
