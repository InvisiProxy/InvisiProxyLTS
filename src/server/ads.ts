import type { IncomingMessage } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config.ts';
import { projectDir } from '../constants.ts';

const defaultFile = pathToFileURL(
	resolve(projectDir, config.adsFile || 'private/ads.json')
);

export const placements = ['rail', 'banner', 'mobile', 'loader'] as const;
type Placement = (typeof placements)[number];

interface UnitConfig {
	provider: 'adsterra' | 'adcash' | 'html';
	key?: string;
	zone?: string;
	src?: string;
	html?: string;
	width?: number;
	height?: number;
	weight?: number;
}

interface ScriptConfig {
	provider?: string;
	src?: string;
	attributes?: Record<string, string>;
	code?: string;
	run?: string;
	zone?: string;
	frame?: boolean;
	group?: string;
	weight?: number;
}

interface SiteConfig {
	hosts?: string[];
	meta?: Record<string, string>;
	adsTxt?: string[];
	files?: Record<string, string>;
	units?: Partial<Record<Placement, UnitConfig[]>>;
	scripts?: ScriptConfig[];
}

interface AdsConfig {
	defaults?: SiteConfig;
	sites?: Record<string, SiteConfig>;
}

// What the browser receives: every network's banner is reduced to a
// ready-made document for a sized iframe. Networks are sent as an index into
// ClientAds.shares so their names stay out of the response.
export interface ClientUnit {
	html: string;
	width: number;
	height: number;
	network: number;
	weight?: number;
}

export interface ClientScript {
	src?: string;
	attributes?: Record<string, string>;
	code?: string;
	wait?: boolean;
	frame: boolean;
	// Scripts in a group take turns: each page view runs the entries of one
	// pick, chosen by weight. An Adcash run and its library share a pick.
	group?: string;
	pick?: number;
	weight?: number;
}

export interface ClientAds {
	// Each page view fills its banners from one network, picked by share.
	shares: number[];
	units: Partial<Record<Placement, ClientUnit[]>>;
	scripts: ClientScript[];
}

export interface SiteAds {
	head: string;
	adsTxt?: string;
	files: Record<string, string>;
	client: ClientAds;
}

const token = /^[\w-]+$/;
const adcashRuns: Record<string, string> = {
	autoTag: 'runAutoTag',
	pop: 'runPop',
	interstitial: 'runInterstitial',
	inPagePush: 'runInPagePush',
};
const aclib = 'https://acscdn.com/script/aclib.js';
// Blocked or failed, aclib leaves window.aclib as its own <script id="aclib">.
const runAclib = (method: string, zone: string) =>
	`if(typeof aclib.${method}==='function')aclib.${method}(${jsonScript({ zoneId: zone })});`;

const escapeAttribute = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;');

const jsonScript = (value: unknown) =>
	JSON.stringify(value).replace(/</g, '\\u003c');

function httpsUrl(value: unknown) {
	if (typeof value !== 'string') return;
	try {
		const url = new URL(value.startsWith('//') ? `https:${value}` : value);
		return url.protocol === 'https:' ? url.href : undefined;
	} catch {
		return;
	}
}

const size = (value: unknown) =>
	Number.isInteger(value) && (value as number) > 0 && (value as number) < 2000
		? (value as number)
		: undefined;

const frameDocument = (body: string) =>
	`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>${body}</body></html>`;

