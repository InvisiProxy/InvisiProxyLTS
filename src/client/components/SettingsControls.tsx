import type { ParentProps } from 'solid-js';
import { translate, values } from '../document-helpers.tsx';

export function SettingsSection(
	props: ParentProps<{ title: string; class: string; last?: boolean }>
) {
	return (
		<details
			class={`settings-card settings-collapse ${props.class}${props.last ? ' settings-card-last' : ''}`}
		>
			<summary class="settings-collapse-header">
				<h2 class="cseltitle">{props.title}</h2>
				<span class="proxy-settings-arrow" aria-hidden="true" />
			</summary>
			<div class="settings-collapse-body">{props.children}</div>
		</details>
	);
}

export function SettingToggle(props: {
	label: string;
	description: string;
	class: string;
	checked?: boolean;
}) {
	return (
		<label class="setting-row">
			<span class="setting-copy">
				<span class="setting-label">{props.label}</span>
				<span class="setting-description">{props.description}</span>
			</span>
			<input
				type="checkbox"
				class={`switch ${props.class}`}
				checked={props.checked}
			/>
		</label>
	);
}

export function AddressField(props: {
	id: string;
	formId: string;
	label: string;
	description: string;
	placeholder: string;
	invalid: string;
}) {
	return (
		<div class="setting-field">
			<label for={props.id}>{props.label}</label>
			<span class="setting-description">{props.description}</span>
			<form id={props.formId} class="cloakform address-form">
				<input
					id={props.id}
					type="text"
					placeholder={props.placeholder}
					spellcheck="false"
					autocomplete="off"
					data-invalid={props.invalid}
				/>
				<input type="submit" value={translate('settings.tab.apply')} />
			</form>
		</div>
	);
}

const transportValue = (name: string) =>
	values.aliases[`prefixes/${name}`] || name;

export function TransportSelect(props: { id: string; containerId: string }) {
	return (
		<div id={props.containerId} class="transport-setting setting-field">
			<label for={props.id}>
				{translate('settings.browsing.transport')}
			</label>
			<select
				id={props.id}
				class="transport-list"
				aria-label={translate('settings.browsing.transport')}
			>
				<option value={transportValue('libcurl')} selected>
					Libcurl
				</option>
				<option value={transportValue('epoxy')}>Epoxy</option>
			</select>
		</div>
	);
}

export function VersionSelect(props: { id: string; containerId: string }) {
	return (
		<div id={props.containerId} class="version-setting setting-field">
			<label for={props.id}>
				{translate('proxySettings.proxyVersion')}
			</label>
			<select
				id={props.id}
				class="version-list"
				aria-label={translate('proxySettings.proxyVersion')}
			>
				<option value="v3" selected>
					Scramjet V3 (Beta)
				</option>
				<option value="v2">Scramjet 2.1.0</option>
			</select>
			<span class="setting-description">
				{translate('proxySettings.proxyVersionDescription')}
			</span>
		</div>
	);
}
