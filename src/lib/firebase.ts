import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { env } from '$env/dynamic/public';

const config = {
	apiKey: env.PUBLIC_FIREBASE_API_KEY,
	authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
	appId: env.PUBLIC_FIREBASE_APP_ID
};

let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;
let _emulatorWired = false;

function app(): FirebaseApp {
	if (!_app) _app = getApps().length ? getApp() : initializeApp(config);
	return _app;
}

/** Firestore handle. Wires the emulator once when PUBLIC_USE_FIREBASE_EMULATOR=true. */
export function db(): Firestore {
	if (_db) return _db;
	_db = getFirestore(app());
	if (env.PUBLIC_USE_FIREBASE_EMULATOR === 'true' && !_emulatorWired) {
		connectFirestoreEmulator(_db, '127.0.0.1', 8080);
		connectStorageEmulator(storage(), '127.0.0.1', 9199);
		_emulatorWired = true;
	}
	return _db;
}

export function storage(): FirebaseStorage {
	if (!_storage) _storage = getStorage(app());
	return _storage;
}
