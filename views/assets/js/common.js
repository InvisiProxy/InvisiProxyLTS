import { values, route, appPresets, appIcon } from 'build:invisiproxy';
import { BareCompatibleClient } from '@mercuryworkshop/proxy-transports';
import { proxiedFrameUrl } from '../../../src/browser/frame-url.ts';
/* -----------------------------------------------
/* Authors: QuiteAFancyEmerald, Yoct, b4kt, and OlyB
/* GNU Affero General Public License v3.0: https://www.gnu.org/licenses/agpl-3.0.en.html
/* MAIN InvisiProxy LTS Common Script
/* ----------------------------------------------- */

// Encase everything in a new scope so that variables are not accidentally
// attached to the global scope.
(() => {

/* GENERAL URL HANDLERS */

// To be defined after the document has fully loaded.
let sjBundle = null;
const FRAME_URL_KEY = `${values.storageNamespace}-frame-url`;
const OPEN_URL_KEY = `${values.storageNamespace}-open-url`;
const SJ_PREFIX_TAG = 'sj:';

// This is used for stealth mode when visiting external sites.
const goFrame = (url) => {
    localStorage.setItem(FRAME_URL_KEY, url);
    if (location.pathname !== route("/s")) {
      localStorage.setItem(OPEN_URL_KEY, url);
      location.href = route("/s") + (values.development ? '' : `?cache=${values.cacheKey}`);
    } else navigateLocalFrame(url);
  },
  navigateLocalFrame = (target) => {
    const windowFrame = document.getElementById('frame');
    const rawUrl = proxiedFrameUrl(target);
    if (!windowFrame || !rawUrl) return;
    document.getElementsByClassName('loader')[0]?.classList.add('loader-active');
    const tryGo = () => {
      const f = sjBundle && sjBundle.frame;
      if (f && typeof f.go === 'function') f.go(rawUrl);
    };
    if (sjBundle && sjBundle.ready) tryGo();
    else
      window.addEventListener('s-ready', tryGo, { once: true });
  },
  /* Used to set functions for the goProx object at the bottom.
   * See the goProx object at the bottom for some usage examples
   * on the URL handlers, omnibox functions, and the sjUrl function.
   */
  urlHandler = (parser) => (url, mode) => {
    if (!url) return;
    if (parser === sjUrl) mode = 'stealth';
    url = parser(url);
    mode = `${mode}`.toLowerCase();
    if (mode === 'stealth' || mode == 1) goFrame(url);
    else if (mode === 'window' || mode == 0) location.href = url;
    else return url;
  },
  openBlankCloak = () => {
      try {
        const newWindow = window.open('about:blank', '_blank');
        if (!newWindow) return null;
        const iframe = newWindow.document.createElement('iframe');
        const styles = {
          border: 'none',
          width: '100%',
          height: '100%',
          margin: '0',
          overflow: 'hidden',
        };
        Object.assign(iframe.style, styles);
        iframe.allow = 'fullscreen';
        iframe.src = location.href;
        newWindow.document.body.appendChild(iframe);
        return newWindow;
      } catch (e) {
        console.error('Blank cloaking failed:', e);
        return null;
      }
    },
  openBlobCloak = () => {
    try {
      const icon =
        (document.querySelector("link[rel*='icon']") || {}).href || '';
      const html = `<!DOCTYPE html><html><head><title>${
        document.title
      }</title><link rel="icon" href="${icon}"><style>html,body{height:100%;margin:0;padding:0;overflow:hidden;}</style></head><body><iframe allow="fullscreen" style="border:none;width:100%;height:100%;margin:0;overflow:hidden;" src="${
        location.href
      }"></iframe></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, '_blank');
      return newWindow;
    } catch (e) {
      console.error('Blob cloaking failed:', e);
      return null;
    }
  };

/* READ SETTINGS */

const storageId = `${values.storageNamespace}-storage`,
  storageObject = () => JSON.parse(localStorage.getItem(storageId)) || {},
  readStorage = (name) => storageObject()[name];

/* OMNIBOX */

const searchEngines = Object.freeze({
    [values.labels["Startpage"]]: 'startpage.com/sp/search?query=',
    [values.labels["Google"]]: 'google.com/search?q=',
    [values.labels["Bing"]]: 'bing.com/search?q=',
    [values.labels["DuckDuckGo"]]: 'duckduckgo.com/?q=',
    [values.labels["Brave"]]: 'search.brave.com/search?q=',
  }),
  defaultSearch = values.defaultSearch,
  autocompletes = Object.freeze({
    // Startpage has used both Google's and Bing's autocomplete.
    // For now, just use Bing.
    [values.labels["Startpage"]]: 'www.bing.com/AS/Suggestions?csr=1&cvid=0&qry=',
    [values.labels["Google"]]: 'www.google.com/complete/search?client=gws-wiz&callback=_&q=',
    [values.labels["Bing"]]: 'www.bing.com/AS/Suggestions?csr=1&cvid=0&qry=',
    [values.labels["DuckDuckGo"]]: 'duckduckgo.com/ac/?q=',
    [values.labels["Brave"]]: 'search.brave.com/api/suggest?q=',
  }),
  autocompleteUrls = Object.values(autocompletes).map(
    (url) => 'https://' + url
  ),
  responseDelimiter = '\ue000',
  formatSuggestion = (
    suggestion,
    delimiters,
    newDelimiters = [responseDelimiter]
  ) => {
    for (let i = 0; i < delimiters.length; i++)
      suggestion = suggestion.replaceAll(
        delimiters[i],
        newDelimiters[i] || newDelimiters[0]
      );
    return suggestion;
  },
  responseHandlers = Object.freeze({
    [values.labels["Startpage"]]: (jsonData) => responseHandlers[values.labels["Bing"]](jsonData),
    [values.labels["Google"]]: (jsonData) =>
      jsonData[0].map(([suggestion]) =>
        formatSuggestion(suggestion, ['<b>', '</b>'])
      ),
    [values.labels["Bing"]]: (jsonData) =>
      jsonData.s.map(({ q }) => formatSuggestion(q, ['\ue000', '\ue001'])),
    [values.labels["DuckDuckGo"]]: (jsonData) => jsonData.map(({ phrase }) => phrase),
    [values.labels["Brave"]]: (jsonData) => jsonData[1],
  });

// Get the autocomplete results for a given search query in JSON format.
let activeACController = null;
const requestAC = async (baseUrl, query, params = {}) => {
  if (!sjBundle?.ready || !sjBundle.frame) return;

  const transport =
    sjBundle.frame.fetchHandler?.client?.transport ||
    sjBundle.controller?.transport;
  if (!transport || typeof transport.request !== 'function') return;

  if (transport.ready === false && typeof transport.init === 'function') {
    try {
      await transport.init();
    } catch {
      return;
    }
  }

  if (activeACController) {
    try {
      activeACController.abort();
    } catch {}
  }
  const controller = new AbortController();
  activeACController = controller;

  const targetUrl = baseUrl + encodeURIComponent(query);
  let remoteUrl;
  try {
    remoteUrl = new URL(targetUrl);
  } catch {
    return;
  }

  let responseJSON;
  try {
    const response = await transport.request(
      remoteUrl,
      'GET',
      null,
      [['accept', 'application/json, text/plain, */*']],
      controller.signal
    );
    if (controller.signal.aborted) return;

    const status = typeof response.status === 'number' ? response.status : 0;
    if (status < 200 || status >= 300) return;

    let text;
    if (response.body instanceof ReadableStream) {
      text = await new Response(response.body).text();
    } else if (response.body instanceof ArrayBuffer) {
      text = new TextDecoder().decode(response.body);
    } else if (typeof response.body === 'string') {
      text = response.body;
    } else {
      text = await new Response(response.body).text();
    }

    try {
      responseJSON = JSON.parse(text);
    } catch {
      try {
        responseJSON = JSON.parse(text.replace(/^[^[{]*|[^\]}]*$/g, ''));
      } catch {
        return;
      }
    }
  } catch {
    return;
  }

  if (controller.signal.aborted) return;

  updateAC(
    params.listElement,
    responseHandlers[params.searchType](responseJSON),
    Date.parse(params.time)
  );
};

let lastUpdated = Date.parse(new Date().toUTCString());
const updateAC = (listElement, searchResults, time) => {
  if (time < lastUpdated) return;
  else lastUpdated = time;
  // Update the data for the results.
  listElement.textContent = '';
  for (let i = 0; i < searchResults.length; i++) {
    let suggestion = document.createElement('li');
    suggestion.tabIndex = 0;
    suggestion.append(
      ...searchResults[i].split(responseDelimiter).map((text, bolded) => {
        if (bolded % 2) {
          let node = document.createElement('b');
          node.textContent = text;
          return node;
        }
        return text;
      })
    );
    listElement.appendChild(suggestion);
  }
};

// Default search engine is set to Startpage. Intended to work just like the usual
// bar at the top of a browser.
const getSearchTemplate = (
    searchEngine = searchEngines[readStorage('SearchEngine')] ||
      searchEngines[defaultSearch]
  ) => `https://${searchEngine}%s`,
  // Like an omnibox, return the results of a search engine if search terms are
  // provided instead of a URL.
  search = (input) => {
    try {
      // Return the input if it is already a valid URL.
      // eg: https://example.com, https://example.com/test?q=param
      return new URL(input) + '';
    } catch (e) {
      // Continue if it is invalid.
    }

    try {
      // Check if the input is valid when http:// is added to the start.
      // eg: example.com, https://example.com/test?q=param
      const url = new URL(`http://${input}`);
      // Return only if the hostname has a TLD or a subdomain.
      if (url.hostname.indexOf('.') != -1) return url + '';
    } catch (e) {
      // Continue if it is invalid.
    }

    // Treat the input as a search query instead of a website.
    return getSearchTemplate().replace('%s', encodeURIComponent(input));
  },
  sjUrl = (url) => SJ_PREFIX_TAG + search(url)

const preparePage = () => {
  if (window.$invisiScramjet?.ready) sjBundle = window.$invisiScramjet;
  else
    window.addEventListener(
      's-ready',
      () => {
        sjBundle = window.$invisiScramjet;
      },
      { once: true }
    );

  // Object.freeze prevents goProx from accidentally being edited.
  const goProx = Object.freeze({
    scramjet: urlHandler(sjUrl),
  });

  const iconLifetime = 7 * 24 * 60 * 60 * 1000;
  const iconCache =
    'caches' in window
      ? caches.open(`${values.storageNamespace}-app-icons`).catch(() => null)
      : Promise.resolve(null);
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith(`${values.storageNamespace}-app-icon-`)) localStorage.removeItem(key);
  } catch {}

  const showIcon = (image, blob) => {
    const objectUrl = URL.createObjectURL(blob);
    image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
    image.addEventListener('error', () => URL.revokeObjectURL(objectUrl), { once: true });
    image.src = objectUrl;
  };

  // Attach event listeners using goProx to specific app menus that need it.
  const loadAppIcon = async (image, destination, iconUrl) => {
    const cacheKey = `${location.origin}/${values.storageNamespace}-icon/${encodeURIComponent(`${destination} ${iconUrl}`)}`;
    const cache = await iconCache;
    try {
      const cached = await cache?.match(cacheKey);
      if (cached && Date.now() - Number(cached.headers.get('x-saved')) < iconLifetime) {
        showIcon(image, await cached.blob());
        return;
      }
    } catch {}

    try {
      if (!window.$invisiScramjet?.ready) {
        await new Promise((resolve) =>
          window.addEventListener('s-ready', resolve, { once: true })
        );
      }
      const client = new BareCompatibleClient(window.$invisiScramjet.controller.transport);
      const siteUrl = new URL(destination);
      const fetchIcon = async (url) => {
        if (!['https:', 'http:'].includes(url.protocol)) return null;
        try {
          const response = await client.fetch(url.href);
          if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return null;
          return await response.blob();
        } catch {
          return null;
        }
      };
      const pageIcon = async () => {
        try {
          const page = await client.fetch(siteUrl.href);
          if (!page.ok) return null;
          const html = new DOMParser().parseFromString(await page.text(), 'text/html');
          const icon = html.querySelector('link[rel~="icon"][href], link[rel="apple-touch-icon"][href]');
          if (!icon) return null;
          const pageUrl = page.url || siteUrl.href;
          const base = html.querySelector('base[href]');
          return fetchIcon(new URL(icon.getAttribute('href'), base ? new URL(base.getAttribute('href'), pageUrl) : pageUrl));
        } catch {
          return null;
        }
      };
      const parent = siteUrl.hostname.split('.').slice(-2).join('.');

      let blob =
        (iconUrl && (await fetchIcon(new URL(iconUrl, siteUrl)))) ||
        (await fetchIcon(new URL('/favicon.ico', siteUrl))) ||
        (await pageIcon());
      if (!blob && parent !== siteUrl.hostname)
        blob = await fetchIcon(new URL(`https://www.google.com/s2/favicons?domain=${parent}&sz=128`));
      if (!blob) return;
      showIcon(image, blob);

      // Keep icons across visits, including before the proxy initializes.
      if (blob.size <= 256 * 1024)
        cache
          ?.put(cacheKey, new Response(blob, { headers: { 'content-type': blob.type, 'x-saved': String(Date.now()) } }))
          .catch(() => {});
    } catch (error) {
      console.warn('Unable to load application icon:', destination, error);
    }
  };

  const prSet = (id, type) => {
    const formElement = document.getElementById(id);
    if (!formElement) return;

    let prUrl = formElement.querySelector('input[type=text]'),
      prAC = formElement.querySelector('#autocomplete'),
      prGo2 = document.querySelectorAll(`#${id}.pr-go2, #${id} .pr-go2`);

    const goProxMethod = (mode) => () => {
        goProx[type](prUrl.value, mode);
      },
      searchMode = type === 'scramjet' ? 'stealth' : 'window';

    if (prUrl) {
      let enableSearch = false,
        onCooldown = false;

      prUrl.addEventListener('keydown', (e) => {
        if (e.code === 'Enter') goProxMethod(searchMode)();
      });

      if (prAC) {
        // Get autocomplete search results when typing in the omnibox.
        prUrl.addEventListener('input', async (e) => {
          // Prevent excessive fetch requests by restricting when requests are made.
          if (enableSearch && !onCooldown) {
            if (!e.target.value) {
              prAC.textContent = '';
              return;
            }
            const query = e.target.value;
            if (e.isTrusted) {
              onCooldown = true;
              setTimeout(() => {
                onCooldown = false;
                // Refresh the autocomplete results after the cooldown ends.
                if (query !== e.target.value)
                  e.target.dispatchEvent(new Event('input'));
              }, 600);
            }

            // Get autocomplete results from the selected search engine.
            let searchType = readStorage('SearchEngine');
            if (!(searchType in autocompletes)) searchType = defaultSearch;
            const requestTime = new Date().toUTCString();
            requestAC('https://' + autocompletes[searchType], query, {
              searchType: searchType,
              listElement: prAC,
              time: requestTime,
            });
          }
        });

        // Show autocomplete results only if the omnibox is in focus.
        prUrl.addEventListener('focus', () => {
          // Don't show results if they were disabled by the user.
          if (readStorage('UseAC') !== false) {
            enableSearch = true;
            prAC.classList.toggle('display-off', false);
          }
          prUrl.select();
        });
        prUrl.addEventListener('blur', (e) => {
          enableSearch = false;

          // Do not remove the autocomplete result list if it was being clicked.
          if (e.relatedTarget) {
            e.relatedTarget.focus();
            if (document.activeElement.parentNode === prAC) return;
          }

          prAC.classList.toggle('display-off', true);
        });

        // Make the corresponding search query if a given suggestion was clicked.
        prAC.addEventListener('click', (e) => {
          e.target.focus();
          prUrl.value = document.activeElement.textContent;
          goProxMethod(searchMode)();
        });
      }
    }

    prGo2.forEach((element) => {
      element.addEventListener('click', goProxMethod('stealth'));
    });
  };

  const iconSettled = (image) =>
    !image.src || image.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });

  const letterIcon = (name) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#d5484f"/><text x="32" y="43" font-family="sans-serif" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">${
        [...name][0]?.toUpperCase().replace(/[&<>]/g, '') || '?'
      }</text></svg>`
    )}`;

  const appIcons = [...document.querySelectorAll('[data-app]')].map((button) => {
    const app = appPresets[button.dataset.app];
    if (!app) return null;
    if (button.tagName === 'BUTTON')
      button.addEventListener('click', () => goProx.scramjet(app.url, 'stealth'));
    const image = button.querySelector('img');
    return (
      image &&
      loadAppIcon(image, app.url, appIcon(app)).then(() => {
        if (!image.src) image.src = letterIcon(app.name);
        return iconSettled(image);
      })
    );
  });

  const appTabs = [...document.querySelectorAll('.app-tab')];
  appTabs.forEach((tab, index) =>
    tab.addEventListener('click', () => {
      appTabs.forEach((other) => {
        other.classList.toggle('is-active', other === tab);
        other.setAttribute('aria-selected', String(other === tab));
      });
      document.querySelectorAll('.app-grid [data-group]').forEach((card) => {
        card.hidden = index > 0 && card.dataset.group !== String(index - 1);
      });
    })
  );

  const appsLoader = document.getElementById('apps-loader');
  if (appsLoader) {
    let loaderGone = false;
    appsLoader.addEventListener('animationend', () => (loaderGone = true), { once: true });
    Promise.allSettled(appIcons).then(() => {
      if (!loaderGone) appsLoader.classList.add('apps-loader-done');
    });
  }

  prSet('pr-sj', 'scramjet');

  const banner = document.getElementById('banner');
  if (banner) {
    fetch(route("/assets/json/splash.json"), {
      mode: 'same-origin',
    }).then((response) => {
      response.json().then((splashList) => {
        banner.firstElementChild.innerHTML =
          splashList[(Math.random() * splashList.length) | 0];
      });
    });
  }

  if (window.self === window.top) {
    const launchType = readStorage('LaunchType');
    let newWindow = null;

    if (launchType === 'blank') {
      newWindow = openBlankCloak();
    } else if (launchType === 'blob') {
      newWindow = openBlobCloak();
    }

    if (newWindow) {
      window.location.replace('about:blank');
      setTimeout(() => {
        window.close();
      }, 100);
    }
  }
};
if ('loading' === document.readyState)
  addEventListener('DOMContentLoaded', preparePage);
else preparePage();
})();
