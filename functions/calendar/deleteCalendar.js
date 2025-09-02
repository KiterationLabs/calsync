// functions/calendar/deleteCalendar.js (ESM)
import { getCalendarClient } from './calendarAPI.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function callWithRetry(fn, { maxAttempts = 5, baseDelayMs = 600, maxDelayMs = 10_000 } = {}) {
	let attempt = 0,
		lastErr;
	while (attempt < maxAttempts) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			const status = err?.response?.status;
			const reason = err?.response?.data?.error?.errors?.[0]?.reason || '';
			const retriable =
				status === 429 ||
				status === 500 ||
				status === 503 ||
				(status === 403 && /rateLimitExceeded|userRateLimitExceeded/i.test(reason));
			if (!retriable) throw err;
			const retryAfter = Number(err?.response?.headers?.['retry-after']);
			const backoff = retryAfter
				? Math.max(0, retryAfter * 1000)
				: Math.min(maxDelayMs, baseDelayMs * 2 ** attempt) + Math.floor(Math.random() * 250);
			attempt++;
			await sleep(backoff);
		}
	}
	throw lastErr;
}

/**
 * Delete a calendar by ID. If deletion is not allowed (not owner),
 * optionally just unsubscribe it from the calendar list.
 *
 * @param {string} calendarId
 * @param {Object} [opts]
 * @param {boolean} [opts.fallbackUnsubscribe=true] - if hard delete fails with 403/404, try calendarList.delete
 * @returns {Promise<{ok:boolean, action:'deleted'|'unsubscribed'}>}
 */
export async function deleteCalendarById(calendarId, { fallbackUnsubscribe = true } = {}) {
	const cal = await getCalendarClient();

	try {
		// Hard delete (permanent). Only works if you're the owner.
		await callWithRetry(() => cal.calendars.delete({ calendarId }));
		return { ok: true, action: 'deleted' };
	} catch (err) {
		const status = err?.response?.status;
		const reason = err?.response?.data?.error?.errors?.[0]?.reason || '';

		// If we can't delete (not owner / not found), optionally just remove from list.
		const cannotDelete =
			status === 403 || status === 404 || /notFound/i.test(reason) || /forbidden/i.test(reason);

		if (fallbackUnsubscribe && cannotDelete) {
			await callWithRetry(() => cal.calendarList.delete({ calendarId }));
			return { ok: true, action: 'unsubscribed' };
		}
		throw err;
	}
}
