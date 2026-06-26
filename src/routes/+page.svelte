<script lang="ts">
	import QrInvite from '$lib/components/QrInvite.svelte';
</script>

<main class="landing">
	<h3 class="title font-serif">send char some love</h3>
	<QrInvite caption="Scan to write a postcard" />
</main>

<style>
	.landing {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2.5rem;
		padding: 2rem;
		background: var(--bg);
		color: var(--ink);
	}
	.title {
		font-size: clamp(2.25rem, 9vw, 3.5rem);
		text-align: center;
		color: var(--ink);
	}
</style>
