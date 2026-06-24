// Client-side image compression. Draws to a canvas and exports JPEG, which
// also converts HEIC (iPhone) -> JPEG and satisfies the image/jpeg-only
// Storage rule. Caps the long edge to keep phone photos small.

export interface CompressOpts {
	maxEdge?: number; // longest side in px (default 1600)
	quality?: number; // 0..1 JPEG quality (default 0.8)
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
	// createImageBitmap decodes HEIC on Safari and is fastest where supported.
	try {
		return await createImageBitmap(file);
	} catch {
		const url = URL.createObjectURL(file);
		try {
			const img = new Image();
			img.src = url;
			await img.decode();
			return img;
		} finally {
			URL.revokeObjectURL(url);
		}
	}
}

function fit(w: number, h: number, maxEdge: number): { width: number; height: number } {
	const scale = Math.min(1, maxEdge / Math.max(w, h));
	return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export async function compressToJpeg(file: File, opts: CompressOpts = {}): Promise<Blob> {
	const maxEdge = opts.maxEdge ?? 1600;
	const quality = opts.quality ?? 0.8;

	const bitmap = await loadBitmap(file);
	const isImg = bitmap instanceof HTMLImageElement;
	const sw = isImg ? bitmap.naturalWidth : bitmap.width;
	const sh = isImg ? bitmap.naturalHeight : bitmap.height;
	const { width, height } = fit(sw, sh, maxEdge);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D context unavailable');
	ctx.drawImage(bitmap, 0, 0, width, height);
	if (bitmap instanceof ImageBitmap) bitmap.close();

	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Image export failed'))),
			'image/jpeg',
			quality
		);
	});
}
