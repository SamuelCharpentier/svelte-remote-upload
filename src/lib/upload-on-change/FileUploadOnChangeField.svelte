<script lang="ts">
	import { onMount } from 'svelte';
	import type { RemoteFormField } from '@sveltejs/kit';

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

	let uploadedId = $state('');
	let progress = $state(0);
	let uploadError = $state('');

	// Upload progress is a JS-only enhancement. Until the component mounts we
	// render the no-JS variant: a plain file field that posts the File directly.
	let enhanced = $state(false);
	onMount(() => {
		enhanced = true;
	});

	// A native form reset clears the file input, but the uploaded id lives in
	// component state, so the hidden field would keep its value. Attach to the
	// hidden input, find its owning form, and clear our state on reset — keeping
	// this the field's own responsibility rather than the parent's.
	function resetWithForm(node: HTMLInputElement) {
		const form = node.form;
		if (!form) return;
		const handleReset = () => reset();
		form.addEventListener('reset', handleReset);
		return () => form.removeEventListener('reset', handleReset);
	}

	/** Clear the upload state, e.g. after a successful form submission. */
	export function reset() {
		uploadedId = '';
		progress = 0;
		uploadError = '';
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

	async function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		uploadError = '';
		uploadedId = '';
		progress = 0;

		if (!file) return;

		uploading = true;
		try {
			uploadedId = await uploadFile(file);
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Upload failed';
		} finally {
			uploading = false;
		}
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
	<!-- JS path: submit the uploaded file's id reference instead of the file. -->
	<input {...field.as('hidden', uploadedId)} {@attach resetWithForm} />
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
