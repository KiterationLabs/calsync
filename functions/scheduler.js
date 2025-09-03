// scheduler.js (ESM)
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// ---- config ----
const STATE_FILE = process.env.SCHED_STATE || path.resolve('./schedules.json');
const TICK_MS = 15_000; // scheduler heartbeat
const DEFAULT_INTERVAL_MIN = 15; // cadence for each job
const MAX_CONCURRENT_JOBS = 2; // how many schedules run in parallel

// ---- tiny persistence ----
async function readState() {
	if (!existsSync(STATE_FILE)) return { schedules: {} };
	return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
}
async function writeState(obj) {
	const tmp = STATE_FILE + '.tmp';
	await fs.writeFile(tmp, JSON.stringify(obj, null, 2));
	await fs.rename(tmp, STATE_FILE);
}
let pendingWrite = null;
function saveSoon(state) {
	if (pendingWrite) return;
	pendingWrite = setTimeout(async () => {
		pendingWrite = null;
		try {
			await writeState(state);
		} catch (e) {
			console.error('save error', e);
		}
	}, 200);
}

const nowSec = () => Math.floor(Date.now() / 1000);
function nextAlignedRun(intervalMin, from = nowSec()) {
	const ms = from * 1000;
	const step = intervalMin * 60_000;
	const next = Math.ceil(ms / step) * step;
	return (Math.max(next, ms + step) / 1000) | 0;
}

// ---- simple semaphore for max parallel jobs ----
class Semaphore {
	constructor(n) {
		this.n = n;
		this.waiters = [];
	}
	async acquire() {
		if (this.n > 0) {
			this.n--;
			return;
		}
		await new Promise((res) => this.waiters.push(res));
	}
	release() {
		if (this.waiters.length) this.waiters.shift()();
		else this.n++;
	}
}

// ---- registry of job handlers ----
const handlers = new Map();
export function registerHandler(type, fn) {
	handlers.set(type, fn);
}

// ---- the scheduler ----
export class Scheduler {
	constructor() {
		this.state = { schedules: {} }; // id -> { id, type, payload, intervalMin, nextRunAt, enabled }
		this.running = new Set(); // ids currently executing
		this.timer = null;
		this.sem = new Semaphore(MAX_CONCURRENT_JOBS);
	}

	async init() {
		this.state = await readState();
		for (const s of Object.values(this.state.schedules)) {
			if (!s.nextRunAt || s.nextRunAt < nowSec() - 3600) {
				s.nextRunAt = nextAlignedRun(s.intervalMin ?? DEFAULT_INTERVAL_MIN);
			}
		}
		saveSoon(this.state);
	}

	upsert({ id, type, payload, intervalMin = DEFAULT_INTERVAL_MIN, enabled = true }) {
		if (!handlers.has(type)) throw new Error(`Unknown type: ${type}`);
		const prev = this.state.schedules[id];
		this.state.schedules[id] = {
			id,
			type,
			payload,
			intervalMin,
			enabled: !!enabled,
			nextRunAt: prev?.nextRunAt ?? nextAlignedRun(intervalMin),
		};
		saveSoon(this.state);
	}

	remove(id) {
		delete this.state.schedules[id];
		saveSoon(this.state);
	}
	setEnabled(id, enabled) {
		const s = this.state.schedules[id];
		if (!s) return;
		s.enabled = !!enabled;
		if (enabled && s.nextRunAt < nowSec()) s.nextRunAt = nextAlignedRun(s.intervalMin);
		saveSoon(this.state);
	}
	list() {
		return Object.values(this.state.schedules).sort((a, b) => a.nextRunAt - b.nextRunAt);
	}

	start() {
		if (this.timer) return;
		this.tick(); // eager
		this.timer = setInterval(() => this.tick(), TICK_MS);
	}
	stop() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
	}

	async tick() {
		const due = this.list().filter(
			(s) => s.enabled && s.nextRunAt <= nowSec() && !this.running.has(s.id)
		);
		for (const job of due) this.runOne(job).catch(() => {});
	}

	async runOne(job) {
		const handler = handlers.get(job.type);
		if (!handler) return;
		await this.sem.acquire();
		this.running.add(job.id);
		try {
			await handler(job.payload);
			this.state.schedules[job.id].nextRunAt = nextAlignedRun(job.intervalMin);
			saveSoon(this.state);
		} catch (e) {
			console.error(`[${job.id}] failed:`, e?.message || e);
			// quick retry in ~2 min, otherwise keep alignment
			const retryAt = Math.min(nextAlignedRun(job.intervalMin), nowSec() + 120);
			this.state.schedules[job.id].nextRunAt = retryAt;
			saveSoon(this.state);
		} finally {
			this.running.delete(job.id);
			this.sem.release();
		}
	}
}
