import { route } from 'build:invisiproxy';
importScripts(route("/scram/controller.sw.js"));
import { isScramjetRouteUrl, proxiedAssetUrl } from '../src/browser/sw-routing.ts';

const SJ_CONTROLLER_PREFIX = route("/scram/network/");
const CONTROLLER_TIMEOUT_MS = 15000;

const blacklist = new Set();
fetch(route("/assets/txt/blacklist.txt"))
  .then((response) => response.text())
  .then((textData) => {
    for (const line of textData.split('\n')) {
      const domain = line.trim();
      if (!domain || domain.charCodeAt(0) === 35 /* '#' */) continue;
      blacklist.add(domain.toLowerCase());
    }
  })
  .catch(() => {});

const isBlacklistedDomain = (domain) => {
  if (!domain || blacklist.size === 0) return false;
  let host = domain.toLowerCase();
  while (host.includes('.')) {
    if (blacklist.has(host)) return true;
    host = host.slice(host.indexOf('.') + 1);
  }
  return false;
};

const targetHostnameForScramjet = (reqUrl) => {
  try {
    const path = new URL(reqUrl).pathname;
    if (!path.startsWith(SJ_CONTROLLER_PREFIX)) return null;
    const rest = path.slice(SJ_CONTROLLER_PREFIX.length).split('/');
    if (rest.length < 3) return null;
    const encoded = rest.slice(2).join('/');
    if (!encoded) return null;
    return new URL(decodeURIComponent(encoded)).hostname;
  } catch {
    return null;
  }
};

// Proxied pages, game assets, WebAssembly modules and Web Worker scripts all
// match the Scramjet prefix. If the page-side controller has not registered
// yet (startup race, service worker revival after a browser restart), these
// requests would otherwise fall through to the static server, which answers
// Scramjet routes with a 404. Hold them until the controller is available
// instead of serving a broken asset.
const routeWhenReady = async (event) => {
  const deadline = Date.now() + CONTROLLER_TIMEOUT_MS;
  while (!$scramjetController.shouldRoute(event)) {
    if (Date.now() >= deadline)
      return new Response("Scramjet controller unavailable", {
        status: 503,
        headers: { "Retry-After": "1", "Cache-Control": "no-store" },
      });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return $scramjetController.route(event);
};

// Escaped CDN assets: requests from a proxied client that the page-side
// rewriters missed (SDK-built URLs, root-relative media paths, worker
// fetches) would fall through to this origin's static site server and come
// back as 404s or blank embeds. Re-wrap them against the proxied document's
// real origin and serve them through the same Wisp-backed controller route
// as everything else, still honoring the ad blacklist. Requests without a
// proxied client (the proxy UI's own assets, the worker itself) stay native.
const routeEscapedAsset = async (event) => {
  const client = await self.clients.get(event.clientId);
  const wrapped = proxiedAssetUrl(
    event.request.url,
    client?.url,
    SJ_CONTROLLER_PREFIX,
    self.location.origin
  );
  if (!wrapped) return fetch(event.request);
  if (isBlacklistedDomain(targetHostnameForScramjet(wrapped)))
    return new Response(new Blob(), { status: 406 });
  const proxied = {
    request: new Request(wrapped, event.request),
    clientId: event.clientId,
    resultingClientId: event.resultingClientId,
    referrer: event.request.referrer,
  };
  const deadline = Date.now() + CONTROLLER_TIMEOUT_MS;
  while (!$scramjetController.shouldRoute(proxied)) {
    if (Date.now() >= deadline)
      return new Response("Scramjet controller unavailable", {
        status: 503,
        headers: { "Retry-After": "1", "Cache-Control": "no-store" },
      });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return $scramjetController.route(proxied);
};

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (isScramjetRouteUrl(url, SJ_CONTROLLER_PREFIX)) {
    event.respondWith(
      (async () => {
        const hostname = targetHostnameForScramjet(url);
        if (isBlacklistedDomain(hostname))
          return new Response(new Blob(), { status: 406 });
        return routeWhenReady(event);
      })()
    );
    return;
  }
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
    return;
  }
  if (event.request.method !== 'GET') return;
  if (event.request.destination === 'document') return;
  event.respondWith(routeEscapedAsset(event));
});
