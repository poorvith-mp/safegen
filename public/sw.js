const CACHE_PREFIX = 'safegen-app-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/favicon.png', '/apple-touch-icon.png', '/logo-mark.svg'];
const STATIC_ASSET = /^\/assets\/[^/]+\.(?:css|js|svg|png|webp|woff2?)$/;

async function installAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
  const index = await fetch('/index.html', { cache: 'no-store' });
  if (!index.ok) return;
  const html = await index.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)]
    .map((match) => match[1])
    .filter((path) => STATIC_ASSET.test(path));
  if (assets.length) await cache.addAll([...new Set(assets)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(installAppShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
    self.clients.claim(),
  ]));
});

async function loadPage(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    return caches.match('/index.html');
  }
}

async function loadAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  // These requests have already passed the same-origin static-path allowlist.
  // Ignore Vary: Origin so precached Vite assets match their module requests offline.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type !== 'opaque') await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(loadPage(request));
    return;
  }
  if (request.destination && (STATIC_ASSET.test(url.pathname) || APP_SHELL.includes(url.pathname))) {
    event.respondWith(loadAsset(request));
  }
});
