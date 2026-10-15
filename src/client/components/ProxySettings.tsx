import { route } from '../document-helpers.tsx';
import { SettingToggle, TransportSelect } from './SettingsControls.tsx';

export default function ProxySettings() {
	return (
		<>
			<p><br></br>
				We offer premium domains, beta features, residential ISP connections and faster
				speeds. You can donate on{' '}
				<a
					href={route('/patreon')}
					target="_blank"
					rel="noopener noreferrer"
				>
					Patreon
				</a>
				.
			</p>
			<details id="settings-panel" class="pr-settings">
				<summary class="proxy-settings-header">
					<h2>Proxy Preferences</h2>
					<span class="proxy-settings-arrow" aria-hidden="true" />
				</summary>
				<div class="proxy-settings-grid">
					<div class="settings-card">
						<h3 class="cseltitle">Connection</h3>
						<TransportSelect
							id="browsing-transport"
							containerId="browsing-transport-setting"
						/>
						<div class="setting-field">
							<label for="browsing-region">Proxy region</label>
							<select id="browsing-region" class="region-list">
								<option value="off">Default</option>
								<option value="eu">Sweden</option>
								<option value="jp">Japan</option>
								<option value="patreon">Patreon</option>
							</select>
						</div>
						<SettingToggle
							label="Tor browsing"
							description="Route through Tor using libcurl."
							class="useonion"
						/>
					</div>
					<div class="proxy-settings-grid-right">
						<div class="settings-card">
							<h3 class="cseltitle">Privacy</h3>
							<SettingToggle
								label="Hide ads"
								description="Block ads while browsing."
								class="hideads"
								checked
							/>
							<SettingToggle
								label="Hide history"
								description="Reduce saved history. May affect some sites."
								class="history-toggle"
								checked
							/>
						</div>
						<button
							class="settings-card link-button settings-toggle"
							type="button"
							aria-label="View more settings"
						>
							<span class="cseltitle">View more settings</span>
							<i class="fas fa-cog" aria-hidden="true"></i>
						</button>
					</div>
				</div>
			</details>
			<p class="proxy-settings-footer">
				Need another link? Click the{' '}
				<button
					type="button"
					class="mirror-links-inline"
					popovertarget="mirror-links-menu"
				>
					mirror links button
				</button>
				.
			</p>
		</>
	);
}
