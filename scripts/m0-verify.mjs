// M0 acceptance proof against the real Firebase project.
// Run with:  node --env-file=.env scripts/m0-verify.mjs
// Requires the SvelteKit dev server running on http://localhost:5173.
//
// Proves: client create card+note  ->  client read card OK
//         client read note DENIED by rules  ->  Admin SDK (server endpoint) reads note OK
import { initializeApp } from 'firebase/app';
import {
	getFirestore,
	doc,
	collection,
	setDoc,
	getDoc,
	deleteDoc,
	serverTimestamp
} from 'firebase/firestore';

const DEV = process.env.DEV_URL ?? 'http://localhost:5173';

const app = initializeApp({
	apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
	appId: process.env.PUBLIC_FIREBASE_APP_ID
});
const db = getFirestore(app);

const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
	console.error(`  ✗ ${m}`);
	process.exitCode = 1;
};

const cardRef = doc(collection(db, 'cards'));
const cardId = cardRef.id;
const body = `secret note ${cardId}`;

// 1. client creates card + note (rules validate the creates)
await setDoc(cardRef, {
	senderName: 'M0 Test Sender',
	wishType: 'future',
	imagePath: null,
	recipient: 'grad',
	createdAt: serverTimestamp()
});
await setDoc(doc(db, 'notes', cardId), { body, createdAt: serverTimestamp() });
pass(`client created cards/${cardId} + notes/${cardId}`);

// 2. client can read the card front
const cardSnap = await getDoc(cardRef);
if (cardSnap.exists() && cardSnap.data().senderName === 'M0 Test Sender') pass('client read of card ALLOWED');
else fail('client could not read card front');

// 3. client read of the note must be DENIED by rules
try {
	await getDoc(doc(db, 'notes', cardId));
	fail('client read of note was ALLOWED (rules broken!)');
} catch (e) {
	if (e.code === 'permission-denied') pass('client read of note DENIED by rules');
	else fail(`client note read failed with unexpected error: ${e.code ?? e.message}`);
}

// 4. Admin SDK via the server endpoint can read the note
const res = await fetch(`${DEV}/api/notes?cardId=${cardId}`);
if (res.ok) {
	const data = await res.json();
	if (data.body === body) pass('Admin SDK (server endpoint) read of note OK');
	else fail(`server returned wrong body: ${JSON.stringify(data)}`);
} else {
	fail(`server endpoint failed: ${res.status} ${await res.text()}`);
}

// cleanup the card front (note stays — client cannot delete it; harmless test data)
try {
	await deleteDoc(cardRef);
} catch {
	/* update/delete denied by rules — expected; ignore */
}

console.log(process.exitCode ? '\nM0 FAILED' : '\nM0 PASSED — all acceptance criteria met');
process.exit(process.exitCode ?? 0);
