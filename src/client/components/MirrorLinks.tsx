import { route } from '../document-helpers.tsx';

export default function MirrorLinks() {
	return (
		<>
			<button
				type="button"
				class="link-button mirror-links-toggle"
				popovertarget="mirror-links-menu"
					title="Get another InvisiProxy link"
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2" />
					<path d="M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2" />
				</svg>
				<span>Mirrors</span>
			</button>
			<section
				id="mirror-links-menu"
				class="mirror-links-menu"
				popover="auto"
				aria-labelledby="mirror-links-title"
			>
				<div class="mirror-links-header">
					<h2 id="mirror-links-title">Mirror links</h2>
					<button
						type="button"
						class="mirror-links-close"
						popovertarget="mirror-links-menu"
						popovertargetaction="hide"
						aria-label="Close mirror links"
					>
						×
					</button>
				</div>
				<p class="setting-description">
					Get another link to keep using InvisiProxy. Links are
					restocked frequently.
				</p>
				<button
					id="dispense-link"
					type="button"
					class="fancybutton glowbutton link-button"
					data-endpoint={route('/api/link')}
				>
					Get a random link
				</button>
				<p id="dispenser-status" role="status" />
				<a
					id="dispensed-link"
					href={route('/')}
					aria-label="Open another InvisiProxy mirror"
					hidden
					target="_blank"
					rel="noopener noreferrer"
				>
					Open mirror link
				</a>
				<br></br>
				<p class="setting-description">
					If you have any issues with links please create a GitHub
					issue.
				</p>
			</section>
		</>
	);
}
