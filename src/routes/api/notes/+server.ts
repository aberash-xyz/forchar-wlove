import { json } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebaseAdmin';
import { verifySessionToken, UNLOCK_COOKIE } from '$lib/server/unlock';
import type { Note } from '$lib/types';
import type { RequestHandler } from './$types';

// Gated by the unlock cookie. Returns every note body as { [cardId]: body }.
// Without a valid session cookie, no body is ever sent to the client.
export const GET: RequestHandler = async ({ cookies }) => {
	if (!verifySessionToken(cookies.get(UNLOCK_COOKIE))) {
		return json({ error: 'locked' }, { status: 401 });
	}

	const snap = await adminDb().collection('notes').get();
	const out: Record<string, string> = {};
	snap.forEach((doc) => {
		out[doc.id] = (doc.data() as Note).body;
	});
	return json(out);
};
