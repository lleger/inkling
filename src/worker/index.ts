import { Hono } from "hono";
import type { Env } from "./types";
import { authMiddleware } from "./middleware/auth";
import { notesRoutes } from "./routes/notes";
import { userRoutes } from "./routes/user";
import { settingsRoutes } from "./routes/settings";

type AuthVars = { userId: string; userEmail: string };

const app = new Hono<{ Bindings: Env; Variables: AuthVars }>();

app.get("/api/health", (c) => c.json({ ok: true }));

app.use("/api/*", authMiddleware);
app.route("/api/user", userRoutes);
app.route("/api/notes", notesRoutes);
app.route("/api/settings", settingsRoutes);

export default app;
