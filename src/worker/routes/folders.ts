import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../types";
import { clearFolderIcon, listFolderMetadata, setFolderIcon } from "../db/queries";

type AuthVars = { userId: string; userEmail: string };

export const foldersRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

const folderIconSchema = z.object({
  path: z.string().trim().min(1).max(300),
  icon_type: z.enum(["emoji", "lucide"]).nullable(),
  icon_value: z.string().trim().min(1).max(80).nullable(),
});

foldersRoutes.get("/", async (c) => {
  const folders = await listFolderMetadata(c.env.DB, c.get("userId"));
  return c.json({ folders });
});

foldersRoutes.put("/icon", zValidator("json", folderIconSchema), async (c) => {
  const body = c.req.valid("json");
  if (body.icon_type === null || body.icon_value === null) {
    await clearFolderIcon(c.env.DB, c.get("userId"), body.path);
    return c.json({ success: true });
  }

  await setFolderIcon(c.env.DB, c.get("userId"), body.path, body.icon_type, body.icon_value);
  return c.json({ success: true });
});
