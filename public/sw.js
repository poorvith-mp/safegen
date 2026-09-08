const CACHE_PREFIX = 'safegen-app-';
const CACHE_NAME = `${CACHE_PREFIX}v3-2`;
const APP_SHELL = ['/favicon.svg', '/favicon.png', '/apple-touch-icon.png', '/logo-mark.svg', '/poorvith-mark.svg', '/clients/codex.png', '/clients/claude.png', '/clients/cursor.svg'];
const PAGES = new Set(['/', '/index.html', '/generator', '/generator/history', '/generator/estimate', '/setup', '/docs', '/about']);
const STATIC_ASSET = /^\/assets\/[^/]+\.(?:css|js|svg|png|webp|woff2?)$/;

async function installAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
  // Cloudflare redirects /index.html to /. A redirected cached response cannot serve an offline navigation.
  const index = await fetch('/', { cache: 'no-store', redirect: 'error' });
  if (!index.ok) throw new Error('App shell unavailable');
  await cache.put('/index.html', index.clone());
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
    if (response.ok && !response.redirected) {
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
  if (request.mode === 'navigate' && PAGES.has(url.pathname.replace(/\/$/, '') || '/')) {
    event.respondWith(loadPage(request));
    return;
  }
  if (request.destination && (STATIC_ASSET.test(url.pathname) || APP_SHELL.includes(url.pathname))) {
    event.respondWith(loadAsset(request));
  }
});
