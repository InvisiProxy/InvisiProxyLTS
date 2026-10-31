// Scramjet's HttpCachePlugin reads every cacheable body fully into memory
// before storing it, so streamed video (whole MP4s, HLS segments) piles up in
// the tab until it crashes. Responses matching these rules bypass that cache.
const mediaDestinations = ['audio', 'video'];
const mediaType = /^(?:audio|video)\/|mpegurl|mp2t|dash\+xml|octet-stream/i;
const maxCachedBytes = 2 * 1024 * 1024;
// Players pull segments through fetch/XHR, often disguised as images.
const maxFetchedBytes = 256 * 1024;

export type RawHeaders = Iterable<[string, string]>;

function header(headers: RawHeaders, name: string): string | null {
	for (const [key, value] of headers)
		if (key.toLowerCase() === name) return value;
	return null;
}

export function skipHttpCache(
	destination: string,
	requestHeaders: RawHeaders,
	responseHeaders: RawHeaders
): boolean {
	if (mediaDestinations.includes(destination)) return true;
	if (header(requestHeaders, 'range') !== null) return true;
	if (mediaType.test(header(responseHeaders, 'content-type') ?? ''))
		return true;
	const length = Number.parseInt(
		header(responseHeaders, 'content-length') ?? '',
		10
	);
	const fetched = destination === '';
	if (!Number.isFinite(length)) return fetched;
	return length > (fetched ? maxFetchedBytes : maxCachedBytes);
}
