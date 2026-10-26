import { route } from 'build:invisiproxy';

(() => {
	const button = document.getElementById('dispense-link');
	const status = document.getElementById('dispenser-status');
	const result = document.getElementById('dispensed-link');
	if (!button || !status || !result) return;
	if (location.pathname === route('/links'))
		document.getElementById('mirror-links-menu').showPopover();

	button.addEventListener('click', async () => {
		button.disabled = true;
		status.textContent = 'Finding a mirror link…';
		result.hidden = true;
		result.removeAttribute('href');
		result.textContent = '';
		try {
			const response = await fetch(button.dataset.endpoint, {
				method: 'POST',
				cache: 'no-store',
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Please try again later.');
			const url = new URL(data.link);
			if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Please try again later.');
			result.href = url.href;
			result.textContent = url.href;
			result.hidden = false;
			status.textContent = 'Your mirror link is ready!';
		} catch (error) {
			status.textContent = error instanceof Error ? error.message : 'Unable to get a link. Please try again later.';
		} finally {
			button.disabled = false;
		}
	});
})();
