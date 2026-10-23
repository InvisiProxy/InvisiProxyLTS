import { existsSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { config } from '../config.ts';
import { notFoundFile, projectUrl, siteUrl } from '../constants.ts';

const isImage = /\.(?:ico|png|jpg|jpeg)$/;
const notFoundPage = new URL(notFoundFile, siteUrl);

const cached404 = new Map<string, { mtimeMs: number; body: string | Buffer }>();

// Pass a language code to get that translation of the 404 page, if it exists.
export function preloaded404(language = ''): string | Buffer {
	const page = language
		? new URL(`locales/${language}/${notFoundFile}`, siteUrl)
		: notFoundPage;
	const stat = statSync(page, { throwIfNoEntry: false });
	if (!stat) return language ? preloaded404() : 'Not Found';
	let cached = cached404.get(language);
	if (cached?.mtimeMs !== stat.mtimeMs) {
		const html = readFileSync(page, 'utf8');
		cached = {
			mtimeMs: stat.mtimeMs,
			body: config.disguiseFiles ? gzipSync(html) : html,
		};
		cached404.set(language, cached);
	}
	return cached.body;
}

export function tryReadFile(
	file: string | URL,
	baseUrl: string | URL = projectUrl,
	isBuffer = config.disguiseFiles
) {
	const location = new URL(file, baseUrl);
	if (!existsSync(location)) return preloaded404();
	return isImage.test(location.pathname) || isBuffer
		? readFileSync(location)
		: readFileSync(location, 'utf8');
}
