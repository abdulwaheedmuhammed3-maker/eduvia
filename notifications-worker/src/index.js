import { generateVapidKeys } from '@mmmike/web-push/vapid';
import { sendPushNotification } from '@mmmike/web-push/send';

const MAX_REMINDERS = 600;
const MAX_HORIZON_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_LATE_MS = 10 * 60 * 1000;
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_SEND_PER_RUN = 10;
const CLAIM_LEASE_MS = 2 * 60 * 1000;

class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!origin || allowedOrigins(env).includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
  }
  return null;
}

async function readJson(request) {
  const size = Number(request.headers.get('Content-Length') || 0);
  if (size > MAX_REQUEST_BYTES) throw new RequestError('Request is too large.', 413);
  if (!request.body) throw new RequestError('A JSON request body is required.', 400);
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new RequestError('Request is too large.', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new RequestError('The request body must be valid JSON.', 400);
  }
}

function bearerToken(request) {
  const match = /^Bearer ([A-Za-z0-9_-]{40,60})$/.exec(request.headers.get('Authorization') || '');
  return match?.[1] || '';
}

async function deviceId(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function vapidKeys(db) {
  const saved = await db.prepare('SELECT public_key, private_key FROM app_keys WHERE singleton = 1').first();
  if (saved) return saved;
  const generated = await generateVapidKeys();
  await db.prepare('INSERT OR IGNORE INTO app_keys (singleton, public_key, private_key, created_at) VALUES (1, ?, ?, ?)')
    .bind(generated.publicKey, generated.privateKey, Date.now()).run();
  return await db.prepare('SELECT public_key, private_key FROM app_keys WHERE singleton = 1').first();
}

function validSubscription(value) {
  if (!value || typeof value.endpoint !== 'string' || value.endpoint.length > 2048) return false;
  let host;
  try {
    const endpoint = new URL(value.endpoint);
    if (endpoint.protocol !== 'https:') return false;
    host = endpoint.hostname.toLowerCase();
  } catch { return false; }
  const supported = host === 'fcm.googleapis.com' || host === 'push.services.mozilla.com' ||
    host.endsWith('.push.services.mozilla.com') || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com');
  return supported && typeof value.keys?.p256dh === 'string' && typeof value.keys?.auth === 'string';
}

function normalizeReminder(value, now) {
  if (!value || typeof value.id !== 'string' || !/^[A-Za-z0-9._:@|-]{1,120}$/.test(value.id)) return null;
  const fireAt = Number(value.fireAt);
  if (!Number.isFinite(fireAt) || fireAt < now - 60_000 || fireAt > now + MAX_HORIZON_MS) return null;
  const title = String(value.title || '').trim().slice(0, 100);
  const body = String(value.body || '').trim().slice(0, 220);
  if (!title || !body) return null;
  return { id: value.id, title, body, fireAt: Math.floor(fireAt) };
}

async function digestSchedule(reminders) {
  const text = JSON.stringify(reminders.map(item => [item.id, item.title, item.body, item.fireAt]));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function sendPush(subscription, payload, keys, env) {
  return sendPushNotification(subscription, payload, {
    publicKey: keys.public_key,
    privateKey: keys.private_key,
    subject: env.VAPID_SUBJECT || 'https://eduvia-pmso.onrender.com'
  });
}

async function handleFetch(request, env) {
  const headers = corsHeaders(request, env);
  if (!headers) return json({ error: 'This origin is not allowed.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/v1/health') return json({ ok: true, service: 'Eduvia phone notifications' }, 200, headers);
  if (request.method === 'GET' && url.pathname === '/v1/config') {
    const keys = await vapidKeys(env.DB);
    return json({ publicKey: keys.public_key }, 200, headers);
  }

  const token = bearerToken(request);
  if (!token) return json({ error: 'This device is not registered.' }, 401, headers);
  const id = await deviceId(token);

  if (request.method === 'POST' && url.pathname === '/v1/schedule') {
    const body = await readJson(request);
    if (!validSubscription(body.subscription)) return json({ error: 'The phone notification subscription is invalid.' }, 400, headers);
    if (!Array.isArray(body.reminders) || body.reminders.length > MAX_REMINDERS) return json({ error: 'The schedule contains too many reminders.' }, 400, headers);
    const now = Date.now();
    const reminders = body.reminders.map(item => normalizeReminder(item, now));
    if (reminders.some(item => !item)) return json({ error: 'One or more reminder times or labels are invalid.' }, 400, headers);
    reminders.sort((a, b) => a.id.localeCompare(b.id));
    const hash = await digestSchedule(reminders);
    const subscriptionJson = JSON.stringify(body.subscription);
    const current = await env.DB.prepare('SELECT schedule_hash, subscription_json FROM devices WHERE device_id = ?').bind(id).first();
    if (current?.schedule_hash === hash && current.subscription_json === subscriptionJson) {
      return json({ ok: true, synced: reminders.length, unchanged: true }, 200, headers);
    }
    // Keep the old hash until every replacement reminder is written. If a delete
    // or batch insert fails, the next sync must retry instead of treating a partial
    // schedule as complete. New devices start with an empty hash for the same reason.
    await env.DB.prepare('INSERT INTO devices (device_id, subscription_json, schedule_hash, updated_at) VALUES (?, ?, \'\', ?) ON CONFLICT(device_id) DO UPDATE SET subscription_json = excluded.subscription_json, updated_at = excluded.updated_at')
      .bind(id, subscriptionJson, now).run();
    if (current?.schedule_hash !== hash) {
      await env.DB.prepare('DELETE FROM reminders WHERE device_id = ?').bind(id).run();
      for (let offset = 0; offset < reminders.length; offset += 40) {
        const statements = reminders.slice(offset, offset + 40).map(item => env.DB.prepare('INSERT INTO reminders (device_id, reminder_id, title, body, fire_at, status, attempt_count, delivered_at) VALUES (?, ?, ?, ?, ?, \'pending\', 0, NULL)')
          .bind(id, item.id, item.title, item.body, item.fireAt));
        if (statements.length) await env.DB.batch(statements);
      }
      await env.DB.prepare('UPDATE devices SET schedule_hash = ? WHERE device_id = ?').bind(hash, id).run();
    }
    return json({ ok: true, synced: reminders.length }, 200, headers);
  }

  if (request.method === 'POST' && url.pathname === '/v1/test') {
    const row = await env.DB.prepare('SELECT subscription_json FROM devices WHERE device_id = ?').bind(id).first();
    if (!row) return json({ error: 'Enable notifications on this phone first.' }, 404, headers);
    const keys = await vapidKeys(env.DB);
    const delivered = await sendPush(JSON.parse(row.subscription_json), {
      title: 'Eduvia notifications are on',
      body: 'Your phone is ready to receive class and study reminders.',
      url: './#today',
      tag: 'eduvia-notification-test'
    }, keys, env);
    if (!delivered) {
      await env.DB.prepare('DELETE FROM reminders WHERE device_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM devices WHERE device_id = ?').bind(id).run();
      return json({ error: 'This phone subscription has expired. Enable notifications again.' }, 410, headers);
    }
    return json({ ok: true }, 200, headers);
  }

  if (request.method === 'POST' && url.pathname === '/v1/unsubscribe') {
    await env.DB.prepare('DELETE FROM reminders WHERE device_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM devices WHERE device_id = ?').bind(id).run();
    return json({ ok: true }, 200, headers);
  }
  return json({ error: 'Not found.' }, 404, headers);
}

async function sendDueReminders(env) {
  const now = Date.now();
  await env.DB.prepare("DELETE FROM reminders WHERE fire_at < ? AND status IN ('pending', 'sending', 'sent', 'failed')")
    .bind(now - MAX_LATE_MS).run();
  const result = await env.DB.prepare("SELECT r.device_id, r.reminder_id, r.title, r.body, r.fire_at, d.subscription_json FROM reminders r JOIN devices d ON d.device_id = r.device_id WHERE r.attempt_count < 3 AND r.fire_at <= ? AND r.fire_at >= ? AND (r.status = 'pending' OR (r.status = 'sending' AND r.claim_until <= ?)) ORDER BY r.fire_at LIMIT ?")
    .bind(now, now - MAX_LATE_MS, now, MAX_SEND_PER_RUN).all();
  if (!result.results?.length) return;
  let keys;
  for (const row of result.results) {
    const claim = await env.DB.prepare("UPDATE reminders SET status = 'sending', claim_until = ? WHERE device_id = ? AND reminder_id = ? AND (status = 'pending' OR (status = 'sending' AND claim_until <= ?))")
      .bind(now + CLAIM_LEASE_MS, row.device_id, row.reminder_id, now).run();
    if (!claim.meta?.changes) continue;
    try {
      keys ||= await vapidKeys(env.DB);
      const delivered = await sendPush(JSON.parse(row.subscription_json), {
        title: row.title,
        body: row.body,
        url: './#today',
        tag: `eduvia-${row.reminder_id}`
      }, keys, env);
      if (delivered) {
        await env.DB.prepare("UPDATE reminders SET status = 'sent', claim_until = NULL, delivered_at = ? WHERE device_id = ? AND reminder_id = ? AND status = 'sending'")
          .bind(Date.now(), row.device_id, row.reminder_id).run();
      } else {
        await env.DB.prepare("DELETE FROM reminders WHERE device_id = ? AND status IN ('pending', 'sending')").bind(row.device_id).run();
        await env.DB.prepare('DELETE FROM devices WHERE device_id = ?').bind(row.device_id).run();
      }
    } catch {
      await env.DB.prepare("UPDATE reminders SET attempt_count = attempt_count + 1, claim_until = NULL, status = CASE WHEN attempt_count + 1 >= 3 THEN 'failed' ELSE 'pending' END WHERE device_id = ? AND reminder_id = ? AND status = 'sending'")
        .bind(row.device_id, row.reminder_id).run();
    }
  }
}

export default {
  async fetch(request, env) {
    try { return await handleFetch(request, env); }
    catch (error) { return json({ error: error?.message || 'The notification service could not complete that request.' }, error?.status || 500, corsHeaders(request, env) || {}); }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDueReminders(env));
  }
};
