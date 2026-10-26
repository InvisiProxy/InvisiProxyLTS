import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { values } from '../site.ts';
import { maskText } from './masks.ts';

const literalElements = new Set([
	'script',
	'style',
	'textarea',
	'iframe',
	'xmp',
	'plaintext',
	'noframes',
]);
const textAttributes = new Set([
	'alt',
	'title',
	'placeholder',
	'aria-label',
	'aria-description',
	'aria-valuetext',
	'data-tippy-content',
	'data-placeholder',
	'data-label',
	'data-default',
	'data-template',
	'data-confirm',
	'data-invalid',
	'data-untitled',
	'data-close',
	'data-add',
	'data-remove',
]);

function escapeText(text: string) {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

export function maskDocument(html: string): string {
	if (values.usingSEO) return html;
	const edits: { start: number; end: number; text: string }[] = [];
	function visit(node: DefaultTreeAdapterTypes.Node) {
		if (node.nodeName === '#text' && 'value' in node) {
			const location = node.sourceCodeLocation;
			if (location && /\S/.test(node.value)) {
				const masked = maskText(node.value);
				if (masked !== node.value)
					edits.push({
						start: location.startOffset,
						end: location.endOffset,
						text: escapeText(masked),
					});
			}
		}
		if ('tagName' in node) {
			for (const attribute of node.attrs) {
				const buttonValue =
					attribute.name === 'value' &&
					node.tagName === 'input' &&
					node.attrs.some(
						({ name, value }) =>
							name === 'type' &&
							/^(submit|reset|button)$/i.test(value)
					);
				if (!textAttributes.has(attribute.name) && !buttonValue)
					continue;
				const location =
					node.sourceCodeLocation?.attrs?.[attribute.name];
				if (!location) continue;
				const masked = attribute.value
					.split(/(\{\w+\})/)
					.map((part, index) => (index % 2 ? part : maskText(part)))
					.join('');
				if (masked !== attribute.value)
					edits.push({
						start: location.startOffset,
						end: location.endOffset,
						text: `${attribute.name}="${escapeText(masked).replaceAll('"', '&quot;')}"`,
					});
			}
			if (literalElements.has(node.tagName)) return;
		}
		if ('childNodes' in node)
			for (const child of node.childNodes) visit(child);
		if ('content' in node)
			visit(node.content as DefaultTreeAdapterTypes.DocumentFragment);
	}
	visit(parse(html, { sourceCodeLocationInfo: true }));
	let output = '',
		offset = 0;
	for (const edit of edits.sort((a, b) => a.start - b.start)) {
		output += html.slice(offset, edit.start) + edit.text;
		offset = edit.end;
	}
	return output + html.slice(offset);
}
