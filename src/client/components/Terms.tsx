import { translate, Translation } from '../document-helpers.tsx';

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
				</p>
				<p>
					<strong>{translate('privacy.updated')}</strong>
				</p>
				<h4>{translate('privacy.what.title')}</h4>
				<p>
					<Translation id="privacy.what.body" />
				</p>
				<h4>{translate('privacy.data.title')}</h4>
				<p>
					<Translation id="privacy.data.body" />
				</p>
				<h4 id="Security">{translate('privacy.security.title')}</h4>
				<p>
					<Translation id="privacy.security.body" />
				</p>
				<p>{translate('privacy.security.intro')}</p>
				<p>{translate('privacy.security.performance')}</p>
				<p>{translate('privacy.security.compatibility')}</p>
				<p>{translate('privacy.security.censorship')}</p>
				<p>{translate('privacy.security.fingerprinting')}</p>
				<p>{translate('privacy.security.transparency')}</p>
				<p>{translate('privacy.security.randomisation')}</p>
				<p>{translate('privacy.security.encryption')}</p>
				<p>{translate('privacy.security.audits')}</p>
				<h4 id="Cookies">{translate('privacy.usage.title')}</h4>
				<p>{translate('privacy.usage.storage')}</p>
				<p>{translate('privacy.usage.cookies')}</p>
				<p>{translate('privacy.usage.serviceWorkers')}</p>
				<p>{translate('privacy.usage.consent')}</p>
				<h4 id="Changes">{translate('privacy.changes.title')}</h4>
				<p>{translate('privacy.changes.body')}</p>
				<h4 id="Credit">{translate('privacy.contact.title')}</h4>
				<p>
					{translate('privacy.contact.body')} d9tcv6vgx@mozmail.com{' '}
					<br />
					<br />
				</p>
			</div>
		</div>
	);
}
