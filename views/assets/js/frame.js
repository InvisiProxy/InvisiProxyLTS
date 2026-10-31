import { values, route, cipherText, homoglyphText } from 'build:invisiproxy';
import { proxiedFrameUrl } from '../../../src/browser/frame-url.ts';
import { autoSiteFixes } from '../../../src/browser/site-fixes.ts';
import {
  maxTabs,
  parseBookmarks,
  parseSession,
  toggleBookmark,
  webUrl,
} from '../../../src/browser/tabs.ts';

(() => {
  const namespace = values.storageNamespace;
  const sessionKey = `${namespace}-tabs`;
  const openKey = `${namespace}-open-url`;
  const lastKey = `${namespace}-frame-url`;
  const bookmarksKey = `${namespace}-bookmarks`;
  const sandboxPermissions =
    'allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-same-origin allow-scripts allow-downloads';

  const read = (storage, key) => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (storage, key, value) => {
    try {
      storage.setItem(key, value);
    } catch {}
  };
  const forget = (storage, key) => {
    try {
      storage.removeItem(key);
    } catch {}
  };
  const setting = (name) => {
    try {
      return JSON.parse(localStorage.getItem(`${namespace}-storage`))?.[name];
    } catch {
      return undefined;
    }
  };

  const byId = (id) => document.getElementById(id);
  const container = byId('tab-frames');
  const omnibar = byId('pr-sj');
  const omniInput = byId('search-input');
  const loader = document.getElementsByClassName('loader')[0];
  const loaderText = loader?.getElementsByClassName('loader-text')[0];
  const toggle = byId('omnibar-toggle');
  const tabList = byId('tab-list');
  const newTabButton = byId('new-tab');
  const bookmarkToggle = byId('bookmark-toggle');
  const bookmarksMenu = byId('bookmarks-menu');
  const bookmarksList = byId('bookmarks-list');
  const bookmarksEmpty = byId('bookmarks-empty');
  const nativeQuery = Document.prototype.querySelector;
  const nativeAttribute = Element.prototype.getAttribute;

  const tabs = [];
  let active = null;
  let bundle = null;
  let bookmarks = parseBookmarks(read(localStorage, bookmarksKey));
  let restarting = false;

  const documentOf = (tab) => {
    try {
      return tab.iframe.contentDocument;
    } catch {
      return null;
    }
  };
  const hostname = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  };
  const titleOf = (tab) =>
    documentOf(tab)?.title?.trim() || hostname(tab.url) || tabList.dataset.untitled;

  const randomTitle = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(5 + Math.floor(Math.random() * 6))), (byte) =>
      String.fromCharCode(97 + (byte % 26))
    ).join('');

  const icon = (className) => {
    const element = document.createElement('i');
    element.className = className;
    element.setAttribute('aria-hidden', 'true');
    return element;
  };
  const faviconUrl = (tab) => {
    const doc = documentOf(tab);
    const link = doc && nativeQuery.call(doc, 'link[rel~="icon"][href]');
    return link ? new URL(nativeAttribute.call(link, 'href'), location.origin).href : '';
  };
  const faviconOf = (url) => {
    if (!url) return icon('fas fa-globe');
    const image = new Image();
    image.alt = '';
    image.src = url;
    image.addEventListener('error', () => image.replaceWith(icon('fas fa-globe')), {
      once: true,
    });
    return image;
  };

  const save = () =>
    write(
      sessionStorage,
      sessionKey,
      JSON.stringify({ urls: tabs.map((tab) => tab.url), active: tabs.indexOf(active) })
    );

  const syncLoader = () =>
    loader?.classList.toggle('loader-active', restarting || Boolean(active?.loading));
  const syncChip = (tab) => {
    tab.label.textContent = cipherText(titleOf(tab));
    tab.iframe.classList.toggle('proxy-tab-blank', !tab.url);
    const url = tab.loading ? '' : faviconUrl(tab);
    const key = tab.loading ? 'loading' : url;
    if (tab.iconKey === key) return;
    tab.iconKey = key;
    tab.open.firstElementChild.replaceWith(
      tab.loading ? icon('fas fa-circle-notch fa-spin') : faviconOf(url)
    );
  };
  const setLoading = (tab, loading) => {
    tab.loading = loading;
    if (tab === active) syncLoader();
    syncChip(tab);
  };

  const applySandbox = (iframe) => {
    if (setting('Sandbox') === true) iframe.setAttribute('sandbox', sandboxPermissions);
    else iframe.removeAttribute('sandbox');
  };

  const retryError = (tab, doc) => {
    const failed = doc.head?.querySelector("meta[itemprop='http-status'][content='404']");
    if (!failed) {
      tab.errors = 0;
      return false;
    }
    if (tab.errors >= 5) return false;
    tab.errors++;
    tab.frame.reload();
    return true;
  };

  const watch = (tab) =>
    setTimeout(() => {
      const doc = documentOf(tab);
      if (!doc || doc.URL === 'about:blank') {
        if (!tab.url) setLoading(tab, false);
        return;
      }
      applySandbox(tab.iframe);
      tab.iframe.contentWindow.addEventListener('beforeunload', () =>
        setLoading(tab, true)
      );
      const update = () => {
        if (doc.readyState !== 'complete') setLoading(tab, true);
        else if (!retryError(tab, doc)) setLoading(tab, false);
        syncChip(tab);
      };
      doc.addEventListener('readystatechange', update);
      update();
    });

  const favBookmarks = () => {
    const url = webUrl(active?.url);
    const saved = Boolean(url) && bookmarks.some((bookmark) => bookmark.url === url);
    const label = saved ? bookmarkToggle.dataset.remove : bookmarkToggle.dataset.add;
    bookmarkToggle.disabled = !url;
    bookmarkToggle.classList.toggle('bookmark-saved', saved);
    bookmarkToggle.setAttribute('aria-pressed', String(saved));
    bookmarkToggle.setAttribute('aria-label', label);
    bookmarkToggle.title = homoglyphText(label);
    bookmarkToggle.firstElementChild.className = `${saved ? 'fas' : 'far'} fa-star`;
  };
  const syncStrip = () => {
    newTabButton.disabled = tabs.length >= maxTabs;
    for (const tab of tabs) {
      const current = tab === active;
      tab.chip.classList.toggle('tab-chip-active', current);
      tab.open.setAttribute('aria-selected', String(current));
      tab.open.tabIndex = current ? 0 : -1;
    }
    active?.chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const isolateFor = (url) => {
    if (
      crossOriginIsolated ||
      !autoSiteFixes(url) ||
      document.cookie.split('; ').includes('AutoSiteFixes=true')
    )
      return false;
    document.cookie = 'AutoSiteFixes=true; path=/; SameSite=None; Secure;';
    save();
    location.reload();
    return true;
  };

  const navigate = (tab, url) => {
    tab.url = url;
    tab.started = true;
    if (isolateFor(url)) return;
    setLoading(tab, true);
    tab.frame.go(url);
    save();
  };

  const onUrl = (tab, url) => {
    tab.url = url;
    if (isolateFor(url)) return;
    if (tab === active) {
      if (document.activeElement !== omniInput) omniInput.value = url;
      favBookmarks();
    }
    syncChip(tab);
    save();
  };

  const createTab = (url, iframe) => {
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.className = 'proxy-tab';
      iframe.allow = 'fullscreen';
      container.append(iframe);
    }
    iframe.title = values.usingSEO ? tabList.dataset.untitled : randomTitle();
    const tab = { iframe, url, started: false, loading: false, errors: 0 };
    tab.frame = bundle.createFrame(iframe, (href) => onUrl(tab, href));
    iframe.addEventListener('load', () => watch(tab));
    applySandbox(iframe);
    tab.chip = document.createElement('div');
    tab.chip.className = 'tab-chip';
    tab.open = document.createElement('button');
    tab.open.type = 'button';
    tab.open.className = 'tab-chip-open';
    tab.open.setAttribute('role', 'tab');
    const label = cipherOf('tab-chip-title', '');
    tab.label = label.firstElementChild;
    tab.open.append(icon('fas fa-globe'), label);
    tab.open.addEventListener('click', () => activate(tab));
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tab-chip-close';
    close.title = homoglyphText(tabList.dataset.close);
    close.setAttribute('aria-label', tabList.dataset.close);
    close.append(icon('fas fa-times'));
    close.addEventListener('click', () => closeTab(tab));
    tab.chip.addEventListener('mousedown', (event) => {
      if (event.button === 1) event.preventDefault();
    });
    tab.chip.addEventListener('auxclick', (event) => {
      if (event.button === 1) closeTab(tab);
    });
    tab.chip.append(tab.open, close);
    tabList.append(tab.chip);
    tabs.push(tab);
    syncChip(tab);
    syncStrip();
    return tab;
  };

  const activate = (tab) => {
    for (const other of tabs) {
      if (other === tab) continue;
      other.iframe.classList.remove('active-tab');
      other.iframe.removeAttribute('id');
    }
    active = tab;
    tab.iframe.classList.add('active-tab');
    tab.iframe.id = 'frame';
    bundle.frame = tab.frame;
    if (!tab.started) {
      tab.started = true;
      if (tab.url) navigate(tab, tab.url);
    }
    if (document.activeElement !== omniInput) omniInput.value = tab.url;
    syncLoader();
    syncStrip();
    favBookmarks();
    save();
  };

  const closeTab = (tab) => {
    const index = tabs.indexOf(tab);
    tabs.splice(index, 1);
    const frames = bundle.controller.frames;
    if (frames.includes(tab.frame)) frames.splice(frames.indexOf(tab.frame), 1);
    tab.iframe.remove();
    tab.chip.remove();
    if (tab === active) {
      active = null;
      activate(tabs[Math.min(index, tabs.length - 1)] ?? createTab(''));
    } else {
      syncStrip();
      save();
    }
  };

  const closeMenus = () => {
    if (bookmarksMenu.parentElement.contains(document.activeElement))
      document.activeElement.blur();
  };

  const textOf = (className, text) => {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  };
  const cipherOf = (className, text) => {
    const element = textOf(className, '');
    const inner = document.createElement(values.fontCipher.tag || 'span');
    inner.textContent = cipherText(text);
    element.append(inner);
    return element;
  };

  const menuRow = ({ content, onOpen, removeLabel, onRemove }) => {
    const item = document.createElement('li');
    item.className = 'frame-menu-row';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'frame-menu-open';
    open.append(...content);
    open.addEventListener('click', onOpen);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'frame-menu-remove';
    remove.title = homoglyphText(removeLabel);
    remove.setAttribute('aria-label', removeLabel);
    remove.append(icon('fas fa-times'));
    remove.addEventListener('click', onRemove);
    item.append(open, remove);
    return item;
  };

  const saveBookmarks = () =>
    write(localStorage, bookmarksKey, JSON.stringify(bookmarks));

  const renderBookmarks = () => {
    bookmarksList.replaceChildren(
      ...bookmarks.map((bookmark) =>
        menuRow({
          content: [
            icon('fas fa-bookmark'),
            cipherOf('frame-menu-title', bookmark.title),
            cipherOf('frame-menu-detail', hostname(bookmark.url)),
          ],
          removeLabel: bookmarksList.dataset.remove,
          onOpen: () => {
            navigate(active, bookmark.url);
            closeMenus();
          },
          onRemove: () => {
            bookmarksMenu.focus();
            bookmarks = toggleBookmark(bookmarks, bookmark);
            saveBookmarks();
            renderBookmarks();
            favBookmarks();
          },
        })
      )
    );
    bookmarksEmpty.hidden = bookmarks.length > 0;
  };

  const navigationGetter =
    Object.getOwnPropertyDescriptor(window, 'navigation')?.get ??
    Object.getOwnPropertyDescriptor(Window.prototype, 'navigation')?.get;
  const navigationOf = (tab) => {
    try {
      return navigationGetter?.call(tab.iframe.contentWindow) ?? null;
    } catch {
      return null;
    }
  };

  const traverse = (back) => {
    if (!active) return;
    const navigation = navigationOf(active);
    if (!navigation) return back ? active.frame.back() : active.frame.forward();
    if (!(back ? navigation.canGoBack : navigation.canGoForward)) return;
    const result = back ? navigation.back() : navigation.forward();
    result.committed.catch(() => {});
    result.finished.catch(() => {});
  };

  byId('omnibar-back').addEventListener('click', () => traverse(true));
  byId('omnibar-forward').addEventListener('click', () => traverse(false));
  byId('omnibar-reload').addEventListener('click', () => {
    if (!active) return;
    setLoading(active, true);
    active.frame.reload();
  });

  let hidden = false;
  toggle.addEventListener('click', () => {
    hidden = !hidden;
    omnibar.classList.toggle('omnibar-hidden', hidden);
    toggle.classList.toggle('omnibar-s', hidden);
    toggle.firstElementChild.className = `fas fa-chevron-${hidden ? 'down' : 'up'}`;
    (hidden ? document.body : omnibar).appendChild(toggle);
    toggle.title = homoglyphText(hidden ? 'Show Bar' : 'Hide Bar');
  });

  byId('bookmarks-button').addEventListener('focus', renderBookmarks);
  bookmarksMenu.addEventListener('click', (event) => {
    if (
      !event.target.closest('.settings-content') ||
      event.target.closest('.close-settings-btn')
    )
      closeMenus();
  });
  tabList.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step || !active) return;
    event.preventDefault();
    const next = tabs[(tabs.indexOf(active) + step + tabs.length) % tabs.length];
    activate(next);
    next.open.focus();
  });
  setInterval(() => {
    for (const tab of tabs) syncChip(tab);
  }, 2000);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus();
  });

  newTabButton.addEventListener('click', () => {
    if (!bundle || tabs.length >= maxTabs) return;
    activate(createTab(''));
    omniInput.focus();
  });

  bookmarkToggle.addEventListener('click', () => {
    const url = webUrl(active?.url);
    if (!url) return;
    bookmarks = toggleBookmark(bookmarks, { url, title: titleOf(active) });
    saveBookmarks();
    favBookmarks();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== bookmarksKey) return;
    bookmarks = parseBookmarks(event.newValue);
    favBookmarks();
  });

  const keyboard = navigator.keyboard;
  const syncEscapeLock = () => {
    if (!keyboard?.lock) return;
    if (document.fullscreenElement) keyboard.lock(['Escape']).catch(() => {});
    else keyboard.unlock?.();
  };
  document.addEventListener('fullscreenchange', syncEscapeLock);
  window.addEventListener('focus', syncEscapeLock);

  const buildUrl = route('assets/js/frame.js');
  const checkBuild = () =>
    fetch(buildUrl, { method: 'HEAD', cache: 'no-store' }).then(
      (response) => (response.status >= 500 ? 'down' : response.ok ? 'same' : 'changed'),
      () => 'down'
    );
  const watchServer = async () => {
    const state = await checkBuild();
    if (state === 'changed' || (state === 'same' && restarting))
      return location.reload();
    if (state === 'down' && !restarting) {
      restarting = true;
      if (loaderText?.dataset.restarting)
        loaderText.textContent = loaderText.dataset.restarting;
      syncLoader();
    }
    setTimeout(watchServer, restarting ? 2000 : 30000);
  };
  if (!values.development)
    checkBuild().then((state) => {
      if (state === 'same') setTimeout(watchServer, 30000);
    });

  const start = () => {
    bundle = window.$invisiScramjet;
    const session = parseSession(read(sessionStorage, sessionKey));
    const opened = proxiedFrameUrl(read(localStorage, openKey));
    forget(localStorage, openKey);
    const first = byId('frame');
    if (session.urls.length) {
      session.urls.forEach((url, index) => createTab(url, index ? undefined : first));
      activate(tabs[session.active]);
      if (opened && tabs.length < maxTabs) activate(createTab(opened));
      else if (opened) navigate(active, opened);
    } else {
      activate(createTab(opened ?? proxiedFrameUrl(read(localStorage, lastKey)) ?? '', first));
    }
  };

  if (window.$invisiScramjet?.ready) start();
  else window.addEventListener('s-ready', start, { once: true });
})();
