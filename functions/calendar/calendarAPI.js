// calendar.js (ESM)
import 'dotenv/config';
import { google } from 'googleapis';

export async function getCalendarClient() {
	const scopes = ['https://www.googleapis.com/auth/calendar'];

	const auth = new google.auth.GoogleAuth({
		credentials: {
			client_email: process.env.GSA_CLIENT_EMAIL,
			// turn "\n" sequences back into real newlines
			private_key: process.env.GSA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
		},
		scopes,
	});

	return google.calendar({ version: 'v3', auth });
}
