import { route } from 'build:invisiproxy';
importScripts(route("/scram/controller.sw.js"));

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

// blob:/data: URLs never resolve against the proxy filesystem and must stay
// with the browser's native handler; prefix-wrapped blob requests (Scramjet
// rewrites them so the controller can serve them through its blob fetcher)
// still match the prefix and keep routing normally.
const isScramjetRoute = (url) => {
  if (/^(?:blob|data):/.test(url)) return false;
  try {
    return new URL(url).pathname.startsWith(SJ_CONTROLLER_PREFIX);
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
  const url = event.request.url;
  if (!isScramjetRoute(url) && !$scramjetController.shouldRoute(event)) return;
  event.respondWith(
    (async () => {
      const hostname = targetHostnameForScramjet(url);
      if (isBlacklistedDomain(hostname))
        return new Response(new Blob(), { status: 406 });
      return routeWhenReady(event);
    })()
  );
});
