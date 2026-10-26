export const maxTabs = 10;
const maxBookmarks = 50;
const maxTitleLength = 200;

export interface Bookmark {
	url: string;
	title: string;
}

export interface TabSession {
	urls: string[];
	active: number;
}

export function webUrl(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:'
			? url.href
			: null;
	} catch {
		return null;
	}
}

const parse = (raw: string | null): unknown => {
	try {
		return JSON.parse(raw ?? '');
	} catch {
		return null;
	}
};

export function parseSession(raw: string | null): TabSession {
	const data = parse(raw) as Partial<TabSession> | null;
	const urls = (Array.isArray(data?.urls) ? data.urls : [])
		.slice(0, maxTabs)
		.map((url) => webUrl(url) ?? '');
	const active = Number(data?.active);
	return {
		urls,
		active:
			Number.isInteger(active) && active >= 0 && active < urls.length
				? active
				: 0,
	};
}

export function parseBookmarks(raw: string | null): Bookmark[] {
	const data = parse(raw);
	if (!Array.isArray(data)) return [];
	const bookmarks: Bookmark[] = [];
	for (const item of data) {
		const url = webUrl(item?.url);
		if (!url || bookmarks.some((bookmark) => bookmark.url === url))
			continue;
		const title =
			typeof item.title === 'string' && item.title.trim()
				? item.title.trim().slice(0, maxTitleLength)
				: new URL(url).hostname;
		bookmarks.push({ url, title });
		if (bookmarks.length === maxBookmarks) break;
	}
	return bookmarks;
}

export function toggleBookmark(
	bookmarks: Bookmark[],
	bookmark: Bookmark
): Bookmark[] {
	if (bookmarks.some(({ url }) => url === bookmark.url))
		return bookmarks.filter(({ url }) => url !== bookmark.url);
	return [
		{ url: bookmark.url, title: bookmark.title.slice(0, maxTitleLength) },
		...bookmarks,
	].slice(0, maxBookmarks);
}
