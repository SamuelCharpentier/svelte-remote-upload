import { randomUUID } from 'crypto';
import { scheduleJob } from 'node-schedule';

export interface StoredUpload {
	name: string;
	type: string;
	size: number;
	bytes: Uint8Array;
	expireAt: number; // timestamp in milliseconds
}

const EXPIRATION_TIME = 1000 * 60 * 10; // 10 minutes

// In-memory store for the experiment. In a real app this would be object
// storage (S3, R2, etc.) and the id would be the storage key.
const uploads = new Map<string, StoredUpload>();

export function saveUpload(upload: StoredUpload): string {
	const id = randomUUID();
	uploads.set(id, upload);
	return id;
}

export function getUpload(id: string): StoredUpload | undefined {
	return uploads.get(id);
}

export function deleteUpload(id: string): void {
	uploads.delete(id);
}

// Periodically clean up expired uploads every 1 minute.
scheduleJob('*/1 * * * *', () => {
	const now = Date.now();
	for (const [id, upload] of uploads) {
		if (upload.expireAt < now) {
			uploads.delete(id);
		}
	}
});
