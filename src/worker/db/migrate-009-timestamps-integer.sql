-- Convert all TEXT (ISO 8601) timestamp columns to INTEGER (Unix milliseconds)
-- to align with Drizzle's standard `timestamp_ms` mode. SQLite can't ALTER
-- column type in place, so each table is rebuilt.
--
-- strftime('%s', x) returns Unix seconds; * 1000 → ms.
-- Wrapped in BEGIN/COMMIT (must be a single transaction so partial failure
-- doesn't leave orphan tables).

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- notes
CREATE TABLE notes_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  preview TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  task_done INTEGER NOT NULL DEFAULT 0,
  task_total INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  folder TEXT DEFAULT NULL,
  deleted_at INTEGER DEFAULT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
INSERT INTO notes_new
  SELECT id, user_id, title, content, preview, word_count, task_done, task_total,
         tags, pinned, folder,
         CASE WHEN deleted_at IS NULL THEN NULL ELSE CAST(strftime('%s', deleted_at) AS INTEGER) * 1000 END,
         CAST(strftime('%s', created_at) AS INTEGER) * 1000,
         CAST(strftime('%s', updated_at) AS INTEGER) * 1000
  FROM notes;
DROP TABLE notes;
ALTER TABLE notes_new RENAME TO notes;
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at DESC);

-- note_versions
CREATE TABLE note_versions_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  note_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
INSERT INTO note_versions_new
  SELECT id, note_id, user_id, content, title, preview, word_count,
         CAST(strftime('%s', created_at) AS INTEGER) * 1000
  FROM note_versions;
DROP TABLE note_versions;
ALTER TABLE note_versions_new RENAME TO note_versions;
CREATE INDEX IF NOT EXISTS idx_versions_note ON note_versions(note_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_user ON note_versions(user_id);

-- user (better-auth)
CREATE TABLE user_new (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
INSERT INTO user_new
  SELECT id, name, email, emailVerified, image,
         CAST(strftime('%s', createdAt) AS INTEGER) * 1000,
         CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
  FROM user;
DROP TABLE user;
ALTER TABLE user_new RENAME TO user;

-- session
CREATE TABLE session_new (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expiresAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
INSERT INTO session_new
  SELECT id, userId, token,
         CAST(strftime('%s', expiresAt) AS INTEGER) * 1000,
         ipAddress, userAgent,
         CAST(strftime('%s', createdAt) AS INTEGER) * 1000,
         CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
  FROM session;
DROP TABLE session;
ALTER TABLE session_new RENAME TO session;
CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);

-- account
CREATE TABLE account_new (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  providerId TEXT NOT NULL,
  accountId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
INSERT INTO account_new
  SELECT id, userId, providerId, accountId, accessToken, refreshToken, idToken,
         CASE WHEN accessTokenExpiresAt IS NULL THEN NULL ELSE CAST(strftime('%s', accessTokenExpiresAt) AS INTEGER) * 1000 END,
         CASE WHEN refreshTokenExpiresAt IS NULL THEN NULL ELSE CAST(strftime('%s', refreshTokenExpiresAt) AS INTEGER) * 1000 END,
         scope, password,
         CAST(strftime('%s', createdAt) AS INTEGER) * 1000,
         CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
  FROM account;
DROP TABLE account;
ALTER TABLE account_new RENAME TO account;
CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(providerId, accountId);

-- verification
CREATE TABLE verification_new (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
INSERT INTO verification_new
  SELECT id, identifier, value,
         CAST(strftime('%s', expiresAt) AS INTEGER) * 1000,
         CAST(strftime('%s', createdAt) AS INTEGER) * 1000,
         CAST(strftime('%s', updatedAt) AS INTEGER) * 1000
  FROM verification;
DROP TABLE verification;
ALTER TABLE verification_new RENAME TO verification;
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);

COMMIT;

PRAGMA foreign_keys = ON;
