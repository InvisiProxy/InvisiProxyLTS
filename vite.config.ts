import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { wispurrVite } from 'wispurr/vite';
import { siteDevPlugin } from './src/build/dev.ts';
import { siteBuildPlugin } from './src/build/plugin.ts';
import { serverPort, serverUrl } from './src/config.ts';
import { isWispRequest, wispOptions } from './src/server/wisp.ts';

export default defineConfig({
	base: serverUrl.pathname,
	publicDir: false,
	plugins: [
		siteBuildPlugin(),
		siteDevPlugin(),
		wispurrVite({
			path: (req: { url?: string | null }) => isWispRequest(req.url),
			config: wispOptions,
			apply: 'serve',
		}),
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
