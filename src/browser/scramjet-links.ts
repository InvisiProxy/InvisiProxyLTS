export interface NormalizedScramjetTarget {
	url: string;
	unwrapped: boolean;
	proxyOrigin: boolean;
}

export function normalizeScramjetTarget(
	value: string | URL,
	proxyOrigin: string,
	networkPrefixPath: string,
	decode: (value: string) => string = decodeURIComponent
): NormalizedScramjetTarget {
	let url = String(value);
	let unwrapped = false;
	const origin = new URL(proxyOrigin).origin;
	const prefixPath = new URL(networkPrefixPath, origin).pathname.replace(
		/\/*$/,
		'/'
	);
	const explicitUrl = /^(?:https?:)?\/\//i.test(url);
	// A wrapped target can itself contain another Scramjet URL. Bound the
	// unwrapping depth so malformed input can never loop indefinitely.
	for (let depth = 0; depth < 8; depth++) {
		let wrapper: URL;
		try {
			wrapper = new URL(url, origin);
		} catch {
			break;
		}

		if (wrapper.origin !== origin) break;
		if (!wrapper.pathname.startsWith(prefixPath)) {
			if (unwrapped || (explicitUrl && depth === 0))
				return { url: wrapper.href, unwrapped, proxyOrigin: true };
			break;
		}

		const wrappedTarget = wrapper.pathname.slice(prefixPath.length);
		const separator = wrappedTarget.indexOf('/');
		if (separator <= 0) {
			if (explicitUrl && depth === 0)
				return { url: wrapper.href, unwrapped, proxyOrigin: true };
			break;
		}
		if (!/^[a-z0-9]{8}$/i.test(wrappedTarget.slice(0, separator))) {
			if (explicitUrl && depth === 0)
				return { url: wrapper.href, unwrapped, proxyOrigin: true };
			break;
		}

		let target: string;
		try {
			target = decode(wrappedTarget.slice(separator + 1));
		} catch {
			if (unwrapped || (explicitUrl && depth === 0))
				return { url: wrapper.href, unwrapped, proxyOrigin: true };
			break;
		}
		if (!target || target === url) {
			if (unwrapped || (explicitUrl && depth === 0))
				return { url: wrapper.href, unwrapped, proxyOrigin: true };
			break;
		}
		try {
			const decodedTarget = new URL(target);
			if (!['http:', 'https:'].includes(decodedTarget.protocol)) {
				if (unwrapped || (explicitUrl && depth === 0))
					return { url: wrapper.href, unwrapped, proxyOrigin: true };
				break;
			}
		} catch {
			if (unwrapped || (explicitUrl && depth === 0))
				return { url: wrapper.href, unwrapped, proxyOrigin: true };
			break;
		}

		if (wrapper.hash) {
			let hash: string;
			try {
				hash = decode(wrapper.hash.slice(1));
			} catch {
				hash = wrapper.hash.slice(1);
			}
			if (hash && !target.includes('#')) target += `#${hash}`;
		}

		url = target;
		unwrapped = true;
	}

	return { url, unwrapped, proxyOrigin: false };
}
