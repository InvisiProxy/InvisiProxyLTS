import { route, translate, Translation, values } from '../document-helpers.tsx';
import {
	AddressField,
	SettingToggle,
	TransportSelect,
} from './SettingsControls.tsx';

const links = {
	patreon: (text: string) => (
		<a href={route('/patreon')} target="_blank" rel="noopener noreferrer">
			{text}
		</a>
	),
	mirrors: (text: string) => (
		<button
			type="button"
			class="mirror-links-inline"
			popovertarget="mirror-links-menu"
		>
			{text}
		</button>
	),
	faq: (text: string) => <a href={route('/questions')}>{text}</a>,
};

export default function ProxySettings() {
	return (
		<>
			<p>
				<br></br>
				<Translation id="proxySettings.donate" tags={links} />
			</p>
			<details id="settings-panel" class="pr-settings">
				<summary class="proxy-settings-header">
					<h2>{translate('proxySettings.title')}</h2>
					<span class="proxy-settings-arrow" aria-hidden="true" />
				</summary>
				<div class="proxy-settings-grid">
					<div class="settings-card">
						<h3 class="cseltitle">
							{translate('proxySettings.connection')}
						</h3>
						<TransportSelect
							id="browsing-transport"
							containerId="browsing-transport-setting"
						/>
						<div class="setting-field">
							<label for="browsing-region">
								{translate('settings.advanced.region')}
							</label>
							<select id="browsing-region" class="region-list">
								<option value="off">
									{translate(
										'settings.advanced.regions.default'
									)}
								</option>
								<option value="eu">
									{translate(
										'settings.advanced.regions.sweden'
									)}
								</option>
								<option value="jp">
									{translate(
										'settings.advanced.regions.japan'
									)}
								</option>
								{values.patreon && (
									<option value="patreon">Patreon</option>
								)}
							</select>
						</div>
						<SettingToggle
							label={translate('settings.advanced.tor')}
							description={translate(
								'settings.advanced.torDescription'
							)}
							class="useonion"
						/>
						<SettingToggle
							label={translate('settings.privacy.blockWebrtc')}
							description={translate(
								'settings.privacy.blockWebrtcDescription'
							)}
							class="block-webrtc"
						/>
						<SettingToggle
							label={translate('proxySettings.searchNavFix')}
							description={translate(
								'proxySettings.searchNavFixDescription'
							)}
							class="search-nav-fix"
						/>
						<SettingToggle
							label={translate(
								'proxySettings.experimentalSiteFixes'
							)}
							description={translate(
								'proxySettings.experimentalSiteFixesDescription'
							)}
							class="experimental-site-fixes"
						/>
					</div>
					<div class="proxy-settings-grid-right">
						<div class="settings-card">
							<h3 class="cseltitle">
								{translate('settings.privacy.title')}
							</h3>
							<SettingToggle
								label={translate('settings.privacy.hideAds')}
								description={translate(
									'settings.privacy.hideAdsDescription'
								)}
								class="hideads"
								checked
							/>
							<SettingToggle
								label={translate(
									'settings.privacy.hideHistory'
								)}
								description={translate(
									'proxySettings.hideHistoryDescription'
								)}
								class="history-toggle"
							/>
							<SettingToggle
								label={translate(
									'proxySettings.randomizeFingerprint'
								)}
								description={translate(
									'proxySettings.randomizeFingerprintDescription'
								)}
								class="randomize-fingerprint"
							/>
							<div class="setting-field">
								<label for="settings-window">
									{translate('settings.advanced.window')}
								</label>
								<select id="settings-window" class="cloak-type-list">
									<option value={values.cloakTypes.none} selected>
										{translate('settings.advanced.windowDefault')}
									</option>
									<option value={values.cloakTypes.blank}>about:blank</option>
									<option value={values.cloakTypes.blob}>blob</option>
								</select>
							</div>
							<AddressField
								id="custom-wisp"
								formId="wispform"
								label={translate('proxySettings.customWisp')}
								description={translate(
									'proxySettings.customWispDescription'
								)}
								placeholder="wss://wisp.example.com/"
								invalid={translate('proxySettings.invalidWisp')}
							/>
						</div>
						<button
							class="settings-card link-button settings-toggle"
							type="button"
							aria-label={translate('proxySettings.moreSettings')}
						>
							<span class="cseltitle">
								{translate('proxySettings.moreSettings')}
							</span>
							<i class="fas fa-cog" aria-hidden="true"></i>
						</button>
					</div>
				</div>
			</details>
			<p class="proxy-settings-footer">
				<Translation id="proxySettings.anotherLink" tags={links} />
			</p>
		</>
	);
}
