import { route, translate } from '../document-helpers.tsx';
import Settings from './Settings.tsx';
import MirrorLinks from './MirrorLinks.tsx';

export default function Header() {
	return (
		<>
			<div class="brand-logo-container">
				<div
					class="logo"
					role="img"
					aria-label={translate('header.logoLabel')}
				></div>
				<a
					href={route('/')}
					class="brand pulse"
					title={translate('header.homeTitle')}
				>
					{' '}
					InvisiProxy v8.2.x{' '}
				</a>
			</div>
			<div class="navbar-group">
				<ul
					class="navbar-1"
					aria-label={translate('header.primaryNav')}
				>
					<li style="margin-left: 0">
						<a
							class="line"
							href={route('/browsing')}
							title={translate('header.browse.title')}
						>
							{translate('header.browse.label')}
						</a>
					</li>
					<li>
						<a
							class="line"
							href={route('/apps')}
							title={translate('header.apps.title')}
						>
							{translate('header.apps.label')}
						</a>
					</li>
					<li>
						<a
							class="line"
							href={route('/partners')}
							title={translate('header.partners.title')}
						>
							{translate('header.partners.label')}
						</a>
					</li>
					<li>
						<a
							class="line"
							href={route('/documentation')}
							title={translate('header.docs.title')}
						>
							{translate('header.docs.label')}
						</a>
					</li>
				</ul>
				<ul class="navbar">
					<li class="dropdown-parent dmenu">
						<div class="pulse white-text">
							<button
								class="link-button"
								type="button"
								tabindex="0"
								aria-label={translate('header.moreOptions')}
							>
								<i class="fas fa-bars"></i>
							</button>
						</div>
						<section
							class="dropdown-child"
							tabindex="0"
							aria-label={translate('header.moreOptionsMenu')}
						>
							<ul class="subnavbar">
								<li>
									<a
										href={route('/questions')}
										title={translate('header.faq.title')}
									>
										{translate('header.faq.label')}
									</a>
								</li>
								<li>
									<a
										href={route('/credits')}
										title={translate(
											'header.credits.title'
										)}
									>
										{translate('header.credits.label')}
									</a>
								</li>
								<li>
									<a
										href={route('/privacy')}
										title={translate(
											'header.privacy.title'
										)}
									>
										{translate('header.privacy.label')}
									</a>
								</li>
							</ul>
						</section>
					</li>
					<li class="mirror-links-nav">
						<MirrorLinks />
					</li>
					<li class="dropdown-parent smenu">
						<div class="white-text">
							<button
								class="link-button settings-toggle"
								type="button"
								aria-label={translate('header.settingsMenu')}
								tabindex="0"
							>
								<i class="fas fa-cog" aria-hidden="true"></i>
							</button>
						</div>
						<section
							class="dropdown-settings"
							tabindex="0"
							aria-label={translate('header.settingsMenu')}
						>
							<div id="csel">
								<Settings />
							</div>
						</section>
					</li>
				</ul>
			</div>
			<input
				id="mnavecb"
				type="checkbox"
				aria-label={translate('header.toggleMenu')}
			/>
			<label
				for="mnavecb"
				class="mnave"
				aria-label={translate('header.toggleMenu')}
			>
				<span class="mnavebutton" aria-hidden="true"></span>
			</label>
			<div class="mobile-overlay">
				<ul class="navbar-1">
					<li>
						<a href={route('/browsing')}>
							{translate('header.browse.label')}
						</a>
					</li>
					<li>
						<a href={route('/partners')}>
							{translate('header.partners.label')}
						</a>
					</li>
					<li>
						<a href={route('/apps')}>
							{translate('header.apps.mobileLabel')}
						</a>
					</li>
					<li>
						<a href={route('/documentation')}>
							{translate('header.docs.label')}
						</a>
					</li>
					<li>
						<a href={route('/questions')}>
							{translate('header.faq.label')}
						</a>
					</li>
					<li>
						<a href={route('/credits')}>
							{translate('header.credits.label')}
						</a>
					</li>
					<li>
						<a href={route('/privacy')}>
							{translate('header.privacy.mobileLabel')}
						</a>
					</li>
				</ul>
			</div>
		</>
	);
}
