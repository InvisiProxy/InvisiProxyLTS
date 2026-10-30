import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { isFlaggedWord } from '../obfuscation/flagged-words.ts';

const dataFile = new URL('../data.json', import.meta.url);
const localeFile = new URL('../../locales/en.yaml', import.meta.url);

const books = [
	1342, 2701, 84, 1661, 11, 345, 76, 98, 1400, 174, 2600, 4300, 120, 158, 205,
	33283, 5200, 16328, 25344, 5730, 16, 35, 36, 1080, 3296, 6130, 996, 244,
	3207, 1727, 4367, 863, 1260, 215, 1250, 1251, 768, 946, 209, 829,
];
const identified =
	/prox(?:y|ies|ium|chain)|unbloc?k|vpn|invisiproxy|scramjet|cloaker|croxy|socks|ruffle|webretro|titaniumnetwork|mercuryworkshop|epoxy|libcurl|bare\s+client|interception-based/i;

const shuffle = <T>(items: T[]) => {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
};

async function fetchBook(id: number) {
	const response = await fetch(
		`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`
	);
	if (!response.ok) throw new Error(`HTTP ${response.status} for book ${id}`);
	return response.text();
}

function bookBody(text: string) {
	const start =
		/\*\*\* ?START OF (?:THE|THIS) (?:PROJECT GUTENBERG EBOOK|EBOOK)[^\n]*/i.exec(
			text
		);
	const end =
		/\*\*\* ?END OF (?:THE|THIS) (?:PROJECT GUTENBERG EBOOK|EBOOK)[^\n]*/i.exec(
			text
		);
	return text.slice(
		start ? start.index + start[0].length : 0,
		end ? end.index : text.length
	);
}

function sentences(body: string) {
	return body
		.replace(/\r/g, '')
		.replace(/\n(?=["“‘])/g, ' ')
		.split(/\n+/)
		.join(' ')
		.split(/(?<=[.!?])\s+(?=["“]?[A-Z])/)
		.map((sentence) => sentence.replace(/\s+/g, ' ').trim())
		.filter((sentence) => {
			if (sentence.length < 60 || sentence.length > 320) return false;
			const words = sentence.split(' ');
			if (words.length < 8 || words.length > 40) return false;
			if (identified.test(sentence)) return false;
			if ((sentence.match(/\d/g)?.length ?? 0) > 3) return false;
			if ((sentence.match(/[_*|{}<>@#$%^~`]/g)?.length ?? 0) > 0)
				return false;
			const letters =
				(sentence.match(/[A-Za-z]/g)?.length ?? 0) / sentence.length;
			if (letters <= 0.75) return false;
			return ![...sentence.matchAll(/[A-Za-z]{3,}/g)].some((word) =>
				isFlaggedWord(word[0].toLowerCase())
			);
		});
}

function facts(body: string) {
	const counts = new Map<string, number>();
	for (const word of body.match(/\b[A-Z][a-z]{4,13}\b/g) ?? []) {
		if (identified.test(word)) continue;
		counts.set(word, (counts.get(word) ?? 0) + 1);
	}
	return [...counts.entries()]
		.filter(
			([word, count]) =>
				count >= 4 && !isFlaggedWord(word.toLowerCase())
		)
		.map(([word]) => word);
}

const locale = parse(readFileSync(localeFile, 'utf8')) as {
	maskedTerms: string[];
};
const data = JSON.parse(readFileSync(dataFile, 'utf8')) as {
	content: string[];
	keywords: string[];
	masks: unknown;
	splash: unknown;
	version: unknown;
};
const generic = new Set(
	[
		'free',
		'search',
		'surf',
		'server',
		'network',
		'connection',
		'privacy',
		'private',
		'games',
	].map((word) => word.toLowerCase())
);
const terms = (locale.maskedTerms ?? []).filter(
	(term) => !generic.has(term.toLowerCase())
);

const picks = shuffle([...books]).slice(0, 8);
const bodies: string[] = [];
for (const id of picks) {
	try {
		const body = bookBody(await fetchBook(id));
		bodies.push(body);
		console.log(`fetched book ${id}: ${body.length} bytes`);
	} catch (error) {
		console.log(`skipped book ${id}: ${String(error)}`);
	}
}
if (bodies.length < 3) {
	console.error('Too few books fetched; keeping the existing corpus.');
	process.exit(1);
}

const pool = shuffle([...new Set(bodies.flatMap((body) => sentences(body)))]);
const rejected = pool.filter((sentence) =>
	terms.some((term) => sentence.toLowerCase().includes(term.toLowerCase()))
);
const clean = pool.filter((sentence) => !rejected.includes(sentence));
console.log(
	`sentences: ${clean.length} kept, ${rejected.length} dropped for masked terms`
);
if (clean.length < 250) {
	console.error('Not enough usable sentences; keeping the existing corpus.');
	process.exit(1);
}

const content: string[] = [];
for (let i = 0; i < clean.length && content.length < 96; ) {
	const count = 3 + Math.floor(Math.random() * 5);
	content.push(clean.slice(i, i + count).join(' '));
	i += count;
}

const words = shuffle([...new Set(bodies.flatMap((body) => facts(body)))]);
const keywords = words
	.filter(
		(word) =>
			!terms.some((term) => term.toLowerCase() === word.toLowerCase())
	)
	.slice(0, Math.max(200, Math.min(390, words.length)));
console.log(`paragraphs: ${content.length}, facts: ${keywords.length}`);

writeFileSync(
	dataFile,
	`${JSON.stringify(
		{
			keywords,
			content,
			masks: data.masks,
			splash: data.splash,
			version: data.version,
		},
		null,
		'\t'
	)}\n`
);
console.log('src/data.json refreshed.');
