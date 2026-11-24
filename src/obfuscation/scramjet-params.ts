import { randomInt } from 'node:crypto';
import ts from 'typescript';
import { decodeSource, encodeSource } from '../browser/proxy-codec.ts';
import { scramjetTokens } from './scramjet-signatures.ts';

function paramName(used: Set<string>) {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz';
	let name: string;
	do {
		name = '';
		for (let i = randomInt(6, 10); i > 0; i--)
			name += alphabet[randomInt(alphabet.length)];
	} while (used.has(name));
	used.add(name);
	return name;
}

// Their names must match the WASM's scrubbed copies, so they come from the
// shared tokens instead of paramName().
const wasmQueryParams: Record<string, string> = {
	isModule: '%24module',
	initiatorOrigin: '%24io',
};

function isQueryParam(node: ts.Expression) {
	return (
		ts.isPropertyAccessExpression(node) &&
		ts.isPropertyAccessExpression(node.expression) &&
		node.expression.name.text === 'QP'
	);
}

export function hideScramjetParams(source: string, key: string): string {
	const file = ts.createSourceFile(
		'scramjet.js',
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.JS
	);
	const renames: { start: number; end: number; value: string }[] = [];
	const writes: ts.Expression[] = [];
	const reads: ts.Expression[] = [];
	const used = new Set<string>();
	function visit(node: ts.Node, inParser: boolean) {
		if (
			ts.isObjectLiteralExpression(node) &&
			node.properties.some(
				(property) =>
					ts.isPropertyAssignment(property) &&
					property.name.getText(file) === 'initiatorOrigin'
			)
		) {
			const wasmName = (property: ts.PropertyAssignment) =>
				wasmQueryParams[property.name.getText(file)];
			for (const property of node.properties) {
				if (
					!ts.isPropertyAssignment(property) ||
					!ts.isStringLiteral(property.initializer) ||
					!property.initializer.text.startsWith('$')
				)
					continue;
				const hardcoded = wasmName(property);
				let value: string;
				if (hardcoded) {
					value = scramjetTokens().names?.[hardcoded];
					if (!value)
						throw new Error(
							`Missing obfuscation token for query parameter ${hardcoded}`
						);
				} else value = paramName(used);
				used.add(value);
				renames.push({
					start: property.initializer.getStart(file),
					end: property.initializer.end,
					value: JSON.stringify(value),
				});
			}
		}
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === 'set' &&
			node.arguments.length === 2 &&
			isQueryParam(node.arguments[0])
		)
			writes.push(node.arguments[1]);
		if (
			ts.isFunctionLike(node) &&
			node.getText(file).includes('extraneous query parameter')
		)
			inParser = true;
		if (
			inParser &&
			ts.isConditionalExpression(node) &&
			ts.isBinaryExpression(node.whenTrue) &&
			node.whenTrue.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isElementAccessExpression(node.whenTrue.left) &&
			ts.isIdentifier(node.whenTrue.right) &&
			// The real read is the parser's `known ? t[name] = value :
			// (warn(...), extras)` conditional; Scramjet 3 also matches
			// push idioms like `keep ? list[i] = item : walk(item)` in
			// functions whose text mentions the marker string.
			node.getText(file).includes('.warn')
		)
			reads.push(node.whenTrue.right);
		ts.forEachChild(node, (child) => visit(child, inParser));
	}
	visit(file, false);
	if (!renames.length) {
		console.warn(
			'[Build] Scramjet query parameters not found; left as is.'
		);
		return source;
	}
	const literal = JSON.stringify(key);
	const edits = [...renames];
	// Scramjet 3 has several copies of the QP parser; every read site has
	// the same `t[e] = value` shape, so all of them decode.
	if (key && writes.length && reads.length) {
		const encode = `((url) => { ${encodeSource(literal)} })`;
		const decode = `((url) => { ${decodeSource(literal)} })`;
		for (const node of writes)
			edits.push({
				start: node.getStart(file),
				end: node.end,
				value: `${encode}(${node.getText(file)})`,
			});
		for (const node of reads)
			edits.push({
				start: node.getStart(file),
				end: node.end,
				value: `${decode}(${node.getText(file)})`,
			});
	} else if (key)
		console.warn(
			'[Build] Scramjet query parameter values could not be encoded; only the names are changed.'
		);
	for (const edit of edits.sort((a, b) => b.start - a.start))
		source =
			source.slice(0, edit.start) + edit.value + source.slice(edit.end);
	return source;
}
