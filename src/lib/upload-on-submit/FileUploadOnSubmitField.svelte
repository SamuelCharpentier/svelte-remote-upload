<script lang="ts">
	import type { RemoteForm, RemoteFormField } from '@sveltejs/kit';
	import { registerUploadOnSubmit } from './uploadOnSubmit';

	interface Props {
		/** The remote form this field belongs to, validated before uploading. */
		form: RemoteForm<any, any>;
		/** The remote form field this control is bound to. */
		field: RemoteFormField<File | string>;
		label?: string;
		accept?: string;
		/** Endpoint that accepts the file and returns `{ id }`. */
		uploadUrl?: string;
		/** Out: whether an upload is currently in flight. */
		uploading?: boolean;
	}

	let {
		form,
		field,
		label = 'File:',
		accept = 'image/jpeg,image/png',
		uploadUrl = '/api/upload',
		uploading = $bindable(false),
	}: Props = $props();

	let selectedFile: File | null = $state(null);
	let uploadedId = $state('');
	// The File that produced `uploadedId`, so a re-submit can skip re-uploading.
	let uploadedFile: File | null = null;
	let progress = $state(0);
	let uploadError = $state('');

	/** Clear the upload state, e.g. after a successful form submission. */
	export function reset() {
		selectedFile = null;
		uploadedId = '';
		uploadedFile = null;
		progress = 0;
		uploadError = '';
	}

	// Attachment on the field's label: register this field's upload with the form
	// so the submit-click coordinator can validate and then run it before the form
	// is submitted, and clear our state on a native form reset. Both are the
	// field's own responsibility — the parent just drops the component in.
	function connectToForm(node: HTMLElement) {
		const element = node.closest('form');
		if (!element) return;
		const unregister = registerUploadOnSubmit(element, form, upload);
		const handleReset = () => reset();
		element.addEventListener('reset', handleReset);
		return () => {
			unregister();
			element.removeEventListener('reset', handleReset);
		};
	}

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		selectedFile = input.files?.[0] ?? null;
		uploadError = '';
		// A new file invalidates any previously uploaded reference.
		if (selectedFile !== uploadedFile) {
			uploadedId = '';
			progress = 0;
		}
	}

	// Called by the coordinator when the form is submitted. Uploads the selected
	// file and records the returned id; resolves false if the upload fails.
	async function upload(): Promise<boolean> {
		uploadError = '';

		// Nothing chosen: leave the id empty and let the form's preflight
		// validation report the missing image.
		if (!selectedFile) {
			return true;
		}

		// Reuse a completed upload if the file hasn't changed (e.g. when the
		// user re-submits after fixing an unrelated validation error).
		if (uploadedId && selectedFile === uploadedFile) {
			return true;
		}

		uploading = true;
		progress = 0;
		try {
			uploadedId = await uploadFile(selectedFile);
			uploadedFile = selectedFile;
			return true;
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Upload failed';
			uploadedId = '';
			uploadedFile = null;
			return false;
		} finally {
			uploading = false;
		}
	}

	// Upload the file to a dedicated endpoint via XHR so we can report progress.
	// The endpoint returns an id, which we submit through the remote form.
	function uploadFile(file: File) {
		return new Promise<string>((resolve, reject) => {
			const body = new FormData();
			body.append('file', file);

			const xhr = new XMLHttpRequest();
			xhr.open('POST', uploadUrl);
			xhr.upload.addEventListener('progress', (event) => {
				if (event.lengthComputable) {
					progress = (event.loaded / event.total) * 100;
				}
			});
			xhr.addEventListener('load', () => {
				const payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve(payload.id);
				} else {
					reject(new Error(payload.message ?? 'Upload failed'));
				}
			});
			xhr.addEventListener('error', () => reject(new Error('Upload failed')));
			xhr.send(body);
		});
	}
</script>

<label {@attach connectToForm}>
	{label}
	{#if uploadedId}
		<!-- Uploaded: submit the id reference in place of the file, so the form
		     sends the lightweight reference rather than re-posting the file. -->
		<input {...field.as('hidden', uploadedId)} />
		<span class="uploaded">{selectedFile?.name ?? 'File uploaded'}</span>
	{:else}
		<!-- The real File is the field's value, so the coordinator can validate the
		     chosen file (type, size…) and the rest of the form before uploading. -->
		<input {...field.as('file')} {accept} disabled={uploading} onchange={handleFileChange} />
	{/if}
</label>

{#each field.issues() ?? [] as issue (issue.message)}
	<span class="hint">{issue.message}</span>
{/each}
{#if uploadError}
	<span class="hint">{uploadError}</span>
{/if}

{#if uploading || (progress > 0 && progress < 100)}
	<label>
		Upload progress: {Math.round(progress)}%
		<progress max="100" value={progress}></progress>
	</label>
{/if}

<style>
	label {
		display: flex;
		flex-direction: column;
		font-weight: bold;
	}
	input {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	.uploaded {
		font-weight: normal;
		font-size: 0.875rem;
		color: #28a745;
	}
	progress {
		width: 100%;
	}
</style>
