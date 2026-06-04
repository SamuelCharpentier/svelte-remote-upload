import * as v from 'valibot';

// The actual file, submitted directly by the browser when JS is unavailable.
const imageFile = v.pipe(
	v.file('Please select an image file.'),
	v.mimeType(['image/jpeg', 'image/png'], 'Please select a JPEG or PNG file.'),
	v.maxSize(1024 * 1024 * 10, 'Please select a file smaller than 10 MB.'),
);

// The id returned by the upload endpoint, submitted when JS is available.
const imageRef = v.pipe(v.string('Please upload an image.'), v.nonEmpty('Please upload an image.'));

export const formSchema = v.object({
	name: v.pipe(v.string('Please enter your name.'), v.minLength(1, 'Please enter your name.')),
	email: v.pipe(
		v.string('Please enter your email.'),
		v.email('Please enter a valid email address.'),
	),
	message: v.optional(v.string()),
	// Progressive enhancement: with JS we upload separately and submit the
	// returned id (string); without JS the browser submits the File directly.
	images: v.array(v.union([imageFile, imageRef], 'Please provide an image.')),
});
