import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import send from 'send';
import { config, serverUrl } from '../config.ts';
import {
	disguiseExtension,
	entryPointFile,
	isDevelopment,
	siteDir,
	siteUrl,
} from '../constants.ts';
import { getPathAliases, getAltPrefix } from '../obfuscation/paths.ts';
import { preloaded404, tryReadFile } from './files.ts';
import { loadLanguages, pickLanguage } from './language.ts';
import { type ClientIp, createLinkDispenser } from './link-dispenser.ts';
import type { ExternalPages } from './links.ts';
import { loadRoutes } from './routes.ts';
import { nonWSRedirect, wispOptions, wispPath } from './wisp.ts';

export type SiteHandler = (req: IncomingMessage, res: ServerResponse) => void;

export interface SiteOptions {
	wispRedirect?: string;
	wispResponse?: string;
	clientIp?: ClientIp;
}

type Disguise = 'pass' | 'loader' | 'modified';

const securityHeaders: [string, string][] = [
	['Cross-Origin-Opener-Policy', 'same-origin'],
	['Cross-Origin-Resource-Policy', 'same-origin'],
	['Origin-Agent-Cluster', '?1'],
	['Referrer-Policy', 'no-referrer'],
	['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
	['X-Content-Type-Options', 'nosniff'],
	['X-DNS-Prefetch-Control', 'off'],
	['X-Download-Options', 'noopen'],
	['X-Frame-Options', 'SAMEORIGIN'],
	['X-Permitted-Cross-Domain-Policies', 'none'],
	['X-XSS-Protection', '0'],
];

const pageTypes: Record<string, string> = {
	default: config.disguiseFiles ? 'image/vnd.microsoft.icon' : 'text/html',
	html: 'text/html',
	txt: 'text/plain',
	xml: 'application/xml',
	ico: 'image/vnd.microsoft.icon',
};

const precompressedTypes: Record<string, string> = {
	js: 'application/javascript; charset=utf-8',
	mjs: 'application/javascript; charset=utf-8',
	wasm: 'application/wasm',
};
const encodings = [
	['br', '.br'],
	['gzip', '.gz'],
] as const;

const trimSlash = (path: string) =>
	path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

const decode = (path: string) => {
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
};

const extension = (file: string) => file.slice(file.lastIndexOf('.') + 1);

function reply(
	res: ServerResponse,
	status: number,
	type?: string,
	body?: string | Buffer
) {
	const payload = typeof body === 'string' ? Buffer.from(body) : body;
	res.statusCode = status;
	if (type) res.setHeader('Content-Type', type);
	res.setHeader('Content-Length', payload?.length ?? 0);
	res.end(payload);
}

function redirect(res: ServerResponse, location: string) {
	res.setHeader('Location', location);
	reply(res, 302);
}

function disguiseCheck(
	pages: Record<string, string>,
	externalPages: ExternalPages
): (url: string) => Disguise {
	if (!config.disguiseFiles) return () => 'pass';
	const base = serverUrl.pathname;
	const otherFile = new RegExp(
		`\\.(?!html$|${disguiseExtension}$)[\\w-]+$`,
		'i'
	);
	const exemptDirs = ['assets', 'scram', 'libcurl', 'epoxy', 'wisp'].map(
		(dir) => getAltPrefix(dir, base).slice(base.length, -1)
	);
	const exemptPages = ['', 'favicon.ico'];
	for (const [name, target] of Object.entries(externalPages))
		(typeof target === 'string' ? exemptPages : exemptDirs).push(name);
	exemptPages.push(...exemptDirs);

	return (url) => {
		let path: string;
		try {
			path = new URL(url, serverUrl).pathname.slice(base.length);
		} catch {
			return 'pass';
		}
		if (
			otherFile.test(path) ||
			exemptDirs.some((dir) => path.startsWith(`${dir}/`)) ||
			exemptPages.includes(path)
		)
			return 'pass';
		if (!path.endsWith(`.${disguiseExtension}`)) return 'loader';
		if (!Object.hasOwn(pages, path) && !path.endsWith('favicon.ico'))
			return 'modified';
		return 'pass';
	};
}

function applyResponseHooks(
	req: IncomingMessage,
	res: ServerResponse,
	development: boolean
) {
	for (const [name, value] of securityHeaders) res.setHeader(name, value);
	const historyHide = (req.headers.cookie || '')
		.split('; ')
		.find((cookie) => cookie.startsWith('HistoryHide='))
		?.split('=')[1];
	const hide =
		historyHide === 'true' && req.headers['sec-fetch-dest'] === 'document';
	if (!hide && !development) return;
	const writeHead = res.writeHead;
	res.writeHead = function (
		this: ServerResponse,
		statusCode: number,
		...args: unknown[]
	) {
		if (development) {
			for (const arg of args)
				if (arg && typeof arg === 'object' && !Array.isArray(arg))
					for (const key of Object.keys(arg))
						if (key.toLowerCase() === 'cache-control')
							delete (arg as Record<string, unknown>)[key];
			this.setHeader('Cache-Control', 'no-store');
		}
		return (writeHead as (...args: unknown[]) => ServerResponse).call(
			this,
			hide &&
				!(
					statusCode >= 300 &&
					statusCode < 400 &&
					this.hasHeader('Location')
				)
				? 404
				: statusCode,
			...args
		);
	} as typeof res.writeHead;
}

export function createSiteHandler({
	wispRedirect = nonWSRedirect,
	wispResponse = wispOptions.nonWSResponse,
	clientIp,
}: SiteOptions = {}): SiteHandler {
	const { pages, externalPages } = loadRoutes();
	const base = serverUrl.pathname;
	const baseRoute = trimSlash(base);
	const development = isDevelopment();
	const dispenserPath = `${base}api/link`;
	const dispense = createLinkDispenser(undefined, clientIp);
	const wispRoute = trimSlash(wispPath());
	const checkDisguise = disguiseCheck(pages, externalPages);
	const loaderPage = config.disguiseFiles
		? tryReadFile('pages/misc/deobf/loader.html', siteUrl, false)
		: '';
	const serviceWorkers = new Map(
		['sw.js', 'sw-blacklist.js'].map((file) => {
			const name = getPathAliases()[`files/${file}`] || file;
			return [base + name, name];
		})
	);

	const staticDirs = ['assets', 'scram', 'libcurl', 'epoxy'].map(
		(prefix) => ({
			prefix: getAltPrefix(prefix, base),
			root: join(siteDir, prefix),
			precompressed: prefix !== 'assets' && !development,
			vary: prefix !== 'assets',
		})
	);
	const pagesDir = {
		prefix: base,
		root: join(siteDir, 'pages'),
		precompressed: false,
		vary: false,
	};
	type StaticDir = typeof pagesDir;

	const languages = loadLanguages();
	const languageVary = config.geoLanguage
		? 'Cookie, Accept-Language, CF-IPCountry'
		: 'Cookie, Accept-Language';
	const prefixedLanguages = config.usingSEO
		? languages.codes.filter((code) => code !== languages.default)
		: [];
	const redirectToLanguage =
		prefixedLanguages.length > 0 && !config.disguiseFiles;
	const languageFor = (req: IncomingMessage) => {
		if (languages.codes.length < 2) return '';
		const useCountry =
			config.geoLanguage &&
			(!config.usingSEO || !!req.headers['accept-language']);
		const language = pickLanguage(req, languages, useCountry);
		return language === languages.default ? '' : language;
	};
	const translated = (file: string, language: string) => {
		const copy = `locales/${language}/${file}`;
		return language &&
			file.endsWith('.html') &&
			existsSync(new URL(copy, siteUrl))
			? copy
			: file;
	};

	const notFound = (res: ServerResponse, language: string) =>
		reply(res, 404, pageTypes.default, preloaded404(language));

	const undisguise = (path: string) =>
		path.slice(0, path.length - 1 - disguiseExtension.length);

	function servePage(
		req: IncomingMessage,
		res: ServerResponse,
		name: string,
		modified: boolean,
		language: string,
		fromPath: boolean
	) {
		if (name === 'favicon.ico') return reply(res, 200);

		if (Object.hasOwn(externalPages, name)) {
			if (modified || fromPath)
				return reply(res, 404, pageTypes.html, preloaded404(language));
			const target = externalPages[name];
			return redirect(
				res,
				typeof target === 'string' ? target : target.default
			);
		}

		if (!Object.hasOwn(pages, name)) return notFound(res, language);
		const file =
			!name && config.disguiseFiles && !modified
				? entryPointFile
				: pages[name];
		const type = modified
			? pageTypes[disguiseExtension]
			: pageTypes[extension(file)] || pageTypes.default;
		if (file === entryPointFile)
			return reply(res, 200, type, tryReadFile(file, siteUrl));
		if (fromPath && !file.endsWith('.html')) return notFound(res, language);
		if (!fromPath && languages.codes.length > 1)
			res.setHeader('Vary', languageVary);
		if (
			redirectToLanguage &&
			!fromPath &&
			language &&
			file.endsWith('.html')
		) {
			const url = req.url || '';
			const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
			return redirect(res, `${base}${language}/${name}${query}`);
		}
		reply(res, 200, type, tryReadFile(translated(file, language), siteUrl));
	}

	function serveStatic(
		req: IncomingMessage,
		res: ServerResponse,
		dir: StaticDir,
		file: string,
		language: string
	) {
		res.removeHeader('Content-Type');
		const type = precompressedTypes[extension(file)];
		const accepted = String(req.headers['accept-encoding'] || '');
		const candidates =
			dir.precompressed && type
				? encodings.filter(([name]) => accepted.includes(name))
				: [];
		const attempt = (index: number) => {
			const encoding = candidates[index];
			const stream = send(req, `/${file}${encoding ? encoding[1] : ''}`, {
				root: dir.root,
				index: false,
			});
			stream.on('headers', () => {
				if (type) res.setHeader('Content-Type', type);
				if (encoding) res.setHeader('Content-Encoding', encoding[0]);
				if (dir.vary) res.setHeader('Vary', 'Accept-Encoding');
			});
			stream.on('directory', () => notFound(res, language));
			stream.on('error', () =>
				index < candidates.length
					? attempt(index + 1)
					: notFound(res, language)
			);
			stream.pipe(res);
		};
		attempt(0);
	}

	return (req, res) => {
		applyResponseHooks(req, res, development);
		let url = req.url || '/';
		let path = trimSlash(url.split('?')[0].replace(/\/{2,}/g, '/'));
		// /fr/questions is the French copy of /questions.
		const prefix = prefixedLanguages.find(
			(code) => path === base + code || path.startsWith(`${base}${code}/`)
		);
		if (prefix) {
			const query = url.indexOf('?');
			path = trimSlash(
				base +
					path.slice(base.length + prefix.length).replace(/^\//, '')
			);
			url = path + (query < 0 ? '' : url.slice(query));
		}
		const language = prefix || languageFor(req);

		if (req.method === 'POST' && path === dispenserPath)
			return void dispense(req, res);

		if (path !== baseRoute && !path.startsWith(base))
			return reply(res, 404, 'text/plain', 'Not Found');

		const disguise = checkDisguise(url);
		if (disguise === 'loader')
			return reply(res, 200, pageTypes.html, loaderPage);
		const modified = disguise === 'modified';
		if (modified) {
			res.setHeader('Content-Type', pageTypes[disguiseExtension]);
			res.setHeader('Access-Control-Allow-Origin', 'null');
		}
		if (req.method !== 'GET' && req.method !== 'HEAD')
			return notFound(res, language);

		if (path === wispRoute)
			return wispRedirect
				? redirect(res, wispRedirect)
				: reply(res, 200, 'text/plain', wispResponse);

		const serviceWorker = serviceWorkers.get(path);
		if (serviceWorker !== undefined) {
			res.setHeader('Service-Worker-Allowed', base);
			return reply(
				res,
				200,
				'application/javascript',
				tryReadFile(serviceWorker, siteUrl)
			);
		}

		const relative = path === baseRoute ? '' : path.slice(base.length);
		if (!relative.includes('/')) {
			const name = decode(relative);
			return servePage(
				req,
				res,
				modified ? undisguise(name) : name,
				modified,
				language,
				!!prefix
			);
		}

		const github = /^github\/([^/]+)$/.exec(relative);
		if (github) {
			const name = decode(github[1]);
			return Object.hasOwn(externalPages.github, name)
				? redirect(res, externalPages.github[name])
				: notFound(res, language);
		}

		const dir =
			staticDirs.find((dir) => path.startsWith(dir.prefix)) || pagesDir;
		const file = path.slice(dir.prefix.length);
		serveStatic(
			req,
			res,
			dir,
			modified ? undisguise(file) : file,
			language
		);
	};
}
