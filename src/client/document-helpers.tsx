import type { JSX, ParentProps } from 'solid-js';
import { renderToString, ssr } from 'solid-js/web';
import {
	values,
	randomItem,
	inlineHtml,
	route,
	translate,
	type MessageParams,
} from '../site.ts';
export {
	values,
	sites,
	appLibrary,
	appPresets,
	credits,
	route,
	ifSEO,
	ifDisguise,
	inlineHtml,
	translate,
	languageTag,
	pageUrl,
	siteOrigin,
} from '../site.ts';
export { getSplash } from '../obfuscation/masks.ts';

function serializeHtml(html: string): JSX.Element {
	return ssr(html) as unknown as JSX.Element;
}

type Tag = (text: string) => JSX.Element;

const defaultTags: Record<string, Tag> = {
	strong: (text) => <strong>{text}</strong>,
	em: (text) => <em>{text}</em>,
	code: (text) => <code>{text}</code>,
	br: () => <br />,
};

export function Translation(props: {
	id: string;
	params?: MessageParams;
	tags?: Record<string, Tag>;
}): JSX.Element {
	const message = translate(props.id, props.params);
	const tags = { ...defaultTags, ...props.tags };
	const parts: JSX.Element[] = [];
	let last = 0;
	for (const match of message.matchAll(/<(\w+)\/>|<(\w+)>(.*?)<\/\2>/gs)) {
		const name = match[1] || match[2];
		if (!Object.hasOwn(tags, name))
			throw new Error(`Unknown tag <${name}> in "${props.id}"`);
		parts.push(
			message.slice(last, match.index),
			tags[name](match[3] ?? '')
		);
		last = match.index + match[0].length;
	}
	parts.push(message.slice(last));
	return parts;
}
export function Splash() {
	return randomItem(values.splash);
}
export function iconBookmarklet() {
	return `javascript:alert((Array.from(document.head.querySelectorAll("link[rel*='icon']")).slice(-1)[0]||0).href||location.origin+"${route('/favicon.ico')}")`;
}
export function Keywords() {
	if (values.usingSEO) return null;
	return (
		<span
			style={{ display: 'none' }}
			{...{ [values.factAttribute]: randomItem(values.keywordFacts) }}
		>
			{randomItem(values.keywordText)}
		</span>
	);
}
export function SEO(props: ParentProps) {
	return values.usingSEO ? props.children : null;
}
export function Disguise(props: ParentProps) {
	return values.disguiseFiles ? props.children : null;
}
export function Inline(props: ParentProps): JSX.Element {
	const children = props.children;
	const assets = (Array.isArray(children) ? children : [children])
		.map((child) => renderToString(() => child))
		.join('\n');
	return serializeHtml(inlineHtml(assets));
}
