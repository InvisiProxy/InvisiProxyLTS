import { values, route } from 'build:invisiproxy';
import { selectedTransport } from '../../../src/browser/transport.ts';
import { normalizeScramjetTarget } from '../../../src/browser/scramjet-links.ts';
import { rewriteFrameUrl } from '../../../src/browser/frame-urls.ts';
(() => {
  const swScope = route("/"),
    swAllowedHostnames = ['localhost', '127.0.0.1'],
    wispUrl =
      `${(location.protocol === 'https:' ? 'wss' : 'ws')}://${location.host}${route("/wisp/")}`,
    proxyUrl = {
      tor: 'socks5h://localhost:9050',
      eu: 'socks5h://localhost:7000',
      jp: 'socks5h://localhost:7001',
    },
    storageId = `${values.storageNamespace}-storage`,
    storageObject = () => JSON.parse(localStorage.getItem(storageId)) || {},
    readStorage = (name) => storageObject()[name];

  const transportName = selectedTransport(readStorage('Transport')),
    transportUrl = route(`/${transportName}/index.mjs`);

  const getTransportOptions = () => {
    const options = { wisp: wispUrl };
    if (transportName === 'libcurl' && 'string' === typeof readStorage('UseSocks5'))
      options.proxy = proxyUrl[readStorage('UseSocks5')];
    return options;
  };

  const getSWRoute = () =>
    route(readStorage('HideAds') !== false ? '/sw-blacklist.js' : '/sw.js');

  const unregisterStaleSWs = async () => {
    const expected = new URL(getSWRoute(), location.origin).pathname;
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
      const active = registration.active;
      if (active && new URL(active.scriptURL).pathname !== expected)
        await registration.unregister();
    }
  };

  const registerScramjetSW = async () => {
    if (!navigator.serviceWorker) {
      if (
        location.protocol !== 'https:' &&
        !swAllowedHostnames.includes(location.hostname)
      )
        throw new Error('Service workers cannot be registered without https.');
      throw new Error("Your browser doesn't support service workers.");
    }

    await unregisterStaleSWs();

    const sw = getSWRoute();
    console.log('Registering Scramjet service worker:', sw);
    const registration = await navigator.serviceWorker.register(sw, {
      scope: swScope,
    });

    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        let timer;
        const onChange = () => {
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener(
            'controllerchange',
            onChange
          );
          resolve();
        };
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          onChange,
          { once: true }
        );
        timer = setTimeout(onChange, 5000);
        if (navigator.serviceWorker.controller) onChange();
      });
    }

    return registration;
  };

  /** @returns {Promise<import("@mercuryworkshop/proxy-transports").ProxyTransport>} */
  const buildScramjetTransport = async (options) => {
    const mod = await import(transportUrl);
    const TransportClient = mod.default;
    const transport = new TransportClient(options);
    await transport.init();
    return transport;
  };

  const buildFramePlugins = () => {
    // HttpCache/link watching need $scramjetUtils, but the ManagedPlugin
    // guards (navigation, embed rewriting, response header stripping) only
    // need the controller: never let a missing utils global skip those, or
    // proxied game documents lose CSP/COEP stripping entirely.
    const plugins =
      typeof $scramjetUtils === 'undefined'
        ? []
        : [new $scramjetUtils.HttpCachePlugin()];

    // Some proxied sites (eg TikTok's analytics SDK) build navigation URLs
    // from rewritten values that stringify to "undefined", pushing a bogus
    // /undefined route that resolves to a ?fromUrl=/undefined 404 page.
    // Detect degenerate targets both as raw values and as scramjet-wrapped
    // URLs whose percent-encoded target decodes to one.
    const degenerateUrl = (value) => {
      if (value == null) return false;
      const raw = String(value);
      if (/^(?:undefined|null|NaN|\[object Object\])$/.test(raw)) return true;
      const degeneratePath = (url) =>
        /\/(?:undefined|null|NaN)\/?$/.test(url.pathname) ||
        /^(?:undefined|null|NaN)$/.test(url.pathname.replace(/^\//, ''));
      try {
        if (degeneratePath(new URL(raw, 'https://degenerate.invalid/')))
          return true;
      } catch {
        return false;
      }
      try {
        return degeneratePath(
          new URL(decodeURIComponent(raw), 'https://degenerate.invalid/')
        );
      } catch {
        return false;
      }
    };
    if (typeof $scramjetController?.ManagedPlugin === 'function') {
      plugins.push(
        new (class extends $scramjetController.ManagedPlugin {
          constructor() {
            super('degenerate-url-guard', []);
          }
          install(frame) {
            // init.pre fires before scramjet captures the native navigation
            // methods, so these guards sit underneath its rewriters and see
            // every proxied navigation, including already-rewritten URLs.
            // TikTok's analytics SDK otherwise pushes history.replaceState
            // with "undefined", leaving the frame stuck on a 404 page.
            this.tap(frame.hooks.init.pre, (ctx) => {
              const win = ctx?.window;
              if (!win || win.__invisiDegenerateGuard) return;
              win.__invisiDegenerateGuard = true;
              const frameHistory = win.History?.prototype;
              if (frameHistory)
                for (const method of ['pushState', 'replaceState']) {
                  const original = frameHistory[method];
                  if (typeof original !== 'function') continue;
                  frameHistory[method] = function (state, title, url) {
                    if (!degenerateUrl(url))
                      return original.call(this, state, title, url);
                    // Keep the frame on its current URL instead of the
                    // corrupted one. An undefined URL argument leaves the
                    // URL untouched while still applying the new state.
                    if (method === 'replaceState')
                      return original.call(this, state, title, undefined);
                  };
                }
              const client = ctx?.client;
              const networkPrefix = new URL(
                route('/scram/network/'),
                location.origin
              ).pathname;
              if (client && !client.__invisiNavigationGuard) {
                client.__invisiNavigationGuard = true;
                const originalRewriteUrl = client.rewriteUrl.bind(client);
                client.rewriteUrl = (url, options) => {
                  const normalized = normalizeScramjetTarget(
                    url,
                    location.origin,
                    networkPrefix
                  );
                  if (normalized.proxyOrigin) return normalized.url;
                  if (normalized.unwrapped)
                    return originalRewriteUrl(normalized.url, options);
                  return originalRewriteUrl(url, options);
                };
                const normalizedLinks = new WeakMap();
                this.tap(client.hooks.rewriter.html.pre, ({ handler }) => {
                  const visit = (node) => {
                    if (node?.attribs && ['a', 'area'].includes(node.name)) {
                      const value = node.attribs.href;
                      if (value) {
                        const normalized = normalizeScramjetTarget(
                          value,
                          location.origin,
                          networkPrefix
                        );
                        if (normalized.proxyOrigin) {
                          normalizedLinks.set(node, normalized.url);
                          node.attribs.href = '#';
                        } else if (normalized.unwrapped)
                          node.attribs.href = normalized.url;
                      }
                    }
                    for (const child of node?.children || []) visit(child);
                  };
                  visit(handler.root);
                });
                this.tap(client.hooks.rewriter.html.post, ({ handler }) => {
                  const visit = (node) => {
                    if (node && normalizedLinks.has(node)) {
                      node.attribs.href = normalizedLinks.get(node);
                      delete node.attribs['scramjet-attr-href'];
                      normalizedLinks.delete(node);
                    }
                    for (const child of node?.children || []) visit(child);
                  };
                  visit(handler.root);
                });
                client.Proxy('HTMLAnchorElement.prototype.click', {
                  apply(click) {
                    const anchor = click.this;
                    const normalized = normalizeScramjetTarget(
                      anchor.href,
                      location.origin,
                      networkPrefix
                    );
                    if (normalized.proxyOrigin)
                      anchor.href = normalized.url;
                    else if (normalized.unwrapped)
                      anchor.href = client.rewriteUrl(normalized.url);
                  },
                });
              }
              const locationProto = win.Location?.prototype;
              if (locationProto) {
                const descriptor = Object.getOwnPropertyDescriptor(
                  locationProto,
                  'href'
                );
                if (descriptor?.set && descriptor?.get)
                  Object.defineProperty(locationProto, 'href', {
                    ...descriptor,
                    set(value) {
                      if (degenerateUrl(value)) return;
                      const normalized = normalizeScramjetTarget(
                        value,
                        location.origin,
                        networkPrefix
                      );
                      const target =
                        normalized.proxyOrigin
                          ? normalized.url
                          : normalized.unwrapped && client
                            ? client.rewriteUrl(normalized.url)
                            : value;
                      descriptor.set.call(this, target);
                    },
                  });
                for (const method of ['assign', 'replace']) {
                  const original = locationProto[method];
                  if (typeof original !== 'function') continue;
                  locationProto[method] = function (url) {
                    if (degenerateUrl(url)) return;
                    const normalized = normalizeScramjetTarget(
                      url,
                      location.origin,
                      networkPrefix
                    );
                    return original.call(
                      this,
                      normalized.proxyOrigin
                        ? normalized.url
                        : normalized.unwrapped && client
                          ? client.rewriteUrl(normalized.url)
                          : url
                    );
                  };
                }
              }
            });
            // Guard window.open separately because Scramjet rewrites its target
            // before native window.open is called.
            this.tap(frame.hooks.init.pre, (ctx) => {
              const win = ctx?.window;
              if (!win || win.__invisiOpenGuard) return;
              win.__invisiOpenGuard = true;
              const originalOpen = win.open;
              if (typeof originalOpen !== 'function') return;
              win.open = function (url, ...args) {
                if (url === undefined || url === null || url === '')
                  return originalOpen.call(this, url, ...args);
                const normalized = normalizeScramjetTarget(
                  url,
                  location.origin,
                  route('/scram/network/')
                );
                return originalOpen.call(
                  this,
                  normalized.proxyOrigin
                    ? normalized.url
                    : normalized.unwrapped && ctx?.client
                      ? ctx.client.rewriteUrl(normalized.url)
                      : url,
                  ...args
                );
              };
            });
            // Dynamically created cross-origin embeds must stay behind the
            // proxy: game sites (Poki, CrazyGames) inject iframes pointing at
            // CDNs like files.crazygames.com or poki-gdn.com at runtime and
            // spawn Workers for game binaries. Scramjet rewrites parsed
            // markup, but values handed to setAttribute or the Worker
            // constructors after load can still carry raw external URLs or
            // doubly-wrapped ones. init.pre runs before Scramjet captures
            // these natives, so these guards sit underneath its rewriters
            // and normalize every value exactly once; blob:/data: URLs pass
            // through untouched because their scripts were already rewritten
            // and blob requests never leave the origin (the service worker
            // routes prefix-wrapped blob:, .wasm and worker requests through
            // the controller).
            this.tap(frame.hooks.init.pre, (ctx) => {
              const win = ctx?.window;
              const client = ctx?.client;
              if (!win || !client || win.__invisiEmbedGuard) return;
              win.__invisiEmbedGuard = true;
              const networkPrefix = new URL(
                route('/scram/network/'),
                location.origin
              ).pathname;
              const rewrite = (value) =>
                rewriteFrameUrl(
                  value,
                  (url) => client.rewriteUrl(url),
                  location.origin,
                  networkPrefix
                );
              const setAttribute = win.Element?.prototype?.setAttribute;
              if (typeof setAttribute === 'function') {
                win.Element.prototype.setAttribute = function (name, value) {
                  if (String(name).toLowerCase() === 'src') {
                    const tag = String(this?.tagName || '').toLowerCase();
                    if (tag === 'iframe' || tag === 'frame')
                      value = rewrite(value);
                  }
                  return setAttribute.call(this, name, value);
                };
              }
              for (const name of ['Worker', 'SharedWorker']) {
                const Worker = win[name];
                if (typeof Worker !== 'function') continue;
                win[name] = new Proxy(Worker, {
                  construct(target, args, newTarget) {
                    if (args.length > 0) args[0] = rewrite(args[0]);
                    return Reflect.construct(target, args, newTarget);
                  },
                });
              }
            });
            // Proxied subresources inherit remote cross-origin policy
            // headers; when they reach the frame they break streaming media
            // chunks, WebAssembly instantiation and game assets served from
            // CDNs like files.crazygames.com or poki-gdn.com, so strip them
            // here. Content-Security-Policy (and its report-only variant)
            // leaks the remote site's img-src/frame-src/connect-src origins,
            // which blocks proxied thumbnails and game binaries, and
            // Cross-Origin-Embedder-Policy breaks every subresource that
            // cannot present a CORP header back to the frame.
            this.tap(frame.hooks.fetch.response, (ctx, res) => {
              const headers = res?.response?.headers;
              if (headers && typeof headers.delete === 'function')
                for (const name of [
                  'cross-origin-opener-policy',
                  'cross-origin-embedder-policy',
                  'cross-origin-resource-policy',
                  'content-security-policy',
                  'content-security-policy-report-only',
                ])
                  headers.delete(name);
            });
          }
        })()
      );
    }

    const omniInput = document.getElementById('search-input');
    if (typeof $scramjetUtils !== 'undefined') {
      plugins.push(
        new $scramjetUtils.UrlWatcherPlugin((url) => {
          if (omniInput && document.activeElement !== omniInput)
            omniInput.value = url;
        })
      );

      plugins.push(
        new $scramjetUtils.CatchEscapedLinksPlugin((url) => {
          try {
            localStorage.setItem(`${values.storageNamespace}-frame-url`, 'sj:' + url.href);
          } catch (e) {}
          return new URL(location.pathname + location.search, location.origin);
        })
      );
    }

    return plugins;
  };

  const initialize = async () => {
    try {
      if (window.$invisiScramjet?.ready) {
        const existing = window.$invisiScramjet;
        const visibleFrame = document.getElementById('frame');
        if (
          visibleFrame instanceof HTMLIFrameElement &&
          existing.frame?.element !== visibleFrame
        ) {
          existing.frame = existing.controller.createFrame(visibleFrame, {
            plugins: buildFramePlugins(),
          });
        } 
        window.dispatchEvent(new Event('s-ready'));
        return;
      }

      const transportOptions = getTransportOptions();
      console.log('Using proxy:', transportOptions.proxy);
      console.log('Transport mode:', transportUrl);

      const [registration, transport] = await Promise.all([
        registerScramjetSW(),
        buildScramjetTransport(transportOptions),
      ]);

      const serviceworker =
        navigator.serviceWorker.controller ?? registration.active;
      if (!serviceworker)
        throw new Error('No service worker available for Scramjet controller');

      const { Controller } = $scramjetController;
      const { defaultConfig } = $scramjet;
      const controller = new Controller({
        serviceworker,
        transport,
        config: {
          prefix: route("/scram/network/"),
          scramjetPath: route("/scram/scramjet.js"),
          wasmPath: route("/scram/scramjet.wasm"),
          injectPath: route("/scram/controller.inject.js"),
        },
        scramjetConfig: {
          ...defaultConfig,
          flags: {
            ...defaultConfig.flags,
            allowFailedIntercepts: true,
            allowInvalidJs: true,
          },
        },
      });

      let handshakeTimer;
      try {
        await Promise.race([
          controller.wait(),
          new Promise((_, reject) => {
            handshakeTimer = setTimeout(
              () => reject(new Error('Scramjet controller handshake timed out')),
              15000
            );
          }),
        ]);
      } finally {
        clearTimeout(handshakeTimer);
      }
      console.log('Scramjet controller initialized');

      const visibleFrame = document.getElementById('frame');
      let frame;
      if (visibleFrame instanceof HTMLIFrameElement) {
        frame = controller.createFrame(visibleFrame, {
          plugins: buildFramePlugins(),
        });
      } else {
        const hidden = document.createElement('iframe');
        hidden.setAttribute('aria-hidden', 'true');
        hidden.tabIndex = -1;
        hidden.style.cssText =
          'position:fixed;width:0;height:0;border:0;visibility:hidden;pointer-events:none;';
        document.body.appendChild(hidden);
        // The fallback frame proxies real navigations too, so it needs the
        // same plugins as the visible frame (embed rewriting, header strips).
        frame = controller.createFrame(hidden, {
          plugins: buildFramePlugins(),
        });
      }

      window.$invisiScramjet = { controller, frame, ready: true };
      // The visible #frame can appear after initialization (the disguised
      // loader swaps the document body in late); rebind the controller to it
      // with the same plugins so the proxied document keeps every guard.
      const frameObserver = new MutationObserver(() => {
        const visibleFrame = document.getElementById('frame');
        if (!(visibleFrame instanceof HTMLIFrameElement)) return;
        frameObserver.disconnect();
        if (window.$invisiScramjet.frame.element !== visibleFrame)
          window.$invisiScramjet.frame = controller.createFrame(visibleFrame, {
            plugins: buildFramePlugins(),
          });
      });
      frameObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      window.dispatchEvent(new Event('s-ready'));
    } catch (err) {
      console.error(
        'Scramjet initialization failed',
        err
      );
      window.$invisiScramjetError = err;
      window.dispatchEvent(new CustomEvent('s-error', { detail: err }));
    }
  };

  if (window.$invisiScramjetInitializing) {
    window.$invisiScramjetInitializing.then(() => {
      if (window.$invisiScramjet?.ready) initialize();
    });
  } else {
    window.$invisiScramjetInitializing = initialize().finally(() => {
      delete window.$invisiScramjetInitializing;
    });
  }
})();
