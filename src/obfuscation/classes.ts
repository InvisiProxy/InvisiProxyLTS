import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import ts from 'typescript';
import { config } from '../config.ts';
import { projectUrl } from '../constants.ts';
import {
	generatedNames,
	obfuscationState,
	saveObfuscationState,
} from './state.ts';

const vendorClass =
	/^(?:fa(?:[brsld])?(?:-|$)|aos(?:-|$)|tippy-(?:box|content|arrow|backdrop)|eruda(?:-|$))/;
const vendorId = /^tsparticles$/;
const idAttribute = /^(?:id|for|containerId|formId|buttonId|menuId)$/;
const elementId = /^[A-Za-z][\w-]*$/;

let collected: { classes: Set<string>; ids: Set<string> } | undefined;

function sourceNames() {
	if (collected) return collected;
	const classes = new Set<string>();
	const ids = new Set<string>();
	const addClasses = (value: string) => {
		for (const name of value.split(/\s+/))
			if (name && !vendorClass.test(name)) classes.add(name);
	};
	const addId = (value: string) => {
		if (elementId.test(value) && !vendorId.test(value)) ids.add(value);
	};
	const cssRoot = new URL('views/assets/css/', projectUrl);
	for (const file of existsSync(cssRoot)
		? readdirSync(cssRoot, { recursive: true, encoding: 'utf8' })
		: []) {
		if (!file.endsWith('.css')) continue;
		postcss
			.parse(readFileSync(new URL(file, cssRoot), 'utf8'))
			.walkRules((rule) => {
				selectorParser((selectors) => {
					selectors.walkClasses((node) => {
						addClasses(node.value);
					});
					selectors.walkIds((node) => {
						addId(node.value);
					});
				}).processSync(rule.selector);
			});
	}
	const clientRoot = fileURLToPath(new URL('src/client/', projectUrl));
	for (const file of readdirSync(clientRoot, {
		recursive: true,
		encoding: 'utf8',
	})) {
		if (!file.endsWith('.tsx')) continue;
		const source = ts.createSourceFile(
			file,
			readFileSync(`${clientRoot}/${file}`, 'utf8'),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX
		);
		function visit(node: ts.Node) {
			if (ts.isJsxAttribute(node)) {
				const name = node.name.getText(source);
				const value = node.initializer;
				const literal =
					value && ts.isJsxExpression(value)
						? value.expression
						: value;
				if (literal && ts.isStringLiteralLike(literal)) {
					if (name === 'class') addClasses(literal.text);
					else if (idAttribute.test(name)) addId(literal.text);
				}
			}
			ts.forEachChild(node, visit);
		}
		visit(source);
	}
	collected = { classes, ids };
	return collected;
}

export function classNames(): Record<string, string> {
	if (config.usingSEO) return {};
	const state = obfuscationState();
	if (Object.keys(state.classes).length) return state.classes;
	state.classes = generatedNames(sourceNames().classes, 'classes');
	saveObfuscationState(state);
	return state.classes;
}

export function elementIds(): Record<string, string> {
	if (config.usingSEO) return {};
	const state = obfuscationState();
	if (Object.keys(state.ids).length) return state.ids;
	state.ids = generatedNames(sourceNames().ids, 'ids');
	saveObfuscationState(state);
	return state.ids;
}

export function rewriteClasses(value: string, names = classNames()) {
	return value.replace(/\S+/g, (name) => names[name] || name);
}

export function rewriteIds(value: string, ids = elementIds()) {
	return value.replace(/\S+/g, (name) => ids[name] || name);
}

export function rewriteSelector(
	value: string,
	names = classNames(),
	ids = elementIds()
) {
	return selectorParser((selectors) => {
		selectors.walkClasses((node) => {
			node.value = names[node.value] || node.value;
		});
		selectors.walkIds((node) => {
			node.value = ids[node.value] || node.value;
		});
		selectors.walkAttributes((node) => {
			if (
				!node.value ||
				!['=', '~='].includes(node.operator || '') ||
				!['class', 'id'].includes(node.attribute)
			)
				return;
			node.setValue(
				node.attribute === 'class'
					? rewriteClasses(node.value, names)
					: rewriteIds(node.value, ids),
				{ quoteMark: node.quoteMark }
			);
		});
	}).processSync(value);
}

export function rewriteStylesheet(
	css: string,
	names = classNames(),
	ids = elementIds()
) {
	const root = postcss.parse(css);
	root.walkRules((rule) => {
		rule.selector = rewriteSelector(rule.selector, names, ids);
	});
	return root.toString();
}

