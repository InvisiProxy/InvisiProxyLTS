import { values } from '../document-helpers.tsx';

const script = `(() => {
	const loader = document.querySelector('.font-loader');
	if (!loader) return;
	let hidden = false;
	const hide = () => {
		if (hidden) return;
		hidden = true;
		loader
			.animate(
				[{ opacity: getComputedStyle(loader).opacity }, { opacity: 0 }],
				{ duration: 200, fill: 'forwards' }
			)
			.finished.then(() => loader.remove());
	};
	const wait = () => {
		void document.body.offsetHeight;
		document.fonts.ready.then(hide);
	};
	setTimeout(hide, 3000);
	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', wait);
	else wait();
})();`;

export default function FontLoader() {
	if (!values.fontCipher.tag) return null;
	return (
		<>
			<div class="font-loader" aria-hidden="true"></div>
			<script innerHTML={script} />
		</>
	);
}
