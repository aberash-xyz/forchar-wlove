// M2 acceptance: live wall renders, a new card appears <2s, and NO note body
// ever reaches the browser. Requires dev server on :5173 and seeded cards.
// Run: node --env-file=.env scripts/wall-e2e.mjs
import { chromium } from 'playwright';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';

const URL = process.env.WALL_URL ?? 'http://localhost:5173/wall';
const NOTE_MARKER = 'A little note'; // seeded note bodies contain this
const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
	console.error(`  ✗ ${m}`);
	process.exitCode = 1;
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();

// Watch every response body for note text leaking to the client.
let noteLeak = false;
page.on('response', async (res) => {
	try {
		const body = await res.text();
		if (body.includes(NOTE_MARKER)) {
			noteLeak = true;
			console.error(`    ! note text seen in ${res.url()}`);
		}
	} catch {
		/* streaming/opaque body — ignore */
	}
});

await page.goto(URL, { waitUntil: 'load' });
await page.waitForSelector('.cell', { timeout: 10000 });
const initialCells = await page.locator('.cell').count();
initialCells > 0 ? pass(`wall rendered ${initialCells} card cells`) : fail('no cards rendered');

// Live: create a uniquely-named card and assert it shows up within 2s.
const app = initializeApp({
	apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
	appId: process.env.PUBLIC_FIREBASE_APP_ID
});
const db = getFirestore(app);
const liveName = `LIVE-${Date.now().toString().slice(-6)}`;
const r = doc(collection(db, 'cards'));
await setDoc(r, {
	senderName: liveName,
	coverColor: '#46b274',
	imagePath: null,
	imageUrl: null,
	recipient: 'char',
	createdAt: serverTimestamp()
});
await setDoc(doc(db, 'notes', r.id), { body: `${NOTE_MARKER} LIVE`, createdAt: serverTimestamp() });

const t0 = Date.now();
try {
	// newest-first → appears at the top, in view
	await page.waitForFunction(
		(name) => !!document.body.textContent && document.body.textContent.includes(name),
		liveName,
		{ timeout: 2000 }
	);
	pass(`new card appeared live in ${Date.now() - t0}ms (<2s)`);
} catch {
	fail('new card did not appear within 2s');
}

// settle, then verdict on note leakage
await page.waitForTimeout(500);
noteLeak ? fail('NOTE TEXT reached the browser') : pass('no note text in any network response');

await browser.close();
console.log(process.exitCode ? '\nM2 e2e FAILED' : '\nM2 e2e PASSED');
process.exit(process.exitCode ?? 0);
