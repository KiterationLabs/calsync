// src/Contact.jsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Mail, Github, ExternalLink } from 'lucide-react';

export default function Contact() {
	return (
		<main className="min-h-screen bg-neutral-950 text-neutral-200">
			<div className="pointer-events-none fixed inset-0 -z-10">
				<div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_50%_-50%,rgba(56,189,248,0.15),transparent_60%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_95%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
			</div>

			<section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
				<Card className="border-white/10 bg-neutral-900/60 backdrop-blur">
					<CardHeader>
						<CardTitle className="text-xl">Contact</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-sm text-neutral-400">Email</p>
								<a
									href="mailto:archways@gmx.us"
									className="text-neutral-100 hover:underline">
									archways@gmx.us
								</a>
							</div>
							<Button
								asChild
								variant="secondary"
								className="bg-white/10 hover:bg-white/15">
								<a href="mailto:archways@gmx.us">
									<Mail className="mr-2 h-4 w-4" />
									Send Email
								</a>
							</Button>
						</div>

						<Separator className="bg-white/5" />

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-sm text-neutral-400">GitHub (archways404)</p>
								<a
									href="https://github.com/archways404"
									target="_blank"
									rel="noreferrer"
									className="text-neutral-100 hover:underline">
									github.com/archways404
								</a>
							</div>
							<Button
								asChild
								variant="secondary"
								className="bg-white/10 hover:bg-white/15">
								<a
									href="https://github.com/archways404"
									target="_blank"
									rel="noreferrer">
									<Github className="mr-2 h-4 w-4" />
									Open
								</a>
							</Button>
						</div>

						<Separator className="bg-white/5" />

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-sm text-neutral-400">Project repo</p>
								<a
									href="https://github.com/KiterationLabs/calsync"
									target="_blank"
									rel="noreferrer"
									className="text-neutral-100 hover:underline">
									github.com/KiterationLabs/calsync
								</a>
							</div>
							<Button
								asChild
								variant="secondary"
								className="bg-white/10 hover:bg-white/15">
								<a
									href="https://github.com/KiterationLabs/calsync"
									target="_blank"
									rel="noreferrer">
									<ExternalLink className="mr-2 h-4 w-4" />
									Open
								</a>
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
