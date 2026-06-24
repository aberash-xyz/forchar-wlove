// Seed color-only cards for wall testing.
// Run: node --env-file=.env scripts/seed.mjs [count]   (default 12)
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';

const COVER_COLORS = ['#ff7a3c', '#e8a13c', '#ef5a8c', '#46b274', '#5b86df', '#3a4a7a'];
const NAMES = ['Mimi', 'Tom', 'Sara', 'Lala', 'Ben', 'Noor', 'Kio', 'Ada', 'Sol', 'Ren', 'Uma', 'Theo'];

const count = Number(process.argv[2] ?? 12);

const app = initializeApp({
	apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
	appId: process.env.PUBLIC_FIREBASE_APP_ID
});
const db = getFirestore(app);

for (let i = 0; i < count; i++) {
	const r = doc(collection(db, 'cards'));
	await setDoc(r, {
		senderName: `${NAMES[i % NAMES.length]} ${i + 1}`,
		coverColor: COVER_COLORS[i % COVER_COLORS.length],
		imagePath: null,
		imageUrl: null,
		recipient: 'char',
		createdAt: serverTimestamp()
	});
	// also write a gated note so the data shape matches real cards
	await setDoc(doc(db, 'notes', r.id), {
		body: `A little note #${i + 1} for the road.`,
		createdAt: serverTimestamp()
	});
}
console.log(`seeded ${count} cards (+notes)`);
process.exit(0);
