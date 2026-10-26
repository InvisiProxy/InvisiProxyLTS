import { createRoot } from 'solid-js';
import { useTippy } from 'solid-tippy';

const targets = document.querySelectorAll<HTMLElement>(
	'.tippy-button, .pr-tippy'
);
if (targets.length)
	createRoot(() => {
		for (const target of targets)
			useTippy(() => target, {
				hidden: true,
				props: { delay: 50, placement: 'bottom' },
			});
	});