export function rewriteClassReferences(
	code: string,
	name: string,
	names = classNames(),
	ids = elementIds()
) {
	const source = ts.createSourceFile(
		name,
		code,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.JS
	);
	const edits: { start: number; end: number; value: string }[] = [];
	const suffix = randomBytes(8).toString('hex');
	const classes = `__invisiClasses_${suffix}`;
	const selector = `__invisiSelector_${suffix}`;
	const id = `__invisiId_${suffix}`;
	const runtimeNames = { classes, selector, id };
	let runtime = false;
	function argument(
		node: ts.Expression,
		kind: 'classes' | 'selector' | 'id'
	) {
		let value: string;
		if (ts.isStringLiteralLike(node)) {
			value = JSON.stringify(
				kind === 'classes'
					? rewriteClasses(node.text, names)
					: kind === 'id'
						? ids[node.text] || node.text
						: rewriteSelector(node.text, names, ids)
			);
		} else {
			runtime = true;
			value = `${runtimeNames[kind]}(${node.getText(source)})`;
		}
		edits.push({ start: node.getStart(source), end: node.end, value });
	}
	function visit(node: ts.Node) {
		if (ts.isCallExpression(node)) {
			const call = node.expression;
			const method = ts.isPropertyAccessExpression(call)
				? call.name.text
				: ts.isIdentifier(call)
					? call.text
					: '';
			if (node.arguments[0]) {
				if (
					[
						'querySelector',
						'querySelectorAll',
						'closest',
						'matches',
					].includes(method)
				) {
					argument(node.arguments[0], 'selector');
					visit(call);
					for (const arg of node.arguments.slice(1)) visit(arg);
					return;
				}
				if (method === 'getElementById') {
					argument(node.arguments[0], 'id');
					visit(call);
					return;
				}
				if (
					method === 'getElementsByClassName' ||
					(ts.isPropertyAccessExpression(call) &&
						ts.isPropertyAccessExpression(call.expression) &&
						call.expression.name.text === 'classList')
				) {
					const count = ['add', 'remove', 'replace'].includes(method)
						? node.arguments.length
						: 1;
					for (const arg of node.arguments.slice(0, count))
						argument(arg, 'classes');
					visit(call);
					for (const arg of node.arguments.slice(count)) visit(arg);
					return;
				}
				if (
					method === 'setAttribute' &&
					ts.isStringLiteralLike(node.arguments[0]) &&
					['class', 'id', 'for'].includes(node.arguments[0].text) &&
					node.arguments[1]
				) {
					argument(
						node.arguments[1],
						node.arguments[0].text === 'class' ? 'classes' : 'id'
					);
					visit(call);
					return;
				}
			}
		}
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isPropertyAccessExpression(node.left) &&
			['className', 'id', 'htmlFor'].includes(node.left.name.text)
		) {
			argument(
				node.right,
				node.left.name.text === 'className' ? 'classes' : 'id'
			);
			visit(node.left);
			return;
		}
		if (ts.isStringLiteralLike(node)) {
			const text = rewriteIdAttributes(
				node.text.replace(
					/(\bclass\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/g,
					(_match, before, doubleQuoted, singleQuoted, unquoted) =>
						`${before}"${rewriteClasses(doubleQuoted ?? singleQuoted ?? unquoted, names)}"`
				),
				ids
			);
			if (text !== node.text)
				edits.push({
					start: node.getStart(source),
					end: node.end,
					value: JSON.stringify(text),
				});
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
	for (const edit of edits.sort((a, b) => b.start - a.start))
		code = code.slice(0, edit.start) + edit.value + code.slice(edit.end);
	if (!runtime) return code;
	return `(() => {
		const names = ${JSON.stringify(names)};
		const ids = ${JSON.stringify(ids)};
		function ${classes}(value) { return typeof value === 'string' ? value.replace(/\\S+/g, name => names[name] || name) : value; }
		function ${selector}(value) { return typeof value === 'string' ? value.replace(/"[^"]*"|'[^']*'|\\.([a-zA-Z_][\\w-]*)|#([a-zA-Z_][\\w-]*)/g, (match, name, id) => name && names[name] ? '.' + names[name] : id && ids[id] ? '#' + ids[id] : match) : value; }
		function ${id}(value) { return typeof value === 'string' && ids[value] || value; }
		${code}
	})();`;
}

function rewriteIdAttributes(text: string, ids: Record<string, string>) {
	if (!text.includes('<')) return text;
	return text.replace(
		/((?<![\w-])(?:id|for)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/g,
		(match, before, doubleQuoted, singleQuoted, unquoted) => {
			const value = doubleQuoted ?? singleQuoted ?? unquoted;
			return ids[value] ? `${before}"${ids[value]}"` : match;
		}
	);
}
