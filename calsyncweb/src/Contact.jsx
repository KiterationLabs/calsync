// src/Contact.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Github, ExternalLink, Copy, HeartHandshake } from 'lucide-react';

function ContactRow({
	label,
	value,
	href,
	actionIcon: Icon,
	actionText = 'Open',
	copyable = false,
}) {
	const [copied, setCopied] = useState(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		} catch {}
	}

	const isExternal = href?.startsWith('http');

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
			<div className="min-w-0">
				<p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
				{href ? (
					<a
						href={href}
						target={isExternal ? '_blank' : undefined}
						rel="noreferrer"
						className="block truncate text-neutral-100 hover:underline"
						title={value}>
						{value}
					</a>
				) : (
					<span
						className="block truncate text-neutral-100"
						title={value}>
						{value}
					</span>
				)}
			</div>

			<div className="flex items-center gap-2 shrink-0">
				{copyable && (
					<Button
						type="button"
						variant="outline"
						onClick={copy}
						className="h-8 border-white/15 hover:bg-white/5">
						<Copy className="mr-2 h-4 w-4" />
						{copied ? 'Copied' : 'Copy'}
					</Button>
				)}
				{href && (
					<Button
						asChild
						variant="secondary"
						className="h-8 bg-white/10 hover:bg-white/15">
						<a
							href={href}
							target={isExternal ? '_blank' : undefined}
							rel="noreferrer">
							{Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
							{actionText}
						</a>
					</Button>
				)}
			</div>
		</div>
	);
}

export default function Contact() {
	return (
		<section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
			{/* Title */}
			<h1 className="text-2xl font-semibold">
				<span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
					Contact
				</span>
			</h1>
			<p className="mt-2 text-sm text-neutral-400">
				Support, bugs, feature requests, or collaboration.
			</p>

			{/* Sponsors CTA */}
			<div className="mt-6 rounded-xl border border-white/10 bg-neutral-900/60 p-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<p className="font-medium text-neutral-100">Support the project</p>
						<p className="text-sm text-neutral-400">
							If CalSync helps you, consider sponsoring ongoing development.
						</p>
					</div>
					<Button
						asChild
						className="bg-pink-600 hover:bg-pink-500">
						<a
							href="https://github.com/sponsors/archways404"
							target="_blank"
							rel="noreferrer">
							<HeartHandshake className="mr-2 h-4 w-4" />
							Sponsor on GitHub
						</a>
					</Button>
				</div>
			</div>

			{/* Rows */}
			<div className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10 bg-neutral-900/60 backdrop-blur">
				<div className="px-4">
					<ContactRow
						label="Email"
						value="archways@gmx.us"
						href="mailto:archways@gmx.us"
						actionIcon={Mail}
						actionText="Send Email"
						copyable
					/>
				</div>
				<div className="px-4">
					<ContactRow
						label="GitHub (archways404)"
						value="github.com/archways404"
						href="https://github.com/archways404"
						actionIcon={Github}
						actionText="Open"
					/>
				</div>
				<div className="px-4">
					<ContactRow
						label="Project Repo"
						value="github.com/KiterationLabs/calsync"
						href="https://github.com/KiterationLabs/calsync"
						actionIcon={Github}
						actionText="Open"
					/>
				</div>
			</div>
		</section>
	);
}
