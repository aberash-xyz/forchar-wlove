<script lang="ts">
	import QrInvite from '$lib/components/QrInvite.svelte';
	import OrbitRing from '$lib/components/OrbitRing.svelte';
</script>

<main class="landing">
	<OrbitRing text="send char some love" diameter={360}>
		<QrInvite size={150} caption="" />
	</OrbitRing>
	<p class="cta font-sans-tight">scan to write a postcard</p>
</main>

<style>
	.landing {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		padding: 2rem;
		background: var(--bg);
		color: var(--ink);
	}
	.cta {
		color: var(--ink);
		font-size: 0.95rem;
		letter-spacing: 0.02em;
	}
</style>
