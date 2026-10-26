import { minify } from 'html-minifier-terser';
import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { config } from '../config.ts';
import {
	classNames,
	elementIds,
	rewriteClasses,
	rewriteIds,
	rewriteStylesheet,
} from './classes.ts';
import { obfuscateScript, stripObfuscatedMarker } from './scripts.ts';

const idReferences = new Set([
	'id',
	'for',
	'list',
	'form',
	'popovertarget',
	'commandfor',
	'headers',
	'itemref',
	'aria-controls',
	'aria-describedby',
	'aria-labelledby',
	'aria-owns',
	'aria-activedescendant',
]);

function rewriteAttribute(
	name: string,
	value: string,
	names: Record<string, string>,
	ids: Record<string, string>
) {
	if (name === 'class') return rewriteClasses(value, names);
	if (idReferences.has(name)) return rewriteIds(value, ids);
	if (/(?:^|:)href$/.test(name) && !/^[a-z][\w+.-]*:|^\/\//i.test(value))
		return value.replace(/#([^#]+)$/, (match, id) =>
			ids[id] ? `#${ids[id]}` : match
		);
	return value.replace(
		/url\(\s*(['"]?)#([\w-]+)\1\s*\)/g,
		(match, quote, id) =>
			ids[id] ? `url(${quote}#${ids[id]}${quote})` : match
	);
}

export async function obfuscateDocument(html: string, name: string) {
	if (config.usingSEO) return html;
	const edits: { start: number; end: number; source: string }[] = [];
	const names = classNames();
	const ids = elementIds();
	function visit(node: DefaultTreeAdapterTypes.Node) {
		if ('tagName' in node) {
			for (const attr of node.attrs) {
				const attrName = attr.prefix
					? `${attr.prefix}:${attr.name}`
					: attr.name;
				const location = node.sourceCodeLocation?.attrs?.[attrName];
				if (!location) continue;
				const value = rewriteAttribute(
					attrName,
					attr.value,
					names,
					ids
				);
				if (attrName !== 'class' && value === attr.value) continue;
				edits.push({
					start: location.startOffset,
					end: location.endOffset,
					source: `${attrName}="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`,
				});
			}
			if (
				node.tagName === 'style' &&
				node.sourceCodeLocation?.startTag &&
				node.sourceCodeLocation.endTag
			) {
				const start = node.sourceCodeLocation.startTag.endOffset;
				const end = node.sourceCodeLocation.endTag.startOffset;
				edits.push({
					start,
					end,
					source: rewriteStylesheet(
						html.slice(start, end),
						names,
						ids
					),
				});
			}
		}
		if ('tagName' in node && node.tagName === 'script') {
			const type = node.attrs.find((attr) => attr.name === 'type')?.value;
			const location = node.sourceCodeLocation;
			if (
				!node.attrs.some((attr) => attr.name === 'src') &&
				(!type ||
					/^(?:module|(?:text|application)\/(?:java|ecma)script)$/i.test(
						type
					)) &&
				location?.startTag &&
				location.endTag
			) {
				const start = location.startTag.endOffset;
				const end = location.endTag.startOffset;
				edits.push({
					start,
					end,
					source: stripObfuscatedMarker(
						obfuscateScript(
							html.slice(start, end),
							`${name}:${start}`
						)
					).replace(/<\/script/gi, '<\\/script'),
				});
			}
		}
		if ('childNodes' in node)
			for (const child of node.childNodes) visit(child);
		if ('content' in node)
			visit(node.content as DefaultTreeAdapterTypes.DocumentFragment);
	}
	visit(parse(html, { sourceCodeLocationInfo: true }));
	for (const edit of edits.sort((a, b) => b.start - a.start))
		html = html.slice(0, edit.start) + edit.source + html.slice(edit.end);
	return minify(html, {
		removeComments: true,
		collapseWhitespace: true,
		conservativeCollapse: true,
		minifyCSS: true,
		minifyJS: false,
		keepClosingSlash: true,
	});
}
