CREATE TABLE IF NOT EXISTS google_oauth_states (
  state_hash TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  return_url TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS google_oauth_states_expiry_idx
  ON google_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS google_connections (
  device_id TEXT PRIMARY KEY,
  refresh_token_enc TEXT NOT NULL,
  account_email TEXT NOT NULL DEFAULT '',
  scopes_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  device_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  minute_bucket INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, ip_hash, action, minute_bucket)
);

CREATE INDEX IF NOT EXISTS ai_usage_window_idx
  ON ai_usage(device_id, ip_hash, action, minute_bucket);
