import type { wispurrOptions } from 'wispurr';
import { serverUrl } from '../config.ts';
import { getAltPrefix } from '../obfuscation/paths.ts';

export const wispPath = () => getAltPrefix('wisp', serverUrl.pathname);

export const wispProxies = {
	tor: 'socks5h://127.0.0.1:9050',
	eu: 'socks5h://127.0.0.1:7000',
	jp: 'socks5h://127.0.0.1:7001',
	patreon: 'socks5h://127.0.0.1:7002',
} as const;
export type WispRegion = keyof typeof wispProxies;

const trimTrailingSlash = (path: string) =>
	path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

const tryDecode = (path: string) => {
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
};

/**
 * Match a request pathname against the Wisp endpoint in every normal form a
 * client may send it in: with or without the trailing slash, with duplicate
 * slashes collapsed, and percent-encoded — including double-encoded slashes
 * (`%252F`), which over-eager URL builders produce for the proxy path. The
 * comparison stays exact against the alias after normalization, so no other
 * route can ever be routed onto Wisp.
 */
export const matchesWispPath = (
	pathname: string,
	route = wispPath()
): boolean => {
	const target = trimTrailingSlash(route);
	let candidate = pathname;
	// Two decode rounds cover single- and double-encoded slashes; a malformed
	// escape falls back to the raw form via tryDecode.
	for (let depth = 0; depth < 3; depth++) {
		if (trimTrailingSlash(candidate.replace(/\/{2,}/g, '/')) === target)
			return true;
		const decoded = tryDecode(candidate);
		if (decoded === candidate) break;
		candidate = decoded;
	}
	return false;
};

/**
 * Which regional Wisp backend an incoming request targets: `''` for the
 * default endpoint, a key of `wispProxies` for `/alias/<region>`, otherwise
 * `null`. Matching runs through `matchesWispPath`, so query strings,
 * duplicate slashes and percent-encoding can neither hide nor fake a region.
 */
export function wispRegion(
	url: string | null | undefined,
	route = wispPath()
): string | null {
	const path = typeof url === 'string' ? url.split(/[?#]/)[0] : '';
	if (matchesWispPath(path, route)) return '';
	const base = trimTrailingSlash(route);
	for (const region of Object.keys(wispProxies))
		if (matchesWispPath(path, `${base}/${region}`)) return region;
	return null;
}

/**
 * Whether an incoming request (upgrade or probe) targets the Wisp endpoint,
 * regional backends included. Query strings and fragments are stripped
 * before matching so a handshake like `/alias/?v=1` still reaches the Wisp
 * backend instead of dying at the site router before any TCP stream opens.
 */
export const isWispRequest = (
	url: string | null | undefined,
	route = wispPath()
): boolean => wispRegion(url, route) !== null;

const wispConfig = {
	port: 4432,
	host: '127.0.0.1',
	allowTCP: true,
	allowUDP: false,
	allowDirectIP: false,
	allowPrivateIPs: false,
	allowLoopbackIPs: true,
	tcpBufferSize: 262144,
	socketBufferSize: 16777216,
	pendingQueueSize: 33554432,
	bufferRemainingLength: 32768,
	tcpNoDelay: true,
	blacklist: {
		hostnames: [],
		ports: [25, 465, 587],
	},
	whitelist: {
		hostnames: [],
		ports: [80, 443, 9050, 7000, 7001, 7002],
	},
	websocketPermessageDeflate: false,
	frameObfuscation: {
		enabled: false,
		version: 2,
		key: '',
		tag: '',
		headerLength: 0,
		nonceLength: 0,
		metadataOffset: 0,
		paddingMinimum: 0,
		paddingMaximum: 0,
		paddingPlacement: 'split',
		keyStride: 0,
		nonceStride: 0,
	},
	dnsServers: [],
	dnsMethod: 'resolve',
	dnsResultOrder: 'ipv4first',
	enableTwisp: false,
	enableV2: true,
	handshakeTimeoutSeconds: 5,
	motd: '',
	passwordAuth: false,
	passwordAuthRequired: false,
	passwordUsers: {},
	parseRealIP: true,
	trustedProxies: ['127.0.0.1', '::1'],
	trustedHeaders: ['X-Forwarded-For'],
	nonWSResponse: 'meow',
	nonWSRedirect: '/pages/404.html',
	logLevel: 'warn',
	proxy: '',
	// Must fit one full inbound DATA frame: 5-byte Wisp header + tcpBufferSize
	// (wispurr's example config uses tcpBufferSize + 5). At exactly
	// tcpBufferSize a maximum-size frame is rejected as "message too large"
	// and the socket dies mid-transfer under heavy concurrent asset loads.
	maxMessageSize: 262149,
	staticDir: '',
	bandwidthLimitKbps: 0,
	connectionsLimitPerIP: 200,
	connectionWindowSeconds: 10,
	floodProtection: {
		enabled: true,
		maxConnectsPerSourceIPPerSecond: 500,
		maxConnectsPerDestPerSecond: 250,
		maxConnectsPerDestPerMinute: 6000,
		maxInFlightSyns: 4096,
		maxConcurrentStreamsPerConnection: 512,
		maxConcurrentConnections: 16384,
		synFloodSignature: {
			enabled: false,
			windowMs: 2000,
			minSamples: 128,
			failedHandshakeRatio: 0.75,
		},
		wsCloseAfterViolations: 64,
		logBlockedDials: false,
	},
	reputation: {
		enabled: false,
		storePath: './data/wispurr-reputation.json',
		saveIntervalSeconds: 30,
		scoreDecayPerHour: 1,
		evictAfterDays: 7,
		thresholds: {
			warn: 21,
			throttle: 51,
			strict: 81,
		},
		weights: {},
		destinationWeights: {},
	},
} satisfies wispurrOptions & Record<string, unknown>;

const { frameObfuscation, nonWSRedirect, ...wispOptions } = wispConfig;
if (frameObfuscation.enabled)
	throw new Error('This Wispurr version does not support frame obfuscation.');

export { nonWSRedirect, wispOptions };
