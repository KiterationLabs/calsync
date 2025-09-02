export async function createEvent(calendarId, event) {
	const calendar = await getCalendarClient();
	// events.import lets you set iCalUID and avoids attendee emails
	const { data } = await calendar.events.import({
		calendarId,
		requestBody: event,
	});
	return data;
}
