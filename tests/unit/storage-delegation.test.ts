import assert from 'node:assert/strict';
import test from 'node:test';
import {
	createNamespacedStorage,
	delegateCookieAccess,
	delegateStorageAccess,
	type CookieClientLike,
	type StorageLike,
} from '../../src/browser/storage-delegation.ts';

function memoryStorage(): StorageLike {
	const entries = new Map<string, string>();
	return {
		get length() {
			return entries.size;
		},
		clear() {
			entries.clear();
		},
		getItem(key) {
			return entries.get(String(key)) ?? null;
		},
		key(index) {
			return [...entries.keys()][index] ?? null;
		},
		removeItem(key) {
			entries.delete(String(key));
		},
		setItem(key, value) {
			entries.set(String(key), String(value));
		},
	};
}

test('namespaced storage supports Storage methods while isolating host keys', () => {
	const backing = memoryStorage();
	const discord = createNamespacedStorage(backing, 'discord.com');
	const other = createNamespacedStorage(backing, 'example.com');

	discord.setItem('token', 'session-token');
	other.setItem('token', 'other-token');
	assert.equal(discord.getItem('token'), 'session-token');
	assert.equal(other.getItem('token'), 'other-token');
	assert.equal(discord.length, 1);
	assert.equal(discord.key(0), 'token');

	discord.clear();
	assert.equal(discord.getItem('token'), null);
	assert.equal(other.getItem('token'), 'other-token');
});

test('delegates both Storage globals and preserves host data after delete attempts', () => {
	const localStorage = memoryStorage();
	const sessionStorage = memoryStorage();
	const frame = {} as {
		Storage?: new (...args: never[]) => object;
		localStorage?: StorageLike;
		sessionStorage?: StorageLike;
	};
	delegateStorageAccess(
		frame,
		{ localStorage, sessionStorage },
		'discord.com'
	);
	const local = frame.localStorage;
	const session = frame.sessionStorage;
	assert.ok(local && session);

	local.setItem('token', 'persisted');
	session.setItem('challenge', 'nonce');
	assert.equal(Reflect.deleteProperty(frame, 'localStorage'), false);
	assert.equal(Reflect.deleteProperty(frame, 'sessionStorage'), false);
	assert.equal(frame.localStorage?.getItem('token'), 'persisted');
	assert.equal(frame.sessionStorage?.getItem('challenge'), 'nonce');
	assert.equal(localStorage.getItem('discord.com@token'), 'persisted');
	assert.equal(sessionStorage.getItem('discord.com@challenge'), 'nonce');
});

test('uses Scramjet-installed host storage proxies when they are available', () => {
	const original = memoryStorage();
	const frame = { localStorage: original, sessionStorage: original };
	delegateStorageAccess(
		frame,
		{ localStorage: memoryStorage(), sessionStorage: memoryStorage() },
		'discord.com'
	);
	assert.equal(frame.localStorage, original);
	assert.equal(frame.sessionStorage, original);
});

test('delegates document.cookie to the CookieJar and syncs writes', async () => {
	const cookies = new Map<string, string>();
	const url = new URL('https://discord.com/login');
	const sent: { url: URL; cookie: string }[][] = [];
	const client: CookieClientLike = {
		url,
		context: {
			cookieJar: {
				getCookies(_url, fromJs) {
					assert.equal(fromJs, true);
					return [...cookies.entries()]
						.map(([key, value]) => `${key}=${value}`)
						.join('; ');
				},
				setCookies(cookie) {
					const [key, value] = cookie.split('=', 2);
					cookies.set(key, value.split(';', 1)[0]);
				},
			},
		},
		init: {
			async sendSetCookie(entries) {
				sent.push(entries);
			},
		},
	};
	const documentPrototype = {};
	Object.defineProperty(documentPrototype, 'cookie', {
		configurable: true,
		get() {
			return 'native-cookie';
		},
		set(_value) {},
	});
	const fakeDocument = Object.create(documentPrototype) as Document;
	const frame = {
		Document: { prototype: documentPrototype },
		document: fakeDocument,
	};

	delegateCookieAccess(frame, client);
	fakeDocument.cookie = 'session=abc; Path=/; Secure';
	assert.equal(fakeDocument.cookie, 'session=abc');
	assert.equal(
		Object.getOwnPropertyDescriptor(documentPrototype, 'cookie')
			?.configurable,
		false
	);
	assert.equal(sent.length, 1);
	assert.equal(sent[0][0].url.href, url.href);
	assert.equal(sent[0][0].cookie, 'session=abc; Path=/; Secure');
});
