import { Hono } from "hono";
import type { Env } from "../types";
import { listNotes, getNote, createNote, updateNote, deleteNote, restoreNote, listDeletedNotes, permanentlyDeleteNote, purgeOldDeletedNotes, togglePinNote } from "../db/queries";

type AuthVars = { userId: string; userEmail: string };

export const notesRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

notesRoutes.get("/", async (c) => {
  const q = c.req.query("q");
  const notes = await listNotes(c.env.DB, c.get("userId"), q);
  return c.json({ notes });
});

notesRoutes.post("/", async (c) => {
  const body = await c.req
    .json<{ title?: string; content?: string }>()
    .catch(() => ({}) as { title?: string; content?: string });
  const note = await createNote(c.env.DB, c.get("userId"), body.title, body.content);
  return c.json({ note }, 201);
});

// Trash list — must be before /:id to avoid matching "trash" as an id
notesRoutes.get("/trash/list", async (c) => {
  await purgeOldDeletedNotes(c.env.DB, c.get("userId"));
  const notes = await listDeletedNotes(c.env.DB, c.get("userId"));
  return c.json({ notes });
});

notesRoutes.get("/:id", async (c) => {
  const note = await getNote(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json({ note });
});

notesRoutes.put("/:id", async (c) => {
  const body = await c.req
    .json<{ title?: string; content?: string }>()
    .catch(() => ({}) as { title?: string; content?: string });
  const note = await updateNote(c.env.DB, c.get("userId"), c.req.param("id"), body);
  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json({ note });
});

notesRoutes.delete("/:id", async (c) => {
  const deleted = await deleteNote(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

notesRoutes.put("/:id/pin", async (c) => {
  const body = await c.req.json<{ pinned: boolean }>().catch(() => ({ pinned: true }));
  const updated = await togglePinNote(c.env.DB, c.get("userId"), c.req.param("id"), body.pinned);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

notesRoutes.post("/:id/restore", async (c) => {
  const restored = await restoreNote(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!restored) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

notesRoutes.delete("/:id/permanent", async (c) => {
  const deleted = await permanentlyDeleteNote(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
