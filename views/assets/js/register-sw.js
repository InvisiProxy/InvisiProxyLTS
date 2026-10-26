import { values, route } from 'build:invisiproxy';
import { renderProxyError } from 'build:invisiproxy-errors';
import {
  openTransport,
  proxyRegions,
  selectedTransport,
  selectedWisp,
} from '../../../src/browser/transport.ts';
import {
  installScramjetSearchUrlGuard,
  needsSearchUrlGuard,
} from '../../../src/browser/search-url-guard.ts';
import { leakFrame } from '../../../src/browser/leak-guard.ts';
import { blockWebrtc } from '../../../src/browser/webrtc.ts';
import {
  profileFromUserAgent,
  randomizeFingerprint,
  rewriteHeaders,
  sessionFingerprint,
  spoofNavigator,
  storedUserAgent,
} from '../../../src/browser/fingerprint.ts';
import {
  autoSiteFixes,
  fixFetchHandler,
  headlessBody,
  keepHistoryUrl,
  obsidianSameTab,
  scriptSafeBody,
  stableCacheKeys,
} from '../../../src/browser/site-fixes.ts';
import {
  errorPageScript,
  errorTrace,
  proxiedUrl,
} from '../../../src/browser/error-page.ts';
import { proxyCodec } from '../../../src/browser/proxy-codec.ts';
(() => {
  const swScope = route("/"),
    swAllowedHostnames = ['localhost', '127.0.0.1'],
    // Regional/Tor proxies are configured server-side (src/server/wisp.ts).
    // The client only selects the matching Wisp endpoint.
    regions = proxyRegions(values.patreon),
    wispBase = `${(location.protocol === 'https:' ? 'wss' : 'ws')}://${location.host}${route("/wisp/")}`,
    storageId = `${values.storageNamespace}-storage`,
    storageObject = () => JSON.parse(localStorage.getItem(storageId)) || {},
    readStorage = (name) => storageObject()[name];

  const transportName = selectedTransport(readStorage('Transport')),
    transportUrl = route(`/${transportName}/index.mjs`),
    siteFixes = readStorage('ExperimentalSiteFixes') === true;

  const getTransportOptions = () => ({
    wisp: selectedWisp(storageObject(), transportName, regions, wispBase),
  });

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

  const clearHttpCache = async () => {
    if (typeof $scramjetUtils === 'undefined' || !self.caches) return;
    try {
      await caches.delete($scramjetUtils.CACHE_NAME);
    } catch {}
  };

  /** @returns {Promise<import("@mercuryworkshop/proxy-transports").ProxyTransport>} */
  const buildScramjetTransport = (options) => openTransport(transportUrl, options.wisp);

  const buildSearchUrlGuardPlugin = () =>
    new (class extends $scramjetController.ManagedPlugin {
      constructor() {
        super('search-url-guard', []);
      }
      install(frame) {
        super.install(frame);
        this.tap(frame.hooks.init.post, ({ window: win, client }) => {
          if (readStorage('SearchNavFix') === true || needsSearchUrlGuard(client.url))
            installScramjetSearchUrlGuard(win, client);
        });
      }
    })();

  const buildLeakGuardPlugin = () =>
    new (class extends $scramjetController.ManagedPlugin {
      constructor() {
        super('leak-guard', []);
      }
      install(frame) {
        super.install(frame);
        this.tap(frame.hooks.init.post, ({ window: win, client }) =>
          leakFrame(win, client)
        );
      }
    })();

  const buildBlockWebrtcPlugin = () =>
    new (class extends $scramjetController.ManagedPlugin {
      constructor() {
        super('block-webrtc', []);
      }
      install(frame) {
        super.install(frame);
        this.tap(frame.hooks.init.post, ({ window: win }) => {
          if (readStorage('BlockWebRTC') === true) blockWebrtc(win);
        });
      }
    })();

  const buildFingerprintPlugin = () => {
    const session =
      readStorage('RandomizeFingerprint') === true
        ? sessionFingerprint(sessionStorage, `${storageId}-fingerprint`)
        : null;
    const userAgent =
      storedUserAgent(readStorage('UserAgent')) ?? session?.preset.userAgent;
    const profile = userAgent ? profileFromUserAgent(userAgent) : null;
    return new (class extends $scramjetController.ManagedPlugin {
      constructor() {
        super('browser-fingerprint', []);
      }
      install(frame) {
        super.install(frame);
        if (profile)
          this.tap(frame.hooks.fetch.request, (_context, props) => {
            props.init.headers = rewriteHeaders(props.init.headers, profile);
          });
        this.tap(frame.hooks.init.post, ({ window: win }) => {
          if (profile) spoofNavigator(win, profile);
          if (session) randomizeFingerprint(win, session.noise, profile);
        });
      }
    })();
  };

  const buildSiteFixesPlugin = () =>
    new (class extends $scramjetController.ManagedPlugin {
      constructor() {
        super('experimental-site-fixes', []);
      }
      install(frame) {
        super.install(frame);
        const active = () => {
          if (siteFixes) return true;
          try {
            return autoSiteFixes(
              proxiedUrl(frame.element.contentWindow.location.href, frame.prefix)
            );
          } catch {
            return false;
          }
        };
        const replaceBody = (response, body) => {
          const fixed = $scramjet.BareResponse.fromNativeResponse(
            body instanceof Response
              ? body
              : new Response(body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                })
          );
          fixed.url = response.url;
          fixed.rawHeaders = response.rawHeaders;
          return fixed;
        };
        fixFetchHandler(frame.fetchHandler, frame.prefix, active);
        if (transportName === 'libcurl')
          this.tap(frame.hooks.fetch.request, ({ request }, props) => {
            if (request.method === 'HEAD' && active()) props.init.method = 'GET';
          });
        this.tap(
          frame.hooks.fetch.preresponse,
          ({ request, parsed }, props) => {
            const response = props.response;
            if (!response.body || !active()) return;
            if (request.method === 'HEAD')
              props.response = replaceBody(response, headlessBody(response));
            else if (
              ['script', 'worker', 'sharedworker'].includes(parsed.destination) &&
              response.ok
            )
              props.response = replaceBody(response, scriptSafeBody(response));
          },
          { before: ['scramjet-http-cache'] }
        );
        this.tap(frame.hooks.init.post, ({ window: win, client }) => {
          if (!active()) return;
          keepHistoryUrl(win, client);
          stableCacheKeys(win, client);
          obsidianSameTab(win.localStorage, client);
        });
      }
    })();

  const buildErrorPagePlugin = () =>
    new (class extends $scramjetController.ManagedPlugin {
      constructor() {
        super('error-page', []);
      }
      install(frame) {
        super.install(frame);
        const { version, build } = $scramjet.versionInfo;
        this.tap(frame.hooks.error.request, ({ rawrequest, error }, props) => {
          if (!['document', 'iframe'].includes(rawrequest.destination)) return;
          props.setResponse = {
            body: renderProxyError(
              'scramjet',
              errorPageScript({
                url: proxiedUrl(rawrequest.rawUrl, frame.prefix),
                trace: errorTrace(error),
                version: `v${version} - build ${build}`,
                ids: values.errors.scramjet?.ids,
              })
            ),
            headers: [['content-type', 'text/html; charset=utf-8']],
            status: 500,
            statusText: 'Internal Server Error',
          };
        });
      }
    })();

  const buildFramePlugins = (onUrl) => {
    const plugins = [
      buildErrorPagePlugin(),
      buildSearchUrlGuardPlugin(),
      buildLeakGuardPlugin(),
      buildBlockWebrtcPlugin(),
      buildFingerprintPlugin(),
      buildSiteFixesPlugin(),
    ];
    if (typeof $scramjetUtils === 'undefined') return plugins;
    plugins.push(new $scramjetUtils.HttpCachePlugin());

    if (onUrl) plugins.push(new $scramjetUtils.UrlWatcherPlugin(onUrl));

    plugins.push(
      new $scramjetUtils.CatchEscapedLinksPlugin((url) => {
        try {
          localStorage.setItem(`${values.storageNamespace}-frame-url`, 'sj:' + url.href);
          localStorage.setItem(`${values.storageNamespace}-open-url`, 'sj:' + url.href);
        } catch (e) {}
        return new URL(location.pathname + location.search, location.origin);
      })
    );

    return plugins;
  };

  const initialize = async () => {
    try {
      if (window.$invisiScramjet?.ready) {
        window.dispatchEvent(new Event('s-ready'));
        return;
      }

      const transportOptions = getTransportOptions();
      console.log('Using wisp:', transportOptions.wisp);
      console.log('Transport mode:', transportUrl);

      const [registration, transport] = await Promise.all([
        registerScramjetSW(),
        buildScramjetTransport(transportOptions),
        clearHttpCache(),
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
          codec: proxyCodec(),
        },
        scramjetConfig: {
          ...defaultConfig,
          flags: {
            ...defaultConfig.flags,
            allowFailedIntercepts: true,
            allowInvalidJs: false,
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

      const createFrame = (element, onUrl) =>
        controller.createFrame(element, { plugins: buildFramePlugins(onUrl) });
      let frame = null;
      if (!(document.getElementById('frame') instanceof HTMLIFrameElement)) {
        const hidden = document.createElement('iframe');
        hidden.setAttribute('aria-hidden', 'true');
        hidden.tabIndex = -1;
        hidden.style.cssText =
          'position:fixed;width:0;height:0;border:0;visibility:hidden;pointer-events:none;';
        document.body.appendChild(hidden);
        frame = controller.createFrame(hidden);
      }

      window.$invisiScramjet = { controller, frame, createFrame, ready: true };
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
    fetch(route("/scram/scramjet.wasm")).catch(() => {});
    window.$invisiScramjetInitializing = initialize().finally(() => {
      delete window.$invisiScramjetInitializing;
    });
  }
})();
