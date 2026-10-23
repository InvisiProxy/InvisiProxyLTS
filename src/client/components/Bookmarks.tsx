import { translate } from '../document-helpers.tsx';

export default function Bookmarks() {
	return (
		<div class="settings-content">
			<div class="settings-header">
				<p class="cseltitle-main">{translate('bookmarks.title')}</p>
				<i class="far fa-times-circle close-settings-btn"></i>
			</div>
			<div class="settings-content-body">
				<div class="csel-container-left">
					<p class="cseltitle">{translate('bookmarks.newSave')}</p>
					<form id="titleform" class="cloakform">
						<input
							type="text"
							placeholder={translate(
								'bookmarks.titlePlaceholder'
							)}
							spellcheck={false}
						/>
						<input
							type="submit"
							value={translate('settings.tab.apply')}
						/>
					</form>
					<form id="urlform" class="cloakform">
						<input
							type="text"
							placeholder={translate('bookmarks.urlPlaceholder')}
							spellcheck={false}
						/>
						<input
							type="submit"
							value={translate('settings.tab.apply')}
						/>
					</form>
				</div>
				<div class="settings-right-column">
					<p class="cseltitle">{translate('bookmarks.saved')}</p>
					<ul class="bookmarks-list">
						<li>{translate('bookmarks.bookmark')}</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
