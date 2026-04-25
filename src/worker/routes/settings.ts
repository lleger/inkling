import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, sql } from "drizzle-orm";
import type { Env } from "../types";
import { makeDb } from "../db/client";
import { userSettings } from "../db/schema";

type AuthVars = { userId: string; userEmail: string };

export const settingsRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accent: z.enum(["green", "blue", "purple", "orange", "rose", "teal"]).optional(),
  defaultMode: z.enum(["richtext", "markdown"]).optional(),
  smartTypography: z.boolean().optional(),
}).passthrough();

settingsRoutes.get("/", async (c) => {
  const db = makeDb(c.env.DB);
  const [row] = await db
    .select({ settings: userSettings.settings })
    .from(userSettings)
    .where(eq(userSettings.userId, c.get("userId")))
    .limit(1);
  if (!row) return c.json({ settings: {} });
  try {
    return c.json({ settings: JSON.parse(row.settings) });
  } catch {
    return c.json({ settings: {} });
  }
});

settingsRoutes.put(
  "/",
  zValidator("json", settingsSchema),
  async (c) => {
    const body = c.req.valid("json");
    const json = JSON.stringify(body);
    const userId = c.get("userId");
    const db = makeDb(c.env.DB);

    await db
      .insert(userSettings)
      .values({ userId, settings: json })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { settings: sql`excluded.settings` },
      });

    return c.json({ settings: body });
  },
);
