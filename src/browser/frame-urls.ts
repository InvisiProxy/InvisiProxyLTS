import { normalizeScramjetTarget } from './scramjet-links.ts';

// URL schemes a proxied document manages natively. Blob/data workers carry
// already-rewritten sources and never reach the service worker, and wrapping
// them (or about:/javascript: targets) breaks the frame outright.
const nativeSchemes = /^(?:blob|data|about|javascript|mailto):/i;

export type FrameUrlRewrite = (url: string) => string;

/**
 * Normalize a URL assigned at runtime (iframe/frame `src`, worker script, ...)
 * so it ends up wrapped exactly once by the Scramjet prefix:
 *
 * - raw cross-origin values (game CDN embeds such as files.crazygames.com or
 *   poki-gdn.com) are wrapped through Scramjet's rewriter;
 * - already-wrapped values are unwrapped and rewrapped, never double-wrapped;
 * - proxy-hosted values outside the Scramjet prefix are returned clean;
 * - blob:/data:/about:/javascript: values pass through untouched;
 * - non-string values (null, undefined, non-URL objects) are returned as-is.
 *
 * `rewrite` is Scramjet's own URL rewriter, which also resolves relative
 * values against the frame's page URL.
 */
export function rewriteFrameUrl(
	value: unknown,
	rewrite: FrameUrlRewrite,
	proxyOrigin: string,
	networkPrefixPath: string
): unknown {
	if (value instanceof URL) value = value.href;
	if (typeof value !== 'string') return value;
	if (!value || value.startsWith('#') || nativeSchemes.test(value))
		return value;
	const normalized = normalizeScramjetTarget(
		value,
		proxyOrigin,
		networkPrefixPath
	);
	if (normalized.proxyOrigin) return normalized.url;
	return rewrite(normalized.unwrapped ? normalized.url : value);
}

/**
 * Return the clean target when the value is already wrapped by the Scramjet
 * prefix, otherwise the value untouched. Meant for setter chains where
 * Scramjet's own rewriter still performs the final wrap: handing it an
 * already-wrapped value would double-wrap it, so unwrap first.
 */
export function unwrapFrameUrl(
	value: unknown,
	proxyOrigin: string,
	networkPrefixPath: string
): unknown {
	if (typeof value !== 'string') return value;
	const normalized = normalizeScramjetTarget(
		value,
		proxyOrigin,
		networkPrefixPath
	);
	return normalized.unwrapped ? normalized.url : value;
}

/**
 * Normalize every URL inside a `srcset` attribute value. Candidates are
 * comma-separated `url [descriptor]` pairs; each candidate URL is unwrapped
 * when already wrapped and handed to `rewrite` otherwise (blob:/data: and
 * empty candidates pass through), while descriptors like `1x`/`800w` are
 * preserved. `rewrite` is Scramjet's rewriter, which resolves relative
 * paths against the frame's page URL.
 */
export function rewriteSrcsetFrameUrls(
	value: unknown,
	rewrite: FrameUrlRewrite,
	proxyOrigin: string,
	networkPrefixPath: string
): unknown {
	if (typeof value !== 'string' || !value) return value;
	const entries: string[] = [];
	let index = 0;
	while (index < value.length) {
		while (index < value.length && /[\s,]/.test(value[index])) index++;
		if (index >= value.length) break;
		// A candidate URL runs up to the next whitespace and may itself
		// contain commas (data: URLs), so collect it as a raw token.
		const start = index;
		while (index < value.length && !/\s/.test(value[index])) index++;
		const url = value.slice(start, index);
		const descriptorStart = index;
		while (index < value.length && value[index] !== ',') index++;
		const descriptor = value.slice(descriptorStart, index);
		index++;
		if (!url || url.startsWith('#') || nativeSchemes.test(url)) {
			entries.push(url + descriptor);
			continue;
		}
		const normalized = normalizeScramjetTarget(
			url,
			proxyOrigin,
			networkPrefixPath
		);
		entries.push(
			`${rewrite(normalized.unwrapped ? normalized.url : url)}${descriptor}`
		);
	}
	return entries.join(', ');
}
