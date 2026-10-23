import { renderToString } from 'solid-js/web';
import { setSiteValues, type SiteValues } from '../site.ts';
import Bookmarks from './components/Bookmarks.tsx';
import Document from './Document.tsx';
import { pageDefinitions } from './pages.ts';
import type { PageDefinition } from './types.ts';
import { maskDocument } from '../obfuscation/mask-document.ts';

export function pageRoutes(): Record<string, string> {
	const definitions: Record<string, PageDefinition> = pageDefinitions;
	return Object.fromEntries(
		Object.entries(definitions).flatMap(([path, { route }]) =>
			(route === undefined ? [] : [route].flat()).map((name) => [
				name,
				path,
			])
		)
	);
}

export function renderDocuments(context: SiteValues) {
	setSiteValues({ ...context, pageNames: Object.keys(pageRoutes()) });
	const documents = Object.fromEntries(
		Object.entries(pageDefinitions).map(([path, definition]) => [
			path,
			maskDocument(
				'<!doctype html>\n' +
					renderToString(() => <Document {...definition} />)
			),
		])
	);
	documents['pages/misc/deobf/bookmarks.html'] = maskDocument(
		renderToString(() => <Bookmarks />)
	);
	return documents;
}
