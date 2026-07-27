importScripts("src/manifest.js");

const CACHE_NAME = "ps4-exploit-v1";

async function cacheAssets(client) {
  const cache = await caches.open(CACHE_NAME);
  const assets = await getAssetsFromManifest();
  let total = assets.length;
  let loaded = 0;
  let errors = [];

  for (const asset of assets) {
    try {
      const response = await fetch(asset, { cache: "reload" });
      if (response.ok) {
        await cache.put(asset, response);
      } else {
        errors.push(`${asset} (HTTP ${response.status})`);
      }
    } catch (err) {
      errors.push(`${asset} (${err.message})`);
    }
    loaded++;
    if (client) {
      client.postMessage({
        type: "CACHE_PROGRESS",
        loaded,
        total,
        asset,
        percent: Math.round((loaded / total) * 100),
      });
    }
  }

  if (client) {
    client.postMessage({
      type: "CACHE_COMPLETE",
      errors,
    });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      const client = clients[0];
      await cacheAssets(client);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CHECK_CACHE") {
    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys();
      if (keys.length > 0) {
        event.source.postMessage({
          type: "CACHE_COMPLETE",
          errors: [],
        });
      } else {
        await cacheAssets(event.source);
      }
    });
  }
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }),
  );
});
