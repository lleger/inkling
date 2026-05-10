CREATE TABLE IF NOT EXISTS folder_metadata (
  user_id TEXT NOT NULL,
  path TEXT NOT NULL,
  icon_type TEXT NOT NULL,
  icon_value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (user_id, path)
);

CREATE INDEX IF NOT EXISTS idx_folder_metadata_user ON folder_metadata(user_id);
