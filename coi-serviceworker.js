/* Minimal COOP/COEP service worker shim for threaded WebAssembly on static hosts. */
(() => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const scriptURL = document.currentScript?.src;
  if (!scriptURL) return;

  // A versioned key permits one reload when switching the existing controller
  // from COEP require-corp to credentialless.
  const workerVersion = new URL(scriptURL).searchParams.get('v') || 'current';
  const key = 'cppMissionCoiCredentiallessReloaded_' + workerVersion;
  if (sessionStorage.getItem(key) === '1') return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  const reloadOnce = () => {
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    window.location.reload();
  };

  // Listen before registering: an updated worker uses skipWaiting() and
  // clients.claim(), which changes the controller after activation.
  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });

  navigator.serviceWorker.register(scriptURL, { scope: new URL('./', scriptURL).pathname })
    .then(registration => {
      // First visit: if a worker is already active but this page was not
      // controlled during navigation, reload once to receive its headers.
      if (!hadController && registration.active) reloadOnce();
    })
    .catch(error => console.warn('Cross-origin isolation service worker registration failed:', error));
})();

if (typeof window === 'undefined') {
  // Keep cross-origin isolation while allowing public no-CORS resources (e.g. Apps Script JSONP).
  let credentialless = true;
  const cacheName = 'cpp-mission-runtime-v1';
  const appCache = 'cpp-mission-app-v2';
  function addIsolationHeaders(response, crossOrigin = false) {
    if (!response || response.status === 0) return response;
    const headers = new Headers(response.headers);
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', credentialless ? 'credentialless' : 'require-corp');
    if (!credentialless) headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    if (crossOrigin) headers.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
  self.addEventListener('activate', event => event.waitUntil((async () => {
    // Remove only obsolete app assets. Keep the runtime CDN cache to avoid
    // forcing every student to download the compiler dependencies again.
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(name => name.startsWith('cpp-mission-app-') && name !== appCache)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })()));
  self.addEventListener('message', event => { if (event.data?.type === 'coepCredentialless') credentialless = Boolean(event.data.value); });
  self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    const scope = new URL(self.registration.scope);
    const local = url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
    const cdn = url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'esm.sh' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
    if (!local && !cdn) return;
    event.respondWith((async () => {
      const cache = await caches.open(local ? appCache : cacheName);
      try {
        if (!local) { const cached = await cache.match(request); if (cached) return addIsolationHeaders(cached, true); }
        // Always bypass the browser's HTTP cache for same-origin app files.
        // The Cache API remains a network-failure fallback only.
        const networkRequest = local ? new Request(request, { cache: 'no-store' }) : request;
        const response = await fetch(networkRequest);
        if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
          const prepared = addIsolationHeaders(response.clone(), !local);
          try { await cache.put(request, prepared.clone()); } catch {}
          return prepared;
        }
        return addIsolationHeaders(response, !local);
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return addIsolationHeaders(cached, !local);
        throw error;
      }
    })());
  });
}
