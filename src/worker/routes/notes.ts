import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../types";
import { listNotes, getNote, createNote, updateNote, deleteNote, restoreNote, listDeletedNotes, permanentlyDeleteNote, purgeOldDeletedNotes, togglePinNote } from "../db/queries";

type AuthVars = { userId: string; userEmail: string };

export const notesRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

const noteBodySchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
});

const pinSchema = z.object({
  pinned: z.boolean(),
});

notesRoutes.get("/", async (c) => {
  const q = c.req.query("q");
  const notes = await listNotes(c.env.DB, c.get("userId"), q);
  return c.json({ notes });
});

notesRoutes.post(
  "/",
  zValidator("json", noteBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const note = await createNote(c.env.DB, c.get("userId"), body.title, body.content);
    return c.json({ note }, 201);
  },
);

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

notesRoutes.put(
  "/:id",
  zValidator("json", noteBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const note = await updateNote(c.env.DB, c.get("userId"), c.req.param("id"), body);
    if (!note) return c.json({ error: "Not found" }, 404);
    return c.json({ note });
  },
);

notesRoutes.delete("/:id", async (c) => {
  const deleted = await deleteNote(c.env.DB, c.get("userId"), c.req.param("id"));
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

notesRoutes.put(
  "/:id/pin",
  zValidator("json", pinSchema),
  async (c) => {
    const { pinned } = c.req.valid("json");
    const updated = await togglePinNote(c.env.DB, c.get("userId"), c.req.param("id"), pinned);
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  },
);

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
