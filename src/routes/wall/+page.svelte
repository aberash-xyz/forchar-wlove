<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { collection, onSnapshot, query } from 'firebase/firestore';
	import { page } from '$app/state';
	import { db } from '$lib/firebase';
	import Postcard from '$lib/components/Postcard.svelte';

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
		const cells = spiralCells(cards.length);
		return cards.map((card, i) => {
			const { gx, gy } = cells[i];
			return {
				card,
				x: gx * SPACING_X + (hashUnit(card.id, 1) - 0.5) * 2 * JITTER,
				y: gy * SPACING_Y + (hashUnit(card.id, 2) - 0.5) * 2 * JITTER,
				rot: (hashUnit(card.id, 3) - 0.5) * 2 * ROT_MAX,
				delay: firstBatch.has(card.id) ? Math.min(i * 14, 650) : 0,
				newest: i === cards.length - 1
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

		// panzoom handles drag + inertial momentum (and touch). We disable zoom and
		// drive a gentle ambient drift through its API while the user is idle.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let pz: any;
		let raf = 0;
		let lastT = 0;
		let pausedUntil = 0;
		let angle = hashUnit('seed', 7) * Math.PI * 2;
		let disposed = false;

		(async () => {
			const panzoom = (await import('panzoom')).default;
			if (disposed || !cameraEl) return;
			pz = panzoom(cameraEl, {
				maxZoom: 1,
				minZoom: 1,
				zoomDoubleClickSpeed: 1, // disables double-click zoom
				beforeWheel: () => true, // no wheel zoom
				smoothScroll: true // kinetic momentum on release
			});
			pz.on('panstart', () => (pausedUntil = Number.POSITIVE_INFINITY));
			pz.on('panend', () => (pausedUntil = performance.now() + 1600));

			const frame = (t: number) => {
				if (!lastT) lastT = t;
				const dt = Math.min(48, t - lastT);
				lastT = t;
				if (pz && t > pausedUntil) {
					angle += 0.00016 * dt;
					const speed = 0.026; // px/ms ~ 26px/s
					let dx = Math.cos(angle) * speed * dt;
					let dy = Math.sin(angle) * speed * dt;
					const tr = pz.getTransform();
					const lx = extentX * 0.7;
					const ly = extentY * 0.7;
					if (Math.abs(tr.x) > lx) dx -= Math.sign(tr.x) * (Math.abs(tr.x) - lx) * 0.02;
					if (Math.abs(tr.y) > ly) dy -= Math.sign(tr.y) * (Math.abs(tr.y) - ly) * 0.02;
					pz.moveBy(dx, dy, false);
				}
				raf = requestAnimationFrame(frame);
			};
			raf = requestAnimationFrame(frame);
		})();

		return () => {
			disposed = true;
			unsub();
			cancelAnimationFrame(raf);
			pz?.dispose();
		};
	});
</script>

<svelte:head><title>The wall</title></svelte:head>

<div class="wall" class:tv bind:clientWidth={vw}>
	{#if loaded && cards.length === 0}
		<p class="empty font-serif">No cards yet. Be the first to send one.</p>
	{/if}
	<div class="camera" bind:this={cameraEl}>
		{#each layout as l (l.card.id)}
			{@const on = placed.has(l.card.id)}
			<div
				class="card"
				class:newest={l.newest}
				style:width="{CARD_W}px"
				style:opacity={on ? 1 : 0}
				style:transition-delay="{l.delay}ms"
				style:transform={on
					? `translate(-50%,-50%) translate(${l.x}px,${l.y}px) rotate(${l.rot}deg)`
					: `translate(-50%,-50%) translate(${l.x}px,${l.y}px) scale(0.2)`}
			>
				<Postcard color={l.card.coverColor} name={l.card.senderName} imageUrl={l.card.imageUrl} />
			</div>
		{/each}
	</div>
</div>

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
