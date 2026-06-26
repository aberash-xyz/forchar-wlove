<script lang="ts">
	// Solid, single-color heart. Fills with currentColor so it inherits the
	// surrounding text color (override by setting `color` on it or a parent).
	let { size = '1em' }: { size?: string } = $props();
</script>

<svg
	class="heart"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="currentColor"
	aria-hidden="true"
>
	<path
		d="M12 20.8 L4.6 11.2 C3.3 9.4 3 6.6 5 5.1 C7 3.6 10 4.2 12 6.6 C14 4.2 17 3.6 19 5.1 C21 6.6 20.7 9.4 19.4 11.2 Z"
	/>
</svg>

<style>
	.heart {
		display: inline-block;
		vertical-align: -0.125em;
	}
</style>
