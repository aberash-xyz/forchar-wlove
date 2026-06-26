<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';

	let {
		title,
		description,
		image = '/og.png',
		type = 'website'
	}: { title: string; description: string; image?: string; type?: string } = $props();

	const siteName = 'A Farewell Sky';
	// Canonical origin: PUBLIC_BASE_URL (the deployed domain), else the request
	// origin. Crawlers need absolute URLs, and these are rendered server-side.
	const base = $derived((env.PUBLIC_BASE_URL || page.url.origin).replace(/\/+$/, ''));
	const url = $derived(base + page.url.pathname);
	const imageUrl = $derived(image.startsWith('http') ? image : base + image);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />

	<meta property="og:site_name" content={siteName} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={title} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
</svelte:head>
