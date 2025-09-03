import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Contact from './Contact.jsx';
import Nav from './Nav.jsx';
import Footer from './Footer.jsx';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<BrowserRouter>
			<div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-200">
				<Nav />
				{/* Global background */}
				<div className="pointer-events-none fixed inset-0 -z-10">
					<div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_50%_-50%,rgba(56,189,248,0.15),transparent_60%)]" />
					<div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_95%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
				</div>
				<div className="flex-1">
					<Routes>
						<Route
							path="/"
							element={<App />}
						/>
						<Route
							path="/contact"
							element={<Contact />}
						/>
					</Routes>
				</div>
				<Footer />
			</div>
		</BrowserRouter>
	</StrictMode>
);
