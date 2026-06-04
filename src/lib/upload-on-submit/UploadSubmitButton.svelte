<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { getDeferredUploadContext } from './deferredUpload';

	interface Props {
		/** Whether the surrounding remote form is currently submitting. */
		pending?: boolean;
		children: Snippet;
	}

	let { pending = false, children }: Props = $props();

	const coordinator = getDeferredUploadContext();
	let uploading = $state(false);

	async function handleClick(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement },
	) {
		// Without JS this handler never runs: the button submits normally and the
		// browser posts the selected Files directly (progressive enhancement).
		if (!coordinator) return;

		// Stop the browser's own submit so we can upload first.
		event.preventDefault();
		const formEl = event.currentTarget.form;
		if (!formEl) return;

		uploading = true;
		try {
			// Upload every deferred field concurrently; only continue once they
			// all resolve. If any upload fails, abort and let it show its error.
			const ok = await coordinator.uploadAll();
			if (!ok) return;

			// Flush the uploaded ids into the hidden inputs before we submit.
			await tick();
			formEl.requestSubmit();
		} finally {
			uploading = false;
		}
	}
</script>

<button type="submit" disabled={uploading || pending} onclick={handleClick}>
	{#if uploading}
		Uploading…
	{:else}
		{@render children()}
	{/if}
</button>

<style>
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
