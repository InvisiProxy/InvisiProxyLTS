import { createRoot } from 'solid-js';
import { useTippy } from 'solid-tippy';
import { values } from 'build:invisiproxy';

const { tag } = values.fontCipher;
const targets = document.querySelectorAll<HTMLElement>(
	'.tippy-button, .pr-tippy'
);
const cipherContent = (reference: Element) => {
	const content = document.createElement(tag);
	content.textContent = reference.getAttribute('data-tippy-content') ?? '';
	return content;
};
if (targets.length)
	createRoot(() => {
		for (const target of targets)
			useTippy(() => target, {
				hidden: true,
				props: {
					delay: 50,
					placement: 'bottom',
					...(tag && {
						ignoreAttributes: true,
						content: cipherContent,
					}),
				},
			});
	});
