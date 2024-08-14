/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		// Check if request has a body (to avoid potential errors)
		if (!request.body) {
			return new Response('Request does not have a body.');
		}

		// Determine content type to handle different body formats effectively
		const contentType = request.headers.get('content-type');

		let body;
		if (contentType?.includes('application/json')) {
			try {
				body = await request.json(); // Attempt to parse JSON
			} catch (error) {
				console.error('Error parsing JSON request body:', error);
				body = '{ Error: Invalid JSON format }'; // Handle parsing errors gracefully
			}
		} else if (contentType?.includes('application/text') || contentType?.includes('text/plain')) {
			body = await request.text(); // Read text content
		} else if (contentType?.includes('application/x-www-form-urlencoded')) {
			try {
				const formData = await request.formData();
				body = {};
				for (const entry of formData.entries()) {
					body[entry[0]] = entry[1];
				}
			} catch (error) {
				console.error('Error parsing form data request body:', error);
				body = '{ Error: Invalid form data }'; // Handle parsing errors gracefully
			}
		} else {
			// Handle unknown content types or provide a default message
			body = '{ Warning: Unsupported content type }';
			console.warn('Request body has unsupported content-type:', contentType);
		}

		// Print the body to the console or log it for debugging
		console.log('Request body:', body);

		const redirectURL = `https://app.maiasignage.com/payment/result?token=${body.token}`;

		// Redirect to the payment result page
		return new Response(null, {
			headers: {
				'Location': redirectURL,
			},
			status: 302, // Found
		});

		// You can further modify the response based on the request body content here
		//return new Response('Hello World!');
	},
};
