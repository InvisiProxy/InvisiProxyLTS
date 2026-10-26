import { route, translate } from '../document-helpers.tsx';

export default function MirrorLinks() {
	return (
		<>
			<button
				type="button"
				class="link-button mirror-links-toggle"
				popovertarget="mirror-links-menu"
				aria-label={translate('mirrors.title')}
				title={translate('mirrors.toggleTitle')}
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
				<span>{translate('mirrors.toggle')}</span>
			</button>
			<section
				id="mirror-links-menu"
				class="mirror-links-menu"
				popover="auto"
				aria-labelledby="mirror-links-title"
			>
				<div class="mirror-links-header">
					<h2 id="mirror-links-title">
						{translate('mirrors.title')}
					</h2>
					<button
						type="button"
						class="mirror-links-close"
						popovertarget="mirror-links-menu"
						popovertargetaction="hide"
						aria-label={translate('mirrors.close')}
					>
						×
					</button>
				</div>
				<p class="setting-description">
					{translate('mirrors.description')}
				</p>
				<button
					id="dispense-link"
					type="button"
					class="fancybutton glowbutton link-button"
					data-endpoint={route('/api/link')}
				>
					{translate('mirrors.getLink')}
				</button>
				<p id="dispenser-status" role="status" />
				<a
					id="dispensed-link"
					href={route('/')}
					aria-label={translate('mirrors.openLabel')}
					hidden
					target="_blank"
					rel="noopener noreferrer"
				>
					{translate('mirrors.open')}
				</a>
				<br></br>
				<p class="setting-description">{translate('mirrors.issues')}</p>
			</section>
		</>
	);
}
