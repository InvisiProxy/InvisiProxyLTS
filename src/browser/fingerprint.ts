export type PresetCategory = 'desktop' | 'mobile' | 'console' | 'bot';

export interface UserAgentPreset {
	id: string;
	label: string;
	category: PresetCategory;
	userAgent: string;
}

export interface BrowserProfile {
	userAgent: string;
	appVersion: string;
	platform: string;
	vendor: string;
	mobile: boolean;
	maxTouchPoints: number;
	chromium?: { version: string; platform: string };
}

export interface FingerprintNoise {
	hardwareConcurrency: number;
	deviceMemory: number;
	seed: number;
}

export type RawHeaders = [string, string][];

const realAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
const realChrome = Number(/Chrome\/(\d+)/.exec(realAgent)?.[1]) || 0;
const realFirefox = Number(/Firefox\/(\d+)/.exec(realAgent)?.[1]) || 0;
const chromeMajor = Math.max(141, realChrome, realFirefox - 2);
const chrome = `${chromeMajor}.0.0.0`;
const firefox = `${Math.max(143, realFirefox, chromeMajor + 2)}.0`;

export const userAgentPresets: readonly UserAgentPreset[] = [
	{
		id: 'chrome-windows',
		label: 'Chrome Windows',
		category: 'desktop',
		userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36`,
	},
	{
		id: 'chrome-mac',
		label: 'Chrome macOS',
		category: 'desktop',
		userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36`,
	},
	{
		id: 'chrome-linux',
		label: 'Chrome Linux',
		category: 'desktop',
		userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36`,
	},
	{
		id: 'firefox-windows',
		label: 'Firefox Windows',
		category: 'desktop',
		userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefox}) Gecko/20100101 Firefox/${firefox}`,
	},
	{
		id: 'firefox-linux',
		label: 'Firefox Linux',
		category: 'desktop',
		userAgent: `Mozilla/5.0 (X11; Linux x86_64; rv:${firefox}) Gecko/20100101 Firefox/${firefox}`,
	},
	{
		id: 'safari-mac',
		label: 'Safari macOS',
		category: 'desktop',
		userAgent:
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
	},
	{
		id: 'chrome-android',
		label: 'Chrome Android',
		category: 'mobile',
		userAgent: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Mobile Safari/537.36`,
	},
	{
		id: 'safari-iphone',
		label: 'Safari iPhone',
		category: 'mobile',
		userAgent:
			'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
	},
	{
		id: 'safari-ipad',
		label: 'Safari iPad',
		category: 'mobile',
		userAgent:
			'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
	},
	{
		id: 'firefox-android',
		label: 'Firefox Android',
		category: 'mobile',
		userAgent: `Mozilla/5.0 (Android 15; Mobile; rv:${firefox}) Gecko/${firefox} Firefox/${firefox}`,
	},
	{
		id: 'playstation',
		label: 'PlayStation 5',
		category: 'console',
		userAgent:
			'Mozilla/5.0 (PlayStation; PlayStation 5/2.26) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15',
	},
	{
		id: 'xbox',
		label: 'Xbox Series X',
		category: 'console',
		userAgent:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox Series X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36 Edge/20.02',
	},
	{
		id: 'switch',
		label: 'Nintendo Switch',
		category: 'console',
		userAgent:
			'Mozilla/5.0 (Nintendo Switch; WifiWebAuthApplet) AppleWebKit/606.4 (KHTML, like Gecko) NF/6.0.1.15.4 NintendoBrowser/5.1.0.20393',
	},
	{
		id: 'steam-deck',
		label: 'Steam Deck',
		category: 'console',
		userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36 Valve Steam Client`,
	},
	{
		id: 'googlebot',
		label: 'Googlebot',
		category: 'bot',
		userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/${chrome} Safari/537.36`,
	},
	{
		id: 'bingbot',
		label: 'Bingbot',
		category: 'bot',
		userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/${chrome} Safari/537.36`,
	},
	{
		id: 'duckduckbot',
		label: 'DuckDuckBot',
		category: 'bot',
		userAgent: 'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
	},
];

const customPrefix = 'custom:';

export function customUserAgent(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed || trimmed.length > 512 || /[\r\n\0]/.test(trimmed))
		return null;
	return trimmed;
}

export function storedUserAgent(stored: unknown): string | null {
	if (typeof stored !== 'string') return null;
	if (stored.startsWith(customPrefix))
		return customUserAgent(stored.slice(customPrefix.length));
	return userAgentPresets.find(({ id }) => id === stored)?.userAgent ?? null;
}

export const customUserAgentValue = (userAgent: string) =>
	customPrefix + userAgent;

export const presetCategories: readonly PresetCategory[] = [
	'desktop',
	'mobile',
	'console',
	'bot',
];

