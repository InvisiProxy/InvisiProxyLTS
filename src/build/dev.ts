import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import {
	createBuilder,
	type Plugin,
	type Rolldown,
	type ViteDevServer,
} from 'vite';
import { developmentEnv, siteDir } from '../constants.ts';
import { beginObfuscationBuild } from '../obfuscation/state.ts';
import { watchedEnvironments } from './plugin.ts';
import { type LoadRenderer, renderSite } from './render.ts';
import { buildValues } from './values.ts';

type HandlerModule = typeof import('../server/handler.ts');
type Middleware = (req: IncomingMessage, res: ServerResponse) => void;

const viteInternal = /\/(?:@vite\/|@id\/|@fs\/|__vite|node_modules\/)/;

function developmentHandler(server: ViteDevServer) {
	let loaded: HandlerModule | undefined;
	let handler: Middleware | undefined;
	let stale = true;
	return {
		refresh() {
			stale = true;
		},
		async get() {
			const site = (await server.ssrLoadModule(
				'/src/server/handler.ts'
			)) as HandlerModule;
			if (stale || site !== loaded || !handler) {
				loaded = site;
				handler = site.createSiteHandler();
				stale = false;
			}
			return handler;
		},
	};
}

async function writeDocuments(server: ViteDevServer) {
	const files = await renderSite({
		load: (() =>
			server.ssrLoadModule('/src/client/entry.tsx')) as LoadRenderer,
		fresh: true,
		head: `<script type="module" src="${server.config.base}@vite/client"></script>`,
	});
	for (const [path, content] of Object.entries(files)) {
		const target = join(siteDir, path);
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(`${target}.tmp`, content);
		renameSync(`${target}.tmp`, target);
	}
}

export function siteDevPlugin(): Plugin {
	let closing = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let renderNeeded = false;
	let started = 0;
	let reload = () => {};

	const schedule = (render: boolean) => {
		if (!timer) started = performance.now();
		renderNeeded ||= render;
		clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			reload();
		}, 25);
	};

	return {
		name: 'invisiproxy-site-dev',
		apply: 'serve',
		async configureServer(server) {
			process.env[developmentEnv] = '1';
			closing = false;
			clearTimeout(timer);
			timer = undefined;
			renderNeeded = false;
			beginObfuscationBuild();
			const startup = performance.now();
			const site = developmentHandler(server);
			const { logger } = server.config;

			let reloading = Promise.resolve();
			reload = () => {
				reloading = reloading.then(async () => {
					if (closing) return;
					try {
						if (renderNeeded) {
							renderNeeded = false;
							await writeDocuments(server);
						}
						site.refresh();
						server.ws.send({ type: 'full-reload', path: '*' });
						logger.info(
							`[dev] Reloaded in ${Math.round(performance.now() - started)}ms`
						);
					} catch (error) {
						logger.error(String(error));
						server.ws.send({
							type: 'error',
							err: {
								message: String(error),
								stack:
									error instanceof Error
										? error.stack || ''
										: '',
							},
						});
					}
				});
			};

			rmSync(siteDir, { force: true, recursive: true });
			let ready = false;
			const builder = await createBuilder({
				configLoader: server.config.inlineConfig.configLoader,
				logLevel: 'error',
				plugins: [
					{
						name: 'invisiproxy-dev-rebuilt',
						writeBundle() {
							if (ready)
								schedule(
									buildValues.inlineAssets &&
										this.environment.name !== 'client'
								);
						},
					},
				],
			});
			const watchers = (await Promise.all(
				watchedEnvironments().map((name) =>
					builder.build(builder.environments[name])
				)
			)) as Rolldown.RolldownWatcher[];
			await Promise.all(
				watchers.map(
					(watcher) =>
						new Promise<void>((resolve, reject) =>
							watcher.on('event', (event) => {
								if (event.code === 'END') resolve();
								else if (event.code === 'ERROR') {
									if (ready)
										logger.error(String(event.error));
									else reject(event.error);
								}
							})
						)
				)
			);
			await writeDocuments(server);
			ready = true;
			logger.info(
				`[dev] Rebuilt on startup in ${Math.round(performance.now() - startup)}ms`
			);

			server.middlewares.use((req, res, next) => {
				if (viteInternal.test(req.url || '')) return next();
				site.get().then((handler) => handler(req, res), next);
			});

			const root = server.config.root;
			const onChange = (event: string, file: string) => {
				const path = relative(root, file).replaceAll('\\', '/');
				if (
					path === 'config.json' ||
					(event !== 'change' &&
						/^(?:views\/(?!dist)|src\/(?:client|locales)\/)/.test(
							path
						))
				)
					void server.restart();
			};
			server.watcher.on('all', onChange);
			server.httpServer?.once('close', () => {
				closing = true;
				clearTimeout(timer);
				server.watcher.off('all', onChange);
				for (const watcher of watchers) void watcher.close();
			});
		},
		hotUpdate({ file }) {
			const path = relative(
				this.environment.config.root,
				file
			).replaceAll('\\', '/');
			if (path.startsWith('views/')) return [];
			if (path.startsWith('src/')) {
				schedule(/^src\/(?:client|locales)\//.test(path));
				return [];
			}
		},
	};
}
