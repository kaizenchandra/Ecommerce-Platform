CREATE TABLE auth_flow (id text PRIMARY KEY, payload text NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX auth_flow_expiry ON auth_flow(expires_at);
CREATE TABLE auth_session (id text PRIMARY KEY, payload text NOT NULL, expires_at timestamptz NOT NULL, idle_until timestamptz NOT NULL);
CREATE INDEX auth_session_expiry ON auth_session(expires_at);
