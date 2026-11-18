CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  subscription_json TEXT NOT NULL,
  schedule_hash TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  device_id TEXT NOT NULL,
  reminder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  fire_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  delivered_at INTEGER,
  PRIMARY KEY (device_id, reminder_id)
);

CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders(status, fire_at);
CREATE INDEX IF NOT EXISTS reminders_device_idx ON reminders(device_id, fire_at);

CREATE TABLE IF NOT EXISTS app_keys (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
