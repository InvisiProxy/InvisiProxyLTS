import { values, route, maskText } from 'build:invisiproxy';
import { BareCompatibleClient } from '@mercuryworkshop/proxy-transports';
import {
  isMobileBrowser,
  openTransport,
  proxyRegions,
  selectedTransport,
  selectedWisp,
} from '../../../src/browser/transport.ts';
import { customWispUrl } from '../../../src/browser/chain.ts';
import {
  customUserAgent,
  customUserAgentValue,
  presetCategories,
  presetLabel,
  storedCategory,
  storedUserAgent,
  userAgentPresets,
} from '../../../src/browser/fingerprint.ts';
/* -----------------------------------------------
/* Authors: Yoct, OlyB, b4kt
/* GNU Affero General Public License v3.0: https://www.gnu.org/licenses/agpl-3.0.en.html
/* Settings Menu
/* ----------------------------------------------- */

// Encase everything in a new scope so that variables are not accidentally
// attached to the global scope.
(() => {
// Determine the expiration date of a new cookie.
let date = new Date();
date.setFullYear(date.getFullYear() + 100);
date = date.toUTCString();

const maskCharacters = new RegExp(
  `[­​${values.characters
    .map((entity) =>
      entity.replace(/&#(x?)([\da-f]+);/gi, (_, hex, code) =>
        String.fromCodePoint(Number.parseInt(code, hex ? 16 : 10))
      )
    )
    .join('')}]`,
  'gu'
);

if (!values.usingSEO)
  document.addEventListener('copy', (e) => {
    const selected = document.getSelection()?.toString() || '',
      plain = selected.replace(maskCharacters, '');
    if (!e.clipboardData || plain === selected) return;
    e.clipboardData.setData('text/plain', plain);
    e.preventDefault();
  });

// Cookies will not be used unless necessary. The localStorage API will be used instead.
const storageId = `${values.storageNamespace}-storage`,
  storageObject = () => JSON.parse(localStorage.getItem(storageId)) || {},
  setStorage = (name, value) => {
    let mainStorage = storageObject();
    mainStorage[name] = value;
    localStorage.setItem(storageId, JSON.stringify(mainStorage));
  },
  removeStorage = (name) => {
    let mainStorage = storageObject();
    delete mainStorage[name];
    localStorage.setItem(storageId, JSON.stringify(mainStorage));
  },
  readStorage = (name) => storageObject()[name],
  useStorageArgs = (name, func) => func(readStorage(name)),
  // All cookies should be secure and are intended to work in IFrames.
  // Cookies are site-wide so a choice made on /ja/ also applies to /.
  // Clearing the unscoped copy removes cookies left behind under the old
  // default path (e.g. /ja), which would otherwise shadow the real one.
  setCookie = (name, value) => {
    document.cookie =
      name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure;';
    document.cookie =
      name +
      `=${encodeURIComponent(value)}; expires=${date}; path=/; SameSite=None; Secure;`;
  },
  removeCookie = (name) => {
    document.cookie =
      name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure;';
    document.cookie =
      name +
      '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/; SameSite=None; Secure;';
  },
  readCookie = async (name) => {
    // Get the first cookie that has the same name.
    for (let cookie of document.cookie.split('; '))
      if (!cookie.indexOf(name + '='))
        // Return the cookie's stored content.
        return decodeURIComponent(cookie.slice(name.length + 1));
  },
  // Customize the page's title.
  pageTitle = (value) => {
    let tag =
      document.getElementsByTagName('title')[0] ||
      document.createElement('title');
    tag.textContent = value;
    document.head.appendChild(tag);
  },
  setIconHref = (href) => {
    let tags = document.querySelectorAll("link[rel*='icon']") || [
      document.createElement('link'),
    ];
    tags.forEach((element) => {
      element.rel = 'icon';
      element.href = href;
      document.head.appendChild(element);
    });
  },
  iconCacheKey = `${values.storageNamespace}-icon-cache`,
  isLocalIcon = (value) => {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin || ['data:', 'blob:'].includes(url.protocol);
    } catch {
      return false;
    }
  },
  iconTransport = async () => {
    if (window.$invisiScramjetInitializing) await window.$invisiScramjetInitializing;
    if (window.$invisiScramjet?.ready) return window.$invisiScramjet.controller.transport;
    if (window.$invisiScramjetError) return null;
    const transportName = selectedTransport(readStorage('Transport'));
    return openTransport(
      route(`/${transportName}/index.mjs`),
      selectedWisp(
        storageObject(),
        transportName,
        proxyRegions(values.patreon),
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${route('/wisp/')}`
      )
    );
  },
  proxiedIcon = async (value) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      const transport = await iconTransport();
      if (!transport) return null;
      const response = await new BareCompatibleClient(transport).fetch(url.href);
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.startsWith('image/')) return null;
      const blob = new Blob([await response.arrayBuffer()], { type });
      if (blob.size > 256 * 1024) return null;
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result), { once: true });
        reader.addEventListener('error', () => reject(reader.error), { once: true });
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Unable to load tab icon:', value, error);
      return null;
    }
  },
  // Set the page's favicon to a new URL.
  pageIcon = (value) => {
    if (isLocalIcon(value)) return setIconHref(value);
    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(iconCacheKey));
    } catch {}
    if (cached?.url === value && cached.data?.startsWith('data:image/'))
      return setIconHref(cached.data);
    proxiedIcon(value).then((data) => {
      if (!data || readStorage('Icon') !== value) return;
      try {
        localStorage.setItem(iconCacheKey, JSON.stringify({ url: value, data }));
      } catch {}
      setIconHref(data);
    });
  },
  // Make a small stylesheet to override a setting from the main stylesheet.
  pageShowAds = () => {
    let advertising = document.createElement('style');
    advertising.id = 'advertising';
    advertising.innerText = '.ad { display:block; }';
    (
      document.head ||
      document.body ||
      document.documentElement ||
      document
    ).appendChild(advertising);
  },
  // Remove the stylesheet made by the function above, if it exists.
  pageHideAds = () => {
    (document.getElementById('advertising') || new Text()).remove();
  },
  offStateKeywords = ['off', 'disabled', 'false', '0'],
  onStateKeywords = ['on', 'enabled', 'true', '1'],
  checkBooleanState = (element) => {
    const state =
      `${(element.querySelector('input:checked,option:checked') || []).value || element.checked}`.toLowerCase();
    return (
      onStateKeywords.includes(state) ||
      (!offStateKeywords.includes(state) && state)
    );
  },
  classEvent = (targetElementList, eventTrigger, eventConstructor = Event) =>
    new eventConstructor(eventTrigger, { target: targetElementList[0] }),
  classUpdateHandler =
    (targetElementList, stateFunction, manualEvent = false, ...params) =>
    () => {
      const state =
        'function' === typeof stateFunction
          ? `${stateFunction(...params)}`.toLowerCase()
          : `${stateFunction}`.toLowerCase();
      [...targetElementList].forEach((updateTarget) => {
        if (updateTarget.children.length > 0) {
          let children = updateTarget.querySelectorAll('input,option');
          const values = Array.from(children, (child) => {
            const childText = `${child.value}`.toLowerCase();
            return offStateKeywords.includes(childText)
              ? offStateKeywords.concat(child.value)
              : onStateKeywords.includes(childText)
                ? onStateKeywords.concat(child.value)
                : [childText];
          });
          const mappedIndex = values.findIndex((possibleValues) =>
            possibleValues.includes(state)
          );
          if ('number' === typeof updateTarget.selectedIndex)
            updateTarget.selectedIndex = mappedIndex;
          else children[mappedIndex].checked = true;
        } else updateTarget.checked = onStateKeywords.includes(state);
      });
      let eventTarget = targetElementList[0];
      if (manualEvent instanceof Event && eventTarget)
        ['input', 'select'].includes(eventTarget.tagName.toLowerCase())
          ? eventTarget.dispatchEvent(manualEvent)
          : eventTarget.querySelectorAll('input').forEach((child) => {
              child.dispatchEvent(manualEvent);
            });
    },
  // These titles and icons are used as autofill templates by settings.html.
  // The icon URLs and tab titles may need to be updated over time.
  presetIcons = Object.freeze({
    '': ' \n ',
    [values.labels["Google"]]: 'Google \n https://www.google.com/favicon.ico',
    [values.labels["Bing"]]:
      'Bing \n https://www.bing.com/sa/simg/favicon-trans-bg-blue-mg-28.ico',
    [`${values.labels["Google"]} Drive`]:
      'Home - Google Drive \n https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
    Gmail:
      'Inbox - Gmail \n https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
  }),
  defaultTheme = 'dark',
  defaultSearch = values.defaultSearch;

// All code in this block is used by menu items that adjust website settings.

/* BEGIN WEBSITE SETTINGS */

if (document.getElementById('csel')) {
  const attachEventListener = (selector, ...args) =>
      (
        document.getElementById(selector) || document.querySelector(selector)
      ).addEventListener(...args),
    settingsMenu = document.getElementById('csel').closest('.dropdown-settings'),
    focusElement = settingsMenu.parentElement.querySelector("button.link-button");

  // TODO: Properly comment this code.
  const attachClassEventListener = (classSelector, ...args) => {
    const eventTrigger = args[0],
      selectorList = [...document.getElementsByClassName(classSelector)];
    selectorList.forEach((element, index) => {
      let otherElements = [...selectorList];
      otherElements.splice(index, 1);
      const elementValue = () =>
        (element.querySelector('input:checked,option:checked') || []).value ||
        element.checked;
      const listeners = ['input', 'select'].includes(
        element.tagName.toLowerCase()
      )
        ? [element]
        : element.querySelectorAll('input');

      listeners.forEach((listener) => {
        listener.addEventListener(...args);
        listener.addEventListener(
          eventTrigger,
          classUpdateHandler(otherElements, elementValue)
        );
      });
    });
  };

  // Allow users to set a custom title with the UI.
  attachEventListener('titleform', 'submit', (e) => {
    e.preventDefault();
    e = e.target.firstElementChild;
    if (e.value) {
      pageTitle(e.value);
      setStorage('Title', e.value);
      e.value = '';
    } else if (confirm('Reset the title to default?')) {
      // Allow users to reset the title to default if nothing is entered.
      focusElement.focus();
      removeStorage('Title');
      pageTitle(maskText("InvisiProxy LTS"));
    }
  });

  // Allow users to set a custom favicon with the UI.
  attachEventListener('iconform', 'submit', (e) => {
    e.preventDefault();
    e = e.target.firstElementChild;
    if (e.value) {
      pageIcon(e.value);
      setStorage('Icon', e.value);
      e.value = '';
    } else if (confirm('Reset the icon to default?')) {
      //    Allow users to reset the favicon to default if nothing is entered.
      focusElement.focus();
      removeStorage('Icon');
      pageIcon(route("assets/ico/favicon.ico"));
    }
  });

  /*

  This is unused in the current settings menu.

  // Allow users to make a new about:blank tab and view the site from there.
  // An iframe of the current page is inserted into the new tab.
  attachEventListener("cselab", "click", () => {
    let win = window.open();
    let iframe = win.document.createElement("iframe");
    iframe.style = "width: 100%; height: 100%; border: none; overflow: hidden; margin: 0; padding: 0; position: fixed; top: 0; left: 0";
    iframe.src = location.href;
    win.document.body.appendChild(iframe);
  });
  */

  // Apply the selected preset's title and icon immediately.
  attachEventListener('icon-list', 'change', (e) => {
    let titleform = document.getElementById('titleform'),
      iconform = document.getElementById('iconform');
    [titleform.firstElementChild.value, iconform.firstElementChild.value] = (
      presetIcons[e.target.value] || ' \n '
    ).split(' \n ');
    if (e.target.value && presetIcons[e.target.value]) {
      titleform.requestSubmit();
      iconform.requestSubmit();
    }
  });

  attachClassEventListener('search-engine-list', 'change', (e) => {
    e.target.value === defaultSearch
      ? removeStorage('SearchEngine')
      : setStorage('SearchEngine', e.target.value);
  });

  attachClassEventListener('theme-list', 'change', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.checked) {
      const theme = readStorage('Theme');
      if (theme) document.documentElement.classList.toggle(theme, false);
      if (e.target.value === defaultTheme) {
        removeStorage('Theme');
      } else {
        setStorage('Theme', e.target.value);
        document.documentElement.classList.toggle(e.target.value, true);
      }
    }
  });

  document.querySelectorAll('.settings-toggle').forEach((button) => {
    button.addEventListener('click', () => focusElement.focus());
  });

  const closeSettings = () => {
    if (settingsMenu.parentElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  };

  settingsMenu
    .querySelector('.close-settings-btn')
    .addEventListener('click', closeSettings);

  settingsMenu.addEventListener('click', (event) => {
    if (!event.target.closest('.settings-content')) {
      closeSettings();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSettings();
    }
  });

  // Allow users to toggle ads with the UI.
  attachClassEventListener('hideads', 'change', (e) => {
    if (checkBooleanState(e.target) === true) {
      pageHideAds();
      setStorage('HideAds', true);
    } else {
      pageShowAds();
      setStorage('HideAds', false);
    }
  });

  attachClassEventListener('useonion', 'change', (e) => {
    const regionList = document.getElementsByClassName('region-list');
    if (checkBooleanState(e.target) === true) {
      classUpdateHandler(regionList, 'off', classEvent(regionList, 'change'))();
      Array.from(regionList).forEach((e) => {
        e.setAttribute('disabled', 'true');
      });
      setStorage('UseSocks5', 'tor');
      classUpdateHandler(document.getElementsByClassName('useonion'), 'on')();
    } else {
      Array.from(regionList).forEach((e) => {
        e.removeAttribute('disabled');
      });

      // Tor will likely never be enabled by default, so removing the cookie
      // here may be better than setting it to false.
      removeStorage('UseSocks5');
    }
    if (e.isTrusted) location.reload();
  });

  attachClassEventListener('useac', 'change', (e) => {
    if (checkBooleanState(e.target) === false) setStorage('UseAC', false);
    else removeStorage('UseAC');
  });

  attachClassEventListener('search-nav-fix', 'change', (e) => {
    if (checkBooleanState(e.target) === true) setStorage('SearchNavFix', true);
    else removeStorage('SearchNavFix');
  });

  attachClassEventListener('experimental-site-fixes', 'change', (e) => {
    if (checkBooleanState(e.target) === true) {
      setStorage('ExperimentalSiteFixes', true);
      setCookie('ExperimentalSiteFixes', 'true');
    } else {
      removeStorage('ExperimentalSiteFixes');
      removeCookie('ExperimentalSiteFixes');
    }
    if (e.isTrusted) location.reload();
  });

  attachClassEventListener('sandbox', 'change', (e) => {
    if (checkBooleanState(e.target) === true) {
      setStorage('Sandbox', true);
    } else {
      removeStorage('Sandbox');
    }
    if (e.isTrusted) location.reload();
  });

  attachClassEventListener('block-webrtc', 'change', (e) => {
    if (checkBooleanState(e.target) === true) setStorage('BlockWebRTC', true);
    else removeStorage('BlockWebRTC');
    if (e.isTrusted) location.reload();
  });

  const attachAddressForm = (formId, key, normalize) => {
    const form = document.getElementById(formId);
    if (!form) return;
    const input = form.querySelector('input[type=text]');
    input.addEventListener('input', () => input.setCustomValidity(''));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) removeStorage(key);
      else {
        const address = normalize(value);
        if (!address) {
          input.setCustomValidity(input.dataset.invalid);
          input.reportValidity();
          return;
        }
        setStorage(key, address);
      }
      location.reload();
    });
  };
  attachAddressForm('wispform', 'CustomWisp', customWispUrl);

  attachClassEventListener('randomize-fingerprint', 'change', (e) => {
    if (checkBooleanState(e.target) === true)
      setStorage('RandomizeFingerprint', true);
    else removeStorage('RandomizeFingerprint');
    try {
      sessionStorage.removeItem(`${storageId}-fingerprint`);
    } catch {}
    if (e.isTrusted) location.reload();
  });

  const storedAgent = readStorage('UserAgent'),
    agentCategory = storedCategory(storedAgent),
    orderedPresets = presetCategories.flatMap((category) =>
      userAgentPresets.filter((preset) => preset.category === category)
    ),
    fingerprintViews = [...document.querySelectorAll('.fingerprint-view')],
    fingerprintPanels = [...document.querySelectorAll('.fingerprint-panel')],
    showFingerprintView = (index) => {
      fingerprintViews.forEach((view, i) => {
        view.classList.toggle('is-active', i === index);
        view.setAttribute('aria-selected', String(i === index));
      });
      fingerprintPanels.forEach((panel, i) => {
        panel.hidden = i !== index;
      });
    };
  fingerprintViews.forEach((view, index) =>
    view.addEventListener('click', () => showFingerprintView(index))
  );
  showFingerprintView(
    agentCategory === 'custom'
      ? presetCategories.length
      : Math.max(0, presetCategories.indexOf(agentCategory))
  );

  document.querySelectorAll('.fingerprint-preset').forEach((button, index) => {
    const preset = orderedPresets[index];
    if (!preset) return;
    button.classList.toggle('is-selected', preset.id === storedAgent);
    button.addEventListener('click', () => {
      setStorage('UserAgent', preset.id);
      location.reload();
    });
  });

  document.querySelectorAll('.fingerprint-custom').forEach((form) => {
    const input = form.querySelector('input[type=text]');
    if (agentCategory === 'custom') input.value = storedUserAgent(storedAgent);
    input.addEventListener('input', () => input.setCustomValidity(''));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const agent = customUserAgent(input.value);
      if (!agent) {
        input.setCustomValidity(input.dataset.invalid);
        input.reportValidity();
        return;
      }
      setStorage('UserAgent', customUserAgentValue(agent));
      location.reload();
    });
  });

  document.querySelectorAll('.fingerprint-reset').forEach((button) =>
    button.addEventListener('click', () => {
      removeStorage('UserAgent');
      location.reload();
    })
  );

  document.querySelectorAll('.fingerprint-status').forEach((status) => {
    const name =
      agentCategory === 'custom'
        ? fingerprintViews.at(-1)?.textContent
        : presetLabel(storedAgent) ?? status.dataset.default;
    status.textContent = maskText(status.dataset.template.replace('{name}', name));
  });

  [
    ['collapse-browsing', 'BrowsingSectionOpen'],
    ['collapse-tab', 'TabSectionOpen'],
    ['collapse-fingerprint', 'FingerprintSectionOpen'],
  ].forEach(([name, key]) => {
    for (const section of document.getElementsByClassName(name)) {
      section.open = readStorage(key) === true;
      section.addEventListener('toggle', () =>
        section.open ? setStorage(key, true) : removeStorage(key)
      );
    }
  });

  attachEventListener('clear-site-data', 'click', async (e) => {
    if (!confirm(e.currentTarget.dataset.confirm)) return;
    try {
      await fetch(route('/api/clear'), { method: 'POST' });
    } catch {}
    location.href = route('/');
  });

  attachClassEventListener('cloak-type-list', 'change', (e) => {
    const value = Object.keys(values.cloakTypes).find(
      (type) => values.cloakTypes[type] === e.target.value
    );
    !value || value === 'none'
      ? removeStorage('LaunchType')
      : setStorage('LaunchType', value);
    if (e.isTrusted) location.reload();
  });

  attachClassEventListener('region-list', 'change', (e) => {
    const isOff = checkBooleanState(e.target) === false;
    isOff
      ? removeStorage('UseSocks5')
      : setStorage('UseSocks5', e.target.value);

    // TOR cannot be used at the same time as a regional selection.
    // This is because they both run on the socks5 protocol.
    let torCheck = document.getElementsByClassName('useonion');
    if (!isOff && checkBooleanState(torCheck[0]) === true)
      classUpdateHandler(torCheck, 'off')();
    if (e.isTrusted) location.reload();
  });

  attachClassEventListener('language-list', 'change', (e) => {
    const value = e.target.value;

    value === 'auto'
      ? (removeStorage('Language'), removeCookie('Language'))
      : (setStorage('Language', value), setCookie('Language', value));

    if (!e.isTrusted) return;

    const alternate = document.querySelector(
      `link[rel="alternate"][hreflang="${value === 'auto' ? 'x-default' : value}"]`
    );
    alternate
      ? location.assign(new URL(alternate.href).pathname + location.search + location.hash)
      : location.reload();
  });

  attachClassEventListener('history-toggle', 'change', (e) => {
    const value = e.target.checked ? 'hidehistory' : 'none';

    value === 'none'
      ? (setStorage('HistoryHide', 'none'), removeCookie('HistoryHide'))
      : (setStorage('HistoryHide', value), setCookie('HistoryHide', 'true'));

    if (e.isTrusted) location.reload();
  });

  /* The Eruda devtools are an alternative to the Chii devtools.
  attachClassEventListener('eruda', 'change', (e) => {
    const enabled = checkBooleanState(e.target) === true;

    if (enabled) {
      setStorage('ErudaEnabled', true);
      const moduleLocation = route('eruda/eruda.js');

      import(moduleLocation).then((module) => {
        if (!self.eruda || !self.eruda.init) return;
        eruda.init();
        delete eruda;
      });
    } else {
      removeStorage('ErudaEnabled');
    }
  });
  */
}

/* END WEBSITE SETTINGS */

/* LOAD USER-SAVED SETTINGS */

const browsingPreferences = document.getElementById('settings-panel');
if (browsingPreferences) {
  browsingPreferences.open = readStorage('BrowsingPreferencesOpen') === true;
  browsingPreferences.addEventListener('toggle', () => {
    setStorage('BrowsingPreferencesOpen', browsingPreferences.open);
  });
}

// Load a custom page title and favicon if it was previously stored.
useStorageArgs('Title', (s) => {
  s != undefined && pageTitle(s);
});
useStorageArgs('Icon', (s) => {
  s != undefined && pageIcon(s);
});

useStorageArgs('Theme', (s) => {
  const themeList = document.getElementsByClassName('theme-list');
  classUpdateHandler(
    themeList,
    s || defaultTheme,
    classEvent(themeList, 'change')
  )();
});

useStorageArgs('Language', (s) => {
  // Restore the cookie if it was cleared so the next page uses the same language.
  if (s) setCookie('Language', s);
  classUpdateHandler(document.getElementsByClassName('language-list'), s || 'auto')();
});

useStorageArgs('SearchEngine', (s) => {
  if (s && !Object.entries(values.labels).some(([name, label]) => name !== 'libcurl' && label === s)) {
    removeStorage('SearchEngine');
    s = undefined;
  }
  classUpdateHandler(
    document.getElementsByClassName('search-engine-list'),
    s || defaultSearch
  )();
});

const mobileBrowser = isMobileBrowser(),
  transportName = selectedTransport(readStorage('Transport'), mobileBrowser),
  transportValue = (name) => values.aliases[`prefixes/${name}`] || name;
if (mobileBrowser || transportName === 'epoxy') setStorage('Transport', transportName);
else if (readStorage('Transport') !== undefined) removeStorage('Transport');
for (const transportSelector of document.getElementsByClassName('transport-list')) {
  transportSelector.value = transportValue(transportName);
  transportSelector.closest('.transport-setting').hidden = mobileBrowser;
  transportSelector.addEventListener('change', () => {
    setStorage(
      'Transport',
      ['libcurl', 'epoxy'].find(
        (name) => transportValue(name) === transportSelector.value
      ) || 'libcurl'
    );
    location.reload();
  });
}
for (const regionSelector of document.getElementsByClassName('region-list')) {
  regionSelector.disabled = transportName === 'epoxy';
  regionSelector.title = transportName === 'epoxy' ? 'Region routing requires libcurl.' : '';
}
for (const torToggle of document.getElementsByClassName('useonion')) {
  torToggle.disabled = transportName === 'epoxy';
  torToggle.title = transportName === 'epoxy' ? 'Tor routing requires libcurl.' : '';
}

// Ads are disabled by default. Load ads if ads were enabled previously.
// Change !== to === here if ads should be enabled by default.
useStorageArgs('HideAds', (s) => {
  if (s !== false) pageHideAds();
  else {
    pageShowAds();
    classUpdateHandler(document.getElementsByClassName('hideads'), 'off')();
  }
});

// TOR is disabled by default. Enable TOR if it was enabled previously.
useStorageArgs('UseSocks5', (s) => {
  const tor = document.getElementsByClassName('useonion'),
    regionList = document.getElementsByClassName('region-list');
  if (s === 'tor') classUpdateHandler(tor, 'on', classEvent(tor, 'change'))();
  else if ('string' === typeof s) classUpdateHandler(regionList, s)();
});

useStorageArgs('HistoryHide', (s) => {
  const hide = s === 'hidehistory' || (!s && !values.usingSEO);

  classUpdateHandler(
    document.getElementsByClassName('history-toggle'),
    hide
  )();

  if (hide) {
    setCookie('HistoryHide', 'true');
  } else {
    removeCookie('HistoryHide');
  }
});

/*
useStorageArgs('ErudaEnabled', (s) => {
  const erudaSwitch = document.getElementsByClassName('eruda');

  if (s === true || s === 'true') {
    classUpdateHandler(erudaSwitch, 'on', classEvent(erudaSwitch, 'change'))();
  }
});
*/

useStorageArgs('UseAC', (s) => {
  if (s === false)
    classUpdateHandler(document.getElementsByClassName('useac'), 'off')();
});

useStorageArgs('SearchNavFix', (s) => {
  if (s === true)
    classUpdateHandler(document.getElementsByClassName('search-nav-fix'), 'on')();
});

useStorageArgs('ExperimentalSiteFixes', (s) => {
  if (s === true) {
    classUpdateHandler(
      document.getElementsByClassName('experimental-site-fixes'),
      'on'
    )();
    setCookie('ExperimentalSiteFixes', 'true');
  } else removeCookie('ExperimentalSiteFixes');
});

useStorageArgs('Sandbox', (s) => {
  if (s === true) {
    classUpdateHandler(document.getElementsByClassName('sandbox'), 'on')();
  }
});

useStorageArgs('CustomWisp', (s) => {
  const input = document.getElementById('custom-wisp');
  if (input && typeof s === 'string') input.value = s;
});

useStorageArgs('BlockWebRTC', (s) => {
  if (s === true)
    classUpdateHandler(document.getElementsByClassName('block-webrtc'), 'on')();
});

useStorageArgs('RandomizeFingerprint', (s) => {
  if (s === true)
    classUpdateHandler(
      document.getElementsByClassName('randomize-fingerprint'),
      'on'
    )();
});

useStorageArgs('LaunchType', (s) => {
  classUpdateHandler(
    document.getElementsByClassName('cloak-type-list'),
    values.cloakTypes[s] || values.cloakTypes.none
  )();
});
})();
