import { getContext, setContext } from 'svelte';

const KEY = Symbol('deferred-upload');

/** Performs a field's upload; resolves `true` on success, `false` on failure. */
export type Uploader = () => Promise<boolean>;

export interface DeferredUploadCoordinator {
	/** Register a field's uploader. Returns a function to unregister it. */
	register(uploader: Uploader): () => void;
	/** Run every registered upload concurrently. Resolves `true` if all succeed. */
	uploadAll(): Promise<boolean>;
}

export function createDeferredUploadCoordinator(): DeferredUploadCoordinator {
	const uploaders = new Set<Uploader>();
	return {
		register(uploader) {
			uploaders.add(uploader);
			return () => uploaders.delete(uploader);
		},
		async uploadAll() {
			// Promise.all fires every upload at once, so they run concurrently
			// rather than waiting for each to finish before starting the next.
			const results = await Promise.all([...uploaders].map((upload) => upload()));
			return results.every(Boolean);
		},
	};
}

/** Create a coordinator and expose it to descendant components via context. */
export function setDeferredUploadContext(): DeferredUploadCoordinator {
	const coordinator = createDeferredUploadCoordinator();
	setContext(KEY, coordinator);
	return coordinator;
}

export function getDeferredUploadContext(): DeferredUploadCoordinator | undefined {
	return getContext(KEY);
}
