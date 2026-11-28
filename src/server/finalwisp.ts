import { spawn } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { type IncomingMessage, request } from 'node:http';
import { isIP, connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, delimiter, join } from 'node:path';
import {
	type FinalwispRegion,
	finalwispLimits,
	finalwispPolicy,
	finalwispRegions,
	finalwispRegionNames,
	wispDns,
} from './wisp.ts';

const pidDir = join(tmpdir(), 'invisiproxy-finalwisp');
const pidFile = join(pidDir, `${process.pid}.json`);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const backoff = (attempt: number) => Math.min(250 * 2 ** attempt, 15_000);

// FINALWISP_BIN, the install path, or a scan of PATH; null when missing.
export function finalwispBinary(): string | null {
	const candidates = [
		process.env.FINALWISP_BIN,
		'/usr/local/bin/finalwisp',
		...(process.env.PATH ?? '').split(delimiter),
	].filter((path): path is string => !!path);
	for (const dir of candidates) {
		const path = join(dir, 'finalwisp');
		try {
			if (existsSync(path) && !statSync(path).isDirectory()) return path;
		} catch {}
	}
	return null;
}

export const finalwispAvailable = () => finalwispBinary() !== null;

// --dns-server takes addresses; names are resolved here (finalwisp allows 3).
export async function resolveDnsServers(servers: string[]): Promise<string[]> {
	const addresses: string[] = [];
	for (const server of servers) {
		const host = server
			.replace(/^\[([\da-f:]+)\].*$/i, '$1')
			.replace(/:\d+$/, '');
		if (isIP(host) !== 0) {
			addresses.push(server);
			continue;
		}
		const found = await lookup(host, { all: true })
			.then((entries) => entries.map(({ address }) => address))
			.catch(() => []);
		if (!found.length)
			throw new Error(
				`Could not resolve the DNS server "${server}"; check the dns setting in config.json.`
			);
		addresses.push(...found);
	}
	return [...new Set(addresses)].slice(0, 3);
}

export async function finalwispArgs(
	region: string,
	{ realIpHeader = 'x-forwarded-for' } = {}
): Promise<string[]> {
	const instance = (finalwispRegions as Record<string, FinalwispRegion>)[
		region
	];
	if (!instance) throw new Error(`Unknown Wisp region "${region}".`);
	const { servers, method } = wispDns();
	const args = [
		'--host',
		'127.0.0.1',
		'--port',
		String(instance.port),
		'--preset',
		'public',
		'--trusted-proxy',
		'127.0.0.1',
		'--real-ip-header',
		realIpHeader,
	];
	// Tests flip these to reach an in-process target.
	if (!finalwispPolicy.directIp) args.push('--no-direct-ip');
	if (finalwispPolicy.loopbackIps) args.push('--allow-loopback');
	if (finalwispPolicy.privateIps) args.push('--allow-private');
	if (finalwispPolicy.ports.length)
		args.push('--allow-ports', finalwispPolicy.ports.join(','));
	args.push(
		'--max-conns',
		String(finalwispLimits.maxConns),
		'--max-streams-per-conn',
		String(finalwispLimits.maxStreamsPerConn),
		'--max-conns-per-ip',
		String(finalwispLimits.maxConnsPerIp),
		'--conn-rate-per-ip',
		finalwispLimits.connRatePerIp,
		'--stream-rate-per-ip',
		String(finalwispLimits.streamRatePerIp),
		'--stream-rate-per-dest',
		finalwispLimits.streamRatePerDest,
		'--stream-rate-per-dest-minute',
		String(finalwispLimits.streamRatePerDestMinute),
		'--log-level',
		finalwispLimits.logLevel
	);
	// `resolve` (the default) keeps finalwisp's own resolver; `lookup` goes
	// back to the system one, and configured servers are queried directly.
	if (servers.length)
		for (const address of await resolveDnsServers(servers))
			args.push('--dns-server', address);
	else if (method === 'lookup') args.push('--no-dns-own');
	if (instance.upstream) {
		args.push('--upstream', instance.upstream);
		if (instance.upstream.startsWith('socks5h://'))
			args.push('--upstream-trust-dns');
	}
	args.push(...instance.extra);
	return args;
}

