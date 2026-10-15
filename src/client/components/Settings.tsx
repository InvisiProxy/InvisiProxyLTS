import { route, values } from '../document-helpers.tsx';
import { SettingToggle, TransportSelect } from './SettingsControls.tsx';

export default function Settings() {
	return (
		<div class="settings-content">
			<div class="settings-header">
				<div>
					<p class="cseltitle-main">Settings</p>
				</div>
				<button
					type="button"
					class="close-settings-btn"
					aria-label="Close settings"
				>
					×
				</button>
			</div>
			<div class="settings-content-body">
				<section class="settings-card">
					<h2 class="cseltitle">Tab appearance</h2>
					<p class="setting-description">
						Customize the title and icon shown in your browser tab.
					</p>
					<div class="setting-field">
						<label for="icon-list">Icon preset</label>
						<select id="icon-list">
							<option value="" selected>
								Select an icon preset
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
						Tab title
					</label>
					<form id="titleform" class="cloakform">
						<input
							id="settings-tab-title"
							type="text"
							placeholder="Enter a tab title…"
							spellcheck="false"
						/>
						<input type="submit" value="Apply" />
					</form>
					<label class="setting-label" for="settings-tab-icon">
						Icon URL
					</label>
					<form id="iconform" class="cloakform">
						<input
							id="settings-tab-icon"
							type="text"
							placeholder="https://example.com/favicon.ico"
							spellcheck="false"
						/>
						<input type="submit" value="Apply" />
					</form>
					<a class="settings-help-link" href={route('/questions')}>
						Find an icon URL →
					</a>
				</section>
				<section class="settings-card">
					<h2 class="cseltitle">Browsing</h2>
					<TransportSelect
						id="settings-transport"
						containerId="transport-setting"
					/>
					<div class="setting-field">
						<label for="settings-search-engine">
							Search engine
						</label>
						<select
							id="settings-search-engine"
							name="search-engine"
							class="search-engine-list"
							aria-label="Search engine"
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
						<label for="settings-theme">Theme</label>
						<select
							id="settings-theme"
							class="theme-list"
							aria-label="Theme"
						>
							<option value="dark" selected>
								Dark
							</option>
							<option value="light">Light</option>
							<option value="nord">Nordish</option>
						</select>
					</div>
					<SettingToggle
						label="Autocomplete"
						description="Show proxied search suggestions."
						class="useac"
						checked
					/>
				</section>
				<section class="settings-card">
					<h2 class="cseltitle">Privacy</h2>
					<SettingToggle
						label="Hide ads"
						description="Block ads while browsing."
						class="hideads"
						checked
					/>
					<SettingToggle
						label="Hide history"
						description="Reduce saved browsing history. May affect some sites."
						class="history-toggle"
						checked
					/>
					<SettingToggle
						label="Prevent tab leaks"
						description="Restrict popups and new tabs. May break some sites."
						class="sandbox"
					/>
				</section>
				<section class="settings-card">
					<h2 class="cseltitle">Advanced</h2>
					<SettingToggle
						label="Tor browsing"
						description="Route through Tor using libcurl."
						class="useonion"
					/>
					<div class="setting-field">
						<label for="settings-region">Proxy region</label>
						<select id="settings-region" class="region-list">
							<option value="off">Default</option>
							<option value="eu">Sweden</option>
							<option value="jp">Japan</option>
							<option value="patreon">Patreon</option>
						</select>
					</div>
					<div class="setting-field">
						<label for="settings-window">Window type</label>
						<select id="settings-window" class="cloak-type-list">
							<option value="none" selected>
								Default
							</option>
							<option value="blank">about:blank</option>
							<option value="blob">blob</option>
						</select>
					</div>
				</section>
			</div>
		</div>
	);
}
