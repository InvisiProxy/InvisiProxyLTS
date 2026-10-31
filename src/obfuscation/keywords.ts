import { createHash } from 'node:crypto';
import data from '../data.json' with { type: 'json' };
import { obfuscationState } from './state.ts';

function seededRandom(seed: string) {
	let a = Number.parseInt(
		createHash('sha256').update(seed).digest('hex').slice(0, 8),
		16
	);
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

interface KeywordPool {
	text: string[];
	facts: string[];
}

let pool: KeywordPool | undefined;

export function keywordPool(): KeywordPool {
	if (pool) return pool;
	const random = seededRandom(`${obfuscationState().seed}:keywords`);
	const sentences = [
		...new Set(
			data.content.flatMap((paragraph) =>
				paragraph
					.split(/(?<=[.!?])\s+/)
					.map((sentence) => sentence.trim())
					.filter((sentence) => sentence.length > 40)
			)
		),
	];
	for (let i = sentences.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[sentences[i], sentences[j]] = [sentences[j], sentences[i]];
	}
	const text: string[] = [];
	for (let i = 0; i < sentences.length; ) {
		const count = 3 + Math.floor(random() * 5);
		text.push(sentences.slice(i, i + count).join(' '));
		i += count;
	}
	const facts = [...data.keywords];
	for (let i = facts.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[facts[i], facts[j]] = [facts[j], facts[i]];
	}
	pool = { text, facts };
	return pool;
}
