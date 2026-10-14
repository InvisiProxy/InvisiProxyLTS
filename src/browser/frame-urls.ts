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
