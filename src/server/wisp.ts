import type { IncomingMessage } from 'node:http';
import type { wispurrOptions } from 'wispurr';
import { config, serverUrl } from '../config.ts';
import { getAltPrefix } from '../obfuscation/paths.ts';

export const wispPath = () => getAltPrefix('wisp', serverUrl.pathname);

export const wispProxies = {
	tor: 'socks5h://127.0.0.1:9050',
	eu: 'socks5h://127.0.0.1:7000',
	jp: 'socks5h://127.0.0.1:7001',
	patreon: 'socks5h://127.0.0.1:7002',
} as const;
export type WispRegion = keyof typeof wispProxies;

export const wispRegions = (Object.keys(wispProxies) as WispRegion[]).filter(
	(region) => region !== 'patreon' || config.patreon === true
);

const isRegion = (name: string): name is WispRegion =>
	(wispRegions as string[]).includes(name);

export function fromOwnSite(req: IncomingMessage): boolean {
	const { origin, host } = req.headers;
	if (!origin) return true;
	try {
		return new URL(origin).hostname === new URL(`http://${host}`).hostname;
	} catch {
		return false;
	}
}

export function wispRegion(url: string | null | undefined): string | null {
	const path = (url ?? '').split(/[?#]/, 1)[0];
	const base = wispPath();
	if (path === base) return '';
	if (!path.startsWith(base)) return null;
	const region = path.slice(base.length).replace(/\/$/, '');
	return isRegion(region) ? region : null;
}
export const isWispRequest = (url: string | null | undefined) =>
	wispRegion(url) !== null;

const wispConfig = {
	port: 4432,
	host: '127.0.0.1',
	allowTCP: true,
	allowUDP: false,
	allowDirectIP: false,
	allowPrivateIPs: false,
	allowLoopbackIPs: true,
	tcpBufferSize: 1048576,
	socketBufferSize: 33554432,
	pendingQueueSize: 268435456,
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
	logLevel: 'none',
	proxy: '',
	maxMessageSize: 1048581,
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
		maxConcurrentStreamsPerConnection: 2048,
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
