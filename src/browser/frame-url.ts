const prefix = 'sj:';

export function proxiedFrameUrl(stored: unknown): string | null {
	if (typeof stored !== 'string' || !stored.startsWith(prefix)) return null;
	try {
		const url = new URL(stored.slice(prefix.length));
		return url.protocol === 'http:' || url.protocol === 'https:'
			? url.href
			: null;
	} catch {
		return null;
	}
}
