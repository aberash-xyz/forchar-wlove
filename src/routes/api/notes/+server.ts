import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebaseAdmin';
import type { Note } from '$lib/types';
import type { RequestHandler } from './$types';

// M0: proves the Admin SDK can read a gated note that the client cannot.
// TODO(M3): require the signed unlock cookie before returning any body, and
// return all notes as `{ [cardId]: body }` instead of a single lookup.

export const GET: RequestHandler = async ({ url }) => {
	const cardId = url.searchParams.get('cardId');
	if (!cardId) throw error(400, 'cardId required');

	const snap = await adminDb().collection('notes').doc(cardId).get();
	if (!snap.exists) throw error(404, 'note not found');

	const note = snap.data() as Note;
	return json({ cardId, body: note.body });
};
