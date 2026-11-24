import { route } from 'build:invisiproxy';
import { decodeUrl } from '../src/browser/proxy-codec.ts';
importScripts(route("/scram/controller.sw.js"));

const SJ_CONTROLLER_PREFIX = route("/scram/network/");

const blacklist = new Set();
fetch(route("/assets/txt/blacklist.txt"))
  .then((response) => response.text())
  .then((textData) => {
    for (const line of textData.split('\n')) {
      const entry = line.trim();
      if (!entry || '#![@'.includes(entry[0])) continue;
      blacklist.add(entry.replace(/^\|\||\^$/g, '').toLowerCase());
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
    return new URL(decodeUrl(encoded)).hostname;
  } catch {
    return null;
  }
};

self.addEventListener('fetch', (event) => {
  if (!$scramjetController.shouldRoute(event)) return;
  event.respondWith(
    (async () => {
      const hostname = targetHostnameForScramjet(event.request.url);
      if (isBlacklistedDomain(hostname))
        return new Response(new Blob(), { status: 406 });
      return $scramjetController.route(event);
    })()
  );
});
