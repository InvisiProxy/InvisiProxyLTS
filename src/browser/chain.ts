export function customWispUrl(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	try {
		const url = new URL(value.trim());
		if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return null;
		if (!url.pathname.endsWith('/')) url.pathname += '/';
		return url.href;
	} catch {
		return null;
	}
}
