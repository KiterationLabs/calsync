// parse-ics.js
import ical from 'node-ical';
import fs from 'node:fs/promises';
import path from 'node:path';

// —— helpers ——
const toRFC3339 = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

// Split multi-room locations like "NI:A0418 NI:B0308"
const normalizeLocation = (raw) =>
	(raw || '')
		.trim()
		.replace(/\s{2,}/g, ' ')
		.replace(/\s+([A-Z]{2}:[A-Z0-9]+)/g, ', $1'); // turn spaces before room-codes into ", "

// Pull useful bits from that mega SUMMARY line
function extractFromSummary(summaryRaw = '') {
	// Collapse whitespace so our regexes are easier
	const s = String(summaryRaw).replace(/\s+/g, ' ').trim();

	const programs = s
		.match(/Program:\s*(.+?)(?=\s+(Kurs\.grp:|Hjälpm\.:|Sign:|Moment:|Aktivitetstyp:|$))/i)?.[1]
		?.trim();

	const kurs = s
		.match(/Kurs\.grp:\s*(.+?)(?=\s+(Hjälpm\.:|Sign:|Moment:|Aktivitetstyp:|$))/i)?.[1]
		?.trim();

	// Allow inner colons inside Moment (e.g. "Extratillfälle: Programintroduktion ...")
	const moment = s.match(/Moment:\s*(.+?)(?=\s+(Aktivitetstyp:|$))/i)?.[1]?.trim();

	const sign = s.match(/Sign:\s*([^\s]+)(?=\s|$)/i)?.[1]?.trim();

	return { programs, kurs, moment, sign, raw: s };
}

// Build the Google Calendar event shape you want
function veventToGcal(e) {
	const { programs, kurs, moment, raw } = extractFromSummary(e.summary);
	const location = normalizeLocation(e.location);

	// Title: prefer the Moment text; fall back to the original SUMMARY if missing
	const title = moment || e.summary || 'Untitled';

	// Description: "<programs> - <kurs>" (only add '-' if both exist; else use whichever exists; else raw)
	const left = (programs || '').trim();
	const right = (kurs || '').trim();
	const description = left && right ? `${left} - ${right}` : left || right || raw;

	const status =
		(e.status || 'CONFIRMED').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed';
	const transparency =
		(e.transparency || e.transp || 'OPAQUE').toUpperCase() === 'TRANSPARENT'
			? 'transparent'
			: 'opaque';

	const isAllDay =
		e.datetype === 'date' ||
		(!e.end && e.start && e.start.getUTCHours?.() === 0 && e.start.getUTCMinutes?.() === 0);

	const start = isAllDay
		? { date: e.start.toISOString().slice(0, 10) }
		: { dateTime: toRFC3339(e.start) };

	const end = isAllDay
		? { date: e.end?.toISOString().slice(0, 10) || start.date }
		: { dateTime: toRFC3339(e.end) };

	return {
		iCalUID: e.uid,
		summary: title,
		location,
		description,
		start,
		end,
		status,
		transparency,
		extendedProperties: { private: { kronoxSummaryRaw: raw } },
	};
}

// ————————————————————————————————————————————————
// SINGLE EXPORTED FUNCTION
// ————————————————————————————————————————————————
export default async function icsToGcalJsonFile(
	inputIcsPath,
	outputJsonPath,
	{ pretty = true } = {}
) {
	const icsText = await fs.readFile(inputIcsPath, 'utf8');

	const parsed = ical.sync.parseICS(icsText);
	const events = Object.values(parsed).filter((v) => v.type === 'VEVENT');
	const mapped = events.map(veventToGcal);

	const json = JSON.stringify(mapped, null, pretty ? 2 : 0);

	const absOut = path.resolve(outputJsonPath);
	await fs.mkdir(path.dirname(absOut), { recursive: true });
	await fs.writeFile(absOut, json, 'utf8');

	return { count: mapped.length, outputPath: absOut, events: mapped };
}

/*
Usage:

import icsToGcalJsonFile from './parse-ics.js';

await icsToGcalJsonFile(
  'ics/regular.ics',           // input ICS path
  'out/events.json',           // output JSON path
  { pretty: true }             // optional
);
*/
