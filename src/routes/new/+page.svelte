<script lang="ts">
	import PostcardBuilder from '$lib/components/PostcardBuilder.svelte';
</script>

<svelte:head><title>Write a postcard</title></svelte:head>

<main class="page">
	<h1 class="font-serif text-3xl text-[#f4dca0]">Write a postcard</h1>
	<p class="subtitle">A photo, a color, a note — sent to the wall.</p>
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
		background: #070a14;
	}
	.subtitle {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}
</style>
