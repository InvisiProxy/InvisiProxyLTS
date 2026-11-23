import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import { config, serverUrl } from '../config.ts';
import { getAltPrefix } from '../obfuscation/paths.ts';

export const wispPath = () => getAltPrefix('wisp', serverUrl.pathname);

// What a plain HTTP hit on a Wisp path gets when it reaches the site.
export const nonWSResponse = 'meow';
export const nonWSRedirect = '/pages/404.html';

export interface WispDns {
	method: 'lookup' | 'resolve';
	servers: string[];
}

const dnsSetting = () => {
	const setting = process.env.DNS ?? config.dns;
	return typeof setting === 'string' ? setting.trim() : '';
};

const isDnsAddress = (value: string) =>
	isIP(value) !== 0 ||
	/^[\da-z](?:[\da-z-]*[\da-z])?(?:\.[\da-z](?:[\da-z-]*[\da-z])?)+$/i.test(
		value
	);

// "resolve" (default) keeps finalwisp's own resolver, "lookup" uses the
// system's, and "nextdns:<id>" or a provider hostname is queried directly.
export function wispDns(setting: string = dnsSetting()): WispDns {
	const value = setting.toLowerCase();
	if (!value || value === 'resolve')
		return { method: 'resolve', servers: [] };
	if (value === 'lookup') return { method: 'lookup', servers: [] };
	const profile = /^nextdns:([\da-f]{6})$/.exec(value)?.[1];
	if (profile)
		return { method: 'resolve', servers: [`${profile}.dns.nextdns.io`] };
	if (/^nextdns:/i.test(value))
		throw new Error(
			`Invalid NextDNS profile in dns setting "${setting}"; expected nextdns:xxx.`
		);
	if (isDnsAddress(setting)) return { method: 'resolve', servers: [setting] };
	throw new Error(
		`Invalid dns setting "${setting}"; use "resolve", "lookup", "nextdns:<profile id>" or a provider hostname such as xxx.dns.nextdns.io.`
	);
}

// Destination policy; tests flip these to reach an in-process target.
export const finalwispPolicy = {
	directIp: false,
	loopbackIps: false,
	privateIps: false,
	ports: [80, 443],
} as const;

// Limits for every instance; see FINALWISP.md for the full translation.
export const finalwispLimits = {
	maxConns: 16384,
	maxStreamsPerConn: 2048,
	maxConnsPerIp: 200,
	connRatePerIp: '20/200',
	streamRatePerIp: 500,
	streamRatePerDest: '250/250',
	streamRatePerDestMinute: 6000,
	logLevel: 'error',
} as const;

// One instance per region ("" is the default); ports must match
// scripts/wisp-nginx.ts and finalwisp.config.cjs. socks5:// has finalwisp
// resolve and check the name itself; socks5h:// leaves that to the proxy,
// which Tor needs for .onion. Each port moves on its own env var, so several
// instances of the site can run their own on the same machine.
export interface FinalwispRegion {
	port: number;
	upstream: string | null;
	extra: string[];
}
export const finalwispRegions = {
	'': {
		port: Number(process.env.FINALWISP_PORT ?? 6001),
		upstream: null,
		extra: [],
	},
	tor: {
		port: Number(process.env.FINALWISP_TOR_PORT ?? 6002),
		upstream: 'socks5h://127.0.0.1:9050',
		extra: ['--connect-timeout', '30', '--dns-threads', '2'],
	},
	eu: {
		port: Number(process.env.FINALWISP_EU_PORT ?? 6003),
		upstream: 'socks5://127.0.0.1:7000',
		extra: ['--dns-threads', '4'],
	},
	jp: {
		port: Number(process.env.FINALWISP_JP_PORT ?? 6004),
		upstream: 'socks5://127.0.0.1:7001',
		extra: ['--dns-threads', '4'],
	},
	patreon: {
		port: Number(process.env.FINALWISP_PATREON_PORT ?? 6005),
		upstream: process.env.PATREON_PROXY || 'socks5://127.0.0.1:7002',
		extra: ['--dns-threads', '4'],
	},
} satisfies Record<string, FinalwispRegion>;
export type WispRegion = keyof typeof finalwispRegions;
export const finalwispRegionNames = () =>
	(Object.keys(finalwispRegions) as WispRegion[]).filter(
		(region) => region !== 'patreon' || config.patreon === true
	);

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
	return region in finalwispRegions ? region : null;
}
export const isWispRequest = (url: string | null | undefined) =>
	wispRegion(url) !== null;
