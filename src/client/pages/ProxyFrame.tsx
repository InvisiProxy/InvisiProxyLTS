import { Cooking, route, values } from '../document-helpers.tsx';
import {
	ScramjetScripts,
	PageScripts,
	PageDescription,
} from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import ProxyPreloads from '../components/ProxyPreloads.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Settings from '../components/Settings.tsx';

export default function ProxyFrame() {
	return (
		<>
			<Cooking />
			<AntiExfil />
			<div class="loader loader-active">
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
						placeholder="Type a URL or search..."
						spellcheck="false"
						autocomplete="off"
					/>
					<ul id="autocomplete"></ul>
				</div>
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
			<Cooking />
			<iframe
				title="Proxied page"
				id="frame"
				allow="fullscreen"
				autofocus={true}
			></iframe>
			<Cooking />
			<script
				innerHTML={`
      const windowFrame = document.getElementById('frame');
      const omnibar = document.getElementById('pr-sj');
      const toggle = document.getElementById('omnibar-toggle');
      const backArrow = document.getElementById('omnibar-back');
      const forwardArrow = document.getElementById('omnibar-forward');
      const reloadArrow = document.getElementById('omnibar-reload');
      let hidden = false;

      toggle.addEventListener('click', () => {
        hidden = !hidden;
        omnibar.classList.toggle('omnibar-hidden', hidden);
        toggle.classList.toggle('omnibar-s', hidden);
        toggle.innerHTML = \`<i class="fas fa-chevron-\${hidden ? 'down' : 'up'}"></i>\`;
        (hidden ? document.body : omnibar).appendChild(toggle);
        toggle.title = hidden ? 'Show Bar' : 'Hide Bar';
      });

      backArrow.addEventListener('click', () => {
        history.back();
      });
      forwardArrow.addEventListener('click', () => {
        history.forward();
      });
      reloadArrow.addEventListener('click', () => {
        loader.classList.add('loader-active');
        windowFrame.contentWindow.location.reload();
      });

      let statusObject = { isLoading: true, timesErrored: 0 };

      const errorRefresh = () => {
        const shouldRefresh =
          statusObject.timesErrored <= 5 &&
          windowFrame.contentWindow.document.head.querySelector(
            "meta[itemprop='http-status'][content='404']"
          );
        if (shouldRefresh) {
          statusObject.timesErrored++;
          windowFrame.contentWindow.location.reload();
        } else statusObject.timesErrored = 0;
        return shouldRefresh;
      };

      const applySandbox = () => {
        const sandboxEnabled =
          localStorage.getItem('${values.storageNamespace}-storage') &&
          JSON.parse(localStorage.getItem('${values.storageNamespace}-storage')).Sandbox;
        const sandboxPermissions =
          'allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-same-origin allow-scripts allow-downloads';

        if (sandboxEnabled) {
          windowFrame.setAttribute('sandbox', sandboxPermissions);
        } else {
          windowFrame.removeAttribute('sandbox');
        }
      };

      const loader = document.getElementsByClassName('loader')[0];
      const updateLoader = () => {
        const frameDocument = windowFrame.contentDocument;
        if (frameDocument?.URL === 'about:blank') return;

        statusObject.isLoading =
          frameDocument ? frameDocument.readyState !== 'complete' : false;

        // Do not remove the loading screen if the page is an error page
        // and should be reloaded.
        if (!statusObject.isLoading && frameDocument && errorRefresh()) {
          statusObject.isLoading = true;
          return;
        }

        // Display the loading screen if statusObject.isLoading is true.
        loader.classList.toggle('loader-active', statusObject.isLoading);
      };

      // Reattach load events whenever the content window has changed.
      const loadHandler = () => {
        setTimeout(() => {
          const frameDocument = windowFrame.contentDocument;
          if (!frameDocument) {
            updateLoader();
            return;
          }
          windowFrame.contentWindow.addEventListener('beforeunload', () => {
            loader.classList.toggle('loader-active', true);
          });
          frameDocument.addEventListener(
            'readystatechange',
            updateLoader
          );
          updateLoader();
          applySandbox();
        });
      };

      const keyboard = navigator.keyboard;
      const syncEscapeLock = () => {
        if (!keyboard || !keyboard.lock) return;
        if (document.fullscreenElement) {
          keyboard.lock(['Escape']).catch(() => {});
        } else if (keyboard.unlock) {
          keyboard.unlock();
        }
      };
      document.addEventListener('fullscreenchange', syncEscapeLock);
      window.addEventListener('focus', syncEscapeLock);

      windowFrame.addEventListener('load', loadHandler);
      loadHandler();
    `}
			/>
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
			<link
				rel="stylesheet"
				href="https://unpkg.com/tippy.js@6/dist/backdrop.css"
			/>
			<link
				rel="stylesheet"
				href="https://unpkg.com/tippy.js@6/animations/shift-away.css"
			/>
			<PageScripts registerServiceWorker />
		</>
	);
}
