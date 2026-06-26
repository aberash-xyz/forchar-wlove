import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

// Single shared read-passcode. The hash (sha256 hex) lives in READ_PASSCODE_HASH;
// the session cookie is an HMAC-signed expiry, keyed by UNLOCK_COOKIE_SECRET.

export const UNLOCK_COOKIE = 'fw_unlock';
const TTL_MS = 8 * 60 * 60 * 1000; // 8h — covers the party, then re-enter
export const UNLOCK_TTL_S = Math.floor(TTL_MS / 1000);

function secret(): string {
	return env.UNLOCK_COOKIE_SECRET ?? '';
}

function safeEqualHex(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) return false;
	return crypto.timingSafeEqual(ab, bb);
}

export function verifyPasscode(code: string): boolean {
	const expected = (env.READ_PASSCODE_HASH ?? '').trim();
	if (!expected) return false; // no passcode configured → deny
	const got = crypto.createHash('sha256').update(code).digest('hex');
	return safeEqualHex(got, expected);
}

export function makeSessionToken(): string {
	const payload = String(Date.now() + TTL_MS); // expiry
	const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
	return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): boolean {
	if (!token) return false;
	const dot = token.indexOf('.');
	if (dot < 0) return false;
	const payload = token.slice(0, dot);
	const sig = token.slice(dot + 1);
	const exp = Number(payload);
	if (!Number.isFinite(exp) || Date.now() > exp) return false;
	const expected = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
	return safeEqualHex(sig, expected);
}

// Best-effort per-IP rate limit. In-memory, so it resets on cold start and is
// per-instance — fine as a brute-force speed bump for a single party passcode.
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 6, windowMs = 60_000): boolean {
	const now = Date.now();
	const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
	recent.push(now);
	hits.set(ip, recent);
	return recent.length > max;
}
