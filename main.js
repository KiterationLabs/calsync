import icsToGcalJsonFile from './functions/parse.js';
import parseURL from './functions/get-ics.js';
import downloadIcs from './functions/download-ics.js';

async function main() {
	/*
	const myURL =
    'https://schema.mau.se/setup/jsp/Schema.jsp?startDatum=idag&intervallTyp=a&intervallAntal=1&sprak=SV&sokMedAND=true&forklaringar=true&resurser=p.TGIAR25h';
    */
	const myURL =
		'https://schema.mau.se/setup/jsp/Schema.jsp?startDatum=idag&intervallTyp=a&intervallAntal=1&sokMedAND=false&sprak=SV&resurser=k.MT155A-20252-TS250-%2C';

	const { icsUrl, resourceId } = parseURL(myURL);
	console.log(icsUrl);

	const icsFilePath = './ics/' + resourceId + '.ics';
	const icsOutFilePath = './out/' + resourceId + '.json';

	const { path, bytes } = await downloadIcs(icsUrl, icsFilePath);
	console.log(`Saved ${bytes} bytes to ${path}`);

	await icsToGcalJsonFile(icsFilePath, icsOutFilePath, { pretty: true });
}

await main();
