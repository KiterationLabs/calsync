// src/components/BetaBanner.jsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';


export default function BetaBanner({
	children = 'CalSync is in Beta. Things may change or break — feedback is appreciated!',
	storageKey = 'calsync_beta_dismissed',
	dismissible = true,
}) {
	const [hidden, setHidden] = useState(false);

	useEffect(() => {
		if (dismissible && typeof window !== 'undefined') {
			setHidden(localStorage.getItem(storageKey) === '1');
		}
	}, [dismissible, storageKey]);

	if (hidden) return null;

	return (
		<div className="border-t border-b border-amber-500/20 bg-amber-500/10">
			<div className="mx-auto max-w-6xl px-4 py-2 text-center text-sm text-amber-300 relative">
				{children}
				{dismissible && (
					<button
						type="button"
						aria-label="Dismiss beta notice"
						onClick={() => {
							try {
								localStorage.setItem(storageKey, '1');
							} catch {}
							setHidden(true);
						}}
						className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10 transition">
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
}
