import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { isIPv4, isIPv6 } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config.ts';
import {
	linkCooldownMs,
	linkRotationMs,
	maxTrackedClients,
	projectDir,
} from '../constants.ts';

const linksFile = pathToFileURL(resolve(projectDir, config.mirrorLinksFile));
const loopback = /^(?:::ffff:)?127\.|^::1$/;

export type ClientIp = (req: IncomingMessage) => string | undefined;

// A reverse proxy on the same host makes every request arrive from loopback,
// so only then is its X-Real-IP header the visitor's address.
export const defaultClientIp: ClientIp = (req) => {
	const remote = req.socket.remoteAddress ?? '';
	const forwarded = req.headers['x-real-ip'];
	return loopback.test(remote) && typeof forwarded === 'string'
		? forwarded.trim()
		: remote;
};

function json(
	res: ServerResponse,
	status: number,
	body: unknown,
	headers: Record<string, string | number> = {}
) {
	const payload = Buffer.from(JSON.stringify(body));
	res.writeHead(status, {
		'Cache-Control': 'no-store',
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': payload.length,
		...headers,
	});
	res.end(payload);
}

function parseLinks(text: string) {
	const links = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'))
		.flatMap((line) => {
			try {
				const url = new URL(line);
				return ['https:', 'http:'].includes(url.protocol) &&
					!url.username &&
					!url.password
					? [url.href]
					: [];
			} catch {
				return [];
			}
		});
	return [...new Set(links)];
}

const ipv4Groups = (ip: string) => {
	const [a, b, c, d] = ip.split('.').map(Number);
	return [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)];
};

function ipv6Groups(ip: string) {
	const split = (half: string) =>
		half
			? half
					.split(':')
					.flatMap((group) =>
						group.includes('.') ? ipv4Groups(group) : [group]
					)
			: [];
	const [head, tail] = ip.split('::');
	const left = split(head);
	const right = tail === undefined ? [] : split(tail);
	const gap = tail === undefined ? 0 : 8 - left.length - right.length;
	return [...left, ...Array(gap).fill('0'), ...right].map((group) =>
		Number.parseInt(group, 16).toString(16)
	);
}

// `client` is who the cooldown applies to; `area` is the wider network that
// shares one assigned link, so rotating addresses inside an ISP allocation
// (an IPv6 /32 or an IPv4 /16) never reveals a second mirror.
export function clientKeys(address: string) {
	const ip = address.replace(/%.*$/, '').replace(/^::ffff:(?=[\d.]+$)/i, '');
	if (isIPv4(ip))
		return { client: ip, area: ip.split('.').slice(0, 2).join('.') };
	if (isIPv6(ip)) {
		const groups = ipv6Groups(ip);
		return {
			client: `${groups.slice(0, 4).join(':')}::/64`,
			area: `${groups.slice(0, 2).join(':')}::/32`,
		};
	}
	return { client: ip, area: ip };
}

// Rendezvous hashing: removing a dead link only moves the areas that had it.
function assignedLink(
	links: string[],
	area: string,
	epoch: number,
	key: Buffer
) {
	let best = links[0];
	let bestScore: Buffer | undefined;
	for (const link of links) {
		const score = createHmac('sha256', key)
			.update(`${epoch}\n${area}\n${link}`)
			.digest();
		if (!bestScore || Buffer.compare(score, bestScore) > 0) {
			best = link;
			bestScore = score;
		}
	}
	return best;
}

export interface DispenserOptions {
	maxClients?: number;
}

export function createLinkDispenser(
	file: URL = linksFile,
	clientIp: ClientIp = defaultClientIp,
	{ maxClients = maxTrackedClients }: DispenserOptions = {}
) {
	// Per process, so the assignments can't be computed from the source.
	const key = randomBytes(32);
	// Ordered oldest first: every request re-inserts its client.
	const requests = new Map<string, number>();
	let cached: { mtimeMs: number; size: number; links: string[] } | undefined;

	async function loadLinks() {
		const { mtimeMs, size } = await stat(file);
		if (cached?.mtimeMs !== mtimeMs || cached.size !== size)
			cached = {
				mtimeMs,
				size,
				links: parseLinks(await readFile(file, 'utf8')),
			};
		return cached.links;
	}

	return async (req: IncomingMessage, res: ServerResponse) => {
		req.resume();
		const { client, area } = clientKeys(clientIp(req) || '');
		const now = Date.now();
		const nextRequest = requests.get(client) || 0;
		if (nextRequest > now)
			return json(
				res,
				429,
				{
					error: `Please wait ${linkCooldownMs / 1000} seconds and try again.`,
				},
				{ 'Retry-After': Math.ceil((nextRequest - now) / 1000) }
			);
		// Evicting the oldest clients when full keeps a flood of fresh
		// addresses from locking everyone else out.
		for (const [tracked, expires] of requests) {
			if (expires > now && requests.size < maxClients) break;
			requests.delete(tracked);
		}
		requests.delete(client);
		requests.set(client, now + linkCooldownMs);

		try {
			const links = await loadLinks();
			if (links.length)
				return json(res, 200, {
					link: assignedLink(
						links,
						area,
						Math.floor(now / linkRotationMs),
						key
					),
				});
		} catch {}
		return json(res, 503, {
			error: 'No mirror links are available right now. Please check back later.',
		});
	};
}
