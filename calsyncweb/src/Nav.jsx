// src/Nav.jsx
import { Link, NavLink } from 'react-router-dom';
import { TestTubeDiagonal } from 'lucide-react';

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

export default function Nav() {
	return (
		<header className="sticky top-0 z-20 border-b border-white/5 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
			<div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
				<Logo />
				<nav className="flex items-center gap-4 text-sm">
					<NavLink
						to="/"
						className={({ isActive }) =>
							`text-neutral-400 hover:text-neutral-200 ${isActive ? 'text-neutral-200' : ''}`
						}>
						Home
					</NavLink>
					<NavLink
						to="/contact"
						className={({ isActive }) =>
							`text-neutral-400 hover:text-neutral-200 ${isActive ? 'text-neutral-200' : ''}`
						}>
						Contact
					</NavLink>
					<span className="text-neutral-400">-</span>
					<span className="text-neutral-400">A service by</span>
					<span className="font-medium">
						Kiteration<span className="text-sky-400">Labs</span>
					</span>
				</nav>
			</div>
		</header>
	);
}
