/* Toast - https://github.com/havi11368/scramjet/blob/utils/packages/utils/src/custom-error-page.ts */

import { decodeUrl } from './proxy-codec.ts';

export interface ErrorPageDetails {
	url: string;
	trace: string;
	version: string;
	ids?: Record<string, string>;
}

export function proxiedUrl(rawUrl: string, prefix: string): string {
	try {
		const { pathname } = new URL(rawUrl);
		if (!pathname.startsWith(prefix)) return rawUrl;
		const url = new URL(decodeUrl(pathname.slice(prefix.length)));
		for (const key of [...url.searchParams.keys()])
			if (key.startsWith('$')) url.searchParams.delete(key);
		return url.href;
	} catch {
		return rawUrl;
	}
}

export function errorTrace(error: unknown): string {
	if (
		error &&
		typeof error === 'object' &&
		'stack' in error &&
		typeof error.stack === 'string' &&
		error.stack
	)
		return error.stack;
	return String(error);
}

export function errorPageScript({
	url,
	trace,
	version,
	ids = {},
}: ErrorPageDetails): string {
	const source = `(() => {
	const trace = ${JSON.stringify(trace)};
	const ids = ${JSON.stringify(ids)};
	const byId = (id) => document.getElementById(ids[id] || id);
	const set = (id, key, value) => {
		const element = byId(id);
		if (element) element[key] = value;
	};
	const onClick = (id, listener) =>
		byId(id)?.addEventListener('click', listener);
	set('fetchedURL', 'textContent', ${JSON.stringify(url)});
	set('errorTrace', 'value', trace);
	set('scramjetVersion', 'textContent', ${JSON.stringify(version)});
	onClick('reload', () => location.reload());
	onClick('copy-button', () => navigator.clipboard.writeText(trace));
})();`;
	const bytes = new TextEncoder().encode(source);
	return `data:text/javascript;base64,${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`;
}
