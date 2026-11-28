import { translate, Translation } from '../document-helpers.tsx';

const securityPoints = [
	'performance',
	'compatibility',
	'censorship',
	'fingerprinting',
	'encryption',
	'transparency',
] as const;

export default function Terms() {
	return (
		<div id="tos" class="box-clear textm">
			<div style="margin: 2%">
				<div class="text-center">
					<h1 class="bigtitle">{translate('privacy.title')}</h1>
					<h4>{translate('privacy.subtitle')}</h4>
				</div>
				<p>
					<strong>{translate('privacy.effective')}</strong>
					<br />
					<strong>{translate('privacy.updated')}</strong>
				</p>
				<h4>{translate('privacy.what.title')}</h4>
				<p>
					<Translation id="privacy.what.body" />
				</p>
				<h4 id="Data">{translate('privacy.data.title')}</h4>
				<p>
					<Translation id="privacy.data.body" />
				</p>
				<h4 id="Advertising">
					{translate('privacy.advertising.title')}
				</h4>
				<p>
					<Translation id="privacy.advertising.body" />
				</p>
				<h4 id="Security">{translate('privacy.security.title')}</h4>
				<p>
					<Translation id="privacy.security.body" />
				</p>
				<ul>
					{securityPoints.map((point) => (
						<li>
							<Translation id={`privacy.security.${point}`} />
						</li>
					))}
				</ul>
				<h4 id="Cookies">{translate('privacy.usage.title')}</h4>
				<ul>
					<li>
						<Translation id="privacy.usage.storage" />
					</li>
					<li>
						<Translation id="privacy.usage.cookies" />
					</li>
					<li>
						<Translation id="privacy.usage.serviceWorkers" />
					</li>
					<li>
						<Translation id="privacy.usage.consent" />
					</li>
				</ul>
				<h4 id="Changes">{translate('privacy.changes.title')}</h4>
				<p>
					<Translation id="privacy.changes.body" />
				</p>
				<h4 id="Contact">{translate('privacy.contact.title')}</h4>
				<p>
					{translate('privacy.contact.body')} d9tcv6vgx@mozmail.com
					<br />
				</p>
			</div>
		</div>
	);
}