function clientUnit(
	unit: UnitConfig,
	warn: (message: string) => void
): Omit<ClientUnit, 'network' | 'weight'> | undefined {
	const skip = (message: string) => {
		warn(message);
		return undefined;
	};
	const width = size(unit.width);
	const height = size(unit.height);
	switch (unit?.provider) {
		case 'adsterra': {
			if (!token.test(unit.key ?? '') || !width || !height)
				return skip('Adsterra units need "key", "width" and "height".');
			const src =
				httpsUrl(unit.src) ??
				`https://www.highperformanceformat.com/${unit.key}/invoke.js`;
			return {
				width,
				height,
				html: frameDocument(
					`<script>atOptions=${jsonScript({ key: unit.key, format: 'iframe', height, width, params: {} })};</script><script src="${escapeAttribute(src)}"></script>`
				),
			};
		}
		case 'adcash':
			if (!token.test(unit.zone ?? '') || !width || !height)
				return skip('Adcash units need "zone", "width" and "height".');
			return {
				width,
				height,
				html: frameDocument(
					`<script id="aclib" src="${aclib}"></script><script>${runAclib('runBanner', unit.zone as string)}</script>`
				),
			};
		case 'html':
			if (typeof unit.html !== 'string' || !width || !height)
				return skip('HTML units need "html", "width" and "height".');
			return {
				width,
				height,
				html: frameDocument(unit.html),
			};
		default:
			return skip(`Unknown unit provider "${unit?.provider}".`);
	}
}

// Adcash pays the least, so it gets the smaller share of page views, both
// for banners and for grouped scripts without a weight of their own.
const providerShare = (provider?: string) => (provider === 'adcash' ? 1 : 2);

function clientScripts(
	scripts: ScriptConfig[],
	warn: (message: string) => void
): ClientScript[] {
	const result: ClientScript[] = [];
	for (const [pick, script] of scripts.entries()) {
		const frame = script.frame === true;
		const rotation: Pick<ClientScript, 'group' | 'pick' | 'weight'> = {};
		if (script.group !== undefined) {
			if (!token.test(script.group))
				warn('Script groups may only use letters, digits, _ and -.');
			else {
				rotation.group = script.group;
				rotation.pick = pick;
				rotation.weight =
					typeof script.weight === 'number' && script.weight > 0
						? script.weight
						: providerShare(script.provider);
			}
		}
		if (script.provider === 'adcash' && script.run) {
			const method = adcashRuns[script.run];
			if (!method || !token.test(script.zone ?? '')) {
				warn(
					`Adcash scripts need "zone" and a "run" of ${Object.keys(adcashRuns).join(', ')}.`
				);
				continue;
			}
			// Every run brings the library along so it can be picked on its
			// own; the browser still loads the library only once.
			result.push(
				{
					src: aclib,
					attributes: { id: 'aclib' },
					wait: true,
					frame,
					...rotation,
				},
				{
					code: runAclib(method, script.zone as string),
					frame,
					...rotation,
				}
			);
			continue;
		}
		if (typeof script.code === 'string') {
			result.push({ code: script.code, frame, ...rotation });
			continue;
		}
		const src = httpsUrl(script.src);
		if (!src) {
			warn(
				'Scripts need an https "src", inline "code" or an Adcash "run".'
			);
			continue;
		}
		const attributes = Object.fromEntries(
			Object.entries(script.attributes ?? {}).filter(
				([name, value]) =>
					token.test(name) &&
					!/^on/i.test(name) &&
					!['src', 'type'].includes(name.toLowerCase()) &&
					typeof value === 'string'
			)
		);
		result.push({ src, attributes, frame, ...rotation });
	}
	return result;
}

function siteAds(site: SiteConfig, warn: (message: string) => void): SiteAds {
	const head = Object.entries(site.meta ?? {})
		.filter(
			([name, value]) => token.test(name) && typeof value === 'string'
		)
		.map(
			([name, value]) =>
				`<meta name="${name}" content="${escapeAttribute(value)}">`
		)
		.join('');
	const units: ClientAds['units'] = {};
	const networks: string[] = [];
	for (const placement of placements) {
		const list: ClientUnit[] = [];
		for (const unit of site.units?.[placement] ?? []) {
			const result = clientUnit(unit, (message) =>
				warn(`${placement}: ${message}`)
			);
			if (!result) continue;
			if (!networks.includes(unit.provider)) networks.push(unit.provider);
			list.push({
				...result,
				network: networks.indexOf(unit.provider),
				// Weights choose between one network's units in a placement.
				...(typeof unit.weight === 'number' &&
					unit.weight > 0 && { weight: unit.weight }),
			});
		}
		if (list.length) units[placement] = list;
	}
	const files = Object.fromEntries(
		Object.entries(site.files ?? {}).filter(
			([path, body]) =>
				/^\/[\w.-]+(?:\/[\w.-]+)*$/.test(path) &&
				!path.includes('..') &&
				typeof body === 'string'
		)
	);
	return {
		head,
		adsTxt: site.adsTxt?.length ? `${site.adsTxt.join('\n')}\n` : undefined,
		files,
		client: {
			shares: networks.map(providerShare),
			units,
			scripts: clientScripts(site.scripts ?? [], warn),
		},
	};
}

