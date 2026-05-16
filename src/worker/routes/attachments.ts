import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../types";
import {
  createAttachment,
  deleteAttachmentRecord,
  getAttachmentRecord,
  getNote,
  listAttachments,
  updateNote,
} from "../db/queries";

type AuthVars = { userId: string; userEmail: string };

export const attachmentsRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
const UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000;

const uploadUrlSchema = z.object({
  filename: z.string().trim().min(1).max(240),
  contentType: z.string().trim().min(1).max(160).optional(),
  size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
});

interface UploadTokenPayload {
  id: string;
  userId: string;
  noteId: string;
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
  exp: number;
}

attachmentsRoutes.get("/notes/:id", async (c) => {
  const note = await getNote(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!note) return c.json({ error: "Not found" }, 404);
  const attachments = await listAttachments(c.env.DB, c.get("userId"), note.id);
  return c.json({ attachments });
});

attachmentsRoutes.post("/notes/:id/upload-url", zValidator("json", uploadUrlSchema), async (c) => {
  const note = await getNote(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!note) return c.json({ error: "Not found" }, 404);

  const body = c.req.valid("json");
  const id = crypto.randomUUID().replace(/-/g, "");
  const contentType = body.contentType || "application/octet-stream";
  const objectKey = `users/${c.get("userId")}/notes/${note.id}/${id}`;
  const payload: UploadTokenPayload = {
    id,
    userId: c.get("userId"),
    noteId: note.id,
    objectKey,
    filename: body.filename,
    contentType,
    size: body.size,
    exp: Date.now() + UPLOAD_TOKEN_TTL_MS,
  };
  const token = await signUploadToken(payload, c.env.BETTER_AUTH_SECRET || "");

  return c.json({
    attachment: {
      id,
      note_id: note.id,
      filename: body.filename,
      content_type: contentType,
      size: body.size,
      created_at: new Date().toISOString(),
      url: `/api/attachments/${id}/content`,
    },
    uploadUrl: `/api/attachments/uploads/${token}`,
    method: "PUT",
    expiresAt: new Date(payload.exp).toISOString(),
  });
});

attachmentsRoutes.put("/uploads/:token", async (c) => {
  const payload = await verifyUploadToken(c.req.param("token"), c.env.BETTER_AUTH_SECRET || "");
  if (!payload || payload.exp < Date.now()) return c.json({ error: "Upload URL expired" }, 401);
  if (payload.userId !== c.get("userId")) return c.json({ error: "Forbidden" }, 403);

  const length = Number(c.req.header("content-length") || "0");
  if (!Number.isFinite(length) || length !== payload.size) {
    return c.json({ error: "Invalid upload size" }, 400);
  }
  if (length > MAX_ATTACHMENT_BYTES) return c.json({ error: "File too large" }, 413);

  await c.env.ATTACHMENTS.put(payload.objectKey, c.req.raw.body, {
    httpMetadata: {
      contentType: payload.contentType,
      contentDisposition: contentDisposition(payload.filename, isPreviewable(payload.contentType)),
    },
    customMetadata: {
      userId: payload.userId,
      noteId: payload.noteId,
      filename: payload.filename,
    },
  });

  const attachment = await createAttachment(c.env.DB, payload.userId, payload.noteId, payload);
  return c.json({ attachment }, 201);
});

attachmentsRoutes.get("/:id/content", async (c) => {
  const record = await getAttachmentRecord(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!record) return c.json({ error: "Not found" }, 404);
  const object = await c.env.ATTACHMENTS.get(record.objectKey);
  if (!object) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-type", record.contentType);
  headers.set("content-length", String(record.size));
  headers.set(
    "content-disposition",
    contentDisposition(record.filename, isPreviewable(record.contentType)),
  );
  headers.set("cache-control", "private, max-age=3600");
  return new Response(object.body, { headers });
});

attachmentsRoutes.delete("/:id", async (c) => {
  const record = await deleteAttachmentRecord(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!record) return c.json({ error: "Not found" }, 404);
  await c.env.ATTACHMENTS.delete(record.objectKey);
  const note = await getNote(c.env.DB, c.get("userId"), record.noteId);
  if (note) {
    await updateNote(c.env.DB, c.get("userId"), record.noteId, {
      content: removeAttachmentMarkdown(note.content, record.id),
    });
  }
  return c.json({ success: true });
});

async function signUploadToken(payload: UploadTokenPayload, secret: string): Promise<string> {
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(`${body}`, secret);
  return `${body}.${sig}`;
}

async function verifyUploadToken(
  token: string,
  secret: string,
): Promise<UploadTokenPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as UploadTokenPayload;
  } catch {
    return null;
  }
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(sig));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function isPreviewable(contentType: string): boolean {
  return (
    contentType.startsWith("image/") ||
    contentType === "application/pdf" ||
    contentType.startsWith("text/")
  );
}

function contentDisposition(filename: string, inline: boolean): string {
  const fallback = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function removeAttachmentMarkdown(content: string, id: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content
    .replace(
      new RegExp(`!?\\[[^\\]\\n]*\\]\\(\\/api\\/attachments\\/${escaped}\\/content\\)`, "g"),
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}
