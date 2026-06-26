import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
	verifyPasscode,
	makeSessionToken,
	rateLimited,
	UNLOCK_COOKIE,
	UNLOCK_TTL_S
} from '$lib/server/unlock';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	if (rateLimited(getClientAddress())) {
		return json({ error: 'Too many tries — wait a minute and try again.' }, { status: 429 });
	}

	let code: unknown;
	try {
		({ code } = await request.json());
	} catch {
		code = undefined;
	}
	if (typeof code !== 'string' || code.length === 0) {
		return json({ error: 'Enter the passcode.' }, { status: 400 });
	}

	if (!verifyPasscode(code)) {
		return json({ error: "That passcode isn't right." }, { status: 401 });
	}

	cookies.set(UNLOCK_COOKIE, makeSessionToken(), {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: !dev,
		maxAge: UNLOCK_TTL_S
	});
	return json({ ok: true });
};