export function hostName(header: string | undefined) {
	return (header ?? '')
		.trim()
		.toLowerCase()
		.replace(/:\d+$/, '')
		.replace(/\.$/, '');
}

interface Lookup {
	exact: Map<string, SiteAds>;
	wildcard: [suffix: string, ads: SiteAds][];
	fallback?: SiteAds;
}

// A site's own settings win over the defaults: maps merge key by key, while
// lists such as a placement's units or the scripts replace the default list.
function inherit(defaults: SiteConfig, site: SiteConfig): SiteConfig {
	return {
		...defaults,
		...site,
		meta: { ...defaults.meta, ...site.meta },
		files: { ...defaults.files, ...site.files },
		units: { ...defaults.units, ...site.units },
	};
}

function buildLookup(text: string): Lookup {
	const { defaults = {}, sites = {} } = JSON.parse(text) as AdsConfig;
	const lookup: Lookup = { exact: new Map(), wildcard: [] };
	for (const [domain, own] of Object.entries(sites)) {
		const warn = (message: string) =>
			console.warn(`[Ads] ${domain}: ${message}`);
		const site = inherit(defaults, own);
		const ads = siteAds(site, warn);
		if (domain === '*') {
			lookup.fallback = ads;
			continue;
		}
		const apex = hostName(domain);
		for (const host of site.hosts ?? ['@', 'www']) {
			const label = host.trim().toLowerCase().replace(/\.$/, '');
			if (label === '*') lookup.wildcard.push([`.${apex}`, ads]);
			else
				lookup.exact.set(
					label === '@' ? apex : `${label}.${apex}`,
					ads
				);
		}
	}
	return lookup;
}

// Ads are looked up by the Host header so one server can run many domains.
// Edits to the file are picked up without a restart.
export function createAds(file: URL | string = defaultFile) {
	let cached: { version: string; lookup: Lookup } | undefined;
	const empty: Lookup = { exact: new Map(), wildcard: [] };
	function lookup() {
		const stat = statSync(file, { throwIfNoEntry: false });
		if (!stat) return empty;
		const version = `${stat.mtimeMs}:${stat.size}`;
		if (cached?.version === version) return cached.lookup;
		try {
			cached = {
				version,
				lookup: buildLookup(readFileSync(file, 'utf8')),
			};
		} catch (error) {
			console.warn(`[Ads] Could not read ${file}: ${error}`);
			cached = { version, lookup: cached?.lookup ?? empty };
		}
		return cached.lookup;
	}
	return (req: IncomingMessage): SiteAds | undefined => {
		const { exact, wildcard, fallback } = lookup();
		const host = hostName(req.headers.host);
		return (
			exact.get(host) ??
			wildcard.find(([suffix]) => host.endsWith(suffix))?.[1] ??
			fallback
		);
	};
}

// Verification meta tags only reach documents sent as plain HTML; disguised
// pages are gzipped, but the entry point every visitor lands on is not.
export function withHead<T extends string | Buffer>(body: T, head: string): T {
	if (!head) return body;
	if (Buffer.isBuffer(body) && body[0] === 0x1f && body[1] === 0x8b)
		return body;
	const html = body.toString();
	const match = /<head>(?:<meta charset="utf-8">)?/i.exec(html);
	if (!match) return body;
	const end = match.index + match[0].length;
	const result = html.slice(0, end) + head + html.slice(end);
	return (Buffer.isBuffer(body) ? Buffer.from(result) : result) as T;
}
