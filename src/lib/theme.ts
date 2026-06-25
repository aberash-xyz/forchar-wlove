// Light/dark theme. The initial value is applied pre-paint by an inline script
// in app.html (reads ?theme= or localStorage). These helpers flip it at runtime.
export type Theme = 'dark' | 'light';
const KEY = 'theme';

export function getTheme(): Theme {
	if (typeof document === 'undefined') return 'dark';
	return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(t: Theme): void {
	document.documentElement.dataset.theme = t;
	try {
		localStorage.setItem(KEY, t);
	} catch {
		/* private mode / storage disabled — non-fatal */
	}
}

export function toggleTheme(): Theme {
	const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	return next;
}
