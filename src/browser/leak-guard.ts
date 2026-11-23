const installed = Symbol.for('invisiLeakGuard');
const clientGlobal = Symbol.for('scramjet client global');
const wrapLocation = '$scramjet__location';

export type ScramjetClientFrameNames = {
	meta: { topFrameName?: string | null };
	url?: URL;
};

const originList = (origins: string[]) => {
	const list: Record<string | number | symbol, unknown> = {
		length: origins.length,
		item: (index: number) => origins[index] ?? null,
		contains: (origin: string) => origins.includes(origin),
		[Symbol.toStringTag]: 'DOMStringList',
		[Symbol.iterator]: origins[Symbol.iterator].bind(origins),
	};
	for (const [index, origin] of origins.entries()) list[index] = origin;
	return list;
};

function maskAncestorOrigins(win: Window, isTop: boolean) {
	const fake = (win as unknown as Record<string, unknown>)[wrapLocation] as
		| object
		| undefined;
	if (!fake) return;
	const origins: string[] = [];
	if (!isTop) {
		let current: Window = win;
		for (;;) {
			let parent: Window;
			try {
				parent = current.parent;
			} catch {
				break;
			}
			if (parent === current) break;
			const ancestor = (
				parent as unknown as Record<symbol, { url?: URL } | undefined>
			)[clientGlobal];
			if (!ancestor?.url) break;
			origins.unshift(ancestor.url.origin);
			current = parent;
		}
	}
	const list =
		isTop || origins.length
			? originList(origins)
			: (win.location.ancestorOrigins ?? originList([]));
	Object.defineProperty(fake, 'ancestorOrigins', {
		get: () => list,
		configurable: false,
		enumerable: true,
	});
}

export function leakFrame(
	win: Window,
	client: ScramjetClientFrameNames,
	isTop = true
): void {
	const guarded = win as Window & { [installed]?: boolean };
	if (guarded[installed]) return;
	guarded[installed] = true;
	maskAncestorOrigins(win, isTop);

	const { getAttribute, setAttribute, removeAttribute } = Element.prototype;
	const opensNewTab = (target: string | null | undefined) =>
		target?.trim().toLowerCase() === '_blank';
	const frameName = () => {
		try {
			return client.meta.topFrameName || '_self';
		} catch {
			return '_self';
		}
	};

	EventTarget.prototype.addEventListener.call(
		win,
		'click',
		(event) => {
			const click = event as MouseEvent;
			if (
				click.button !== 0 ||
				click.ctrlKey ||
				click.metaKey ||
				click.shiftKey ||
				click.altKey
			)
				return;
			const link = click.composedPath().find((node) => {
				const name = (node as Element).localName;
				return (
					(name === 'a' || name === 'area') &&
					getAttribute.call(node, 'href') !== null
				);
			}) as Element | undefined;
			if (!link) return;
			const original = getAttribute.call(link, 'target');
			const base = win.document.querySelector('base[target]');
			const target =
				original ?? (base && getAttribute.call(base, 'target'));
			if (!opensNewTab(target)) return;
			setAttribute.call(link, 'target', frameName());
			setTimeout(() =>
				original === null
					? removeAttribute.call(link, 'target')
					: setAttribute.call(link, 'target', original)
			);
		},
		true
	);
}
