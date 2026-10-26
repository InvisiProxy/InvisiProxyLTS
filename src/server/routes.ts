import { readFileSync } from 'node:fs';
import { routesFile, siteUrl } from '../constants.ts';
import { aliasRoutes } from '../obfuscation/paths.ts';
import { externalPages } from './links.ts';

export function loadRoutes() {
	let pages: Record<string, string>;
	try {
		pages = JSON.parse(readFileSync(new URL(routesFile, siteUrl), 'utf8'));
	} catch (cause) {
		throw new Error('The site has not been built yet; run `pnpm build`.', {
			cause,
		});
	}
	const { pages: servedPages, links } = aliasRoutes(pages, externalPages);
	return { pages: servedPages, externalPages: links };
}
