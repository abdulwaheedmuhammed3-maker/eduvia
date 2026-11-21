const CACHE = 'eduvia-v76-learning-roadmaps';
const CORE = ['./', './index.html', './styles.css?v=entry-flow-3', './entry-flow.css?v=eduvia-entry-4&rev=universal-learning-1', './visual-refresh.css?v=eduvia-design-1', './experience.css?v=discover-touch-fix-1&rev=lecture-announcement-2', './roadmaps.css?v=roadmaps-1', './icon-system.css?v=material-outline-2', './experience.js?v=discover-touch-fix-1&rev=profile-audit-1', './icon-system.js?v=material-outline-2', './roadmap-core.js?v=roadmap-core-1', './roadmaps.js?v=roadmaps-1', './entry-flow.js?v=eduvia-entry-2&rev=profile-audit-2', './native-bridge.js?v=native-android-2', './push-config.js?v=phone-push-1', './learner-profile.js?v=profile-audit-1', './app.js?v=universal-learning-3&rev=storage-accessibility-2-profile-audit-2', './study-studio.js?v=course-intelligence-1&rev=profile-audit-2', './course-intelligence.js?v=course-intelligence-1', './feature-hub.js?v=course-intelligence-1&rev=profile-audit-1', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('eduvia-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  }).catch(() => {
    if (event.request.mode === 'navigate') return caches.match('./index.html');
    return new Response('Eduvia is offline. Reconnect to load this resource.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  })));
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {}
  const title = payload.title || 'Eduvia reminder';
  const options = {
    body: payload.body || 'Your study plan is coming up.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: payload.tag || 'eduvia-reminder',
    renotify: true,
    data: { url: payload.url || './#today' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  let target = new URL('./#today', self.location.origin);
  try {
    const requested = new URL(String(event.notification.data?.url || './#today'), self.location.origin);
    if (requested.origin === self.location.origin) target = requested;
  } catch {}
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const appWindow = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (appWindow) return appWindow.navigate(target.href).then(() => appWindow.focus());
    return clients.openWindow(target.href);
  }));
});
