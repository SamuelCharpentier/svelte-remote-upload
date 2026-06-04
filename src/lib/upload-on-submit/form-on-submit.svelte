<script lang="ts">
	import { myForm } from '$lib/form.remote';
	import { formSchema } from '$lib/form.schema';
	import FileUploadOnSubmitField from './FileUploadOnSubmitField.svelte';
	import UploadSubmitButton from './UploadSubmitButton.svelte';
	import { setDeferredUploadContext } from './deferredUpload';

	// Provide the coordinator the submit button uses to upload every deferred
	// field concurrently before the form is actually submitted.
	setDeferredUploadContext();

	let imageFields: Array<{ reset: () => void } | undefined> = $state([]);
</script>

<form
	{...myForm.preflight(formSchema).enhance(async ({ submit, element }) => {
		if (await submit()) {
			element.reset();
			for (const imageField of imageFields) imageField?.reset();
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

	{#each [0, 1, 2] as index (index)}
		<FileUploadOnSubmitField
			bind:this={imageFields[index]}
			field={myForm.fields.images[index]}
			label="Image:"
		/>
	{/each}

	<UploadSubmitButton pending={!!myForm.pending}>
		{#if myForm.pending}
			Submitting…
		{:else}
			Submit
		{/if}
	</UploadSubmitButton>

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
</style>
