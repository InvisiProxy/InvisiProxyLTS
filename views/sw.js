import { route } from 'build:invisiproxy';
importScripts(route("/scram/controller.sw.js"));

self.addEventListener('fetch', (event) => {
  if ($scramjetController.shouldRoute(event))
    event.respondWith($scramjetController.route(event));
});
