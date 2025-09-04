// src/Nav.jsx
import { Link, NavLink } from 'react-router-dom';
import { TestTubeDiagonal } from 'lucide-react';
import BetaBanner from '@/components/BetaBanner';

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

/* ---------- Smooth gradient link ---------- */
function NavItem({ to, children }) {
	return (
		<NavLink
			to={to}
			className="group relative inline-flex items-center">
			{({ isActive }) => (
				<span className="relative">
					{/* Neutral label */}
					<span
						className={`transition-opacity duration-200 ease-out ${
							isActive ? 'opacity-0' : 'opacity-100 text-neutral-400 group-hover:opacity-0'
						}`}>
						{children}
					</span>

					{/* Gradient label (fades in on hover / stays for active) */}
					<span
						className={`absolute inset-0 bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent
                        transition-opacity duration-200 ease-out
                        ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
						aria-hidden>
						{children}
					</span>
				</span>
			)}
		</NavLink>
	);
}

/* ---------- Nav ---------- */
export default function Nav({ bannerAtTop = false }) {
	return (
		<header className="sticky top-0 z-20 border-b border-white/5 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
			{/* Banner on top (inside header) */}
			{bannerAtTop && (
				<BetaBanner>
					CalSync is in <span className="font-medium text-amber-200">Beta</span>. Report issues via{' '}
					<a
						href="https://github.com/KiterationLabs/calsync/issues"
						target="_blank"
						rel="noreferrer"
						className="underline decoration-amber-400/40 underline-offset-4 hover:text-amber-200">
						GitHub Issues
					</a>
					.
				</BetaBanner>
			)}

			{/* Main row */}
			<div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
				<Logo />

				<nav className="flex flex-1 items-center justify-between ml-8">
					{/* Left: links */}
					<div className="flex items-center gap-6 text-sm">
						<NavItem to="/">Home</NavItem>
						<NavItem to="/contact">Contact</NavItem>
					</div>

					{/* Right: tagline */}
					<div className="hidden sm:flex items-center gap-2 text-sm">
						<span className="text-neutral-400">a service made possible by</span>
						<span className="font-medium">
							Kiteration<span className="text-sky-400">Labs</span>
						</span>
					</div>
				</nav>
			</div>

			{/* Banner on bottom (inside header) */}
			{!bannerAtTop && (
				<BetaBanner>
					<span className="font-bold">CalSync</span> is in{' '}
					<span className="font-medium text-amber-200">Beta</span>. Report issues via{' '}
					<a
						href="https://github.com/KiterationLabs/calsync/issues"
						target="_blank"
						rel="noreferrer"
						className="underline decoration-amber-400/40 underline-offset-4 hover:text-amber-200">
						GitHub Issues
					</a>
					.
				</BetaBanner>
			)}
		</header>
	);
}
