import { randomItem, values } from '../site.ts';

const maskPatterns = new WeakMap<string[], RegExp>();

function maskCharacter() {
	return randomItem(values.characters).replace(
		/&#(x[\da-f]+|\d+);/gi,
		(_, code: string) =>
			String.fromCodePoint(
				code[0].toLowerCase() === 'x'
					? Number.parseInt(code.slice(1), 16)
					: Number.parseInt(code, 10)
			)
	);
}

function termPattern() {
	let pattern = maskPatterns.get(values.maskedTerms);
	if (!pattern) {
		const escaped = [...values.maskedTerms]
			.sort((a, b) => b.length - a.length)
			.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		pattern = new RegExp(escaped.join('|') || '(?!)', 'gi');
		maskPatterns.set(values.maskedTerms, pattern);
	}
	return pattern;
}

function splitWord(word: string) {
	if (word.length < 2) return word;
	let split = word[0];
	for (let i = 1; i < word.length; i++) split += maskCharacter() + word[i];
	return split;
}

export function maskText(text: string): string {
	if (values.usingSEO) return text;
	const masked = text.replace(termPattern(), (term) =>
		term.replace(/\S+/g, splitWord)
	);
	const result = masked.replace(/\S+/g, (term) =>
		/&#\d+;|&#x[A-z\d]+;|&[A-z]+;/.test(term)
			? term
			: term.replace(/(?<=[AEIOUYaeiouy])(?!$)/g, () => maskCharacter())
	);
	return result
		.replace(/&#173;|&shy;/g, '\u00ad')
		.replace(/&#8203;/g, '\u200b');
}

export function getSplash() {
	return maskText(randomItem(values.splash));
}
