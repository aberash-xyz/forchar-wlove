<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { collection, onSnapshot, query } from 'firebase/firestore';
	import { page } from '$app/state';
	import { db } from '$lib/firebase';
	import Postcard from '$lib/components/Postcard.svelte';
	import NoteModal from '$lib/components/NoteModal.svelte';
	import { postUnlock, getNotes } from '$lib/notes';
	import { filterCards, isSearchActive } from '$lib/search';

	type WallCard = {
		id: string;
		senderName: string;
		coverColor: string;
		imageUrl: string | null;
		ms: number;
	};

	const tv = $derived(page.url.searchParams.has('tv'));

	let cards = $state<WallCard[]>([]);
	let loaded = $state(false);
	let firstBatch = $state(new Set<string>());

	// Note gate
	let selected = $state<WallCard | null>(null);
	let unlocked = $state(false);
	let notes = $state<Record<string, string>>({});
	// distinguish a tap from a pan (panzoom owns dragging)
	let downX = 0;
	let downY = 0;

	function onCardClick(e: MouseEvent, card: WallCard) {
		if (Math.hypot(e.clientX - downX, e.clientY - downY) < 8) selected = card;
	}

	async function handleUnlock(code: string) {
		const res = await postUnlock(code);
		if (res.ok) {
			const n = await getNotes();
			if (n) {
				notes = n;
				unlocked = true;
			}
		}
		return res;
	}

	// Search (front-end only — see $lib/search). Matches re-flow to the center;
	// non-matches drop out.
	let search = $state('');
	const searchActive = $derived(isSearchActive(search));
	const displayCards = $derived(filterCards(cards, search, { notes, unlocked }));

	let vw = $state(0);

	// Grid geometry. Card size is derived from the viewport to show ~4 across
	// (up to ~5 on very wide screens); it stays fixed while panning and only
	// recomputes when the screen size changes. Gaps are wide enough that the
	// per-card rotation never makes neighbours overlap.
	const GAP = 46;
	const SPACING_X = $derived(Math.min(Math.max((vw || 1120) / 4, 230), 480));
	const CARD_W = $derived(SPACING_X - GAP);
	const CARD_H = $derived(CARD_W * 1.5); // 4:6
	const SPACING_Y = $derived(CARD_H + GAP);
	const ROT_MAX = 6; // deg
	const JITTER = 12; // px, small enough to never overlap within the gap

	function hashUnit(s: string, salt: number): number {
		let h = (2166136261 ^ salt) >>> 0;
		for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
		return (h >>> 0) / 4294967295;
	}

	// Square spiral: index 0 = center, ringing outward.
	function spiralCells(n: number): { gx: number; gy: number }[] {
		const out: { gx: number; gy: number }[] = [];
		let x = 0,
			y = 0,
			dx = 0,
			dy = -1;
		for (let i = 0; i < n; i++) {
			out.push({ gx: x, gy: y });
			if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
				const t = dx;
				dx = -dy;
				dy = t;
			}
			x += dx;
			y += dy;
		}
		return out;
	}

	type Placed = {
		card: WallCard;
		x: number;
		y: number;
		rot: number;
		delay: number;
		newest: boolean;
	};

	const layout = $derived.by<Placed[]>(() => {
		const cells = spiralCells(displayCards.length);
		return displayCards.map((card, i) => {
			const { gx, gy } = cells[i];
			return {
				card,
				x: gx * SPACING_X + (hashUnit(card.id, 1) - 0.5) * 2 * JITTER,
				y: gy * SPACING_Y + (hashUnit(card.id, 2) - 0.5) * 2 * JITTER,
				rot: (hashUnit(card.id, 3) - 0.5) * 2 * ROT_MAX,
				delay: firstBatch.has(card.id) ? Math.min(i * 14, 650) : 0,
				newest: !searchActive && i === displayCards.length - 1
			};
		});
	});

	// Populated extent — bounds the ambient drift so it roams over cards.
	const extentX = $derived(layout.reduce((m, l) => Math.max(m, Math.abs(l.x)), 0) + CARD_W);
	const extentY = $derived(layout.reduce((m, l) => Math.max(m, Math.abs(l.y)), 0) + CARD_H);

	// Pop-in: cards mount tiny+transparent at their own spot, then settle.
	let placed = $state(new Set<string>());
	$effect(() => {
		const ids = layout.map((l) => l.card.id);
		const raf = requestAnimationFrame(() => {
			untrack(() => {
				const missing = ids.filter((id) => !placed.has(id));
				if (missing.length) {
					const s = new Set(placed);
					for (const id of missing) s.add(id);
					placed = s;
				}
			});
		});
		return () => cancelAnimationFrame(raf);
	});

	let cameraEl = $state<HTMLDivElement>();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let pzInstance = $state<any>(null);

	onMount(() => {
		const q = query(collection(db(), 'cards'));
		const unsub = onSnapshot(q, (snap) => {
			const next = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					senderName: data.senderName,
					coverColor: data.coverColor,
					imageUrl: data.imageUrl ?? null,
					ms: data.createdAt?.toMillis?.() ?? Number.POSITIVE_INFINITY
				};
			});
			next.sort((a, b) => a.ms - b.ms); // oldest -> center, newest -> frontier
			if (!loaded) firstBatch = new Set(next.map((c) => c.id));
			cards = next;
			loaded = true;
		});

		// If a valid unlock cookie is already present (returning visitor), load the
		// notes; otherwise this 401s and no bodies are delivered.
		getNotes().then((n) => {
			if (n) {
				notes = n;
				unlocked = true;
			}
		});

		// panzoom handles drag + inertial momentum (and touch). We disable zoom and
		// drive a gentle ambient drift through its API while the user is idle.
		let raf = 0;
		let lastT = 0;
		let pausedUntil = 0;
		let angle = hashUnit('seed', 7) * Math.PI * 2;
		let disposed = false;

		(async () => {
			const panzoom = (await import('panzoom')).default;
			if (disposed || !cameraEl) return;
			pzInstance = panzoom(cameraEl, {
				maxZoom: 1,
				minZoom: 1,
				zoomDoubleClickSpeed: 1, // disables double-click zoom
				beforeWheel: () => true, // no wheel zoom
				smoothScroll: true // kinetic momentum on release
			});
			pzInstance.on('panstart', () => (pausedUntil = Number.POSITIVE_INFINITY));
			pzInstance.on('panend', () => (pausedUntil = performance.now() + 1600));

			const frame = (t: number) => {
				if (!lastT) lastT = t;
				const dt = Math.min(48, t - lastT);
				lastT = t;
				if (pzInstance && searchActive) {
					// Ease the camera back to center so matches (which re-flow to the
					// middle) come into view — robust against any lingering momentum.
					const tr = pzInstance.getTransform();
					if (Math.abs(tr.x) > 0.5 || Math.abs(tr.y) > 0.5) {
						const k = Math.min(1, 0.012 * dt);
						pzInstance.moveBy(-tr.x * k, -tr.y * k);
					}
				} else if (pzInstance && !selected && t > pausedUntil) {
					// Ambient drift while idle (no modal, no search).
					angle += 0.00016 * dt;
					const speed = 0.026; // px/ms ~ 26px/s
					let dx = Math.cos(angle) * speed * dt;
					let dy = Math.sin(angle) * speed * dt;
					const tr = pzInstance.getTransform();
					const lx = extentX * 0.7;
					const ly = extentY * 0.7;
					if (Math.abs(tr.x) > lx) dx -= Math.sign(tr.x) * (Math.abs(tr.x) - lx) * 0.02;
					if (Math.abs(tr.y) > ly) dy -= Math.sign(tr.y) * (Math.abs(tr.y) - ly) * 0.02;
					pzInstance.moveBy(dx, dy, false);
				}
				raf = requestAnimationFrame(frame);
			};
			raf = requestAnimationFrame(frame);
		})();

		return () => {
			disposed = true;
			unsub();
			cancelAnimationFrame(raf);
			pzInstance?.dispose();
		};
	});
