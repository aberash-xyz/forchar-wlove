// Pure layout math for the wall. No Svelte/DOM — just data in, positions out.

export type WallCard = {
	id: string;
	senderName: string;
	coverColor: string;
	imageUrl: string | null;
	ms: number; // createdAt millis; pending writes sort as newest
};

export type Placed = {
	card: WallCard;
	x: number;
	y: number;
	rot: number;
	delay: number;
	newest: boolean;
};

// Feel knobs — tune the wall's look here.
export const GAP = 46;
export const ROT_MAX = 6; // deg
export const JITTER = 12; // px (kept well under the gap so cards never overlap)

/** Map a Firestore card doc's data to a WallCard (pending serverTimestamp -> newest). */
export function toWallCard(id: string, d: Record<string, unknown>): WallCard {
	const createdAt = d.createdAt as { toMillis?: () => number } | undefined;
	return {
		id,
		senderName: (d.senderName as string) ?? '',
		coverColor: (d.coverColor as string) ?? '#888888',
		imageUrl: (d.imageUrl as string | null) ?? null,
		ms: createdAt?.toMillis?.() ?? Number.POSITIVE_INFINITY
	};
}

export const byOldestFirst = (a: WallCard, b: WallCard) => a.ms - b.ms;

export interface CardMetrics {
	cardW: number;
	cardH: number;
	spacingX: number;
	spacingY: number;
}

/** Card size from viewport: ~4 across (up to ~5 on very wide screens). */
export function cardMetrics(vw: number, gap = GAP): CardMetrics {
	const spacingX = Math.min(Math.max((vw || 1120) / 4, 230), 480);
	const cardW = spacingX - gap;
	const cardH = cardW * 1.5; // 4:6
	return { cardW, cardH, spacingX, spacingY: cardH + gap };
}

/** Stable per-id pseudo-random in [0,1) so jitter/rotation never change on re-render. */
export function hashUnit(s: string, salt: number): number {
	let h = (2166136261 ^ salt) >>> 0;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return (h >>> 0) / 4294967295;
}

/** Square spiral cell coords: index 0 = center, then ringing outward. */
export function spiralCells(n: number): { gx: number; gy: number }[] {
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

export interface LayoutOpts {
	spacingX: number;
	spacingY: number;
	firstBatch: Set<string>; // ids present on first load get a center-out stagger
	searchActive: boolean;
	rotMax?: number;
	jitter?: number;
}

/** Place cards center-out with stable per-card rotation and jitter. */
export function computeLayout(cards: WallCard[], o: LayoutOpts): Placed[] {
	const rotMax = o.rotMax ?? ROT_MAX;
	const jitter = o.jitter ?? JITTER;
	const cells = spiralCells(cards.length);
	return cards.map((card, i) => {
		const { gx, gy } = cells[i];
		return {
			card,
			x: gx * o.spacingX + (hashUnit(card.id, 1) - 0.5) * 2 * jitter,
			y: gy * o.spacingY + (hashUnit(card.id, 2) - 0.5) * 2 * jitter,
			rot: (hashUnit(card.id, 3) - 0.5) * 2 * rotMax,
			delay: o.firstBatch.has(card.id) ? Math.min(i * 14, 650) : 0,
			newest: !o.searchActive && i === cards.length - 1
		};
	});
}

/** Bounding half-extent of the placed field (used to bound ambient drift). */
export function fieldExtent(layout: Placed[], cardW: number, cardH: number) {
	let ex = 0;
	let ey = 0;
	for (const l of layout) {
		ex = Math.max(ex, Math.abs(l.x));
		ey = Math.max(ey, Math.abs(l.y));
	}
	return { extentX: ex + cardW, extentY: ey + cardH };
}
