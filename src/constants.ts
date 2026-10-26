import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectUrl = new URL('../', import.meta.url);
export const projectDir = fileURLToPath(projectUrl);
export const configFile = new URL('config.json', projectUrl);
export const siteUrl = new URL('views/dist/', projectUrl);
export const siteDir = join(projectDir, 'views/dist');
export const stagingDir = join(projectDir, 'views/dist-new');
export const serverDir = join(projectDir, 'dist');
export const notFoundFile = 'not-found.html';
export const routesFile = 'routes.json';
export const localesFile = 'locales.json';
export const entryPointFile = 'pages/misc/deobf/entry-point.html';

export const developmentEnv = 'INVISIPROXY_VITE_DEV';
export const isDevelopment = () => process.env[developmentEnv] === '1';

export const obfuscatedMarker = '/* obfuscated */';
export const disguiseExtension = 'ico';

export const linkCooldownMs = 5000;
export const maxTrackedClients = 10000;
