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
