// parse-ics.js
import ical from 'node-ical';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
	const s = String(summaryRaw).replace(/\s+/g, ' ').trim();

	const programs = s
		.match(/Program:\s*(.+?)(?=\s+(Kurs\.grp:|Hjälpm\.:|Sign:|Moment:|Aktivitetstyp:|$))/i)?.[1]
		?.trim();

	const kurs = s
		.match(/Kurs\.grp:\s*(.+?)(?=\s+(Hjälpm\.:|Sign:|Moment:|Aktivitetstyp:|$))/i)?.[1]
		?.trim();

	// Allow inner colons inside Moment (e.g. "Extratillfälle: Programintroduktion...")
	const moment = s.match(/Moment:\s*(.+?)(?=\s+(Aktivitetstyp:|$))/i)?.[1]?.trim();

	const sign = s.match(/Sign:\s*([^\s]+)(?=\s|$)/i)?.[1]?.trim();

	return { programs, kurs, moment, sign, raw: s };
}

// Build your Google Calendar event shape
function veventToGcal(e) {
	const { programs, kurs, moment, raw } = extractFromSummary(e.summary);
	const location = normalizeLocation(e.location);

	// Title: the Moment; fall back to raw SUMMARY if missing
	const title = moment || e.summary || 'Untitled';

	// Description: "<programs> - <kurs>"
	// Only include the hyphen if both parts exist.
	const descLeft = (programs || '').trim();
	const descRight = (kurs || '').trim();
	const description =
		descLeft && descRight ? `${descLeft} - ${descRight}` : descLeft || descRight || raw;

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

export async function parseIcsText(icsText) {
	const data = ical.sync.parseICS(icsText);
	const events = Object.values(data).filter((v) => v.type === 'VEVENT');
	return events.map(veventToGcal);
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
	try {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);

		// CLI: node parse-ics.js [input.ics] [--out=out.json] [--pretty]
		const args = process.argv.slice(2);
		const inputArg =
			args.find((a) => !a.startsWith('--')) || path.resolve(__dirname, 'ics/regular.ics');
		const outArg = (args.find((a) => a.startsWith('--out=')) || '').split('=')[1];
		const pretty = args.includes('--pretty');

		const inputPath = path.resolve(__dirname, inputArg);
		const outPath = outArg ? path.resolve(__dirname, outArg) : null;

		const ics = await fs.readFile(inputPath, 'utf8');
		const mapped = await parseIcsText(ics);

		const json = JSON.stringify(mapped, null, pretty ? 2 : 0);

		if (outPath) {
			await fs.mkdir(path.dirname(outPath), { recursive: true });
			await fs.writeFile(outPath, json, 'utf8');
			console.log(`Wrote ${mapped.length} events → ${outPath}`);
		} else {
			// No --out provided: print to stdout
			console.log(json);
		}
	} catch (err) {
		console.error('Failed to parse ICS:', err.message);
		process.exit(1);
	}
}
