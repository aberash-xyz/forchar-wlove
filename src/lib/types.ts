import type { Timestamp } from 'firebase/firestore';

export const WISH_TYPES = ['luck', 'wealth', 'love', 'health', 'future'] as const;
export type WishType = (typeof WISH_TYPES)[number];

/** Public front — `cards/{cardId}`. Readable by anyone. */
export interface Card {
	senderName: string; // <= 40 chars
	wishType: WishType;
	imagePath: string | null; // Storage path; null = no photo
	recipient: string;
	createdAt: Timestamp;
}

/** Gated back — `notes/{cardId}`. Same id as its card. Never client-readable. */
export interface Note {
	body: string; // <= 600 chars
	createdAt: Timestamp;
}
