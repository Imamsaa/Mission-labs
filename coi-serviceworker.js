/* COOP/COEP service worker shim for cross-origin isolated browser execution. */
(() => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (window.crossOriginIsolated) return;

  const scriptURL = document.currentScript?.src;
  if (!scriptURL) return;

  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    console.warn('Interactive C++ terminal requires a secure context and Service Worker support.');
    return;
  }

  const workerVersion = new URL(scriptURL).searchParams.get('v') || 'current';
  const reloadKey = 'cppMissionCoiReloaded_' + workerVersion;
  let reloadStarted = false;

  const reloadAfterControllerReady = () => {
    // A controller can be assigned after the navigation response was already
    // created. In that case this document is controlled, but is not isolated.
    // Reload once so the next document receives the COOP/COEP response headers.
    if (window.crossOriginIsolated || reloadStarted || !navigator.serviceWorker.controller) return;

    if (sessionStorage.getItem(reloadKey) === '1') {
      console.warn('Service Worker controls this page, but cross-origin isolation is still unavailable.');
      return;
    }

    sessionStorage.setItem(reloadKey, '1');
    reloadStarted = true;
    window.location.reload();
  };

  const waitForActivation = worker => new Promise(resolve => {
    if (!worker || worker.state === 'activated' || worker.state === 'redundant') {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      worker.removeEventListener('statechange', onStateChange);
      resolve();
    }, 15000);

    const onStateChange = () => {
      if (worker.state === 'activated' || worker.state === 'redundant') {
        clearTimeout(timeout);
        worker.removeEventListener('statechange', onStateChange);
        resolve();
      }
    };

    worker.addEventListener('statechange', onStateChange);
  });

  // Listen before registration so a newly activated worker cannot be missed.
  navigator.serviceWorker.addEventListener('controllerchange', reloadAfterControllerReady);

  navigator.serviceWorker.register(scriptURL, {
    scope: new URL('./', scriptURL).pathname,
    updateViaCache: 'none'
  }).then(async registration => {
    try {
      // Force a script update check. This also handles an already-controlled
      // tab that still has a document without COOP/COEP headers.
      await registration.update();
    } catch (error) {
      console.warn('Service Worker update check failed:', error);
    }

    const candidate = registration.installing || registration.waiting;
    if (candidate) await waitForActivation(candidate);

    await navigator.serviceWorker.ready;

    // Do not rely only on controllerchange: the controller may have been
    // assigned before this script attached its listener.
    reloadAfterControllerReady();
  }).catch(error => {
    console.warn('Cross-origin isolation service worker registration failed:', error);
  });
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
