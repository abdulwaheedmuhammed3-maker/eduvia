const CACHE = 'eduvia-v107-ai-tutor-google';
const CORE = ['./', './index.html', './ai-tutor.js?v=ai-tutor-1', './ai-tutor.css?v=ai-tutor-1', './styles.css?v=entry-flow-4&rev=application-audit-1', './entry-flow.css?v=eduvia-entry-5&rev=theme-audit-1', './visual-refresh.css?v=eduvia-design-3&rev=theme-audit-2', './experience.css?v=discover-touch-fix-4&rev=extra-class-actions-1', './roadmaps.css?v=roadmaps-darkfix-1', './icon-system.css?v=material-outline-3&rev=theme-audit-1', './ui-polish.css?v=layout-audit-2', './experience.js?v=experience-3&rev=play-screen-cleanup-2', './icon-system.js?v=material-outline-2', './roadmap-core.js?v=roadmap-core-1', './roadmaps.js?v=roadmaps-3&rev=more-tools-unified-1', './learning-expansions.js?v=learning-expansions-3&rev=bottom-actions-2&audit=1', './recall-core.js?v=eduvia-recall-1', './recall.js?v=eduvia-recall-1', './recall.css?v=eduvia-recall-1', './voice-reflection.js?v=voice-reflection-2', './voice-reflection.css?v=voice-reflection-1', './entry-flow.js?v=eduvia-entry-3&rev=first-run-alert-optin-2', './native-bridge.js?v=native-android-3', './push-config.js?v=phone-push-1', './learner-profile.js?v=profile-audit-1', './app.js?v=universal-learning-4&rev=storage-accessibility-2-information-architecture-1-first-run-alerts-6&audit=2&change=class-attendance-extra-1', './study-studio.js?v=course-intelligence-1&rev=profile-audit-3-knowledge-check&audit=4&change=postponed-attendance-1&voice-keywords=1', './course-intelligence.js?v=course-intelligence-2&audit=1', './lecture-intelligence.css?v=lecture-intelligence-1', './lecture-intelligence.js?v=lecture-intelligence-1', './feature-hub.js?v=feature-hub-2&rev=primary-nav-map-1&audit=3', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
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
