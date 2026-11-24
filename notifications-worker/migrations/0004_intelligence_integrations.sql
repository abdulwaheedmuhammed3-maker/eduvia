CREATE TABLE IF NOT EXISTS intelligence_sessions (
  session_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  daily_date TEXT NOT NULL,
  daily_requests INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_intelligence_sessions_expiry ON intelligence_sessions(expires_at);

CREATE TABLE IF NOT EXISTS google_oauth_states (
  state_hash TEXT PRIMARY KEY,
  session_hash TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (session_hash) REFERENCES intelligence_sessions(session_hash) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expiry ON google_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS google_connections (
  session_hash TEXT PRIMARY KEY,
  token_iv TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (session_hash) REFERENCES intelligence_sessions(session_hash) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS intelligence_ip_usage (
  ip_hash TEXT PRIMARY KEY,
  usage_date TEXT NOT NULL,
  ai_requests INTEGER NOT NULL DEFAULT 0,
  sessions_created INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intelligence_ip_usage_updated ON intelligence_ip_usage(updated_at);
