// M1 backend-contract proof against the real project.
// Run: node --env-file=.env scripts/m1-verify.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

const app = initializeApp({
	apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
	appId: process.env.PUBLIC_FIREBASE_APP_ID
});
const db = getFirestore(app);
const st = getStorage(app);

const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
	console.error(`  ✗ ${m}`);
	process.exitCode = 1;
};
const denied = (e) => e?.code === 'permission-denied' || e?.code === 'storage/unauthorized';

const created = [];

// 1. valid card (new schema: coverColor, no wishType)
try {
	const r = doc(collection(db, 'cards'));
	await setDoc(r, {
		senderName: 'M1 Tester',
		coverColor: '#ef5a8c',
		imagePath: `cards/${r.id}.jpg`,
		recipient: 'char',
		createdAt: serverTimestamp()
	});
	created.push(r.id);
	pass('card create with coverColor ALLOWED');
} catch (e) {
	fail(`valid card create rejected: ${e.code ?? e.message}`);
}

// 2. empty senderName must be denied
try {
	const r = doc(collection(db, 'cards'));
	await setDoc(r, { senderName: '', coverColor: '#fff', imagePath: null, recipient: 'char', createdAt: serverTimestamp() });
	created.push(r.id);
	fail('empty senderName was ALLOWED (rule broken)');
} catch (e) {
	denied(e) ? pass('empty senderName DENIED by rules') : fail(`unexpected: ${e.code ?? e.message}`);
}

// 3. Storage: jpeg upload allowed
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); // minimal JPEG markers
try {
	await uploadBytes(ref(st, 'cards/m1-test.jpg'), jpeg, { contentType: 'image/jpeg' });
	pass('Storage jpeg upload ALLOWED');
} catch (e) {
	fail(`jpeg upload rejected: ${e.code ?? e.message}`);
}

// 4. Storage: non-jpeg content type denied
try {
	await uploadBytes(ref(st, 'cards/m1-test.txt'), new Uint8Array([1, 2, 3]), {
		contentType: 'text/plain'
	});
	fail('non-jpeg upload was ALLOWED (rule broken)');
} catch (e) {
	denied(e) ? pass('Storage non-jpeg upload DENIED by rules') : fail(`unexpected: ${e.code ?? e.message}`);
}

console.log(`\ncreated test cards: ${created.join(', ') || '(none)'}`);
console.log(process.exitCode ? 'M1 backend FAILED' : 'M1 backend PASSED');
process.exit(process.exitCode ?? 0);
