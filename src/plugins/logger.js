import chalk from 'chalk';

function createLogger(app) {
	const levels = {
		info: { color: chalk.blue, label: 'INFO' },
		warn: { color: chalk.yellow, label: 'WARN' },
		error: { color: chalk.red, label: 'ERROR' },
		success: { color: chalk.green, label: 'OK' },
		debug: { color: chalk.gray, label: 'DEBUG' },
	};

	function log(message, { level = 'info', context = 'App' } = {}) {
		const { color, label } = levels[level] || {
			color: chalk.white,
			label: level.toUpperCase(),
		};
		const time = chalk.dim(getFormattedTimestamp());
		const ctx = chalk.bold(`${context}`);
		const lvl = chalk.bold(color(`${label.padEnd(5)}`));

		if (typeof message === 'object') {
			message = JSON.stringify(message, null, 2);
		}

		console.log(`${time} ${ctx} ${lvl} - ${color(message)}`);
	}

	function getFormattedTimestamp() {
		const now = new Date();
		const day = String(now.getDate()).padStart(2, '0');
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const year = now.getFullYear();
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		return `[${day}/${month}/${year} ${hours}:${minutes}]`;
	}

	function block(title, obj, { level = 'info', context = 'SYS' } = {}) {
		log(title, { level, context });

		// This hardcoded padding visually aligns to the end of " - "
		const spacer = ' '.repeat(31); // Adjust if you tweak log format

		const longestKey = Math.max(...Object.keys(obj).map((k) => k.length));
		for (const [key, val] of Object.entries(obj)) {
			const paddedKey = key.padEnd(longestKey);
			console.log(spacer + chalk.gray(`${paddedKey} : ${val}`));
		}
	}

	return {
		log,
		info: (msg, ctx) => log(msg, { level: 'info', context: ctx }),
		warn: (msg, ctx) => log(msg, { level: 'warn', context: ctx }),
		error: (msg, ctx) => log(msg, { level: 'error', context: ctx }),
		success: (msg, ctx) => log(msg, { level: 'success', context: ctx }),
		debug: (msg, ctx) => log(msg, { level: 'debug', context: ctx }),
		block,
	};
}

export default async function registerLogger(app) {
	const logger = createLogger(app);
	app.decorate('cc', logger); // or 'clog' if you prefer
}
