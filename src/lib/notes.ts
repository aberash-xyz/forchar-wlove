// Client side of the note gate. Bodies only ever arrive after a successful
// unlock (the server checks the signed cookie).

export async function postUnlock(
	code: string
): Promise<{ ok: boolean; error?: string; status: number }> {
	const r = await fetch('/api/unlock', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ code })
	});
	if (r.ok) return { ok: true, status: r.status };
	const data = await r.json().catch(() => ({}));
	return { ok: false, error: data.error ?? 'Something went wrong.', status: r.status };
}

/** Fetch all unlocked note bodies, or null if the session isn't unlocked. */
export async function getNotes(): Promise<Record<string, string> | null> {
	const r = await fetch('/api/notes');
	if (!r.ok) return null;
	return (await r.json()) as Record<string, string>;
}