</script>

<svelte:head><title>The wall</title></svelte:head>

<div
	class="wall"
	class:tv
	role="application"
	aria-label="Postcard wall — drag to pan, tap a card to read"
	bind:clientWidth={vw}
	onpointerdown={(e) => {
		downX = e.clientX;
		downY = e.clientY;
	}}
>
	{#if loaded && cards.length === 0}
		<p class="empty font-serif">No cards yet. Be the first to send one.</p>
	{/if}

	{#if !tv}
		<div class="searchbar">
			<input
				class="search"
				type="text"
				bind:value={search}
				placeholder={unlocked ? 'Search names & notes…' : 'Search names…'}
				aria-label="Search the wall"
			/>
			{#if searchActive}
				<button class="clear" onclick={() => (search = '')} aria-label="Clear search">×</button>
			{/if}
		</div>
		{#if searchActive}
			<p class="result-hint">
				{displayCards.length === 0
					? 'No cards match'
					: `${displayCards.length} match${displayCards.length === 1 ? '' : 'es'}`}
			</p>
		{/if}
	{/if}

	<div class="camera" bind:this={cameraEl}>
		{#each layout as l (l.card.id)}
			{@const on = placed.has(l.card.id)}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class="card"
				class:newest={l.newest}
				style:width="{CARD_W}px"
				style:opacity={on ? 1 : 0}
				style:transition-delay="{l.delay}ms"
				style:transform={on
					? `translate(-50%,-50%) translate(${l.x}px,${l.y}px) rotate(${l.rot}deg)`
					: `translate(-50%,-50%) translate(${l.x}px,${l.y}px) scale(0.2)`}
				onclick={(e) => onCardClick(e, l.card)}
			>
				<Postcard color={l.card.coverColor} name={l.card.senderName} imageUrl={l.card.imageUrl} />
			</div>
		{/each}
	</div>
</div>

{#if selected}
	<NoteModal
		card={selected}
		body={notes[selected.id]}
		{unlocked}
		onClose={() => (selected = null)}
		onUnlock={handleUnlock}
	/>
{/if}

<style>
	.wall {
		position: relative;
		height: 100dvh;
		width: 100%;
		overflow: hidden;
		background: radial-gradient(circle at 50% 45%, var(--bg-elev) 0%, var(--bg) 70%);
		cursor: grab;
		touch-action: none;
	}
	.wall :global(.camera) {
		cursor: grab;
	}

	.searchbar {
		position: fixed;
		top: 0.9rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 40;
	}
	.search {
		width: min(72vw, 22rem);
		padding: 0.55rem 2rem 0.55rem 0.95rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg-elev) 82%, transparent);
		border: 1px solid color-mix(in srgb, var(--ink) 22%, transparent);
		color: var(--ink);
		outline: none;
		backdrop-filter: blur(4px);
	}
	.search::placeholder {
		color: var(--ink-muted);
	}
	.clear {
		position: absolute;
		top: 50%;
		right: 0.6rem;
		transform: translateY(-50%);
		font-size: 1.3rem;
		line-height: 1;
		color: var(--ink-muted);
		cursor: pointer;
	}
	.result-hint {
		position: fixed;
		top: 3.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 40;
		font-size: 0.8rem;
		color: var(--ink-muted);
	}
	.wall.tv {
		cursor: none;
	}
	/* panzoom positions the camera's origin; place it at the screen center so the
	   center-of-spiral (first card) starts in the middle. */
	.camera {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 0;
		height: 0;
	}
	.card {
		position: absolute;
		left: 0;
		top: 0;
		transition:
			transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1),
			opacity 0.6s ease;
		will-change: transform, opacity;
	}
	.card.newest :global(.front) {
		animation: pulse 1.8s ease-in-out 0.4s 2;
	}
	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
		}
		50% {
			box-shadow: 0 0 0 3px rgba(232, 161, 60, 0.75);
		}
	}
	.empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: var(--ink-muted);
		font-size: 1.4rem;
		z-index: 1;
	}
</style>
