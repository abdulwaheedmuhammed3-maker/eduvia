const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('service-worker.js', 'utf8');

test('service worker runtime cache is restricted to explicitly listed core assets', () => {
  assert.ok(source.includes('const CORE_URLS = new Set(CORE.map(path => new URL(path, self.location.href).href));'));
  assert.ok(source.includes('if (!CORE_URLS.has(event.request.url)) return;'));
  assert.ok(source.includes("caches.open(CACHE).then(cache => cache.match(event.request)"));
  assert.ok(!source.includes('caches.match(event.request)'), 'runtime lookup must not search across cache namespaces');
});

test('non-core same-origin GET requests are not intercepted for runtime caching', () => {
  const fetchHandler = source.slice(source.indexOf("self.addEventListener('fetch'"), source.indexOf("self.addEventListener('push'"));
  assert.ok(fetchHandler.includes("event.request.method !== 'GET'"));
  assert.ok(fetchHandler.includes('if (!CORE_URLS.has(event.request.url)) return;'));
  assert.ok(fetchHandler.includes('cache.put(event.request, response.clone())'));
});
