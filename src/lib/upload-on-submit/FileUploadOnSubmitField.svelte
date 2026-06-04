<script lang="ts">
	import { onMount } from 'svelte';
	import type { RemoteFormField } from '@sveltejs/kit';
	import { registerUploadOnSubmit } from './uploadOnSubmit';

	interface Props {
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

	// Deferred upload is a JS-only enhancement. Until the component mounts we
	// render the no-JS variant: a plain file field that posts the File directly.
	let enhanced = $state(false);
	onMount(() => {
		enhanced = true;
	});

	/** Clear the upload state, e.g. after a successful form submission. */
	export function reset() {
		selectedFile = null;
		uploadedId = '';
		uploadedFile = null;
		progress = 0;
		uploadError = '';
	}

	// Attachment on the hidden input: register this field's upload with the form
	// (which wires up the submit-button interception) and clear our state on a
	// native form reset. Both are the field's own responsibility — the parent
	// just drops the component in.
	function connectToForm(node: HTMLInputElement) {
		const form = node.form;
		if (!form) return;
		const unregister = registerUploadOnSubmit(form, upload);
		const handleReset = () => reset();
		form.addEventListener('reset', handleReset);
		return () => {
			unregister();
			form.removeEventListener('reset', handleReset);
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

<label>
	{label}
	{#if enhanced}
		<input type="file" {accept} disabled={uploading} onchange={handleFileChange} />
	{:else}
		<input {...field.as('file')} {accept} />
	{/if}
</label>

{#if enhanced}
	<!-- JS path: submit the uploaded file's id reference instead of the file.
	     It stays empty until the submit button click triggers the upload. -->
	<input {...field.as('hidden', uploadedId)} {@attach connectToForm} />
{/if}

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
	progress {
		width: 100%;
	}
</style>
