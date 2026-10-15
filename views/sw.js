import { route } from 'build:invisiproxy';
importScripts(route("/scram/controller.sw.js"));
import { isScramjetRouteUrl, proxiedAssetUrl } from '../src/browser/sw-routing.ts';

const SCRAMJET_PREFIX = route("/scram/network/");
const CONTROLLER_TIMEOUT_MS = 15000;

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
// as everything else. Requests without a proxied client (the proxy UI's own
// assets, the worker itself) stay native.
const routeEscapedAsset = async (event) => {
  const client = await self.clients.get(event.clientId);
  const wrapped = proxiedAssetUrl(
    event.request.url,
    client?.url,
    SCRAMJET_PREFIX,
    self.location.origin
  );
  if (!wrapped) return fetch(event.request);
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
  if (isScramjetRouteUrl(event.request.url, SCRAMJET_PREFIX)) {
    event.respondWith(routeWhenReady(event));
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
