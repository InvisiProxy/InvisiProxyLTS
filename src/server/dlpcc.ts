import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import type { Relay } from 'dlpcc';
import { config, dlpccEnabled, serverUrl } from '../config.ts';
import { getAltPrefix } from '../obfuscation/paths.ts';
import type { SiteHandler } from './handler.ts';

const loopback = /^(?:::ffff:)?127\.|^::1$/;

// Behind NGINX every request arrives from loopback, so the visitor's address
// comes from X-Real-IP there; the relay's per-IP rate limit needs it.
export function visitorIp(req: IncomingMessage): string {
	const remote = req.socket.remoteAddress ?? '';
	const forwarded = req.headers['x-real-ip'];
	return loopback.test(remote) && typeof forwarded === 'string'
		? forwarded
		: remote;
}

export function publicHost(
	pattern = process.env.DLPCC_PUBLIC_HOST
): ((host: string) => string) | undefined {
	if (!pattern?.includes('*')) return undefined;
	return (host) =>
		isIP(host.replace(/^\[|\]$/g, ''))
			? host
			: pattern.replace('*', host.replace(/^www\./, ''));
}

const privateDefaults = {
	rateLimit: 600,
	rateLimitBurst: 100,
	maxAllocsPerUser: 32,
	maxAllocs: 4000,
};
const envName = (option: string) =>
	`DLPCC_${option.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`;
export function relayDefaults(env = process.env) {
	return Object.fromEntries(
		Object.entries(privateDefaults).map(([option, value]) => [
			option,
			env[envName(option)] ? undefined : value,
		])
	) as Partial<typeof privateDefaults>;
}

// Only servers with dlpcc on ever load the package or spawn the relay.
export async function startDlpcc(server: Server): Promise<Relay | null> {
	if (!dlpccEnabled) return null;
	const { createRelay } = await import('dlpcc');
	const relay = createRelay({
		...relayDefaults(),
		basePath: getAltPrefix('dlpcc', serverUrl.pathname).slice(0, -1),
		publicHost: publicHost(),
	});
	// With NGINX owning 443, its stream config hands TURN to the relay instead.
	const behindNginx =
		config.dlpccNginx === true || process.env.DLPCC_NGINX === 'true';
	if (!behindNginx) relay.attach(server);
	await relay.start();
	return relay;
}

export function withDlpcc(
	relay: () => Relay | null,
	site: SiteHandler
): SiteHandler {
	return (req: IncomingMessage, res: ServerResponse) => {
		const current = relay();
		if (current) {
			(req as IncomingMessage & { ip?: string }).ip = visitorIp(req);
			if (current.routeRequest(req, res)) return;
		}
		site(req, res);
	};
}
