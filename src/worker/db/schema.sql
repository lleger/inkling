-- Consolidated schema for a fresh D1. Generated from `src/worker/db/schema.ts`
-- (Drizzle) by exporting the local DB after all migrate-001..009 had been
-- applied. Keep regenerating this file from the canonical schema.ts using:
--
--   npx wrangler d1 export inkling-db --local --output=src/worker/db/schema.sql --no-data
--
-- The migrate-*.sql files in this directory are historical and only relevant
-- if you're upgrading an old DB in place. For a fresh deploy, just apply
-- this file (`npm run db:migrate`).

PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  settings TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS "notes" (
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
CREATE TABLE IF NOT EXISTS "note_versions" (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  note_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expiresAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS "account" (
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
CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_user_updated ON notes(user_id, updated_at DESC);
CREATE INDEX idx_versions_note ON note_versions(note_id, created_at DESC);
CREATE INDEX idx_versions_user ON note_versions(user_id);
CREATE INDEX idx_session_userId ON session(userId);
CREATE INDEX idx_session_token ON session(token);
CREATE INDEX idx_account_userId ON account(userId);
CREATE INDEX idx_account_provider ON account(providerId, accountId);
CREATE INDEX idx_verification_identifier ON verification(identifier);