export interface StorageLike {
	readonly length: number;
	clear(): void;
	getItem(key: string): string | null;
	key(index: number): string | null;
	removeItem(key: string): void;
	setItem(key: string, value: string): void;
}

export interface StorageGlobals {
	Storage?: new (...args: never[]) => object;
	localStorage?: StorageLike;
	sessionStorage?: StorageLike;
}

export interface StorageFallbacks {
	localStorage: StorageLike;
	sessionStorage: StorageLike;
}

export interface CookieJarLike {
	getCookies(url: URL, fromJs: boolean): string;
	setCookies(cookie: string, url: URL): void;
}

export interface CookieClientLike {
	url: URL;
	context: { cookieJar: CookieJarLike };
	init: {
		sendSetCookie?: (
			cookies: { url: URL; cookie: string }[]
		) => Promise<void>;
	};
}

const isStorageLike = (value: unknown): value is StorageLike => {
	if (!value || typeof value !== 'object') return false;
	const storage = value as Partial<StorageLike>;
	return (
		typeof storage.getItem === 'function' &&
		typeof storage.setItem === 'function' &&
		typeof storage.removeItem === 'function' &&
		typeof storage.key === 'function' &&
		typeof storage.clear === 'function'
	);
};

/**
 * Expose one target site's keys through a Storage-compatible proxy over the
 * proxy page's persistent storage. This is only used when Scramjet's own
 * storage proxy is unavailable; its namespace format matches Scramjet's.
 */
export function createNamespacedStorage(
	storage: StorageLike,
	host: string,
	storageConstructor?: new (...args: never[]) => object
): StorageLike {
	const prefix = `${host}@`;
	const keys = () => {
		const result: string[] = [];
		for (let index = 0; index < storage.length; index++) {
			const key = storage.key(index);
			if (key?.startsWith(prefix)) result.push(key.slice(prefix.length));
		}
		return result;
	};

	const target = Object.create(Object.getPrototypeOf(storage)) as StorageLike;
	return new Proxy(target, {
		get(_target, property) {
			if (property === 'length') return keys().length;
			if (property === 'getItem')
				return (key: string) => storage.getItem(prefix + String(key));
			if (property === 'setItem')
				return (key: string, value: string) =>
					storage.setItem(prefix + String(key), String(value));
			if (property === 'removeItem')
				return (key: string) =>
					storage.removeItem(prefix + String(key));
			if (property === 'clear')
				return () => {
					for (const key of keys()) storage.removeItem(prefix + key);
				};
			if (property === 'key')
				return (index: number) => keys()[index] ?? null;
			if (property === 'constructor')
				return (
					storageConstructor ??
					Object.getPrototypeOf(target)?.constructor
				);
			if (typeof property === 'symbol' || property in Object.prototype)
				return Reflect.get(target, property, target);
			return storage.getItem(prefix + String(property)) ?? undefined;
		},
		set(_target, property, value) {
			if (typeof property === 'symbol' || property in Object.prototype)
				return false;
			storage.setItem(prefix + String(property), String(value));
			return true;
		},
		has(_target, property) {
			if (typeof property === 'symbol' || property in Object.prototype)
				return true;
			return storage.getItem(prefix + String(property)) !== null;
		},
		ownKeys() {
			return keys();
		},
		getOwnPropertyDescriptor(_target, property) {
			if (typeof property !== 'string' || property in Object.prototype)
				return Reflect.getOwnPropertyDescriptor(target, property);
			const value = storage.getItem(prefix + property);
			return value === null
				? undefined
				: {
						value,
						enumerable: true,
						configurable: true,
						writable: true,
					};
		},
		defineProperty(_target, property, descriptor) {
			if (typeof property !== 'string' || !('value' in descriptor))
				return false;
			storage.setItem(prefix + property, String(descriptor.value));
			return true;
		},
		deleteProperty(_target, property) {
			if (typeof property !== 'string') return false;
			storage.removeItem(prefix + property);
			return true;
		},
	});
}

/**
 * Keep Scramjet's host-scoped Storage objects reachable for the full page
 * lifetime. Some sites delete the configurable globals after boot; making the
 * descriptors non-configurable prevents auth/session code from losing them.
 * If a global is already missing, provide a fallback scoped to the target
 * host and backed by the proxy page's local/session storage.
 */
export function delegateStorageAccess(
	global: StorageGlobals,
	fallbacks: StorageFallbacks,
	host: string
): void {
	for (const name of ['localStorage', 'sessionStorage'] as const) {
		let current: unknown;
		try {
			current = global[name];
		} catch {
			current = undefined;
		}
		const storage = isStorageLike(current)
			? current
			: createNamespacedStorage(fallbacks[name], host, global.Storage);
		try {
			Object.defineProperty(global, name, {
				configurable: false,
				enumerable: true,
				get: () => storage,
			});
		} catch {
			// The browser may already expose a non-configurable native property.
			// Scramjet's installed descriptor remains authoritative in that case.
		}
	}
}

/** Keep the CookieJar-backed document.cookie API installed for the frame. */
export function delegateCookieAccess(
	global: { Document?: { prototype: object }; document: Document },
	client: CookieClientLike
): void {
	const prototype = global.Document?.prototype;
	if (!prototype) return;
	const descriptor = Object.getOwnPropertyDescriptor(prototype, 'cookie');
	const cookieJar = client.context.cookieJar;
	Object.defineProperty(prototype, 'cookie', {
		configurable: false,
		enumerable: descriptor?.enumerable ?? true,
		get() {
			return cookieJar.getCookies(client.url, true);
		},
		set(value: string) {
			const cookie = String(value);
			const url = client.url;
			cookieJar.setCookies(cookie, url);
			void client.init.sendSetCookie?.([{ url, cookie }]);
		},
	});
}
