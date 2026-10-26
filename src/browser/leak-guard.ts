const installed = Symbol.for('leak prevention');

export type ScramjetClientFrameNames = {
	meta: { topFrameName?: string | null };
};

export function leakFrame(
	win: Window,
	client: ScramjetClientFrameNames
): void {
	const guarded = win as Window & { [installed]?: boolean };
	if (guarded[installed]) return;
	guarded[installed] = true;

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
