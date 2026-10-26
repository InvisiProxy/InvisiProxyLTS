// The Freedom Project - https://nullatenus.com/

const garbageValues = new Set(['undefined', 'null', 'nan', '[object object]']);
const fallbackHref = 'https://example.com/';
const guardInstalled = Symbol.for('invisiproxy search url guard');
const searchInputSelectors = [
	'#search_form_input',
	"input[name='q']",
	"input[type='search']",
	"input[name='query']",
	"textarea[name='q']",
];
const guardedSites = ['duckduckgo.com', 'tiktok.com', 'animetsu.site', 'fmhy.net', 'twitch.tv'];

export type ScramjetClientUrlGuardTarget = {
	url: { href: string } | string;
	rewriteUrl: (url: string | URL, options?: unknown) => string;
};

export function needsSearchUrlGuard(url: { href: string } | string): boolean {
	try {
		const { hostname } = new URL(typeof url === 'string' ? url : url.href);
		return guardedSites.some(
			(site) => hostname === site || hostname.endsWith(`.${site}`)
		);
	} catch {
		return false;
	}
}

function isGarbageValue(value: string): boolean {
	return garbageValues.has(value.trim().toLowerCase());
}

function isGarbagePathname(pathname: string): boolean {
	return pathname.split('/').some((segment) => isGarbageValue(segment));
}

export function readProxiedSearchInputQuery(
	doc: Pick<Document, 'querySelector'> | null | undefined
): string {
	if (!doc) return '';
	for (const selector of searchInputSelectors) {
		const value = (doc.querySelector(selector) as HTMLInputElement | null)
			?.value;
		if (typeof value !== 'string') continue;
		const query = value.trim();
		if (query && !isGarbageValue(query)) return query;
	}
	return '';
}

export function sanitizeScramjetNavigateUrl(
	raw: unknown,
	baseHref: string,
	recoveryQuery: () => string = () => ''
): string | null {
	const recovered = () => {
		const query = recoveryQuery().trim();
		return query && !isGarbageValue(query) ? query : '';
	};
	const searchPath = () => {
		const query = recovered();
		return query ? `/?q=${encodeURIComponent(query)}` : null;
	};

	if (raw == null) return searchPath();
	const href = typeof raw === 'string' ? raw : String(raw);
	if (!href.trim()) return null;
	if (isGarbageValue(href)) return searchPath();

	let url: URL;
	try {
		url = new URL(href, baseHref.trim() || fallbackHref);
	} catch {
		return href;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return href;

	const pathGarbage = isGarbagePathname(url.pathname);
	const queryParam = url.searchParams.get('q');
	if (!pathGarbage && (queryParam == null || !isGarbageValue(queryParam)))
		return href;

	const query = recovered();
	if (!query) return null;

	const next = new URL(url.href);
	if (pathGarbage) next.pathname = '/';
	next.search = '';
	next.searchParams.set('q', query);
	for (const [key, value] of url.searchParams)
		if (key !== 'q' && !isGarbageValue(value))
			next.searchParams.set(key, value);
	return /^https?:\/\//i.test(href.trim())
		? next.href
		: `${next.pathname}${next.search}${next.hash}`;
}

export function installScramjetSearchUrlGuard(
	win: Window,
	client: ScramjetClientUrlGuardTarget
): void {
	const guarded = win as Window & { [guardInstalled]?: boolean };
	if (guarded[guardInstalled]) return;
	guarded[guardInstalled] = true;

	const recoveryQuery = () => readProxiedSearchInputQuery(win.document);
	const readClientHref = (): string => {
		try {
			const current = client.url;
			return typeof current === 'string'
				? current
				: (current?.href ?? fallbackHref);
		} catch {
			return fallbackHref;
		}
	};

	const rewriteUrl = client.rewriteUrl.bind(client);
	client.rewriteUrl = (url, options) =>
		rewriteUrl(
			sanitizeScramjetNavigateUrl(url, readClientHref(), recoveryQuery) ??
				readClientHref(),
			options
		);

	const proto = Object.getPrototypeOf(client) as object | null;
	const descriptor =
		Object.getOwnPropertyDescriptor(client, 'url') ??
		(proto ? Object.getOwnPropertyDescriptor(proto, 'url') : undefined);
	if (descriptor?.get && descriptor.set) {
		const { get, set } = descriptor;
		Object.defineProperty(client, 'url', {
			configurable: true,
			enumerable: true,
			get() {
				return get.call(this);
			},
			set(value: unknown) {
				let base = fallbackHref;
				try {
					base = String(get.call(this)?.href ?? base);
				} catch {}
				const fixed = sanitizeScramjetNavigateUrl(
					value,
					base,
					recoveryQuery
				);
				if (fixed != null) set.call(this, fixed);
			},
		});
	}

	installNavigationApiStub(win, client, readClientHref);
}

function installNavigationApiStub(
	win: Window,
	client: ScramjetClientUrlGuardTarget,
	readClientHref: () => string
): void {
	try {
		if ('navigation' in win && win.navigation) return;
	} catch {}

	const makeEntry = () => ({
		url: readClientHref(),
		key: 'invisiproxy-scramjet',
		id: 'invisiproxy-scramjet',
		index: 0,
		sameDocument: true,
		getState: () => null,
	});
	const settled = () => {
		const entry = makeEntry();
		return {
			committed: Promise.resolve(entry),
			finished: Promise.resolve(entry),
		};
	};
	const attempt = (action: () => void) => {
		try {
			action();
		} catch {}
	};
	const listeners = new Map<
		string,
		Set<EventListenerOrEventListenerObject>
	>();

	const navigation = {
		get currentEntry() {
			return makeEntry();
		},
		get transition() {
			return null;
		},
		get canGoBack() {
			return win.history.length > 1;
		},
		get canGoForward() {
			return false;
		},
		entries() {
			return [makeEntry()];
		},
		navigate(url: string) {
			attempt(() => {
				(client as { url: string }).url = url;
			});
			return settled();
		},
		reload() {
			attempt(() => win.location.reload());
			return settled();
		},
		back() {
			attempt(() => win.history.back());
		},
		forward() {
			attempt(() => win.history.forward());
		},
		traverseTo() {},
		updateCurrentEntry() {},
		addEventListener(
			type: string,
			listener: EventListenerOrEventListenerObject
		) {
			const set = listeners.get(type) ?? new Set();
			listeners.set(type, set);
			set.add(listener);
		},
		removeEventListener(
			type: string,
			listener: EventListenerOrEventListenerObject
		) {
			listeners.get(type)?.delete(listener);
		},
		dispatchEvent() {
			return true;
		},
	};

	try {
		Object.defineProperty(win, 'navigation', {
			configurable: true,
			enumerable: true,
			writable: true,
			value: navigation,
		});
	} catch {
		attempt(() => {
			(win as { navigation?: unknown }).navigation = navigation;
		});
	}
}
