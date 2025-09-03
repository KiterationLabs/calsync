// src/App.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
	Calendar,
	Link as LinkIcon,
	Shield,
	Clock,
	CheckCircle2,
	ArrowRight,
	Sparkles,
	TestTubeDiagonal,
	CalendarPlus,
	ExternalLink,
	Download,
	Copy,
} from 'lucide-react';

function Logo() {
	return (
		<div className="flex items-center gap-2">
			{/* KiterationLabs mark — diagonal test tube with gradient */}
			<div className="flex items-center justify-center">
				<TestTubeDiagonal className="size-6 rounded-md bg-gradient-to-br from-indigo-500 to-sky-400 p-1 text-black" />
			</div>
			<div className="text-lg font-semibold tracking-tight">
				<span className="text-white">Kiteration</span>
				<span className="text-sky-400">Labs</span>
			</div>
		</div>
	);
}

function BrandLockup() {
	return (
		<div className="flex items-center gap-3">
			<Calendar className="size-6 text-sky-400" />
			<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
				Cal<span className="text-sky-400">Sync</span>
			</h1>
			<Badge
				variant="secondary"
				className="bg-sky-500/15 text-sky-300 border-sky-500/20">
				Malmö University
			</Badge>
		</div>
	);
}

export default function App() {
	const [url, setUrl] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState(null);
	const [error, setError] = useState('');

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setResult(null);

		// Very light validation — you can make this stricter
		if (!url || !/^https?:\/\//i.test(url)) {
			setError('Please paste a valid KronoX link (must start with http/https).');
			return;
		}

		setSubmitting(true);
		try {
			// Hit your Fastify endpoint
			const res = await fetch('http://localhost:3000/api/public/calsync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ URL: url }),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data?.error || 'Request failed');
			}
			setResult(data);
		} catch (err) {
			setError(err?.message || 'Something went wrong');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="dark">
			<main className="min-h-screen bg-neutral-950 text-neutral-200">
				{/* Subtle background */}
				<div className="pointer-events-none fixed inset-0 -z-10">
					<div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_50%_-50%,rgba(56,189,248,0.15),transparent_60%)]" />
					<div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_95%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
				</div>

				{/* Hero */}
				<section className="mx-auto max-w-6xl px-4 pt-12 sm:pt-16">
					<div className="flex flex-col items-center text-center gap-5">
						<BrandLockup />
						<p className="max-w-2xl text-balance text-neutral-300">
							Sync your <span className="text-white font-medium">Kronox</span> schedule to{' '}
							<span className="text-white font-medium">Google Calendar</span> — automatically, every
							15 minutes.
						</p>
						<div className="flex flex-wrap items-center justify-center gap-2">
							<Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
								Auto-refresh
							</Badge>
							<Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/20">
								Crash-safe
							</Badge>
							<Badge className="bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20">
								Rate-limit aware
							</Badge>
						</div>
					</div>

					{/* Form Card */}
					<Card className="mx-auto mt-8 w-full max-w-2xl border-white/10 bg-neutral-900/60 backdrop-blur">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2">
								<Sparkles className="size-5 text-sky-400" />
								Paste the link for your schedule
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<form
								onSubmit={onSubmit}
								className="flex flex-col sm:flex-row gap-3">
								<div className="relative flex-1">
									<LinkIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
									<Input
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="https://schema.mau.se/setup/jsp/Schema.jsp?..."
										className="pl-9 bg-neutral-950/60 border-white/10 focus-visible:ring-sky-500"
										inputMode="url"
										autoComplete="off"
									/>
								</div>
								<Button
									type="submit"
									disabled={submitting}
									className="whitespace-nowrap bg-sky-600 hover:bg-sky-500">
									{submitting ? 'Syncing…' : 'Sync to Google'}
									<ArrowRight className="ml-2 size-4" />
								</Button>
							</form>

							{error && <p className="text-sm text-red-400">{error}</p>}

							{result && (
								<div className="rounded-lg border border-white/10 bg-neutral-900/60 p-4 text-left">
									{/* Header row */}
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
										<div className="flex items-center gap-2">
											{/* Status pill */}
											<span
												className={[
													'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium border',
													result.status?.includes('created')
														? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
														: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
												].join(' ')}>
												<span className="size-1.5 rounded-full bg-current opacity-80" />
												{result.status}
											</span>

											{/* Optional calendarId chip with copy */}
											{result.calendarId && (
												<button
													onClick={async () => {
														try {
															await navigator.clipboard.writeText(result.calendarId);
														} catch {}
													}}
													className="group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 transition"
													title="Copy calendar ID"
													type="button">
													<span className="truncate max-w-[12rem]">{result.calendarId}</span>
													<Copy className="size-3.5 opacity-70 group-hover:opacity-100" />
												</button>
											)}
										</div>

										{/* Next sync chip */}
										{typeof result.nextRunAt === 'number' && (
											<span className="inline-flex items-center gap-2 rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300">
												Next sync:
												<span className="font-medium text-neutral-100">
													{new Date(result.nextRunAt * 1000).toLocaleString()}
												</span>
											</span>
										)}
									</div>

									{/* Separator */}
									<div className="my-3 h-px bg-white/5" />

									{/* Actions */}
									<div className="flex flex-wrap items-center gap-2">
										{(() => {
											const gcalLink =
												result.links?.google ||
												(result.calendarId
													? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
															result.calendarId
													  )}`
													: null);

											return gcalLink ? (
												<Button
													asChild
													className="bg-sky-600 hover:bg-sky-500">
													<a
														href={gcalLink}
														target="_blank"
														rel="noreferrer">
														<CalendarPlus className="mr-2 size-4" />
														Add to Google Calendar
													</a>
												</Button>
											) : null;
										})()}

										{result.links?.web && (
											<Button
												variant="secondary"
												asChild
												className="bg-white/10 hover:bg-white/15">
												<a
													href={result.links.web}
													target="_blank"
													rel="noreferrer">
													<ExternalLink className="mr-2 size-4" />
													Open on the web
												</a>
											</Button>
										)}

										{result.links?.ics && (
											<Button
												variant="outline"
												asChild
												className="border-white/15 hover:bg-white/5">
												<a
													href={result.links.ics}
													target="_blank"
													rel="noreferrer">
													<Download className="mr-2 size-4" />
													Download .ics
												</a>
											</Button>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</section>

				{/* Features */}
				<section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Feature
							icon={<Clock className="size-5 text-sky-400" />}
							title="Auto refresh"
							desc="Your schedule checks for updates every 15 minutes. No manual exports."
						/>
						<Feature
							icon={<Shield className="size-5 text-sky-400" />}
							title="Rate-limit aware"
							desc="Backoff + retries keep Google happy and resilient under load."
						/>
						<Feature
							icon={<CheckCircle2 className="size-5 text-sky-400" />}
							title="Idempotent"
							desc="Duplicate links collapse to one calendar & one background job."
						/>
					</div>
				</section>

				<Separator className="mx-auto max-w-6xl bg-white/5" />

				{/* How it works */}
				<section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
					<h2 className="text-xl font-semibold mb-6">How it works</h2>
					<ol className="space-y-4">
						<Step
							n={1}
							title="Paste your Kronox link"
							text="We validate it and schedule an immediate background sync."
						/>
						<Step
							n={2}
							title="CalSync creates/uses your calendar"
							text="We ensure a dedicated calendar for your KronoX resource."
						/>
						<Step
							n={3}
							title="Events upserted"
							text="Existing events are updated; new ones imported with iCalUID."
						/>
						<Step
							n={4}
							title="Refresh every 15 minutes"
							text="A lightweight worker keeps everything in sync."
						/>
					</ol>
				</section>
			</main>
		</div>
	);
}

function Feature({ icon, title, desc }) {
	return (
		<Card className="border-white/10 bg-neutral-900/60">
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-base">
					{icon}
					<span>{title}</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="text-sm text-neutral-300">{desc}</CardContent>
		</Card>
	);
}

function Step({ n, title, text }) {
	return (
		<li className="flex items-start gap-4">
			<div className="mt-1 grid size-7 place-items-center rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
				{n}
			</div>
			<div>
				<p className="font-medium">{title}</p>
				<p className="text-sm text-neutral-400">{text}</p>
			</div>
		</li>
	);
}
