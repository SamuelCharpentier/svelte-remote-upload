import { tick } from 'svelte';

/** Performs a field's upload; resolves `true` on success, `false` on failure. */
export type Uploader = () => Promise<boolean>;

interface Coordinator {
	uploaders: Set<Uploader>;
	running: boolean;
}

// One coordinator per <form>, discovered through the field's own DOM node — so
// fields self-organise with no context, provider, or special button required.
const coordinators = new WeakMap<HTMLFormElement, Coordinator>();
let activeCoordinators = 0;

const SUBMIT_SELECTOR =
	'button:not([type]), button[type="submit"], input[type="submit"], input[type="image"]';

// A single document-level listener serves every coordinated form. Resolving the
// clicked submitter's `.form` (rather than relying on DOM containment) means we
// also catch buttons associated via the `form` attribute from outside the form.
const handleDocumentClick = (event: MouseEvent) => {
	const target = event.target as Element | null;
	const submitter = target?.closest<HTMLButtonElement | HTMLInputElement>(SUBMIT_SELECTOR);
	if (!submitter) return;

	const form = submitter.form;
	if (!form) return;

	const coordinator = coordinators.get(form);
	// Only intercept forms that actually have registered deferred work.
	if (!coordinator || coordinator.uploaders.size === 0) return;

	// Intercepting the button's click (not the form's submit) is the only
	// reliable seam: SvelteKit owns the submit event, but the click fires
	// first, and cancelling it stops the submit from ever happening.
	event.preventDefault();
	if (coordinator.running) return;
	coordinator.running = true;

	void (async () => {
		try {
			// Fire every field's upload at once so they run concurrently.
			const results = await Promise.all([...coordinator.uploaders].map((upload) => upload()));
			if (!results.every(Boolean)) return; // a field will surface its error

			// Flush the uploaded ids into the hidden inputs, then submit for
			// real. requestSubmit dispatches a fresh submit event (not a click),
			// so this handler doesn't re-run — no loop.
			await tick();
			if (submitter.disabled) {
				form.requestSubmit();
			} else {
				form.requestSubmit(submitter);
			}
		} finally {
			coordinator.running = false;
		}
	})();
};

/**
 * Register a field's deferred upload with its owning form. The form's submit
 * button click is intercepted automatically; multiple fields on the same form
 * upload concurrently before a single real submit. Returns an unregister fn.
 */
export function registerUploadOnSubmit(form: HTMLFormElement, uploader: Uploader): () => void {
	let coordinator = coordinators.get(form);
	if (!coordinator) {
		coordinator = { uploaders: new Set(), running: false };
		coordinators.set(form, coordinator);
		// Attach the shared listener once, when the first form starts coordinating.
		if (activeCoordinators++ === 0) {
			document.addEventListener('click', handleDocumentClick, true);
		}
	}
	coordinator.uploaders.add(uploader);

	return () => {
		const current = coordinators.get(form);
		if (!current) return;
		current.uploaders.delete(uploader);
		if (current.uploaders.size === 0) {
			coordinators.delete(form);
			// Drop the shared listener once no form is coordinating anymore.
			if (--activeCoordinators === 0) {
				document.removeEventListener('click', handleDocumentClick, true);
			}
		}
	};
}
