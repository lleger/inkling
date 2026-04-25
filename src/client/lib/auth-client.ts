import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin (frontend and worker share localhost:5173 in dev,
  // and one origin in prod via the assets bundle)
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
});

export const { signIn, signUp, signOut, useSession } = authClient;
