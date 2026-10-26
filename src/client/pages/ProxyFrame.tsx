import type { JSX, ParentProps } from 'solid-js';
import { Inline, Keywords, route, translate } from '../document-helpers.tsx';
import {
	ScramjetScripts,
	PageScripts,
	PageDescription,
} from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import ProxyPreloads from '../components/ProxyPreloads.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Settings from '../components/Settings.tsx';

function FrameMenu(
	props: ParentProps<{
		buttonId: string;
		menuId: string;
		title: string;
		button: JSX.Element;
	}>
) {
	return (
		<div class="dropdown-parent" title={props.title}>
			<button
				type="button"
				class="link-button"
				id={props.buttonId}
				aria-label={props.title}
			>
				{props.button}
			</button>
			<section
				class="dropdown-settings"
				id={props.menuId}
				tabindex="0"
				aria-label={props.title}
			>
				<div class="settings-content frame-menu">
					<div class="settings-header">
						<p class="cseltitle-main">{props.title}</p>
						<button
							type="button"
							class="close-settings-btn"
							aria-label={translate('frame.closeMenu')}
						>
							×
						</button>
					</div>
					{props.children}
				</div>
			</section>
		</div>
	);
}

export default function ProxyFrame() {
	return (
		<>
			<Keywords />
			<AntiExfil />
			<div class="loader loader-active">
				<img
					class="pr-logo"
					src={route('/assets/img/hero.webp')}
					alt="Scramjet"
				/>
				<p class="loader-text">{translate('frame.loading')}</p>
				<div class="loader-w"></div>
			</div>
			<div class="omnibar" id="pr-sj">
				<a
					class="logo"
					href={route('/browsing')}
					aria-label="InvisiProxy Logo"
				>
					<span class="sr-only">InvisiProxy browsing</span>
				</a>
				<button type="button" id="omnibar-back" title="Back">
					<i class="fas fa-arrow-left"></i>
				</button>
				<button type="button" id="omnibar-forward" title="Forward">
					<i class="fas fa-arrow-right"></i>
				</button>
				<button type="button" id="omnibar-reload" title="Refresh">
					<i class="fas fa-redo-alt"></i>
				</button>
				<div class="search-box">
					<input
						class="glowbutton"
						id="search-input"
						type="text"
						placeholder={translate('frame.searchPlaceholder')}
						spellcheck="false"
						autocomplete="off"
					/>
					<button
						type="button"
						id="bookmark-toggle"
						title={translate('frame.addBookmark')}
						aria-label={translate('frame.addBookmark')}
						aria-pressed="false"
						data-add={translate('frame.addBookmark')}
						data-remove={translate('frame.removeBookmark')}
					>
						<i class="far fa-star" aria-hidden="true"></i>
					</button>
					<ul id="autocomplete"></ul>
				</div>
				<FrameMenu
					buttonId="tabs-button"
					menuId="tabs-menu"
					title={translate('frame.tabs')}
					button={
						<>
							<i class="fas fa-columns" aria-hidden="true"></i>
							<span id="tab-count">1</span>
						</>
					}
				>
					<ul
						id="tabs-list"
						class="frame-menu-list"
						data-untitled={translate('frame.newTab')}
						data-close={translate('frame.closeTab')}
					></ul>
					<button
						type="button"
						id="new-tab"
						class="frame-menu-action"
					>
						<i class="fas fa-plus" aria-hidden="true"></i>
						{translate('frame.newTab')}
					</button>
				</FrameMenu>
				<FrameMenu
					buttonId="bookmarks-button"
					menuId="bookmarks-menu"
					title={translate('frame.bookmarks')}
					button={<i class="fas fa-bookmark" aria-hidden="true"></i>}
				>
					<ul
						id="bookmarks-list"
						class="frame-menu-list"
						data-remove={translate('frame.removeBookmark')}
					></ul>
					<p id="bookmarks-empty" class="setting-description">
						{translate('frame.noBookmarks')}
					</p>
				</FrameMenu>
				<div title="Settings" class="dropdown-parent">
					<button
						class="link-button"
						type="button"
						tabindex="0"
						aria-label="Settings"
					>
						<i class="fas fa-cog pulse" aria-hidden="true"></i>
					</button>
					<section
						class="dropdown-settings"
						tabindex="0"
						aria-label="Settings menu"
					>
						<div id="csel">
							<Settings />
						</div>
					</section>
				</div>
				<button type="button" id="omnibar-toggle" title="Hide Bar">
					<i class="fas fa-chevron-up"></i>
				</button>
			</div>
			<Keywords />
			<div id="tab-frames">
				<iframe
					title="Proxied page"
					id="frame"
					class="proxy-tab active-tab"
					allow="fullscreen"
					autofocus={true}
				></iframe>
			</div>
			<Keywords />
		</>
	);
}

export function Head() {
	return (
		<>
			<title>InvisiProxy LTS</title>
			<PageDescription />
			<ProxyPreloads />
			<HeadContent />
			<ScramjetScripts utilities />
			<PageScripts registerServiceWorker />
			<Inline>
				<script
					src={route('assets/js/frame.js', 'inline')}
					defer={true}
					innerHTML=""
				/>
			</Inline>
		</>
	);
}
