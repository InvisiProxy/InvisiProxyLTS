import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import solid from 'vite-plugin-solid';
import { wispurrVite } from 'wispurr/vite';
import { siteDevPlugin } from './src/build/dev.ts';
import { siteBuildPlugin } from './src/build/plugin.ts';
import { serverPort, serverUrl } from './src/config.ts';
import { isWispRequest, wispOptions } from './src/server/wisp.ts';

// wispurr drives a Go worker binary that may be missing or built for another
// platform/libc (e.g. the published musl build on a glibc host). Probe that it
// can actually spawn; otherwise fall back to the pure-JS Wisp server so the
// proxy works without a working Go toolchain.
const require = createRequire(import.meta.url);
const wispurrWorker = join(
	dirname(require.resolve('wispurr/package.json')),
	'bin',
	`${platform()}-${process.arch}`,
	platform() === 'win32' ? 'wispurr.exe' : 'wispurr'
);
const canRunWispurr = (() => {
	try {
		return !spawnSync(wispurrWorker, ['--version'], {
			stdio: 'ignore',
			timeout: 5000,
		}).error;
	} catch {
		return false;
	}
})();

const wispPlugin = (): Plugin => {
	if (canRunWispurr)
		return wispurrVite({
			path: (req: { url?: string | null }) => isWispRequest(req.url),
			config: wispOptions,
			apply: 'serve',
		});
	return {
		name: 'invisiproxy-wisp-fallback',
		apply: 'serve',
		async configureServer(server) {
			const { server: wisp, logging } = await import(
				'@mercuryworkshop/wisp-js/server'
			);
			logging.set_level(logging.WARN);
			// Mirror the egress restrictions from src/server/wisp.ts.
			Object.assign(wisp.options, {
				wisp_version: 2,
				allow_udp_streams: false,
				allow_direct_ip: false,
				allow_private_ips: false,
				allow_loopback_ips: false,
				port_blacklist: wispOptions.blacklist.ports,
				dns_result_order: wispOptions.dnsResultOrder,
				parse_real_ip: wispOptions.parseRealIP,
				parse_real_ip_from: wispOptions.trustedProxies,
			});
			server.httpServer?.on('upgrade', (req, socket, head) => {
				if (isWispRequest(req.url)) wisp.routeRequest(req, socket, head);
			});
		},
	};
};

export default defineConfig({
	base: serverUrl.pathname,
	publicDir: false,
	plugins: [
		siteBuildPlugin(),
		siteDevPlugin(),
		wispPlugin(),
		solid({ ssr: true }),
	],
	server: {
		host: true,
		allowedHosts: true,
		port: serverPort,
		strictPort: true,
		hmr: { path: '@vite/hmr' },
		watch: {
			ignored: ['**/views/dist/**', '**/views/dist-new/**', '**/dist/**'],
		},
	},
});
