// src/Footer.jsx
import { TestTubeDiagonal } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

function Logo() {
	return (
		<Link
			to="/"
			className="flex items-center gap-2">
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
		</Link>
	);
}

export default function Footer() {
	return (
		<footer className="border-t border-white/5">
			<div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<Logo />
					<span className="text-sm text-neutral-400">
						© {new Date().getFullYear()} KiterationLabs LLC
					</span>
				</div>
				<div className="text-sm text-neutral-400">
					Built by{' '}
					<a
						href="https://github.com/archways404"
						target="_blank"
						rel="noreferrer"
						className="bg-gradient-to-br from-indigo-500 to-sky-400 bg-clip-text text-transparent font-medium hover:opacity-90">
						archways404
					</a>
				</div>
			</div>
		</footer>
	);
}
