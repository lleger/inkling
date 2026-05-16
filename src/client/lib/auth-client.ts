import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Same-origin (frontend and worker share localhost:5173 in dev,
  // and one origin in prod via the assets bundle)
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("inkling:two-factor-required"));
        }
      },
    }),
    passkeyClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
