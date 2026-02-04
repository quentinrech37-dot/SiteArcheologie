const CACHE_NAME = "salins-cartes-v18";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./plans.json",
  "./manifest.webmanifest",
  "./offline.html",
  "./assets/img/plan1_thumb.jpg",
  "./assets/img/plan2_thumb.jpg",
  "./assets/img/plan3_thumb.jpg",
  "./assets/img/plan4_thumb.jpg",
  "./assets/img/plan5_thumb.jpg",
  "./assets/img/plan6_thumb.jpg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

// Install : cache du coeur du site
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate : nettoyage éventuel
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch : stratégie "cache-first" pour vos fichiers, "network-first" pour tuiles externes
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Si c'est votre site : cache-first
  if (url.origin === location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Tuiles / ressources externes : network-first (sinon cartes bloquées)
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    // on cache quand même si possible
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return caches.match("./offline.html");
  }
}

async function networkFirst(req){
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    return fresh;
  } catch {
    const cached = await cache.match(req);
    return cached || caches.match("./offline.html");
  }
}
