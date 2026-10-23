import { translate } from '../document-helpers.tsx';

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
				<option value="libcurl" selected>
					Libcurl
				</option>
				<option value="epoxy">Epoxy</option>
			</select>
		</div>
	);
}
