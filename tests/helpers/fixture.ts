import { fork, spawn } from 'node:child_process';
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

export async function fixture(
	t: TestContext,
	overrides: Partial<typeof settings> = {},
	full = false
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
	for (const file of ['src', 'package.json', 'vite.config.ts'])
		await cp(join(project, file), join(root, file), { recursive: true });
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
	if (full)
		await cp(join(project, 'views'), join(root, 'views'), {
			recursive: true,
			filter: (path) =>
				!['dist', 'dist-new', 'archive'].includes(basename(path)),
		});
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

export const buildFixture = (root: string) =>
	run(root, [
		'node_modules/vite/bin/vite.js',
		'build',
		'--configLoader',
		'native',
	]);

export async function startServer(root: string) {
	const port = await freePort();
	const server = fork(join(root, 'dist/server.js'), [], {
		cwd: root,
		env: { ...process.env, PORT: String(port), INVISIPROXY_VITE_DEV: '' },
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