const isAlive = (pid: number) => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === 'EPERM';
	}
};

const isWorker = (pid: number) => {
	try {
		const command = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
		return basename(command.split('\0')[0]) === 'finalwisp';
	} catch {
		return false;
	}
};

export function reapOrphanedWorkers() {
	let files: string[];
	try {
		files = readdirSync(pidDir);
	} catch {
		return;
	}
	for (const file of files) {
		const owner = Number.parseInt(file, 10);
		if (!Number.isInteger(owner) || owner === process.pid || isAlive(owner))
			continue;
		try {
			const pids: unknown = JSON.parse(
				readFileSync(join(pidDir, file), 'utf8')
			);
			if (Array.isArray(pids))
				for (const pid of pids)
					if (Number.isInteger(pid) && isWorker(pid))
						process.kill(pid, 'SIGKILL');
		} catch {}
		rmSync(join(pidDir, file), { force: true });
	}
}

export function recordWorkers(pids: number[]) {
	try {
		mkdirSync(pidDir, { recursive: true });
		writeFileSync(pidFile, JSON.stringify(pids));
	} catch {}
}

export function forgetWorkers() {
	rmSync(pidFile, { force: true });
}

// Managed mode (dev, tests and simple deployments); production runs the
// instances under pm2 behind nginx instead. See FINALWISP.md.
export class SupervisedFinalwisp {
	readonly started: Promise<boolean>;
	readonly port: number;
	private stopped = false;
	private live = false;
	private replacing = false;
	private attempt = 0;
	private startedAt = 0;
	private healthFailures = 0;
	private readonly name: string;
	private readonly args: string[];
	private readonly healthTimer: NodeJS.Timeout;
	private readonly onWorkersChanged: () => void;
	private process?: ReturnType<typeof spawn>;

	constructor(
		name: string,
		args: string[],
		port: number,
		onWorkersChanged: () => void = () => {}
	) {
		this.name = name;
		this.args = args;
		this.port = port;
		this.onWorkersChanged = onWorkersChanged;
		this.started = this.launch();
		this.healthTimer = setInterval(
			() => void this.checkHealth(),
			15_000
		).unref();
	}

	get isRunning() {
		return this.live && this.process?.exitCode === null;
	}

	get pids() {
		return this.process?.pid ? [this.process.pid] : [];
	}

	private async launch(): Promise<boolean> {
		const bin = finalwispBinary();
		if (!bin) {
			console.error(
				`finalwisp (${this.name}) is not installed; see FINALWISP.md.`
			);
			return false;
		}
		while (!this.stopped) {
			try {
				if (this.stopped) return false;
				const child = spawn(bin, this.args, { stdio: 'inherit' });
				this.process = child;
				this.startedAt = Date.now();
				this.healthFailures = 0;
				child.once('exit', () => {
					this.live = false;
				});
				child.once('close', () => this.restart());
				this.live = true;
				this.onWorkersChanged();
				return true;
			} catch (error) {
				console.error(
					`finalwisp (${this.name}) failed to start:`,
					error
				);
				await sleep(backoff(this.attempt++));
			}
		}
		return false;
	}

	private restart() {
		this.live = false;
		if (this.stopped) return;
		if (Date.now() - this.startedAt > 60_000) this.attempt = 0;
		if (!this.replacing)
			console.error(
				`finalwisp (${this.name}) stopped unexpectedly, restarting.`
			);
		this.replacing = false;
		this.onWorkersChanged();
		void sleep(backoff(this.attempt++)).then(() => this.launch());
	}

	private async checkHealth() {
		if (this.stopped || !this.process) return;
		const healthy = await new Promise<boolean>((resolve) => {
			const probe = request(
				{
					hostname: '127.0.0.1',
					port: this.port,
					path: '/',
					timeout: 3000,
				},
				(res) => {
					res.resume();
					resolve(res.statusCode === 200);
				}
			);
			probe.once('timeout', () => {
				probe.destroy();
				resolve(false);
			});
			probe.once('error', () => resolve(false));
			probe.end();
		});
		this.healthFailures = healthy ? 0 : this.healthFailures + 1;
		if (this.healthFailures >= 3 && this.isRunning) {
			console.error(
				`finalwisp (${this.name}) stopped responding, restarting.`
			);
			this.live = false;
			this.replacing = true;
			this.process.kill('SIGKILL');
		}
	}

