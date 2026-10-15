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

const identifierChar = /[\w-]/;

function escapeCssString(value: string, quote: string): string {
	return value.replace(/[\\"']/g, (match) =>
		match === quote || match === '\\' ? `\\${match}` : match
	);
}

/**
 * Rewrite every `url(...)` target inside CSS text: an inline `style`
 * attribute, a `cssText` assignment, a single declaration value such as
 * `background-image: url(cover.png)` or a whole stylesheet block. Quoted and
 * unquoted forms are tokenized spec-compliantly, so `data:` URLs containing
 * commas, string literals (`content: "url(x)"`) and comments never get
 * rewritten, and targets are normalized exactly once through
 * `rewriteFrameUrl` (fragment references like `url(#gradient)` and
 * blob:/data:/about: targets pass through because they never leave the
 * frame). Values without a `url(` token are returned untouched.
 */
export function rewriteCssTextFrameUrls(
	value: unknown,
	rewrite: FrameUrlRewrite,
	proxyOrigin: string,
	networkPrefixPath: string
): unknown {
	if (typeof value !== 'string' || !value) return value;
	const lower = value.toLowerCase();
	if (!lower.includes('url(')) return value;
	let output = '';
	let index = 0;
	while (index < value.length) {
		const char = value[index];
		// Comments and string literals are copied verbatim.
		if (char === '/' && value[index + 1] === '*') {
			const end = value.indexOf('*/', index + 2);
			const stop = end === -1 ? value.length : end + 2;
			output += value.slice(index, stop);
			index = stop;
			continue;
		}
		if (char === '"' || char === "'") {
			let end = index + 1;
			while (end < value.length && value[end] !== char) {
				if (value[end] === '\\') end++;
				end++;
			}
			const stop = Math.min(end + 1, value.length);
			output += value.slice(index, stop);
			index = stop;
			continue;
		}
		// A url( function token may not continue an identifier (`curl(` is a
		// custom function, not a URL token).
		const previous = index > 0 ? value[index - 1] : '';
		if (
			!lower.startsWith('url(', index) ||
			identifierChar.test(previous)
		) {
			output += char;
			index++;
			continue;
		}
		const bodyStart = index + 4;
		let cursor = bodyStart;
		while (cursor < value.length && /\s/.test(value[cursor])) cursor++;
		const leading = value.slice(bodyStart, cursor);
		let quote = '';
		let target = '';
		if (value[cursor] === '"' || value[cursor] === "'") {
			quote = value[cursor];
			let end = cursor + 1;
			while (end < value.length && value[end] !== quote) {
				if (value[end] === '\\' && end + 1 < value.length) {
					target += value[end] + value[end + 1];
					end += 2;
					continue;
				}
				target += value[end];
				end++;
			}
			if (value[end] !== quote) {
				output += value.slice(index);
				break;
			}
			cursor = end + 1;
			while (cursor < value.length && /\s/.test(value[cursor])) cursor++;
			if (value[cursor] !== ')') {
				output += value.slice(index);
				break;
			}
			cursor++;
		} else {
			const end = value.indexOf(')', cursor);
			if (end === -1) {
				output += value.slice(index);
				break;
			}
			target = value.slice(cursor, end).trim();
			cursor = end + 1;
		}
		const rewritten = rewriteFrameUrl(
			target,
			rewrite,
			proxyOrigin,
			networkPrefixPath
		);
		// Untouched targets (fragments, blob:/data:, proxy-hosted values) are
		// re-emitted verbatim so the surrounding CSS formatting is preserved.
		if (rewritten === target) {
			output += value.slice(index, cursor);
			index = cursor;
			continue;
		}
		// Re-emit with quotes so unquoted targets that gained escaped
		// characters stay parseable, preserving the original whitespace.
		const outerQuote = quote || '"';
		output += `url(${leading}${outerQuote}${escapeCssString(
			String(rewritten),
			outerQuote
		)}${outerQuote})`;
		index = cursor;
	}
	return output;
}
