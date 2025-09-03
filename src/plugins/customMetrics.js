import { Counter, Histogram, register } from 'prom-client';

export const requestCounter = new Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests received',
	labelNames: ['method', 'route', 'status_code'],
});

export const loginCounter = new Counter({
	name: 'login_requests_total',
	help: 'Total number of login attempts',
});

export const loginDuration = new Histogram({
	name: 'login_duration_seconds',
	help: 'Login request duration in seconds',
	labelNames: ['status'], // optional: allows filtering by status like 'success' or 'fail'
	buckets: [0.1, 0.5, 1, 2, 5],
});

export const promRegistry = register;
