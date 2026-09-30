CREATE TABLE IF NOT EXISTS study_limits (
  bucket TEXT PRIMARY KEY,
  used INTEGER NOT NULL CHECK (used > 0),
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS study_limits_expiry ON study_limits(expires);
