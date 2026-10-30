import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { values } from '../site.ts';
import {
	cipherMarkup,
	cipherText,
	disguiseText,
	escapeText,
	homoglyphText,
	maskText,
} from './masks.ts';

const literalElements = new Set([
	'script',
	'style',
	'textarea',
	'iframe',
	'xmp',
	'plaintext',
	'noframes',
]);
const plainElements = new Set([
	'title',
	'select',
	'option',
	'optgroup',
	'svg',
	'math',
	'template',
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
	'data-restarting',
]);

type TextMode = 'cipher' | 'disguise' | 'decoy' | 'title';

const titleAttributes = new Set(['title', 'placeholder']);

const titleText = (text: string) => homoglyphText(maskText(text));

const attributeText = (name: string, text: string) =>
	name === 'data-tippy-content' && values.fontCipher.tag
		? cipherText(maskText(text))
		: titleAttributes.has(name)
			? titleText(text)
			: disguiseText(text);

const renderText = (text: string, mode: TextMode) =>
	mode === 'cipher'
		? cipherMarkup(maskText(text))
		: escapeText(
				mode === 'decoy'
					? maskText(text)
					: mode === 'title'
						? titleText(text)
						: disguiseText(text)
			);

export function maskDocument(html: string): string {
	if (values.usingSEO) return html;
	const edits: { start: number; end: number; text: string }[] = [];
	function visit(node: DefaultTreeAdapterTypes.Node, mode: TextMode) {
		if (node.nodeName === '#text' && 'value' in node) {
			const location = node.sourceCodeLocation;
			if (location && /\S/.test(node.value)) {
				const text = renderText(node.value, mode);
				if (text !== escapeText(node.value))
					edits.push({
						start: location.startOffset,
						end: location.endOffset,
						text,
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
					.map((part, index) =>
						index % 2 ? part : attributeText(attribute.name, part)
					)
					.join('');
				if (masked !== attribute.value)
					edits.push({
						start: location.startOffset,
						end: location.endOffset,
						text: `${attribute.name}="${escapeText(masked).replaceAll('"', '&quot;')}"`,
					});
			}
			if (literalElements.has(node.tagName)) return;
			const optOut = node.sourceCodeLocation?.attrs?.['data-plain'];
			if (optOut)
				edits.push({
					start: optOut.startOffset - 1,
					end: optOut.endOffset,
					text: '',
				});
			if (node.attrs.some(({ name }) => name === values.factAttribute))
				mode = 'decoy';
			else if (node.tagName === 'title') mode = 'title';
			else if (
				mode === 'cipher' &&
				(optOut || plainElements.has(node.tagName))
			)
				mode = 'disguise';
		}
		if ('childNodes' in node)
			for (const child of node.childNodes) visit(child, mode);
		if ('content' in node)
			visit(
				node.content as DefaultTreeAdapterTypes.DocumentFragment,
				mode
			);
	}
	visit(parse(html, { sourceCodeLocationInfo: true }), 'cipher');
	let output = '',
		offset = 0;
	for (const edit of edits.sort((a, b) => a.start - b.start)) {
		output += html.slice(offset, edit.start) + edit.text;
		offset = edit.end;
	}
	return output + html.slice(offset);
}
