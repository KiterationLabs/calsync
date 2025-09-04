import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Trash2, RefreshCcw, Shield, Search } from 'lucide-react';

const ADMIN_LIST_URL = 'http://localhost:3000/api/admin/list'; // your working endpoint
const DELETE_URL = (id) => `http://localhost:3000/api/admin/${encodeURIComponent(id)}`;

const ALT_DELETE_URL = (id) => `http://localhost:3000/api/admin/${encodeURIComponent(id)}/delete`;

function TokenBar({ token, setToken, onReload }) {
	return (
		<div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
			<div className="flex items-center gap-2">
				<Shield className="h-4 w-4 text-neutral-400" />
				<span className="text-sm text-neutral-400">Admin token</span>
			</div>
			<div className="flex items-center gap-2 w-full sm:w-auto">
				<Input
					value={token}
					onChange={(e) => setToken(e.target.value)}
					placeholder="X-Admin-Token"
					className="bg-neutral-950/60 border-white/10 w-full sm:w-72"
				/>
				<Button
					onClick={onReload}
					variant="secondary"
					className="bg-white/10 hover:bg-white/15 h-9">
					<RefreshCcw className="h-4 w-4 mr-2" /> Reload
				</Button>
			</div>
			<span className="text-xs text-neutral-500">Stored in localStorage only.</span>
		</div>
	);
}

function Toolbar({ query, setQuery, role, setRole, showHidden, setShowHidden }) {
	return (
		<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
			<div className="flex-1 flex items-center gap-2">
				<div className="relative flex-1">
					<Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search by summary, id, timezone..."
						className="pl-9 bg-neutral-950/60 border-white/10"
					/>
				</div>
				<select
					value={role}
					onChange={(e) => setRole(e.target.value)}
					className="h-9 rounded-md bg-neutral-950/60 border border-white/10 text-sm px-3"
					title="minAccessRole filter">
					<option value="">Any role</option>
					<option value="freeBusyReader">freeBusyReader</option>
					<option value="reader">reader</option>
					<option value="writer">writer</option>
					<option value="owner">owner</option>
				</select>
			</div>
			<label className="inline-flex items-center gap-2 text-sm text-neutral-300">
				<input
					type="checkbox"
					checked={showHidden}
					onChange={(e) => setShowHidden(e.target.checked)}
					className="rounded border-white/20 bg-neutral-900"
				/>
				Show hidden
			</label>
		</div>
	);
}

function CalendarRow({ cal, onDelete, copyingId, setCopyingId }) {
	const [confirming, setConfirming] = useState(false);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(cal.id);
			setCopyingId(cal.id);
			setTimeout(() => setCopyingId(null), 1000);
		} catch {}
	};

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
			<div className="min-w-0">
				<p className="text-sm font-medium text-neutral-100 truncate">
					{cal.summary || '(no title)'}
				</p>
				<p className="text-xs text-neutral-400 truncate">{cal.id}</p>
				<div className="mt-1 flex flex-wrap items-center gap-2">
					<Badge
						variant="secondary"
						className="bg-white/5 border-white/10 text-neutral-300">
						{cal.accessRole}
					</Badge>
					{cal.primary ? (
						<Badge className="bg-sky-500/15 text-sky-300 border-sky-500/20">Primary</Badge>
					) : null}
					{cal.selected ? (
						<Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
							Selected
						</Badge>
					) : null}
					{cal.timeZone ? (
						<Badge className="bg-white/5 border-white/10 text-neutral-300">{cal.timeZone}</Badge>
					) : null}
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<Button
					type="button"
					variant="outline"
					onClick={copy}
					className="h-8 border-white/15 hover:bg-white/5"
					title="Copy calendar ID">
					<Copy className="mr-2 h-4 w-4" />
					{copyingId === cal.id ? 'Copied' : 'Copy ID'}
				</Button>

				{confirming ? (
					<>
						<Button
							onClick={() => onDelete(cal)}
							className="h-8 bg-red-600 hover:bg-red-500"
							title="Confirm delete">
							<Trash2 className="mr-2 h-4 w-4" /> Confirm delete
						</Button>
						<Button
							variant="secondary"
							onClick={() => setConfirming(false)}
							className="h-8 bg-white/10 hover:bg-white/15">
							Cancel
						</Button>
					</>
				) : (
					<Button
						variant="destructive"
						onClick={() => setConfirming(true)}
						className="h-8"
						title="Delete / Unsubscribe">
						<Trash2 className="mr-2 h-4 w-4" /> Delete
					</Button>
				)}
			</div>
		</div>
	);
}

