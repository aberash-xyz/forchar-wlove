<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import { page } from '$app/state';
	import { db } from '$lib/firebase';
	import Postcard from '$lib/components/Postcard.svelte';

	type WallCard = {
		id: string;
		senderName: string;
		coverColor: string;
		imageUrl: string | null;
	};

	const tv = $derived(page.url.searchParams.has('tv'));

	let cards = $state<WallCard[]>([]);
	let newIds = $state(new Set<string>());
	let loaded = $state(false);

	// Layout
	let scrollEl = $state<HTMLDivElement>();
	let viewportW = $state(0);
	const GAP = 16;
	const minCol = $derived(tv ? 240 : 150);
	const cols = $derived(Math.max(1, Math.floor((viewportW + GAP) / (minCol + GAP))));
	const colW = $derived(cols > 0 ? (viewportW - (cols - 1) * GAP) / cols : viewportW);
	const rowH = $derived(colW * (6 / 4)); // 4:6 portrait card
	const rowCount = $derived(Math.ceil(cards.length / cols));

	const virt = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => scrollEl ?? null,
		estimateSize: () => rowH,
		overscan: 4,
		gap: GAP
	});

	// Keep the virtualizer in sync with reactive layout/data (and pick up the
	// scroll element once it mounts). Read the instance untracked via get() so
	// setOptions' store update doesn't re-trigger this effect into a loop; depend
	// only on the layout values below.
	$effect(() => {
		const count = rowCount;
		const size = rowH;
		const el = scrollEl;
		get(virt).setOptions({
			count,
			getScrollElement: () => el ?? null,
			estimateSize: () => size,
			overscan: 4,
			gap: GAP
		});
	});

	function flagNew(id: string) {
		const s = new Set(newIds);
		s.add(id);
		newIds = s;
		setTimeout(() => {
			const t = new Set(newIds);
			t.delete(id);
			newIds = t;
		}, 2200);
	}

	onMount(() => {
		const q = query(collection(db(), 'cards'), orderBy('createdAt', 'desc'));
		let initialized = false;
		const unsub = onSnapshot(q, (snap) => {
			cards = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					senderName: data.senderName,
					coverColor: data.coverColor,
					imageUrl: data.imageUrl ?? null
				};
			});
			if (initialized) {
				for (const ch of snap.docChanges()) if (ch.type === 'added') flagNew(ch.doc.id);
			}
			initialized = true;
			loaded = true;
		});

		// TV ambient: gentle auto-scroll, looping. Pauses while a person scrolls.
		let raf = 0;
		let paused = 0;
		const onWheel = () => (paused = 60);
		if (tv && scrollEl) scrollEl.addEventListener('wheel', onWheel, { passive: true });
		const tick = () => {
			if (tv && scrollEl) {
				if (paused > 0) paused--;
				else {
					const max = scrollEl.scrollHeight - scrollEl.clientHeight;
					scrollEl.scrollTop = max > 0 ? (scrollEl.scrollTop + 0.4) % (max + 1) : 0;
				}
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		return () => {
			unsub();
			cancelAnimationFrame(raf);
			scrollEl?.removeEventListener('wheel', onWheel);
		};
	});
</script>

<svelte:head><title>The wall</title></svelte:head>

<div class="wall" class:tv>
	<div class="viewport" bind:this={scrollEl} bind:clientWidth={viewportW}>
		{#if loaded && cards.length === 0}
			<p class="empty font-serif">No cards yet. Be the first to send one.</p>
		{:else}
			<div class="rows" style:height="{$virt.getTotalSize()}px">
				{#each $virt.getVirtualItems() as row (row.key)}
					<div
						class="row"
						style:transform="translateY({row.start}px)"
						style:height="{rowH}px"
						style:grid-template-columns="repeat({cols}, 1fr)"
						style:gap="{GAP}px"
					>
						{#each cards.slice(row.index * cols, row.index * cols + cols) as card (card.id)}
							<div class="cell" class:enter={newIds.has(card.id)} class:newest={card.id === cards[0]?.id}>
								<Postcard color={card.coverColor} name={card.senderName} imageUrl={card.imageUrl} />
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.wall {
		height: 100dvh;
		background: #070a14;
	}
	.viewport {
		height: 100%;
		overflow-y: auto;
		padding: 16px;
	}
	.rows {
		position: relative;
		width: 100%;
	}
	.row {
		position: absolute;
		inset-inline: 0;
		display: grid;
	}
	.cell {
		min-width: 0;
	}

	.empty {
		color: rgba(244, 220, 160, 0.6);
		text-align: center;
		margin-top: 30vh;
		font-size: 1.4rem;
	}

	/* enter animation for newly streamed-in cards */
	.cell.enter {
		animation: enter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.cell.newest {
		animation: enter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.cell.newest :global(.front) {
		animation: pulse 1.8s ease-in-out 0.6s 2;
	}
	@keyframes enter {
		from {
			opacity: 0;
			transform: scale(0.85) translateY(12px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
		}
		50% {
			box-shadow: 0 0 0 3px rgba(232, 161, 60, 0.7);
		}
	}

	/* TV ambient mode */
	.wall.tv .viewport {
		padding: 28px;
	}
</style>
