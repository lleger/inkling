import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Same-origin (frontend and worker share localhost:5173 in dev,
  // and one origin in prod via the assets bundle)
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [magicLinkClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
