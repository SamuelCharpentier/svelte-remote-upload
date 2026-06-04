import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { formSchema } from '$lib/form.schema';
import { deleteUpload, getUpload } from '$lib/server/uploads';

export const myForm = form(formSchema, async (data, issue) => {
	let file: { name: string; type: string; size: number }[] = [];

	for (const [index, image] of data.images.entries()) {
		if (typeof image === 'string') {
			// JS path: the upload happened separately, resolve the id reference.
			const upload = getUpload(image);
			if (!upload) {
				invalid(
					issue.images[index](
						'Your upload could not be found. Please choose the image again.',
					),
				);
			}
			file.push({ name: upload.name, type: upload.type, size: upload.size });
			deleteUpload(image);
		} else {
			// No-JS path: the File was submitted directly with the form.
			file.push({ name: image.name, type: image.type, size: image.size });
		}
	}

	return { success: true, file };
});
