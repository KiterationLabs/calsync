// parse-ics-employee.js
import ical from 'node-ical';
import fs from 'node:fs/promises';
import path from 'node:path';

const toRFC3339 = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

// Extract Kurs.grp and Moment from SUMMARY
function extractFields(summaryRaw = '') {
	const s = String(summaryRaw).replace(/\s+/g, ' ').trim();

	const kurs = s.match(/Kurs\.grp:\s*(.+?)(?=\s+(Sign:|Moment:|Aktivitetstyp:|$))/i)?.[1]?.trim();
	const moment = s.match(/Moment:\s*(.+?)(?=\s+(Sign:|Aktivitetstyp:|$))/i)?.[1]?.trim();

	return { kurs, moment, raw: s };
}

// Build the display name "Kurs - Moment"
function makeEmployeeDisplayName(kurs, moment) {
	return [kurs, moment]
		.filter(Boolean)
		.join(' - ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

// Make a safe filename (keep spaces, remove bad chars)
function toFileSafeBase(name) {
	return name
		.replace(/[\/\\:*?"<>|]+/g, '-')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

// Optional: slug for IDs
export function toSlug(s) {
	return String(s)
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

// For mapping events (title = LOCATION, description = "<location> <kurs>")
function veventToGcalEmployee(e) {
	const { kurs, raw } = extractFields(e.summary);
	const location = (e.location || '').trim();
	const title = location || 'Untitled';

	const status =
		(e.status || 'CONFIRMED').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed';
	const transparency =
		(e.transparency || e.transp || 'OPAQUE').toUpperCase() === 'TRANSPARENT'
			? 'transparent'
			: 'opaque';

	const start = { dateTime: toRFC3339(e.start) };
	const end = { dateTime: toRFC3339(e.end) };

	const description = [location, kurs].filter(Boolean).join(' ').trim() || raw;

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

// Peek the first VEVENT and derive calendar name + safe filename base
export async function peekEmployeeNamesFromIcs(inputIcsPath) {
	const icsText = await fs.readFile(inputIcsPath, 'utf8');
	const parsed = ical.sync.parseICS(icsText);
	const first = Object.values(parsed).find((v) => v.type === 'VEVENT');

	if (!first) {
		const fallback = 'Employee Schedule';
		return { calendarSummary: fallback, fileBase: toFileSafeBase(fallback) };
	}

	const { kurs, moment } = extractFields(first.summary);
	const calendarSummary = makeEmployeeDisplayName(kurs, moment) || 'Employee Schedule';
	const fileBase = toFileSafeBase(calendarSummary);

	return { calendarSummary, fileBase };
}

// MAIN: write Google-shaped events JSON
export default async function icsToGcalJsonFileEmployee(
	inputIcsPath,
	outputJsonPath,
	{ pretty = true } = {}
) {
	try {
		console.log(`[EMP] reading ICS from: ${inputIcsPath}`);
		const icsText = await fs.readFile(inputIcsPath, 'utf8');

		console.log(`[EMP] parsing ICS text length=${icsText.length}`);
		const parsed = ical.sync.parseICS(icsText);
		const events = Object.values(parsed).filter((v) => v.type === 'VEVENT');
		console.log(`[EMP] found ${events.length} events`);

		const mapped = events.map(veventToGcalEmployee);
		const json = JSON.stringify(mapped, null, pretty ? 2 : 0);

		const absOut = path.resolve(outputJsonPath);
		await fs.mkdir(path.dirname(absOut), { recursive: true });

		console.log(`[EMP] writing JSON to: ${absOut}`);
		await fs.writeFile(absOut, json, 'utf8');

		console.log(`[EMP] write complete!`);
		return { count: mapped.length, outputPath: absOut, events: mapped };
	} catch (err) {
		console.error('[EMP] parse failed:', err);
		throw err;
	}
}
