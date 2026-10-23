import { route, translate } from '../document-helpers.tsx';

export default function Footer() {
	return (
		<>
			<div class="footerflex">
				<div class="footerbrand">
					<h3>
						<a
							href={route('/')}
							title={translate('footer.homeTitle')}
						>
							InvisiProxy
						</a>
					</h3>
					<p>{translate('footer.tagline')}</p>
					<div class="logo-potato"></div>
				</div>
				<div class="footerlist">
					<h3>{translate('footer.dependencies')}</h3>
					<ul>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/solidjs')}
								title={translate('footer.solidjs')}
							>
								SolidJS{' '}
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/wispurr')}
								title={translate('footer.wispurr')}
							>
								Wispurr{' '}
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/nord-theme')}
								title={translate('footer.nord')}
							>
								Nord Theme
							</a>
						</li>
					</ul>
				</div>
				<div class="footerlist">
					<h3>{translate('footer.transports')}</h3>
					<ul>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/libcurl')}
							>
								Libcurl
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/epoxy')}
							>
								Epoxy
							</a>
						</li>
					</ul>
				</div>
				<div class="footerlist">
					<h3>{translate('footer.services')}</h3>
					<ul>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/scramjet')}
								title={translate('footer.scramjet')}
							>
								Scramjet
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/wisp')}
								title={translate('footer.wisp')}
							>
								{translate('footer.wispLabel')}
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/proxy-transports')}
								title={translate('footer.proxyTransports')}
							>
								Proxy Transports
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/merp')}
								title={translate('footer.merp')}
							>
								{translate('footer.merpLabel')}
							</a>
						</li>
					</ul>
				</div>
				<div class="footerlist">
					<h3>{translate('footer.about')}</h3>
					<ul>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github')}
								title={translate('footer.githubTitle')}
							>
								GitHub
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/patreon')}
								title={translate('footer.patreonTitle')}
							>
								Patreon
							</a>
						</li>
						<li>
							<a
								href={route('/privacy')}
								title={translate('footer.privacy')}
							>
								{translate('footer.privacy')}
							</a>
						</li>
						<li>
							<a
								href={route('/credits')}
								title={translate('footer.creditsTitle')}
							>
								{translate('footer.credits')}
							</a>
						</li>
					</ul>
				</div>
				<div class="footerlist">
					<a href="#top" title={translate('footer.backToTop')}>
						<span class="sr-only">
							{translate('footer.backToTop')}
						</span>
						<i
							class="fas fa-angle-double-up"
							aria-hidden="true"
						></i>
					</a>
				</div>
			</div>
			<div class="footersocials">
				<a
					target="_blank"
					rel="noopener noreferrer"
					href={route('/github')}
					title={translate('footer.followGithub')}
				>
					<span class="sr-only">
						{translate('footer.followGithub')}
					</span>
					<i class="fab fa-github" aria-hidden="true"></i>
				</a>
				<a
					target="_blank"
					rel="noopener noreferrer"
					href={route('/patreon')}
					title={translate('footer.patreonTitle')}
				>
					<span class="sr-only">
						{translate('footer.patreonTitle')}
					</span>
					<i class="fab fa-patreon" aria-hidden="true"></i>
				</a>
				<a
					target="_blank"
					rel="noopener noreferrer"
					href={route('/kofi')}
					title={translate('footer.followKofi')}
				>
					<span class="sr-only">
						{translate('footer.followKofi')}
					</span>
					<i class="fas fa-coffee" aria-hidden="true"></i>
				</a>
			</div>
			<p class="copyright">InvisiProxy LTS 2020-2026</p>
		</>
	);
}
