import type { Timestamp } from 'firebase/firestore';

/** Placeholder cover colors — stand-ins until real default covers ship. */
export const COVER_COLORS = [
	'#ff7a3c', // ember
	'#e8a13c', // amber
	'#ef5a8c', // pink
	'#46b274', // green
	'#5b86df', // blue
	'#3a4a7a' // indigo
] as const;

/** Public front — `cards/{cardId}`. Readable by anyone. */
export interface Card {
	senderName: string; // 1..40 chars
	coverColor: string; // hex; shown when no image, or behind it
	imagePath: string | null; // Storage path; null = color-only cover
	imageUrl: string | null; // resolved download URL, stored so the wall needs no per-card fetch
	recipient: string;
	createdAt: Timestamp;
}

/** Gated back — `notes/{cardId}`. Same id as its card. Never client-readable. */
export interface Note {
	body: string; // <= 600 chars
	createdAt: Timestamp;
}
