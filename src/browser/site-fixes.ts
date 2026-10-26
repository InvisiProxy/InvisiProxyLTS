const autoSites = ['playobsidian.com', 'truffled.lol'];
const encapsulated =
	/(?:importScripts\("|import ")(data:text\/javascript;charset=utf-8;base64,[\w+/=]+)"\)?;?\n$/;
const workerDestinations = ['worker', 'sharedworker'];
const bracelessDebugger = /(\)|\belse)(\s*)debugger\b/g;
const evalImport = /\beval\(\s*(['"`])import\((['"])([^'"`]+)\2\)\1\s*\)/g;
const storageCacheMethods = ['delete', 'match', 'matchAll', 'put'] as const;

export type ScramjetClientSiteTarget = {
	url: { href: string; origin: string };
};

export type ScramjetFetchRequestTarget = {
	rawUrl: URL;
	rawDestination: RequestDestination;
	method: string;
	cache: RequestCache;
};

export type ScramjetSiteFetchHandler = {
	handleFetch(
		request: ScramjetFetchRequestTarget
	): Promise<{ body: unknown }>;
};

export function autoSiteFixes(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		return autoSites.some(
			(site) => hostname === site || hostname.endsWith(`.${site}`)
		);
	} catch {
		return false;
	}
}

function encapsulatedWorkerScript(body: unknown): string | null {
	if (typeof body !== 'string') return null;
	return encapsulated.exec(body)?.[1] ?? null;
}

export function fixFetchHandler(
	handler: ScramjetSiteFetchHandler,
	prefix: string,
	active: () => boolean
): void {
	const issued = new Map<string, number>();
	const handleFetch = handler.handleFetch.bind(handler);
	handler.handleFetch = async (request) => {
		const destination =
			request.rawUrl.searchParams.get('$dest') || request.rawDestination;
		const target = request.rawUrl.pathname.slice(prefix.length);
		const pending = issued.get(target);
		if (pending && destination === 'script') {
			if (pending > 1) issued.set(target, pending - 1);
			else issued.delete(target);
			request.rawDestination = '';
		}
		if (request.method === 'HEAD' && active()) request.cache = 'no-store';
		const response = await handleFetch(request);
		if (workerDestinations.includes(destination) && active()) {
			const script = encapsulatedWorkerScript(response.body);
			if (script) issued.set(script, (issued.get(script) ?? 0) + 1);
		}
		return response;
	};
}

export function headlessBody(response: Response): Response {
	response.body?.cancel().catch(() => {});
	return new Response(null, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
}

export function fixScriptSource(js: string): string {
	return js
		.replace(bracelessDebugger, '$1$2void 0')
		.replace(evalImport, 'import("$3")');
}

export function scriptSafeBody(response: Response): ReadableStream<Uint8Array> {
	return new ReadableStream({
		async start(controller) {
			try {
				const bytes = new Uint8Array(await response.arrayBuffer());
				let fixed: string | null = null;
				try {
					const js = new TextDecoder('utf-8', { fatal: true }).decode(
						bytes
					);
					fixed = fixScriptSource(js);
					if (fixed === js) fixed = null;
				} catch {}
				controller.enqueue(
					fixed === null ? bytes : new TextEncoder().encode(fixed)
				);
				controller.close();
			} catch (error) {
				controller.error(error);
			}
		},
	});
}

export function keepHistoryUrl(
	win: Window,
	client: ScramjetClientSiteTarget
): void {
	const proto = (win as Window & typeof globalThis).History.prototype;
	for (const name of ['pushState', 'replaceState'] as const)
		proto[name] = new Proxy(proto[name], {
			apply(target, history: History, args: unknown[]) {
				if (history === win.history && args[2] == null)
					args[2] = client.url.href;
				return Reflect.apply(target, history, args);
			},
		});
}

export function siteCacheKey(request: unknown, base: string): unknown {
	if (typeof request !== 'string' && !(request instanceof URL))
		return request;
	try {
		return new URL(request, base).href;
	} catch {
		return request;
	}
}

export function siteCacheNames(names: string[], origin: string): string[] {
	const prefix = `${origin}@`;
	return names
		.filter((name) => name.startsWith(prefix))
		.map((name) => name.slice(prefix.length));
}

export function stableCacheKeys(
	win: Window,
	client: ScramjetClientSiteTarget
): void {
	const scope = win as Window & typeof globalThis;
	const cache = scope.Cache.prototype as unknown as Record<
		string,
		(...args: unknown[]) => unknown
	>;
	for (const name of storageCacheMethods)
		cache[name] = new Proxy(cache[name], {
			apply(target, self, args: unknown[]) {
				if (args.length)
					args[0] = siteCacheKey(args[0], client.url.href);
				return Reflect.apply(target, self, args);
			},
		});
	const storage = scope.CacheStorage.prototype;
	storage.keys = new Proxy(storage.keys, {
		async apply(target, self) {
			const names: string[] = await Reflect.apply(target, self, []);
			return siteCacheNames(names, client.url.origin);
		},
	});
}

const obsidianDefaults = {
	sidebarCollapsed: false,
	sidebarSort: 'alphabetical',
	sortBy: 'alphabetical',
	maskTitle: '',
	maskIcon: '',
	autoMask: false,
	panicKey: '',
	panicURL: '',
	aspect: '',
	closePrevention: false,
	customCSS: '',
	cards: 'default',
	overlay: 'default',
	launch: 'newTab',
	libraryMode: false,
};

export function obsidianSameTab(
	storage: Pick<Storage, 'getItem' | 'setItem'>,
	client: ScramjetClientSiteTarget
): void {
	if (!/(^|\.)playobsidian\.com$/.test(new URL(client.url.href).hostname))
		return;
	const key = 'settings';
	let settings: Record<string, unknown> = obsidianDefaults;
	try {
		settings = JSON.parse(storage.getItem(key) ?? 'null') ?? settings;
	} catch {}
	if (settings.launch === 'currentTab') return;
	storage.setItem(key, JSON.stringify({ ...settings, launch: 'currentTab' }));
}
