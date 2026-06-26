<script lang="ts">
  import PostcardBuilder from "$lib/components/PostcardBuilder.svelte";
</script>

<svelte:head><title>Write a postcard</title></svelte:head>

<main class="page">
  <h1 class="font-serif text-3xl text-ink">Write a postcard</h1>
  <p class="subtitle font-sans-tight">
    A photo, a color, a note — sent to the wall.
  </p>
  <PostcardBuilder />
</main>

<style>
  .page {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem 1rem 3rem;
    background: var(--bg);
  }
  .subtitle {
    color: var(--ink-muted);
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
</style>
