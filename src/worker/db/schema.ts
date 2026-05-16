import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";

// All timestamp columns use Drizzle's standard timestamp_ms mode: stored as
// INTEGER (Unix milliseconds) and surfaced to JS as Date objects. This matches
// what better-auth's adapter passes (Date) and serializes cleanly to ISO
// strings on the wire via JSON.stringify.

const nowMs = sql`(unixepoch() * 1000)`;
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });

// --- App tables ---

export const notes = sqliteTable(
  "notes",
  {
    id: text("id")
      .primaryKey()
      .default(sql`(lower(hex(randomblob(16))))`),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default("Untitled"),
    content: text("content").notNull().default(""),
    preview: text("preview").notNull().default(""),
    wordCount: integer("word_count").notNull().default(0),
    taskDone: integer("task_done").notNull().default(0),
    taskTotal: integer("task_total").notNull().default(0),
    tags: text("tags").notNull().default("[]"),
    pinned: integer("pinned").notNull().default(0),
    folder: text("folder"),
    deletedAt: ts("deleted_at"),
    createdAt: ts("created_at").notNull().default(nowMs),
    updatedAt: ts("updated_at").notNull().default(nowMs),
  },
  (t) => [
    index("idx_notes_user_id").on(t.userId),
    index("idx_notes_user_updated").on(t.userId, t.updatedAt),
  ],
);

export const noteVersions = sqliteTable(
  "note_versions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`(lower(hex(randomblob(16))))`),
    noteId: text("note_id").notNull(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    title: text("title").notNull(),
    preview: text("preview").notNull().default(""),
    wordCount: integer("word_count").notNull().default(0),
    createdAt: ts("created_at").notNull().default(nowMs),
  },
  (t) => [
    index("idx_versions_note").on(t.noteId, t.createdAt),
    index("idx_versions_user").on(t.userId),
  ],
);

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey(),
  settings: text("settings").notNull().default("{}"),
});

export const folderMetadata = sqliteTable(
  "folder_metadata",
  {
    userId: text("user_id").notNull(),
    path: text("path").notNull(),
    iconType: text("icon_type", { enum: ["emoji", "lucide"] }).notNull(),
    iconValue: text("icon_value").notNull(),
    updatedAt: ts("updated_at").notNull().default(nowMs),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.path] }),
    index("idx_folder_metadata_user").on(t.userId),
  ],
);

// Note → note references, populated on every save by parsing wiki-link
// markdown out of the saved content. Keyed by (noteId, refId) so a note
// can reference the same target multiple times without dupes. Two indexes
// support both directions: forward (a note's outbound refs) and backward
// (incoming backlinks for a target).
export const noteRefs = sqliteTable(
  "note_refs",
  {
    noteId: text("note_id").notNull(),
    refId: text("ref_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (t) => [index("idx_refs_note").on(t.noteId), index("idx_refs_target_user").on(t.refId, t.userId)],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id")
      .primaryKey()
      .default(sql`(lower(hex(randomblob(16))))`),
    userId: text("user_id").notNull(),
    noteId: text("note_id").notNull(),
    objectKey: text("object_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: ts("created_at").notNull().default(nowMs),
  },
  (t) => [
    index("idx_attachments_user").on(t.userId),
    index("idx_attachments_note").on(t.noteId),
    index("idx_attachments_user_note").on(t.userId, t.noteId),
  ],
);

// --- better-auth tables ---
// Standard better-auth SQLite schema with timestamps as INTEGER (Unix ms),
// matching the Drizzle pattern.

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: ts("createdAt").notNull().default(nowMs),
  updatedAt: ts("updatedAt").notNull().default(nowMs),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: ts("expiresAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: ts("createdAt").notNull().default(nowMs),
    updatedAt: ts("updatedAt").notNull().default(nowMs),
  },
  (t) => [index("idx_session_userId").on(t.userId), index("idx_session_token").on(t.token)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text("providerId").notNull(),
    accountId: text("accountId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: ts("accessTokenExpiresAt"),
    refreshTokenExpiresAt: ts("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: ts("createdAt").notNull().default(nowMs),
    updatedAt: ts("updatedAt").notNull().default(nowMs),
  },
  (t) => [
    index("idx_account_userId").on(t.userId),
    index("idx_account_provider").on(t.providerId, t.accountId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expiresAt").notNull(),
    createdAt: ts("createdAt").notNull().default(nowMs),
    updatedAt: ts("updatedAt").notNull().default(nowMs),
  },
  (t) => [index("idx_verification_identifier").on(t.identifier)],
);
