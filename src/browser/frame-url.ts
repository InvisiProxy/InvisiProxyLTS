export const frameUrlPrefix = 'web:';

export function proxiedFrameUrl(stored: unknown): string | null {
	if (typeof stored !== 'string' || !stored.startsWith(frameUrlPrefix))
		return null;
	try {
		const url = new URL(stored.slice(frameUrlPrefix.length));
		return url.protocol === 'http:' || url.protocol === 'https:'
			? url.href
			: null;
	} catch {
		return null;
	}
}
