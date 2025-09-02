export async function findByICalUID(calendarId, iCalUID) {
	const calendar = await getCalendarClient();
	const { data } = await calendar.events.list({
		calendarId,
		iCalUID,
		maxResults: 1,
		singleEvents: true,
		showDeleted: false,
	});
	return data.items?.[0] || null;
}
