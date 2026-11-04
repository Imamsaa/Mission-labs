/* Minimal COOP/COEP service worker shim for threaded WebAssembly on static hosts. */
(() => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const scriptURL = document.currentScript?.src;
  if (!scriptURL) return;

  // A versioned key permits one reload when switching the existing controller
  // from COEP require-corp to credentialless.
  const key = 'cppMissionCoiCredentiallessReloaded_v1';
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
  const appCache = 'cpp-mission-app-v1';
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
  self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
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
        const response = await fetch(request);
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
