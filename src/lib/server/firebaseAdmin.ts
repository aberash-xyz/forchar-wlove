import { readFileSync } from 'node:fs';
import { getApps, initializeApp, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';

// Lives under $lib/server so SvelteKit guarantees it never reaches the client.

let _app: App | undefined;
let _db: Firestore | undefined;

function projectId(): string {
	return pubEnv.PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-farewell-sky';
}

function adminApp(): App {
	if (_app) return _app;
	if (getApps().length) {
		_app = getApps()[0];
		return _app;
	}

	// Emulator mode: FIRESTORE_EMULATOR_HOST is set and no service account is needed.
	if (env.FIRESTORE_EMULATOR_HOST) {
		_app = initializeApp({ projectId: projectId() });
		return _app;
	}

	// Production: service account from a JSON env (deploy) or a file path (local).
	const raw = env.FIREBASE_SERVICE_ACCOUNT_PATH
		? readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
		: env.FIREBASE_SERVICE_ACCOUNT;
	if (raw) {
		const svc = JSON.parse(raw);
		// `\n` inside the private key survives env round-trips as a literal — normalize.
		if (typeof svc.private_key === 'string') {
			svc.private_key = svc.private_key.replace(/\\n/g, '\n');
		}
		_app = initializeApp({ credential: cert(svc), projectId: svc.project_id ?? projectId() });
	} else {
		_app = initializeApp({ credential: applicationDefault(), projectId: projectId() });
	}
	return _app;
}

/** Admin Firestore handle — full read access, server-only. */
export function adminDb(): Firestore {
	if (!_db) _db = getFirestore(adminApp());
	return _db;
}
