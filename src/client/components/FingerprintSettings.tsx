import { translate } from '../document-helpers.tsx';
import {
	presetCategories as categories,
	userAgentPresets,
} from '../../browser/fingerprint.ts';
import { SettingsSection } from './SettingsControls.tsx';

export default function FingerprintSettings() {
	return (
		<SettingsSection
			title={translate('settings.fingerprint.title')}
			class="collapse-fingerprint"
		>
			<p class="setting-description">
				{translate('settings.fingerprint.description')}
			</p>
			<div class="fingerprint-views" role="tablist">
				{[...categories, 'custom'].map((view) => (
					<button type="button" class="fingerprint-view" role="tab">
						{translate(`settings.fingerprint.views.${view}`)}
					</button>
				))}
			</div>
			{categories.map((category) => (
				<div class="fingerprint-panel" role="tabpanel">
					<div class="fingerprint-presets">
						{userAgentPresets
							.filter((preset) => preset.category === category)
							.map((preset) => (
								<input
									type="button"
									class="fingerprint-preset"
									value={preset.label}
								/>
							))}
					</div>
					{category === 'bot' && (
						<p class="setting-description">
							{translate('settings.fingerprint.botWarning')}
						</p>
					)}
				</div>
			))}
			<div class="fingerprint-panel" role="tabpanel">
				<form class="cloakform fingerprint-custom">
					<input
						type="text"
						class="fingerprint-custom-input"
						placeholder={translate(
							'settings.fingerprint.customPlaceholder'
						)}
						aria-label={translate('settings.fingerprint.customLabel')}
						spellcheck="false"
						autocomplete="off"
						data-invalid={translate('settings.fingerprint.invalidCustom')}
					/>
					<input
						type="submit"
						value={translate('settings.tab.apply')}
					/>
				</form>
			</div>
			<div class="fingerprint-status-row">
				<span
					class="setting-description fingerprint-status"
					data-template={translate('settings.fingerprint.current')}
					data-default={translate('settings.fingerprint.default')}
				>
					{translate('settings.fingerprint.current', {
						name: translate('settings.fingerprint.default'),
					})}
				</span>
				<input
					type="button"
					class="fingerprint-reset"
					value={translate('settings.fingerprint.reset')}
				/>
			</div>
		</SettingsSection>
	);
}
