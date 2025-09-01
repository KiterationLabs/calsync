import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
	keyFile: 'token/credentials.json',
	scopes: ['https://www.googleapis.com/auth/calendar'],
});

const client = await auth.getClient();
const { token } = await client.getAccessToken();

if (!token) {
	console.error('No token returned');
	process.exit(1);
}
console.log(token);
