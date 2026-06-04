import { error, json } from '@sveltejs/kit';
import { saveUpload } from '$lib/server/uploads';
import type { RequestHandler } from './$types';

const MAX_SIZE = 1024 * 1024 * 20;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.formData();
	const file = data.get('file');

	if (!(file instanceof File)) {
		error(400, 'No file was provided.');
	}
	if (!ALLOWED_TYPES.includes(file.type)) {
		error(415, 'Please upload a JPEG or PNG image.');
	}
	if (file.size > MAX_SIZE) {
		error(413, 'Please upload a file smaller than 20 MB.');
	}

	const id = saveUpload({
		name: file.name,
		type: file.type,
		size: file.size,
		bytes: new Uint8Array(await file.arrayBuffer()),
	});

	return json({ id });
};
