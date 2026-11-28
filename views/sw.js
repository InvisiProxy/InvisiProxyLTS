import { route } from 'build:invisiproxy';
importScripts(route("/scram3/controller3.sw.js"));

self.addEventListener('fetch', (event) => {
  if ($scramjetController.shouldRoute(event))
    event.respondWith($scramjetController.route(event));
});