export function storedCategory(
	stored: unknown
): PresetCategory | 'custom' | null {
	if (typeof stored !== 'string') return null;
	if (stored.startsWith(customPrefix))
		return customUserAgent(stored.slice(customPrefix.length))
			? 'custom'
			: null;
	return userAgentPresets.find(({ id }) => id === stored)?.category ?? null;
}

export const presetLabel = (stored: unknown): string | null =>
	userAgentPresets.find(({ id }) => id === stored)?.label ?? null;

export function profileFromUserAgent(userAgent: string): BrowserProfile {
	const mobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
	const apple = /iPhone|iPad|iPod|Macintosh/.test(userAgent);
	const platform = /iPhone/.test(userAgent)
		? 'iPhone'
		: /iPad/.test(userAgent)
			? 'iPad'
			: /Android/.test(userAgent)
				? 'Linux armv81'
				: /Windows|Xbox/.test(userAgent)
					? 'Win32'
					: /Macintosh/.test(userAgent)
						? 'MacIntel'
						: /PlayStation/.test(userAgent)
							? 'PlayStation 5'
							: /Nintendo/.test(userAgent)
								? 'Nintendo Switch'
								: /Linux|X11/.test(userAgent)
									? 'Linux x86_64'
									: '';
	const chromeVersion = /(?:Chrome|CriOS)\/(\d+)/.exec(userAgent)?.[1];
	const chromium =
		chromeVersion &&
		!/Edge\/|Firefox|Googlebot|bingbot|Xbox/.test(userAgent) &&
		!apple
			? {
					version: chromeVersion,
					platform: /Android/.test(userAgent)
						? 'Android'
						: /Windows/.test(userAgent)
							? 'Windows'
							: /CrOS/.test(userAgent)
								? 'Chrome OS'
								: 'Linux',
				}
			: chromeVersion && /Macintosh/.test(userAgent)
				? { version: chromeVersion, platform: 'macOS' }
				: undefined;
	const vendor = chromium
		? 'Google Inc.'
		: apple || /PlayStation/.test(userAgent)
			? 'Apple Computer, Inc.'
			: '';
	return {
		userAgent,
		appVersion: userAgent.replace(/^Mozilla\//, ''),
		platform,
		vendor,
		mobile,
		maxTouchPoints: mobile ? 5 : 0,
		chromium,
	};
}

export function randomPreset(random = Math.random): UserAgentPreset {
	const desktop = userAgentPresets.filter(
		({ category }) => category === 'desktop'
	);
	return desktop[Math.floor(random() * desktop.length)];
}

export function randomNoise(random = Math.random): FingerprintNoise {
	const pick = <T>(items: readonly T[]) =>
		items[Math.floor(random() * items.length)];
	return {
		hardwareConcurrency: pick([4, 6, 8, 12, 16]),
		deviceMemory: pick([4, 8]),
		seed: Math.floor(random() * 2 ** 31),
	};
}

export interface SessionFingerprint {
	preset: UserAgentPreset;
	noise: FingerprintNoise;
}

export function sessionFingerprint(
	session: Pick<Storage, 'getItem' | 'setItem'>,
	key: string,
	random = Math.random
): SessionFingerprint {
	try {
		const saved = JSON.parse(session.getItem(key) ?? 'null');
		const preset = userAgentPresets.find(({ id }) => id === saved?.preset);
		const noise = saved?.noise;
		if (
			preset &&
			Number.isInteger(noise?.hardwareConcurrency) &&
			Number.isInteger(noise?.deviceMemory) &&
			Number.isInteger(noise?.seed)
		)
			return { preset, noise };
	} catch {}
	const fresh = { preset: randomPreset(random), noise: randomNoise(random) };
	try {
		session.setItem(
			key,
			JSON.stringify({ preset: fresh.preset.id, noise: fresh.noise })
		);
	} catch {}
	return fresh;
}

function brandList(version: string, full = false) {
	const value = full ? `${version}.0.0.0` : version;
	return [
		{ brand: 'Chromium', version: value },
		{ brand: 'Google Chrome', version: value },
		{ brand: 'Not?A_Brand', version: full ? '99.0.0.0' : '99' },
	];
}

const brandHeader = (version: string) =>
	brandList(version)
		.map(({ brand, version }) => `"${brand}";v="${version}"`)
		.join(', ');

export function rewriteHeaders(
	headers: RawHeaders,
	profile: BrowserProfile
): RawHeaders {
	const kept = headers.filter(
		([name]) => !/^(?:user-agent|sec-ch-ua(?:-.*)?)$/i.test(name)
	);
	kept.push(['user-agent', profile.userAgent]);
	if (profile.chromium)
		kept.push(
			['sec-ch-ua', brandHeader(profile.chromium.version)],
			['sec-ch-ua-mobile', profile.mobile ? '?1' : '?0'],
			['sec-ch-ua-platform', `"${profile.chromium.platform}"`]
		);
	return kept;
}

type ProxiedWindow = Window & typeof globalThis;

function define(target: object, name: string, value: () => unknown) {
	try {
		Object.defineProperty(target, name, {
			configurable: true,
			enumerable: true,
			get: value,
		});
	} catch {}
}

export function spoofNavigator(win: Window, profile: BrowserProfile): void {
	const proto = (win as ProxiedWindow).Navigator?.prototype;
	if (!proto) return;
	define(proto, 'userAgent', () => profile.userAgent);
	define(proto, 'appVersion', () => profile.appVersion);
	define(proto, 'platform', () => profile.platform);
	define(proto, 'vendor', () => profile.vendor);
	define(proto, 'maxTouchPoints', () => profile.maxTouchPoints);
	define(proto, 'oscpu', () =>
		/Firefox/.test(profile.userAgent) ? profile.platform : undefined
	);
	const chromium = profile.chromium;
	if (!chromium) {
		define(proto, 'userAgentData', () => undefined);
		define(proto, 'deviceMemory', () => undefined);
		return;
	}
	const data = {
		brands: brandList(chromium.version),
		mobile: profile.mobile,
		platform: chromium.platform,
		getHighEntropyValues: async (hints: string[]) => {
			const values: Record<string, unknown> = {
				brands: brandList(chromium.version),
				mobile: profile.mobile,
				platform: chromium.platform,
			};
			if (hints.includes('fullVersionList'))
				values.fullVersionList = brandList(chromium.version, true);
			if (hints.includes('uaFullVersion'))
				values.uaFullVersion = `${chromium.version}.0.0.0`;
			return values;
		},
		toJSON: () => ({
			brands: brandList(chromium.version),
			mobile: profile.mobile,
			platform: chromium.platform,
		}),
	};
	define(proto, 'userAgentData', () => data);
}

function noisy(seed: number) {
	let state = seed >>> 0 || 1;
	return () => {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) / 2 ** 32;
	};
}

