// M3 acceptance: the note gate. Requires the dev server on :5173 and the dev
// passcode "skylantern" (READ_PASSCODE_HASH in .env).
// Run: node scripts/m3-verify.mjs
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const CODE = 'skylantern';
const NOTE_HINT = 'note'; // seeded bodies contain "note"; just checking bodies exist

const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
	console.error(`  ✗ ${m}`);
	process.exitCode = 1;
};

async function unlock(code) {
	const r = await fetch(`${BASE}/api/unlock`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ code })
	});
	const cookie = (r.headers.getSetCookie?.() ?? [])
		.map((c) => c.split(';')[0])
		.find((c) => c.startsWith('fw_unlock='));
	return { status: r.status, body: await r.json().catch(() => ({})), cookie };
}

// 1. notes locked without a cookie -> 401, no bodies leak
{
	const r = await fetch(`${BASE}/api/notes`);
	const text = await r.text();
	if (r.status === 401) pass('GET /api/notes without cookie -> 401');
	else fail(`expected 401, got ${r.status}`);
	if (!text.toLowerCase().includes('"body"') && text.length < 200)
		pass('no note bodies in locked response');
	else fail('locked response leaked content');
}

// 2. wrong passcode -> 401 friendly error, no cookie
{
	const r = await unlock('not-the-code');
	if (r.status === 401 && r.body.error) pass(`wrong passcode -> 401 ("${r.body.error}")`);
	else fail(`wrong passcode: status ${r.status}`);
	if (!r.cookie) pass('no unlock cookie issued on wrong passcode');
	else fail('cookie issued for wrong passcode!');
}

// 3. correct passcode -> cookie issued
let cookie;
{
	const r = await unlock(CODE);
	cookie = r.cookie;
	if (r.status === 200 && cookie) pass('correct passcode -> 200 + signed cookie');
	else fail(`correct passcode: status ${r.status}, cookie ${cookie}`);
}

// 4. notes with cookie -> 200 with bodies
{
	const r = await fetch(`${BASE}/api/notes`, { headers: { cookie } });
	const data = await r.json().catch(() => ({}));
	const n = Object.keys(data).length;
	if (r.status === 200 && n > 0) pass(`GET /api/notes with cookie -> ${n} notes revealed`);
	else fail(`unlocked notes: status ${r.status}, count ${n}`);
}

// 5. tampered cookie -> still locked
{
	const bad = cookie.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
	const r = await fetch(`${BASE}/api/notes`, { headers: { cookie: bad } });
	if (r.status === 401) pass('tampered cookie -> 401 (HMAC verified)');
	else fail(`tampered cookie accepted: ${r.status}`);
}

// 6. rate limiting kicks in on repeated attempts
{
	let got429 = false;
	for (let i = 0; i < 10; i++) {
		const r = await unlock('still-wrong');
		if (r.status === 429) {
			got429 = true;
			break;
		}
	}
	got429 ? pass('rate limit returns 429 after repeated attempts') : fail('no rate limiting');
}

console.log(process.exitCode ? '\nM3 FAILED' : '\nM3 PASSED — note gate holds');
process.exit(process.exitCode ?? 0);
