import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { imageFile } from '$lib/form.schema';
import { saveUpload } from '$lib/server/uploads';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.formData();

	// Client-side validation can be bypassed, so re-validate the file here with
	// the same schema the form uses.
	const result = v.safeParse(imageFile, data.get('file'));
	if (!result.success) {
		error(400, result.issues[0].message);
	}
	const file = result.output;

	const id = saveUpload({
		name: file.name,
		type: file.type,
		size: file.size,
		bytes: new Uint8Array(await file.arrayBuffer()),
	});

	return json({ id });
};
