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
  let controllerTimer = null;

  function reloadAfterControl(reason) {
    if (window.crossOriginIsolated || reloadStarted || !navigator.serviceWorker.controller) return;

    if (sessionStorage.getItem(reloadKey) === '1') {
      console.warn('Cross-origin isolation is still unavailable after the controlled navigation.', reason);
      return;
    }

    sessionStorage.setItem(reloadKey, '1');
    reloadStarted = true;
    console.info('Reloading Mission Lab after Service Worker control is confirmed:', reason);
    window.location.reload();
  }

  function requestClaim(worker) {
    if (!worker) return;
    try {
      worker.postMessage({ type: 'coi-ensure-control' });
    } catch (error) {
      console.warn('Could not request Service Worker client claim:', error);
    }
  }

  function stopControllerTimer() {
    if (controllerTimer) clearTimeout(controllerTimer);
    controllerTimer = null;
  }

  function handleControllerChange() {
    stopControllerTimer();
    const controller = navigator.serviceWorker.controller;
    if (!controller) return;

    // credentialless is the preferred mode because Mission Lab also loads
    // public Apps Script JSONP and CDN assets without CORS headers.
    controller.postMessage({ type: 'coepCredentialless', value: true });
    reloadAfterControl('controllerchange');
  }

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

  navigator.serviceWorker.register(scriptURL, {
    scope: new URL('./', scriptURL).pathname,
    updateViaCache: 'none'
  }).then(async registration => {
    try {
      await registration.update();
    } catch (error) {
      console.warn('Service Worker update check failed:', error);
    }

    try {
      await navigator.serviceWorker.ready;
    } catch (error) {
      console.warn('Service Worker readiness check failed:', error);
    }

    if (navigator.serviceWorker.controller) {
      handleControllerChange();
      return;
    }

    const activeWorker = registration.active;
    if (activeWorker) {
      // Do not reload just because a registration is active. It must first
      // claim this tab; otherwise the next navigation still has no COEP headers.
      requestClaim(activeWorker);
    } else {
      const installingWorker = registration.installing || registration.waiting;
      if (installingWorker) {
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'activated') requestClaim(registration.active || installingWorker);
        });
      }
    }

    // Wait for clients.claim() to deliver controllerchange. Never spend the
    // one-time reload before the browser confirms that this tab is controlled.
    controllerTimer = setTimeout(() => {
      if (navigator.serviceWorker.controller) {
        handleControllerChange();
      } else {
        console.warn('Service Worker is registered but still does not control this tab. No reload was attempted.');
      }
    }, 12000);
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
  self.addEventListener('message', event => {
    if (event.data?.type === 'coepCredentialless') {
      credentialless = Boolean(event.data.value);
      return;
    }
    if (event.data?.type === 'coi-ensure-control') {
      event.waitUntil(self.clients.claim());
    }
  });
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
