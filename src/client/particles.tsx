import { createSignal, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';
import type { ISourceOptions } from '@tsparticles/engine';
import { loadBasic } from '@tsparticles/basic';
import { loadInteractivityPlugin } from '@tsparticles/plugin-interactivity';
import { loadParticlesLinksInteraction } from '@tsparticles/interaction-particles-links';
import { Particles, initParticlesEngine } from '@tsparticles/solid';

function themeOptions(): ISourceOptions {
	const styles = getComputedStyle(document.documentElement);
	const value = (name: string) => styles.getPropertyValue(name).trim();
	const number = (name: string) => parseFloat(value(name)) || 0.3;
	return {
		background: { color: { value: value('--particles-bg') || '#0d1117' } },
		fullScreen: { enable: true, zIndex: -1 },
		detectRetina: true,
		fpsLimit: 60,
		interactivity: { events: { resize: { enable: true } } },
		particles: {
			color: { value: value('--particles-color') || '#ffffff' },
			move: {
				enable: true,
				speed: number('--particles-mv-spd'),
				direction: 'none',
				outModes: { default: 'out' },
			},
			number: { density: { enable: true }, value: 100 },
			opacity: {
				value: { min: 0.1, max: number('--particles-op-max') },
				animation: {
					enable: true,
					speed: number('--particles-op-spd'),
					sync: false,
				},
			},
			shape: { type: 'circle' },
			size: {
				value: { min: 1, max: 5 },
				animation: {
					enable: true,
					speed: number('--particles-sz-spd'),
					sync: false,
				},
			},
			links: {
				enable: true,
				distance: 150,
				color: value('--particles-links') || '#ffffff',
				opacity: parseFloat(value('--particles-links-opacity')) || 0.4,
				width: 1,
			},
		},
		pauseOnBlur: true,
		pauseOnOutsideViewport: true,
	};
}

function Background() {
	const [options, setOptions] = createSignal(themeOptions());
	let theme = document.documentElement.className;
	const observer = new MutationObserver(() => {
		if (document.documentElement.className === theme) return;
		theme = document.documentElement.className;
		setOptions(themeOptions());
	});
	observer.observe(document.documentElement, { attributeFilter: ['class'] });
	onCleanup(() => observer.disconnect());
	return <Particles id="tsparticles" options={options()} />;
}

window.$invisiParticles?.();
window.$invisiParticles = undefined;
const root = document.getElementById('background');
if (root)
	initParticlesEngine(async (engine) => {
		await loadBasic(engine);
		await loadInteractivityPlugin(engine);
		await loadParticlesLinksInteraction(engine);
	}).then(() => {
		if (root.isConnected)
			window.$invisiParticles = render(() => <Background />, root);
	});
