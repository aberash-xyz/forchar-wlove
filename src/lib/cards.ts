import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { compressToJpeg } from './image';

export interface NewCard {
	senderName: string;
	coverColor: string;
	note: string;
	imageFile?: File | null;
	recipient?: string;
}

/**
 * Pure-client card creation: generate id -> compress+upload photo (if any) ->
 * write `cards/{id}` then `notes/{id}`. Security rules validate both creates.
 * Returns the new card id.
 */
export async function createCard(input: NewCard): Promise<string> {
	const cardRef = doc(collection(db(), 'cards'));
	const id = cardRef.id;

	let imagePath: string | null = null;
	if (input.imageFile) {
		const jpeg = await compressToJpeg(input.imageFile);
		imagePath = `cards/${id}.jpg`;
		await uploadBytes(ref(storage(), imagePath), jpeg, { contentType: 'image/jpeg' });
	}

	await setDoc(cardRef, {
		senderName: input.senderName.trim().slice(0, 40),
		coverColor: input.coverColor,
		imagePath,
		recipient: input.recipient ?? 'char',
		createdAt: serverTimestamp()
	});

	await setDoc(doc(db(), 'notes', id), {
		body: input.note.trim().slice(0, 600),
		createdAt: serverTimestamp()
	});

	return id;
}

/** Resolve a Storage image path to a public download URL (for the wall, M2). */
export function imageUrl(imagePath: string): Promise<string> {
	return getDownloadURL(ref(storage(), imagePath));
}
