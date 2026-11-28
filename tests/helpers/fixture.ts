import { fork, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import {
	cp,
	mkdtemp,
	mkdir,
	readFile,
	realpath,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import type settings from '../../config.json';

export const project = fileURLToPath(new URL('../../', import.meta.url));
const shutdowns = new Map<string, (() => Promise<unknown>)[]>();

export const probe = (name: string) =>
	fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

export const browserSettings = {
	usingSEO: false,
	disguiseFiles: true,
	pathname: '/school/',
} as const;

export const wispPolicyEnv = (targetPort: number) => ({
	WISP_DIRECT_IP: 'true',
	WISP_LOOPBACK_IPS: 'true',
	WISP_PRIVATE_IPS: 'true',
	WISP_PORTS: `${targetPort},80,443`,
});

export async function fixture(
	t: TestContext,
	overrides: Partial<typeof settings> = {}
) {
	const root = await realpath(
		await mkdtemp(join(tmpdir(), 'invisiproxy-test-'))
	);
	shutdowns.set(root, []);
	t.after(async () => {
		for (const shutdown of shutdowns.get(root) ?? []) await shutdown();
		shutdowns.delete(root);
		await rm(root, { recursive: true, force: true, maxRetries: 5 });
	});
	for (const file of [
		'src',
		'locales',
		'package.json',
		'vite.config.ts',
		'vendor',
	])
		await cp(join(project, file), join(root, file), { recursive: true });
	await cp(join(project, 'views'), join(root, 'views'), {
		recursive: true,
		filter: (path) =>
			!['dist', 'dist-new', 'archive'].includes(basename(path)),
	});
	await symlink(
		join(project, 'node_modules'),
		join(root, 'node_modules'),
		'junction'
	);
	const config = {
		...JSON.parse(await readFile(join(project, 'config.json'), 'utf8')),
		verbose: false,
		mirrorLinksFile: 'private/test-links.txt',
		...overrides,
	};
	await writeFile(join(root, 'config.json'), JSON.stringify(config));
	await mkdir(join(root, 'private'));
	await writeFile(
		join(root, 'private/test-links.txt'),
		'# PRIVATE_TEST_MARKER\nhttps://first.example/\nhttps://second.example/\n'
	);
	return root;
}

export async function freePort() {
	const server = createServer();
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const { port } = server.address() as AddressInfo;
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve()))
	);
	return port;
}

export async function run(
	root: string,
	args: string[],
	env: NodeJS.ProcessEnv = {},
	timeout = 600_000
) {
	const childEnv: NodeJS.ProcessEnv = {
		...process.env,
		PORT: String(await freePort()),
		INVISIPROXY_VITE_DEV: '',
		...env,
	};
	delete childEnv.NODE_TEST_CONTEXT;
	return new Promise<string>((resolve, reject) => {
		const child = spawn(process.execPath, args, {
			cwd: root,
			env: childEnv,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let output = '';
		const timer = setTimeout(() => child.kill(), timeout);
		child.stdout.on('data', (data) => (output += data));
		child.stderr.on('data', (data) => (output += data));
		child.once('error', reject);
		child.once('exit', (code, signal) => {
			clearTimeout(timer);
			if (code === 0) resolve(output);
			else
				reject(
					new Error(
						`Command failed (${code ?? signal}): ${output.slice(-8000)}`
					)
				);
		});
	});
}

const buildCache = new Map<string, string>();
process.on('exit', () => {
	for (const dir of buildCache.values())
		rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

export async function buildFixture(root: string) {
	const config = await readFile(join(root, 'config.json'), 'utf8');
	const cached = buildCache.get(config);
	if (cached) {
		await rm(join(root, 'dist'), { recursive: true, force: true });
		await rm(join(root, 'views/dist'), { recursive: true, force: true });
		await cp(join(cached, 'dist'), join(root, 'dist'), { recursive: true });
		await cp(join(cached, 'views/dist'), join(root, 'views/dist'), {
			recursive: true,
		});
		return;
	}
	await run(root, [
		'node_modules/vite/bin/vite.js',
		'build',
		'--configLoader',
		'native',
	]);
	const dir = await mkdtemp(join(tmpdir(), 'invisiproxy-build-'));
	buildCache.set(config, dir);
	await cp(join(root, 'dist'), join(dir, 'dist'), { recursive: true });
	await cp(join(root, 'views/dist'), join(dir, 'views/dist'), {
		recursive: true,
	});
}

export async function startServer(
	root: string,
	env: Record<string, string> = {}
) {
	const port = await freePort();
	const server = fork(join(root, 'dist/server.js'), [], {
		cwd: root,
		env: {
			...process.env,
			...env,
			PORT: String(port),
			INVISIPROXY_VITE_DEV: '',
		},
		stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
	});
	const exited = new Promise((resolve) => server.once('exit', resolve));
	shutdowns.get(root)?.push(() => {
		const timer = setTimeout(() => server.kill('SIGKILL'), 10_000);
		server.kill('SIGTERM');
		return exited.finally(() => clearTimeout(timer));
	});
	await new Promise((resolve, reject) => {
		server.once('message', resolve);
		server.once('exit', (code) =>
			reject(new Error(`Server exited early (${code})`))
		);
	});
	return `http://127.0.0.1:${port}`;
}
