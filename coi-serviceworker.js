/* COOP/COEP service worker bootstrap. */
(() => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (window.crossOriginIsolated) return;

  const scriptURL = document.currentScript?.src;
  if (!scriptURL) return;

  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    console.warn('Interactive C++ terminal requires HTTPS and Service Worker support.');
    return;
  }

  const version = new URL(scriptURL).searchParams.get('v') || 'current';
  const reloadKey = 'cppMissionCoiNavigationReload_' + version;
  let reloadStarted = false;

  function reloadOnce(reason) {
    if (window.crossOriginIsolated || reloadStarted) return;
    if (sessionStorage.getItem(reloadKey) === '1') {
      console.warn('Cross-origin isolation is still unavailable after the service worker reload.', reason);
      return;
    }

    sessionStorage.setItem(reloadKey, '1');
    reloadStarted = true;
    console.info('Reloading Mission Lab through the COOP/COEP service worker:', reason);
    window.location.reload();
  }

  function watchActivation(worker) {
    if (!worker) return;
    const onStateChange = () => {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', onStateChange);
        // The controllerchange event normally reloads first. This is a backup
        // for browsers that activate the worker without dispatching it in time.
        if (!navigator.serviceWorker.controller) reloadOnce('service-worker-activated');
      }
      if (worker.state === 'redundant') {
        worker.removeEventListener('statechange', onStateChange);
      }
    };
    worker.addEventListener('statechange', onStateChange);
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!window.crossOriginIsolated) reloadOnce('controllerchange');
  });

  navigator.serviceWorker.register(scriptURL, {
    scope: new URL('./', scriptURL).pathname,
    updateViaCache: 'none'
  }).then(async registration => {
    try {
      await registration.update();
    } catch (error) {
      console.warn('Service Worker update check failed:', error);
    }

    watchActivation(registration.installing || registration.waiting);

    try {
      await navigator.serviceWorker.ready;
    } catch (error) {
      console.warn('Service Worker readiness check failed:', error);
    }

    const controller = navigator.serviceWorker.controller;
    if (controller) {
      // Preserve credentialless mode so Apps Script JSONP and other public
      // no-CORS resources continue to work under COEP.
      controller.postMessage({ type: 'coepCredentialless', value: true });
      // The current document may have loaded before the controller added
      // isolation headers. Reload this URL exactly once through the controller.
      reloadOnce('controlled-page-needs-isolated-navigation');
    } else if (registration.active) {
      // The active worker exists, but this tab was not claimed yet.
      reloadOnce('active-worker-has-not-claimed-tab');
    } else {
      watchActivation(registration.installing || registration.waiting);
    }
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
