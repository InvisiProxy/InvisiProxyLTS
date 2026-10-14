import { route } from 'build:invisiproxy';
importScripts(route("/scram/controller.sw.js"));

const SCRAMJET_PREFIX = route("/scram/network/");
const CONTROLLER_TIMEOUT_MS = 15000;

// blob:/data: URLs never resolve against the proxy filesystem and must stay
// with the browser's native handler; prefix-wrapped blob requests (Scramjet
// rewrites them so the controller can serve them through its blob fetcher)
// still match the prefix and keep routing normally.
const isScramjetRoute = (url) => {
  if (/^(?:blob|data):/.test(url)) return false;
  try {
    return new URL(url).pathname.startsWith(SCRAMJET_PREFIX);
  } catch {
    return false;
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

self.addEventListener('fetch', (event) => {
  if (isScramjetRoute(event.request.url)) {
    event.respondWith(routeWhenReady(event));
    return;
  }
  if ($scramjetController.shouldRoute(event))
    event.respondWith($scramjetController.route(event));
});
