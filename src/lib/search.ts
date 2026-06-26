// Front-end card search. The whole dataset lives in memory (the wall loads
// every card; unlock fetches every note), so search is a plain in-memory
// filter — no Firestore queries or indexes needed at party scale.

export interface SearchableCard {
	id: string;
	senderName: string;
}

export interface SearchContext {
	/** Note bodies, keyed by card id. Only present (and searched) after unlock. */
	notes: Record<string, string>;
	unlocked: boolean;
}

export function isSearchActive(rawQuery: string): boolean {
	return rawQuery.trim().length > 0;
}

/** Does this card match the query? Sender name always; note body once unlocked. */
export function cardMatches<T extends SearchableCard>(
	card: T,
	rawQuery: string,
	ctx: SearchContext
): boolean {
	const q = rawQuery.trim().toLowerCase();
	if (!q) return true;
	if (card.senderName.toLowerCase().includes(q)) return true;
	if (ctx.unlocked && (ctx.notes[card.id] ?? '').toLowerCase().includes(q)) return true;
	return false;
}

/** Filter cards by the query; returns the original array when the query is empty. */
export function filterCards<T extends SearchableCard>(
	cards: T[],
	rawQuery: string,
	ctx: SearchContext
): T[] {
	if (!isSearchActive(rawQuery)) return cards;
	return cards.filter((c) => cardMatches(c, rawQuery, ctx));
}
