import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config.ts';
import { linkCooldownMs, maxTrackedClients, projectDir } from '../constants.ts';

const linksFile = pathToFileURL(resolve(projectDir, config.mirrorLinksFile));

export type ClientIp = (req: IncomingMessage) => string | undefined;

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
	return text
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
}

export function createLinkDispenser(
	file: URL = linksFile,
	clientIp: ClientIp = (req) => req.socket.remoteAddress
) {
	const requests = new Map<string, number>();
	return async (req: IncomingMessage, res: ServerResponse) => {
		req.resume();
		const ip = clientIp(req) || '';
		const now = Date.now();
		const nextRequest = requests.get(ip) || 0;
		if (nextRequest > now)
			return json(
				res,
				429,
				{
					error: `Please wait ${linkCooldownMs / 1000} seconds before requesting another link.`,
				},
				{ 'Retry-After': Math.ceil((nextRequest - now) / 1000) }
			);
		for (const [client, expires] of requests)
			if (expires <= now) requests.delete(client);
		if (requests.size >= maxTrackedClients)
			return json(res, 503, { error: 'Please try again shortly.' });
		requests.set(ip, now + linkCooldownMs);

		try {
			const links = parseLinks(await readFile(file, 'utf8'));
			if (links.length)
				return json(res, 200, { link: links[randomInt(links.length)] });
		} catch {}
		return json(res, 503, {
			error: 'No mirror links are available right now. Please check back later.',
		});
	};
}
