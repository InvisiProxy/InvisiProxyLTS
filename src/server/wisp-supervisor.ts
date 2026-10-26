import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { type IncomingMessage, request } from 'node:http';
import type { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { wispurr, type wispurrOptions } from 'wispurr';
import { binPath } from 'wispurr/dist/path.js';

const pidDir = join(tmpdir(), 'invisiproxy-wisp');
const pidFile = join(pidDir, `${process.pid}.json`);
const workerName = basename(binPath);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const backoff = (attempt: number) => Math.min(250 * 2 ** attempt, 15_000);

let starting: Promise<unknown> = Promise.resolve();
const serially = <T>(task: () => Promise<T>) => {
	const result = starting.then(task, task);
	starting = result.catch(() => {});
	return result;
};

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
		return basename(command.split('\0')[0]) === workerName;
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

export class SupervisedWisp {
	private readonly name: string;
	private readonly wisp: wispurr;
	private readonly onWorkersChanged: () => void;
	private readonly healthTimer: NodeJS.Timeout;
	private stopped = false;
	private live = false;
	private replacing = false;
	private attempt = 0;
	private startedAt = 0;
	private healthFailures = 0;
	readonly started: Promise<boolean>;

	constructor(
		name: string,
		options: wispurrOptions,
		onWorkersChanged: () => void = () => {}
	) {
		this.name = name;
		this.wisp = new wispurr(options);
		this.onWorkersChanged = onWorkersChanged;
		this.started = this.launch();
		this.healthTimer = setInterval(
			() => void this.checkHealth(),
			15_000
		).unref();
	}

	get isRunning() {
		return this.live && this.wisp.isRunning;
	}

	get pids() {
		return (this.wisp.processes ?? [])
			.map(({ process }) => process.pid)
			.filter((pid): pid is number => pid !== undefined);
	}

	private async launch(): Promise<boolean> {
		while (!this.stopped) {
			try {
				await serially(() => this.wisp.start(1));
				if (this.stopped) {
					this.wisp.kill();
					return false;
				}
				this.startedAt = Date.now();
				this.healthFailures = 0;
				for (const { process } of this.wisp.processes ?? []) {
					process.once('exit', () => {
						this.live = false;
					});
					process.once('close', () => this.restart());
				}
				this.live = true;
				this.onWorkersChanged();
				return true;
			} catch (error) {
				console.error(`Wisp (${this.name}) failed to start:`, error);
				if (this.wisp.isRunning) this.wisp.kill();
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
				`Wisp (${this.name}) stopped unexpectedly, restarting.`
			);
		this.replacing = false;
		this.onWorkersChanged();
		void sleep(backoff(this.attempt++)).then(() => this.launch());
	}

	private async checkHealth() {
		const port = this.wisp.ports[0];
		if (this.stopped || port === undefined) return;
		const healthy = await new Promise<boolean>((resolve) => {
			const probe = request(
				{ hostname: '127.0.0.1', port, path: '/health', timeout: 3000 },
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
		if (this.healthFailures >= 3 && this.wisp.isRunning) {
			console.error(
				`Wisp (${this.name}) stopped responding, restarting.`
			);
			this.live = false;
			this.replacing = true;
			this.wisp.kill();
		}
	}

	route(req: IncomingMessage, socket: Socket, head: Buffer) {
		if (this.isRunning) return this.wisp.route(req, socket, head);
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
		if (this.isRunning) return this.wisp.route(req, socket, head);
		socket.end(
			'HTTP/1.1 503 Service Unavailable\r\nRetry-After: 2\r\nConnection: close\r\n\r\n'
		);
	}

	async stop(graceMs = 2000) {
		this.stopped = true;
		this.live = false;
		clearInterval(this.healthTimer);
		if (this.wisp.isRunning) await this.wisp.stop(graceMs);
	}

	kill() {
		this.stopped = true;
		this.live = false;
		clearInterval(this.healthTimer);
		if (this.wisp.isRunning) this.wisp.kill();
	}
}
