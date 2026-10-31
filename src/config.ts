import { existsSync, readFileSync } from 'node:fs';
import type settings from '../config.json';
import { configFile, envFile } from './constants.ts';

// Server-only settings that stay out of the repo, such as proxy addresses.
// Variables already set in the environment win.
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const config: Readonly<typeof settings> = Object.freeze(
	JSON.parse(readFileSync(configFile, 'utf8'))
);

export const serverPort = Number(process.env.PORT ?? config.port);

export const dlpccEnabled = config.dlpcc === true;
if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65535)
	throw new Error('PORT must be an integer between 1 and 65535.');

export const serverUrl: Readonly<URL> = (() => {
	let url: URL;
	try {
		url = new URL(config.host);
	} catch {
		url = new URL('http://a');
		url.host = config.host;
	}
	url.port = String(serverPort);
	url.pathname = `${(config.pathname || '/').replace(/\/+$|[^\w/.-]+/g, '')}/`;
	return Object.freeze(url);
})();
