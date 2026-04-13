import { Hono } from "hono";
import type { Env } from "../types";

type AuthVars = { userId: string; userEmail: string };

export const settingsRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

settingsRoutes.get("/", async (c) => {
  const row = await c.env.DB.prepare("SELECT settings FROM user_settings WHERE user_id = ?")
    .bind(c.get("userId"))
    .first<{ settings: string }>();

  if (!row) return c.json({ settings: {} });

  try {
    return c.json({ settings: JSON.parse(row.settings) });
  } catch {
    return c.json({ settings: {} });
  }
});

settingsRoutes.put("/", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const json = JSON.stringify(body);
  const userId = c.get("userId");

  await c.env.DB.prepare(
    "INSERT INTO user_settings (user_id, settings) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET settings = ?",
  )
    .bind(userId, json, json)
    .run();

  return c.json({ settings: body });
});
