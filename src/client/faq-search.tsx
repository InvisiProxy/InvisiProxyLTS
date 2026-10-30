import { createSignal, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { plainText } from 'build:invisiproxy';

const normalizeSearch = (value: string) =>
	value
		.replace(/[\u00ad\u200b-\u200d\u2060-\u206f\ufeff]|\ufe0f/g, '')
		.trim()
		.toLocaleLowerCase();

function FAQSearch(props: { label?: string; placeholder?: string }) {
	const [query, setQuery] = createSignal('');
	const entries = [...document.querySelectorAll<HTMLElement>('#faqs > div')];
	createEffect(() => {
		const search = normalizeSearch(query());
		for (const entry of entries) {
			const heading = plainText(
				entry.firstElementChild?.textContent || ''
			);
			entry.style.display = normalizeSearch(heading).includes(search)
				? ''
				: 'none';
		}
	});
	return (
		<input
			class="faq-search"
			type="search"
			aria-label={props.label}
			autocomplete="off"
			spellcheck={false}
			placeholder={props.placeholder}
			value={query()}
			onInput={(event) => setQuery(event.currentTarget.value)}
		/>
	);
}

const root = document.getElementById('faq-search-root');
if (root) {
	const { label, placeholder } = root.dataset;
	root.replaceChildren();
	render(() => <FAQSearch label={label} placeholder={placeholder} />, root);
}
