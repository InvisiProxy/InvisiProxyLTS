import { values, route } from 'build:invisiproxy';
import { selectedTransport } from '../../../src/browser/transport.ts';
import { normalizeScramjetTarget } from '../../../src/browser/scramjet-links.ts';
import {
  rewriteCssTextFrameUrls,
  rewriteFrameUrl,
  rewriteSrcsetFrameUrls,
  unwrapFrameUrl,
} from '../../../src/browser/frame-urls.ts';
(() => {
  const swScope = route("/"),
    swAllowedHostnames = ['localhost', '127.0.0.1'],
    // Regional/Tor proxies are configured server-side (src/server/wisp.ts).
    // The client only selects the matching Wisp endpoint.
    regions = ['tor', 'eu', 'jp', 'patreon'],
    wispUrl = (region) =>
      `${(location.protocol === 'https:' ? 'wss' : 'ws')}://${location.host}${route("/wisp/")}${region ? region + '/' : ''}`,
    storageId = `${values.storageNamespace}-storage`,
    storageObject = () => JSON.parse(localStorage.getItem(storageId)) || {},
    readStorage = (name) => storageObject()[name];

  const transportName = selectedTransport(readStorage('Transport')),
    transportUrl = route(`/${transportName}/index.mjs`);

  const getTransportOptions = () => {
    const selected = readStorage('UseSocks5');
    return {
      wisp: wispUrl(
        transportName === 'libcurl' && regions.includes(selected) ? selected : ''
      ),
    };
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
            // Shared with the init.post setter patch below: the frame
            // realm's native src/srcset descriptors, captured before
            // Scramjet installs its own rewriters during client init.
            const nativeSrcDescriptors = new Map();
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
              for (const [name, props] of [
                ['HTMLImageElement', ['src', 'srcset']],
                ['HTMLIFrameElement', ['src']],
                ['HTMLFrameElement', ['src']],
              ]) {
                const proto = win[name]?.prototype;
                if (!proto) continue;
                for (const prop of props) {
                  const descriptor = Object.getOwnPropertyDescriptor(
                    proto,
                    prop
                  );
                  if (descriptor?.get && descriptor.set)
                    nativeSrcDescriptors.set(`${name}.${prop}`, descriptor);
                }
              }
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
              const rewriteCss = (value) =>
                rewriteCssTextFrameUrls(
                  value,
                  (url) => client.rewriteUrl(url),
                  location.origin,
                  networkPrefix
                );
              const setAttribute = win.Element?.prototype?.setAttribute;
              if (typeof setAttribute === 'function') {
                win.Element.prototype.setAttribute = function (name, value) {
                  const attribute = String(name).toLowerCase();
                  if (attribute === 'src') {
                    const tag = String(this?.tagName || '').toLowerCase();
                    if (tag === 'iframe' || tag === 'frame')
                      value = rewrite(value);
                  } else if (attribute === 'style' && typeof value === 'string') {
                    // Inline style attributes (Poki cover divs set them at
                    // runtime) carry url(...) declarations that must be
                    // prefixed like every other frame URL.
                    value = rewriteCss(value);
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
              // Poki renders game covers as inline CSS background images
              // rather than <img> tags. Scramjet rewrites url(...) inside
              // style attributes, cssText and setProperty during client
              // init, but the individual IDL setters on CSSStyleDeclaration
              // (el.style.backgroundImage = "url(...)" - what React-style
              // inline styles assign) stay native, so cover images resolve
              // against the proxy origin and never load. Intercept every
              // url-bearing declaration setter; each layer normalizes
              // exactly once, so values Scramjet already wrapped (or that
              // flow through the text paths below, which Scramjet also
              // traps) are never double-wrapped. Fragment references like
              // url(#gradient) and blob:/data: targets pass through.
              const cssProto = win.CSSStyleDeclaration?.prototype;
              if (cssProto) {
                for (const property of [
                  'background',
                  'backgroundImage',
                  'borderImage',
                  'borderImageSource',
                  'cursor',
                  'listStyle',
                  'listStyleImage',
                  'mask',
                  'maskImage',
                  'content',
                ]) {
                  const descriptor = Object.getOwnPropertyDescriptor(
                    cssProto,
                    property
                  );
                  if (!descriptor?.set) continue;
                  Object.defineProperty(cssProto, property, {
                    ...descriptor,
                    set(value) {
                      return descriptor.set.call(this, rewriteCss(value));
                    },
                  });
                }
                const cssText = Object.getOwnPropertyDescriptor(
                  cssProto,
                  'cssText'
                );
                if (cssText?.set)
                  Object.defineProperty(cssProto, 'cssText', {
                    ...cssText,
                    set(value) {
                      return cssText.set.call(this, rewriteCss(value));
                    },
                  });
                const setProperty = cssProto.setProperty;
                if (typeof setProperty === 'function')
                  cssProto.setProperty = function (property, value, priority) {
                    if (typeof value === 'string') value = rewriteCss(value);
                    return setProperty.call(this, property, value, priority);
                  };
              }
              // CrazyGames-style SDKs build game iframes before the src
              // setters above exist (early inline scripts) or inject parsed
              // markup, then attach the element later, so a plain prototype
              // src hook can miss the value entirely. Normalize every
              // iframe/frame subtree at the DOM mutation boundary instead:
              // any embed appended or parsed into the document gets exactly
              // one prefix wrap. Values whose wrapped result equals the
              // current src (including markup Scramjet's insertAdjacentHTML
              // rewriter already handled) are left untouched, so correctly
              // wrapped nodes never reload.
              const normalizeFrame = (element) => {
                const src = element.getAttribute?.('src');
                if (typeof src !== 'string' || !src) return;
                if (rewrite(src) === src) return;
                // Hand Scramjet's rewriter the raw value (it wraps once);
                // our own setter wrapper does the same when Scramjet's
                // rewriter is not installed yet.
                element.setAttribute('src', src);
              };
              const normalizeInserted = (node) => {
                if (!node) return;
                if (node.nodeType === 1) {
                  const tag = node.tagName;
                  if (tag === 'IFRAME' || tag === 'FRAME') {
                    normalizeFrame(node);
                    return;
                  }
                  if (node.firstElementChild)
                    for (const frame of node.querySelectorAll('iframe,frame'))
                      normalizeFrame(frame);
                } else if (node.nodeType === 11) {
                  for (const child of node.childNodes) normalizeInserted(child);
                }
              };
              const appendChild = win.Node?.prototype?.appendChild;
              if (typeof appendChild === 'function') {
                win.Node.prototype.appendChild = function (child) {
                  // Normalize before insertion: an iframe entering the
                  // document with a raw src would otherwise start fetching
                  // the unproxied URL first.
                  normalizeInserted(child);
                  return appendChild.call(this, child);
                };
              }
              const insertAdjacentHTML = win.Element?.prototype
                ?.insertAdjacentHTML;
              if (typeof insertAdjacentHTML === 'function') {
                win.Element.prototype.insertAdjacentHTML = function (
                  position,
                  html
                ) {
                  const track =
                    typeof html === 'string' && /<(?:iframe|frame)\b/i.test(html)
                      ? String(position).toLowerCase()
                      : '';
                  const before =
                    track === 'beforebegin' ? this.previousSibling : undefined;
                  const after =
                    track === 'afterend' ? this.nextSibling : undefined;
                  const first =
                    track === 'afterbegin' ? this.firstChild : undefined;
                  const last =
                    track === 'beforeend' ? this.lastChild : undefined;
                  const result = insertAdjacentHTML.call(this, position, html);
                  // Walk only the nodes this call just inserted.
                  if (track === 'beforebegin')
                    for (
                      let node = this.previousSibling;
                      node && node !== before;
                      node = node.previousSibling
                    )
                      normalizeInserted(node);
                  else if (track === 'afterend')
                    for (
                      let node = this.nextSibling;
                      node && node !== after;
                      node = node.nextSibling
                    )
                      normalizeInserted(node);
                  else if (track === 'afterbegin')
                    for (
                      let node = this.firstChild;
                      node && node !== first;
                      node = node.nextSibling
                    )
                      normalizeInserted(node);
                  else if (track === 'beforeend')
                    for (
                      let node = this.lastChild;
                      node && node !== last;
                      node = node.previousSibling
                    )
                      normalizeInserted(node);
                  return result;
                };
              }
            });
            // Scramjet installs its own src rewriters during client init,
            // which happens after init.pre, so patch the element prototypes a
            // second time once that has landed. This covers SDK code that
            // assigns img.src/img.srcset or iframe.src asynchronously long
            // after load: values Scramjet still owns are unwrapped before
            // being handed back to its rewriter (which wraps exactly once),
            // and srcset - which Scramjet leaves native - is fully rewritten
            // here so relative paths and CDN candidates load through the
            // proxy prefix instead of 404ing against the static server.
            this.tap(frame.hooks.init.post, (ctx) => {
              const win = ctx?.window;
              const client = ctx?.client;
              if (!win || !client || win.__invisiEmbedSetterGuard) return;
              win.__invisiEmbedSetterGuard = true;
              const origin = location.origin;
              const networkPrefix = new URL(
                route('/scram/network/'),
                origin
              ).pathname;
              for (const [key, native] of nativeSrcDescriptors) {
                const [name, prop] = key.split('.');
                const proto = win[name]?.prototype;
                if (!proto) continue;
                const current = Object.getOwnPropertyDescriptor(proto, prop);
                if (!current?.get || !current.set) continue;
                const scramjetOwns = current.set !== native.set;
                const transform =
                  prop === 'srcset'
                    ? (value) =>
                        rewriteSrcsetFrameUrls(
                          value,
                          scramjetOwns
                            ? (url) => url
                            : (url) => client.rewriteUrl(url),
                          origin,
                          networkPrefix
                        )
                    : scramjetOwns
                      ? (value) => unwrapFrameUrl(value, origin, networkPrefix)
                      : (value) =>
                          rewriteFrameUrl(
                            value,
                            (url) => client.rewriteUrl(url),
                            origin,
                            networkPrefix
                          );
                Object.defineProperty(proto, prop, {
                  ...current,
                  set(value) {
                    return current.set.call(this, transform(value));
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
      console.log('Using wisp:', transportOptions.wisp);
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
