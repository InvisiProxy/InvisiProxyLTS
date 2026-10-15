import { route } from '../document-helpers.tsx';
import Settings from './Settings.tsx';
import MirrorLinks from './MirrorLinks.tsx';

export default function Header() {
	return (
		<>
			<div class="brand-logo-container">
				<div
					class="logo"
					role="img"
					aria-label="InvisiProxy Logo"
				></div>
				<a
					href={route('/')}
					class="brand pulse"
					title="InvisiProxy Home Page"
				>
					{' '}
					InvisiProxy v8.1.x{' '}
				</a>
			</div>
			<div class="navbar-group">
				<ul class="navbar-1" aria-label="Primary navigation">
					<li style="margin-left: 0">
						<a
							class="line"
							href={route('/browsing')}
							title="Browse - Bypass restrictions on the web"
						>
							Browse
						</a>
					</li>
					<li>
						<a
							class="line"
							href={route('/apps')}
							title="Applications - Browse a selection of useful applications"
						>
							Apps
						</a>
					</li>
					<li>
						<a
							class="line"
							href={route('/partners')}
							title="Partners - Explore our partner projects"
						>
							Partners
						</a>
					</li>
					<li>
						<a
							class="line"
							href={route('/documentation')}
							title="Documentation - Detailed information and guides"
						>
							Docs
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
								aria-label="More navigation options"
							>
								<i class="fas fa-bars"></i>
							</button>
						</div>
						<section
							class="dropdown-child"
							tabindex="0"
							aria-label="More options submenu"
						>
							<ul class="subnavbar">
								<li>
									<a
										href={route('/questions')}
										title="FAQ - Frequently asked questions and answers"
									>
										FAQ
									</a>
								</li>
								<li>
									<a
										href={route('/credits')}
										title="Credits - Acknowledgements and contributions"
									>
										Credits
									</a>
								</li>
								<li>
									<a
										href={route('/privacy')}
										title="Privacy Policy - Information on user privacy"
									>
										Privacy
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
								aria-label="Settings menu"
								tabindex="0"
							>
								<i class="fas fa-cog" aria-hidden="true"></i>
							</button>
						</div>
						<section
							class="dropdown-settings"
							tabindex="0"
							aria-label="Settings menu"
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
				aria-label="Toggle navigation menu"
			/>
			<label
				for="mnavecb"
				class="mnave"
				aria-label="Toggle navigation menu"
			>
				<span class="mnavebutton" aria-hidden="true"></span>
			</label>
			<div class="mobile-overlay">
				<ul class="navbar-1">
					<li>
						<a href={route('/browsing')}>Browse</a>
					</li>
					<li>
						<a href={route('/partners')}>Partners</a>
					</li>
					<li>
						<a href={route('/apps')}>Applications</a>
					</li>
					<li>
						<a href={route('/documentation')}>Docs</a>
					</li>
					<li>
						<a href={route('/questions')}>FAQ</a>
					</li>
					<li>
						<a href={route('/credits')}>Credits</a>
					</li>
					<li>
						<a href={route('/privacy')}>TOS</a>
					</li>
				</ul>
			</div>
		</>
	);
}
