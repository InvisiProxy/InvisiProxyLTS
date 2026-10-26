import { values } from 'build:invisiproxy';
import { proxiedFrameUrl } from '../../../src/browser/frame-url.ts';
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
  const frameTitle = byId('frame').title;
  const omnibar = byId('pr-sj');
  const omniInput = byId('search-input');
  const loader = document.getElementsByClassName('loader')[0];
  const toggle = byId('omnibar-toggle');
  const tabCount = byId('tab-count');
  const tabsMenu = byId('tabs-menu');
  const tabsList = byId('tabs-list');
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
    documentOf(tab)?.title?.trim() || hostname(tab.url) || tabsList.dataset.untitled;

  const icon = (className) => {
    const element = document.createElement('i');
    element.className = className;
    element.setAttribute('aria-hidden', 'true');
    return element;
  };
  const faviconOf = (tab) => {
    const doc = documentOf(tab);
    const link = doc && nativeQuery.call(doc, 'link[rel~="icon"][href]');
    if (!link) return icon('fas fa-globe');
    const image = new Image();
    image.alt = '';
    image.src = new URL(nativeAttribute.call(link, 'href'), location.origin).href;
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
    loader?.classList.toggle('loader-active', Boolean(active?.loading));
  const setLoading = (tab, loading) => {
    tab.loading = loading;
    if (tab === active) syncLoader();
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
    bookmarkToggle.title = label;
    bookmarkToggle.firstElementChild.className = `${saved ? 'fas' : 'far'} fa-star`;
  };
  const renderTabBook = () => {
    tabCount.textContent = String(tabs.length);
    favBookmarks();
  };

  const navigate = (tab, url) => {
    tab.url = url;
    tab.started = true;
    setLoading(tab, true);
    tab.frame.go(url);
    save();
  };

  const onUrl = (tab, url) => {
    tab.url = url;
    if (tab === active) {
      if (document.activeElement !== omniInput) omniInput.value = url;
      favBookmarks();
    }
    save();
  };

  const createTab = (url, iframe) => {
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.className = 'proxy-tab';
      iframe.title = frameTitle;
      iframe.allow = 'fullscreen';
      container.append(iframe);
    }
    const tab = { iframe, url, started: false, loading: false, errors: 0 };
    tab.frame = bundle.createFrame(iframe, (href) => onUrl(tab, href));
    iframe.addEventListener('load', () => watch(tab));
    applySandbox(iframe);
    tabs.push(tab);
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
    renderTabBook();
    save();
  };

  const closeTab = (tab) => {
    const index = tabs.indexOf(tab);
    tabs.splice(index, 1);
    const frames = bundle.controller.frames;
    if (frames.includes(tab.frame)) frames.splice(frames.indexOf(tab.frame), 1);
    tab.iframe.remove();
    if (tab === active) {
      active = null;
      activate(tabs[Math.min(index, tabs.length - 1)] ?? createTab(''));
    } else {
      renderTabBook();
      save();
    }
  };

  const closeMenus = () => {
    if ([tabsMenu, bookmarksMenu].some((menu) => menu.parentElement.contains(document.activeElement)))
      document.activeElement.blur();
  };

  const textOf = (className, text) => {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  };

  const menuRow = ({ content, title, onOpen, removeLabel, onRemove, current }) => {
    const item = document.createElement('li');
    item.className = 'frame-menu-row';
    if (current) item.classList.add('frame-menu-current');
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'frame-menu-open';
    open.title = title;
    open.append(...content);
    open.addEventListener('click', onOpen);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'frame-menu-remove';
    remove.title = removeLabel;
    remove.setAttribute('aria-label', removeLabel);
    remove.append(icon('fas fa-times'));
    remove.addEventListener('click', onRemove);
    item.append(open, remove);
    return item;
  };

  const renderTabs = () => {
    tabsList.replaceChildren(
      ...tabs.map((tab) =>
        menuRow({
          content: [faviconOf(tab), textOf('frame-menu-title', titleOf(tab))],
          title: tab.url || titleOf(tab),
          current: tab === active,
          removeLabel: tabsList.dataset.close,
          onOpen: () => {
            activate(tab);
            closeMenus();
          },
          onRemove: () => {
            tabsMenu.focus();
            closeTab(tab);
            renderTabs();
          },
        })
      )
    );
    newTabButton.disabled = tabs.length >= maxTabs;
  };

  const saveBookmarks = () =>
    write(localStorage, bookmarksKey, JSON.stringify(bookmarks));

  const renderBookmarks = () => {
    bookmarksList.replaceChildren(
      ...bookmarks.map((bookmark) =>
        menuRow({
          content: [
            icon('fas fa-bookmark'),
            textOf('frame-menu-title', bookmark.title),
            textOf('frame-menu-detail', hostname(bookmark.url)),
          ],
          title: bookmark.url,
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
    toggle.title = hidden ? 'Show Bar' : 'Hide Bar';
  });

  byId('tabs-button').addEventListener('focus', renderTabs);
  byId('bookmarks-button').addEventListener('focus', renderBookmarks);
  for (const menu of [tabsMenu, bookmarksMenu])
    menu.addEventListener('click', (event) => {
      if (
        !event.target.closest('.settings-content') ||
        event.target.closest('.close-settings-btn')
      )
        closeMenus();
    });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus();
  });

  newTabButton.addEventListener('click', () => {
    if (!bundle || tabs.length >= maxTabs) return;
    activate(createTab(''));
    closeMenus();
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