export default function AdminCalendars() {
	const [token, setToken] = useState(() => localStorage.getItem('adminToken') || '');
	const [loading, setLoading] = useState(false);
	const [calendars, setCalendars] = useState([]);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [role, setRole] = useState('');
	const [showHidden, setShowHidden] = useState(false);
	const [copyingId, setCopyingId] = useState(null);

	// persist token
	useEffect(() => {
		localStorage.setItem('adminToken', token || '');
	}, [token]);

	const fetchCalendars = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const params = new URLSearchParams();
			if (query) params.set('search', query);
			if (role) params.set('minAccessRole', role);
			if (showHidden) params.set('showHidden', 'true');

			const res = await fetch(`${ADMIN_LIST_URL}?${params.toString()}`, {
				// headers: token ? { 'X-Admin-Token': token } : {},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Failed to load calendars');
			setCalendars(data.calendars || []);
		} catch (e) {
			setError(e.message || 'Failed to load calendars');
		} finally {
			setLoading(false);
		}
	}, [token, query, role, showHidden]);

	useEffect(() => {
		fetchCalendars();
	}, [fetchCalendars]);

	const onReload = () => fetchCalendars();

	const onDelete = async (cal) => {
		// optimistic remove
		const prev = calendars;
		setCalendars((list) => list.filter((c) => c.id !== cal.id));
		try {
			// try DELETE first
			const del = await fetch(DELETE_URL(cal.id), {
				method: 'DELETE',
			});
			if (!del.ok) {
				// fallback POST /delete
				const alt = await fetch(ALT_DELETE_URL(cal.id), {
					method: 'POST',
				});
				if (!alt.ok) {
					const body = await alt.json().catch(() => ({}));
					throw new Error(body?.error || 'Delete failed');
				}
			}
		} catch (e) {
			// rollback
			setCalendars(prev);
			setError(e.message || 'Delete failed');
		}
	};

	const count = calendars.length;

	return (
		<section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
			<Card className="border-white/10 bg-neutral-900/60 backdrop-blur">
				<CardHeader className="pb-3">
					<CardTitle className="text-xl flex items-center justify-between">
						<span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
							Admin · Calendars
						</span>
						<span className="text-sm text-neutral-400">
							{loading ? 'Loading…' : `${count} total`}
						</span>
					</CardTitle>
					<TokenBar
						token={token}
						setToken={setToken}
						onReload={onReload}
					/>
					<Toolbar
						query={query}
						setQuery={setQuery}
						role={role}
						setRole={setRole}
						showHidden={showHidden}
						setShowHidden={setShowHidden}
					/>
				</CardHeader>

				<CardContent>
					{error ? (
						<div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
							{error}
						</div>
					) : null}

					<div className="divide-y divide-white/10 rounded-lg border border-white/10">
						{calendars.map((c) => (
							<div
								key={c.id}
								className="px-4">
								<CalendarRow
									cal={c}
									onDelete={onDelete}
									copyingId={copyingId}
									setCopyingId={setCopyingId}
								/>
							</div>
						))}
						{count === 0 && !loading ? (
							<div className="p-6 text-sm text-neutral-400">No calendars match your filters.</div>
						) : null}
					</div>

					<div className="mt-4 flex items-center justify-end gap-2">
						<Button
							variant="secondary"
							onClick={onReload}
							className="bg-white/10 hover:bg-white/15"
							disabled={loading}>
							<RefreshCcw className="h-4 w-4 mr-2" />
							Refresh
						</Button>
					</div>
				</CardContent>
			</Card>
		</section>
	);
}
