// Static assets that must never fall back to the proxy origin's own file
// server when a proxied document requests them from a CDN-style path.
const assetPath =
	/\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp|wasm|woff2?|ttf|otf|eot|mp4|webm|og[gv]|mp3|wav|flac)(?:$|\?)/i;

/**
 * Whether a request URL belongs to the Scramjet proxy prefix. blob:/data:
 * URLs never resolve against the proxy filesystem and stay with the
 * browser's native handler; prefix-wrapped blob requests (Scramjet rewrites
 * them so the controller can serve them through its blob fetcher) still
 * match the prefix and keep routing normally.
 */
export function isScramjetRouteUrl(
	url: string,
	networkPrefixPath: string
): boolean {
	if (/^(?:blob|data):/.test(url)) return false;
	try {
		return new URL(url).pathname.startsWith(networkPrefixPath);
	} catch {
		return false;
	}
}

export interface ProxiedClient {
	controllerId: string;
	frameId: string;
	target: URL;
}

/**
 * Parse a proxied document URL (`<prefix><controllerId>/<frameId>/<encoded
 * target>`) back into the frame ids and remote target it is proxying, or
 * null when the URL is not a proxied document (top-level proxy pages, the
 * service worker itself, malformed input).
 */
export function proxiedClientFor(
	clientUrl: string | undefined,
	networkPrefixPath: string
): ProxiedClient | null {
	if (!clientUrl) return null;
	let path: string;
	try {
		path = new URL(clientUrl).pathname;
	} catch {
		return null;
	}
	if (!path.startsWith(networkPrefixPath)) return null;
	const rest = path.slice(networkPrefixPath.length).split('/');
	if (rest.length < 3 || !rest[0] || !rest[1]) return null;
	try {
		const target = new URL(decodeURIComponent(rest.slice(2).join('/')));
		if (!['http:', 'https:'].includes(target.protocol)) return null;
		return { controllerId: rest[0], frameId: rest[1], target };
	} catch {
		return null;
	}
}

/**
 * Re-wrap an escaped asset request (an image, font, wasm module or media
 * file that a proxied client requested outside the Scramjet prefix) so it
 * loads through the same Wisp-backed controller route instead of falling
 * through to this origin's static site server, which answers remote asset
 * paths with 404s. Root-relative assets are re-resolved against the
 * proxied document's real origin; already-absolute cross-origin assets are
 * wrapped as-is. Returns null when the request should stay native.
 */
export function proxiedAssetUrl(
	requestUrl: string,
	clientUrl: string | undefined,
	networkPrefixPath: string,
	proxyOrigin: string
): string | null {
	let url: URL;
	try {
		url = new URL(requestUrl);
	} catch {
		return null;
	}
	if (!['http:', 'https:'].includes(url.protocol)) return null;
	if (url.pathname.startsWith(networkPrefixPath)) return null;
	if (!assetPath.test(url.pathname)) return null;
	const client = proxiedClientFor(clientUrl, networkPrefixPath);
	if (!client) return null;
	const target =
		url.origin === proxyOrigin
			? new URL(url.pathname + url.search, client.target.origin)
			: url;
	return new URL(
		`${networkPrefixPath}${client.controllerId}/${client.frameId}/${encodeURIComponent(target.href)}`,
		proxyOrigin
	).href;
}
