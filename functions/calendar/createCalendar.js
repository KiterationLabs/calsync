// functions/calendar/createCalendar.js (ESM)
import { getCalendarClient } from './calendarAPI.js';

/**
 * Create a new Google Calendar.
 *
 * @param {Object} opts
 * @param {string} opts.summary                         - Calendar name (required)
 * @param {string} [opts.timeZone='Europe/Stockholm']   - IANA time zone
 * @param {string} [opts.description='']                - Optional description
 * @param {boolean} [opts.makePublic=true]              - Add a public ACL so anyone can view
 * @param {'reader'|'freeBusyReader'} [opts.publicRole='reader'] - Public role
 * @param {Array<string|{email:string, role?:'owner'|'writer'|'reader'|'freeBusyReader'}>} [opts.shareWith=[]]
 *        Extra people to grant access to (strings default to role "reader")
 *
 * @returns {Promise<import('googleapis').calendar_v3.Schema$Calendar>} The created calendar resource
 */
export async function createCalendar({
	summary,
	timeZone = 'Europe/Stockholm',
	description = '',
	makePublic = true,
	publicRole = 'reader',
	shareWith = [],
} = {}) {
	if (!summary) throw new Error('createCalendar: "summary" is required');

	const cal = await getCalendarClient();

	// 1) Create the calendar
	const { data: newCal } = await cal.calendars.insert({
		requestBody: { summary, timeZone, description },
	});

	// 2) (Optional) Make calendar public: anyone can view (no edit)
	//    Use 'reader' to expose event details; 'freeBusyReader' for only free/busy.
	if (makePublic) {
		try {
			await cal.acl.insert({
				calendarId: newCal.id,
				requestBody: {
					role: publicRole, // 'reader' or 'freeBusyReader'
					scope: { type: 'default' }, // 'default' means "public"
				},
				sendNotifications: false,
			});
		} catch (err) {
			// Some orgs forbid public calendars; don't fail the whole create if this happens.
			if (err?.code !== 409) {
				console.warn('createCalendar: failed to set public ACL:', err?.message || err);
			}
		}
	}

	// 3) Optionally share with specific users
	for (const entry of shareWith) {
		const { email, role } = typeof entry === 'string' ? { email: entry, role: 'reader' } : entry;

		if (!email) continue;

		await cal.acl.insert({
			calendarId: newCal.id,
			requestBody: {
				role: role ?? 'reader',
				scope: { type: 'user', value: email },
			},
			sendNotifications: true,
		});
	}

	return newCal;
}