	route(req: IncomingMessage, socket: Socket, head: Buffer) {
		if (this.isRunning) return this.pipe(req, socket, head);
		void this.routeWhenReady(req, socket, head);
	}

	private async routeWhenReady(
		req: IncomingMessage,
		socket: Socket,
		head: Buffer
	) {
		const deadline = Date.now() + 10_000;
		while (
			!this.isRunning &&
			!this.stopped &&
			!socket.destroyed &&
			Date.now() < deadline
		)
			await sleep(100);
		if (socket.destroyed) return;
		if (this.isRunning) return this.pipe(req, socket, head);
		socket.end(
			'HTTP/1.1 503 Service Unavailable\r\nRetry-After: 2\r\nConnection: close\r\n\r\n'
		);
	}

	private pipe(req: IncomingMessage, socket: Socket, head: Buffer) {
		// finalwisp serves Wisp on any path ending in "/". The instance only
		// sees this process, so the client's address is passed on.
		const lines = ['GET / HTTP/1.1\r\n'];
		for (let i = 0; i < req.rawHeaders.length; i += 2) {
			const name = req.rawHeaders[i];
			if (name.toLowerCase() === 'x-forwarded-for') continue;
			lines.push(`${name}: ${req.rawHeaders[i + 1]}\r\n`);
		}
		lines.push(
			`X-Forwarded-For: ${req.socket.remoteAddress ?? '127.0.0.1'}\r\n\r\n`
		);
		const upstream = connect(this.port, '127.0.0.1');
		upstream.once('connect', () => {
			upstream.write(lines.join(''));
			if (head.length) upstream.write(head);
			socket.pipe(upstream);
			upstream.pipe(socket);
		});
		upstream.once('error', () => socket.destroy());
		upstream.once('close', () => socket.destroy());
		socket.once('error', () => upstream.destroy());
		socket.once('close', () => upstream.destroy());
	}

	// Above finalwisp's 30 s drain so sessions can finish.
	async stop(graceMs = 32_000) {
		this.stopped = true;
		this.live = false;
		clearInterval(this.healthTimer);
		const child = this.process;
		if (!child || child.exitCode !== null || child.signalCode !== null)
			return;
		const exit = new Promise((resolve) => child.once('exit', resolve));
		let timer: NodeJS.Timeout | undefined;
		const grace = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, graceMs);
		});
		child.kill('SIGINT');
		try {
			await Promise.race([exit, grace]);
		} finally {
			clearTimeout(timer);
			if (child.exitCode === null && child.signalCode === null)
				child.kill('SIGKILL');
		}
	}

	kill() {
		this.stopped = true;
		this.live = false;
		clearInterval(this.healthTimer);
		this.process?.kill('SIGKILL');
	}
}

export type FinalwispInstances = Map<string, SupervisedFinalwisp>;

// One instance per region; an empty map (after a warning) without the binary.
export async function startFinalwispInstances(): Promise<FinalwispInstances> {
	if (!finalwispAvailable()) {
		console.error(
			'finalwisp is not installed; the proxy cannot open connections. Install it (see FINALWISP.md) or set manageWisp to false and route Wisp with nginx.'
		);
		return new Map();
	}
	reapOrphanedWorkers();
	const instances: FinalwispInstances = new Map();
	const recordAll = () =>
		recordWorkers(
			[...instances.values()].flatMap((instance) => instance.pids)
		);
	for (const region of finalwispRegionNames()) {
		const settings = finalwispRegions[region];
		if (!settings) continue;
		instances.set(
			region,
			new SupervisedFinalwisp(
				region || 'default',
				await finalwispArgs(region),
				settings.port,
				recordAll
			)
		);
	}
	recordAll();
	return instances;
}

export async function stopFinalwispInstances(instances: FinalwispInstances) {
	forgetWorkers();
	await Promise.all([...instances.values()].map((wisp) => wisp.stop()));
}
