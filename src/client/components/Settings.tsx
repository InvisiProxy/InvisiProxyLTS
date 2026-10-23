import { route, translate, values } from '../document-helpers.tsx';
import { SettingToggle, TransportSelect } from './SettingsControls.tsx';

export default function Settings() {
	return (
		<div class="settings-content">
			<div class="settings-header">
				<div>
					<p class="cseltitle-main">{translate('settings.title')}</p>
				</div>
				<button
					type="button"
					class="close-settings-btn"
					aria-label={translate('settings.close')}
				>
					×
				</button>
			</div>
			<div class="settings-content-body">
				<div class="settings-column">
					<section class="settings-card">
						<h2 class="cseltitle">
							{translate('settings.language.title')}
						</h2>
						<p class="setting-description">
							{translate('settings.language.description')}
						</p>
						<div class="setting-field">
							<select
								id="settings-language"
								class="language-list"
								aria-label={translate('settings.language.title')}
							>
								<option value="auto" selected>
									{translate('settings.language.automatic')}
								</option>
								{values.locales.map(({ code, name }) => (
									<option value={code}>{name}</option>
								))}
							</select>
						</div>
					</section>
					<section class="settings-card">
						<h2 class="cseltitle">
							{translate('settings.browsing.title')}
						</h2>
						<TransportSelect
							id="settings-transport"
							containerId="transport-setting"
						/>
						<div class="setting-field">
							<label for="settings-search-engine">
								{translate('settings.browsing.searchEngine')}
							</label>
							<select
								id="settings-search-engine"
								name="search-engine"
								class="search-engine-list"
								aria-label={translate(
									'settings.browsing.searchEngine'
								)}
							>
								{[
									values.labels.Startpage,
									values.labels.DuckDuckGo,
									values.labels.Bing,
									values.labels.Brave,
								].map((engine) => (
									<option
										value={engine}
										selected={engine === values.defaultSearch}
									>
										{engine}
									</option>
								))}
							</select>
						</div>
						<div class="setting-field">
							<label for="settings-theme">
								{translate('settings.browsing.theme')}
							</label>
							<select
								id="settings-theme"
								class="theme-list"
								aria-label={translate('settings.browsing.theme')}
							>
								<option value="dark" selected>
									{translate('settings.browsing.themes.dark')}
								</option>
								<option value="light">
									{translate('settings.browsing.themes.light')}
								</option>
								<option value="nord">
									{translate('settings.browsing.themes.nord')}
								</option>
							</select>
						</div>
						<SettingToggle
							label={translate('settings.browsing.autocomplete')}
							description={translate(
								'settings.browsing.autocompleteDescription'
							)}
							class="useac"
							checked
						/>
					</section>
					<section class="settings-card settings-card-last">
						<h2 class="cseltitle">
							{translate('settings.advanced.title')}
						</h2>
						<SettingToggle
							label={translate('settings.advanced.tor')}
							description={translate(
								'settings.advanced.torDescription'
							)}
							class="useonion"
						/>
						<div class="setting-field">
							<label for="settings-region">
								{translate('settings.advanced.region')}
							</label>
							<select id="settings-region" class="region-list">
								<option value="off">
									{translate('settings.advanced.regions.default')}
								</option>
								<option value="eu">
									{translate('settings.advanced.regions.sweden')}
								</option>
								<option value="jp">
									{translate('settings.advanced.regions.japan')}
								</option>
								<option value="patreon">Patreon</option>
							</select>
						</div>
						<div class="setting-field">
							<label for="settings-window">
								{translate('settings.advanced.window')}
							</label>
							<select id="settings-window" class="cloak-type-list">
								<option value="none" selected>
									{translate('settings.advanced.windowDefault')}
								</option>
								<option value="blank">about:blank</option>
								<option value="blob">blob</option>
							</select>
						</div>
					</section>
				</div>
				<div class="settings-column">
					<section class="settings-card">
						<h2 class="cseltitle">{translate('settings.tab.title')}</h2>
						<p class="setting-description">
							{translate('settings.tab.description')}
						</p>
						<div class="setting-field">
							<label for="icon-list">
								{translate('settings.tab.iconPreset')}
							</label>
							<select id="icon-list">
								<option value="" selected>
									{translate('settings.tab.selectPreset')}
								</option>
								<option value={values.labels.Google}>
									{values.labels.Google}
								</option>
								<option value={values.labels.Bing}>
									{values.labels.Bing}
								</option>
								<option
									value={`${values.labels.Google} Drive`}
								>{`${values.labels.Google} Drive`}</option>
								<option value="Gmail">Gmail</option>
							</select>
						</div>
						<label class="setting-label" for="settings-tab-title">
							{translate('settings.tab.tabTitle')}
						</label>
						<form id="titleform" class="cloakform">
							<input
								id="settings-tab-title"
								type="text"
								placeholder={translate(
									'settings.tab.tabTitlePlaceholder'
								)}
								spellcheck="false"
							/>
							<input
								type="submit"
								value={translate('settings.tab.apply')}
							/>
						</form>
						<label class="setting-label" for="settings-tab-icon">
							{translate('settings.tab.iconUrl')}
						</label>
						<form id="iconform" class="cloakform">
							<input
								id="settings-tab-icon"
								type="text"
								placeholder="https://example.com/favicon.ico"
								spellcheck="false"
							/>
							<input
								type="submit"
								value={translate('settings.tab.apply')}
							/>
						</form>
						<a class="settings-help-link" href={route('/questions')}>
							{translate('settings.tab.findIcon')}
						</a>
					</section>
					<section class="settings-card">
						<h2 class="cseltitle">
							{translate('settings.privacy.title')}
						</h2>
						<SettingToggle
							label={translate('settings.privacy.hideAds')}
							description={translate(
								'settings.privacy.hideAdsDescription'
							)}
							class="hideads"
							checked
						/>
						<SettingToggle
							label={translate('settings.privacy.hideHistory')}
							description={translate(
								'settings.privacy.hideHistoryDescription'
							)}
							class="history-toggle"
						/>
						<SettingToggle
							label={translate('settings.privacy.preventLeaks')}
							description={translate(
								'settings.privacy.preventLeaksDescription'
							)}
							class="sandbox"
						/>
					</section>
				</div>
			</div>
		</div>
	);
}