function addCanvasNoise(win: ProxiedWindow, seed: number) {
	const canvas = win.HTMLCanvasElement?.prototype;
	const context = win.CanvasRenderingContext2D?.prototype;
	if (!canvas || !context) return;
	const { getImageData } = context;
	const read = getImageData as (
		this: CanvasRenderingContext2D,
		...args: [number, number, number, number]
	) => ImageData;
	const write = context.putImageData as (
		this: CanvasRenderingContext2D,
		image: ImageData,
		x: number,
		y: number
	) => void;
	const { getContext } = canvas;
	const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
	canvas.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
		const result = (getContext as (...args: unknown[]) => unknown).apply(
			this,
			args
		);
		if (args[0] === '2d' && result)
			contexts.set(this, result as CanvasRenderingContext2D);
		return result;
	} as typeof getContext;
	const perturb = (data: Uint8ClampedArray) => {
		const random = noisy(seed);
		for (let i = 0; i < data.length; i += 4)
			if (random() < 0.02) data[i] ^= 1;
	};
	context.getImageData = function (...args) {
		const image = getImageData.apply(this, args);
		perturb(image.data);
		return image;
	};
	for (const method of ['toDataURL', 'toBlob'] as const) {
		const original = canvas[method] as (...args: unknown[]) => unknown;
		canvas[method] = function (
			this: HTMLCanvasElement,
			...args: unknown[]
		) {
			const ctx = contexts.get(this);
			if (!ctx || !this.width || !this.height)
				return original.apply(this, args);
			const image = read.call(ctx, 0, 0, this.width, this.height);
			const pristine = read.call(ctx, 0, 0, this.width, this.height);
			perturb(image.data);
			write.call(ctx, image, 0, 0);
			try {
				return original.apply(this, args);
			} finally {
				write.call(ctx, pristine, 0, 0);
			}
		} as never;
	}
}

function maskWebgl(win: ProxiedWindow) {
	for (const name of [
		'WebGLRenderingContext',
		'WebGL2RenderingContext',
	] as const) {
		const proto = win[name]?.prototype;
		if (!proto) continue;
		const getParameter = proto.getParameter as (
			this: WebGLRenderingContextBase,
			parameter: number
		) => unknown;
		proto.getParameter = function (
			this: WebGLRenderingContextBase,
			parameter: number
		) {
			if (parameter === 0x9245) return 'Google Inc.';
			if (parameter === 0x9246)
				return 'ANGLE (Generic, Generic Renderer)';
			return getParameter.call(this, parameter);
		} as typeof proto.getParameter;
	}
}

export function randomizeFingerprint(
	win: Window,
	noise: FingerprintNoise,
	profile?: BrowserProfile | null
): void {
	const proxied = win as ProxiedWindow;
	const proto = proxied.Navigator?.prototype;
	if (proto) {
		define(proto, 'hardwareConcurrency', () => noise.hardwareConcurrency);
		define(proto, 'deviceMemory', () =>
			profile && !profile.chromium ? undefined : noise.deviceMemory
		);
	}
	addCanvasNoise(proxied, noise.seed);
	maskWebgl(proxied);
}
