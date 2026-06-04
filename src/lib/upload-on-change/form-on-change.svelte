<script lang="ts">
	import { myForm } from '$lib/form.remote';
	import { formSchema } from '$lib/form.schema';
	import FileUploadOnChangeField from './FileUploadOnChangeField.svelte';

	let imageFields: Array<{ reset: () => void } | undefined> = $state([]);
	let imageFieldsUploading: Array<boolean> = $state([false, false, false]);
	let anyImageFieldUploading = $derived(imageFieldsUploading.some((uploading) => uploading));
</script>

<form
	{...myForm.preflight(formSchema).enhance(async ({ submit, element }) => {
		if (await submit()) {
			element.reset();
			imageFields.forEach((field) => field?.reset());
		}
	})}
	enctype="multipart/form-data"
>
	<label>
		Name:
		<input {...myForm.fields.name.as('text')} placeholder="Name" />
		{#each myForm.fields.name.issues() as issue (issue.message)}
			<span class="hint">{issue.message}</span>
		{/each}
	</label>
	<label>
		Email:
		<input {...myForm.fields.email.as('email')} placeholder="Email" />
		{#each myForm.fields.email.issues() as issue (issue.message)}
			<span class="hint">{issue.message}</span>
		{/each}
	</label>
	<label>
		Message:
		<textarea {...myForm.fields.message.as('text')}></textarea>
		{#each myForm.fields.message.issues() as issue (issue.message)}
			<span class="hint">{issue.message}</span>
		{/each}
	</label>

	<FileUploadOnChangeField
		bind:this={imageFields[0]}
		bind:uploading={imageFieldsUploading[0]}
		field={myForm.fields.images[0]}
		label="Image:"
	/>
	<FileUploadOnChangeField
		bind:this={imageFields[1]}
		bind:uploading={imageFieldsUploading[1]}
		field={myForm.fields.images[1]}
		label="Image:"
	/>
	<FileUploadOnChangeField
		bind:this={imageFields[2]}
		bind:uploading={imageFieldsUploading[2]}
		field={myForm.fields.images[2]}
		label="Image:"
	/>

	<button type="submit" disabled={!!myForm.pending || anyImageFieldUploading}>
		{#if myForm.pending}
			Submitting…
		{:else}
			Submit
		{/if}
	</button>
	<button type="reset" disabled={!!myForm.pending || anyImageFieldUploading}> Reset </button>

	<p>{JSON.stringify(myForm.result)}</p>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 400px;
		margin: 2rem auto;
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-family: Arial, sans-serif;
	}
	label {
		display: flex;
		flex-direction: column;
		font-weight: bold;
	}
	input,
	textarea {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	button {
		padding: 0.75rem;
		border: none;
		border-radius: 4px;
		background-color: #007bff;
		color: white;
		font-size: 1rem;
		cursor: pointer;
	}
	button[disabled] {
		background-color: #6c757d;
		cursor: not-allowed;
	}
</style>
