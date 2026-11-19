const CACHE = 'eduvia-v38';
const CORE = ['./', './index.html', './styles.css?v=student-id-card-1', './native-bridge.js?v=native-android-2', './push-config.js?v=phone-push-1', './app.js?v=student-profile-1', './study-studio.js?v=student-id-card-1', './feature-hub.js?v=course-workspace-1', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('eduvia-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match('./index.html'))));
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
  const target = new URL(event.notification.data?.url || './#today', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const appWindow = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (appWindow) return appWindow.navigate(target).then(() => appWindow.focus());
    return clients.openWindow(target);
  }));
});
