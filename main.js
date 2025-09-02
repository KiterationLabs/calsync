import icsToGcalJsonFile from './functions/parse.js';
import parseURL from './functions/get-ics.js';
import downloadIcs from './functions/download-ics.js';

async function main() {
	const myURL =
		'https://schema.mau.se/setup/jsp/Schema.jsp?startDatum=idag&intervallTyp=a&intervallAntal=1&sprak=SV&sokMedAND=true&forklaringar=true&resurser=p.TGIAR25h';
	const outputURL = parseURL(myURL);
	console.log(outputURL);

	const { path, bytes } = await downloadIcs(outputURL, './ics/TGIAR25h.ics');
	console.log(`Saved ${bytes} bytes to ${path}`);

	/*
	await icsToGcalJsonFile(
		'ics/regular.ics', // input ICS path
		'out/new_events.json', // output JSON path
		{ pretty: true }
	);
  */
}

await main();
