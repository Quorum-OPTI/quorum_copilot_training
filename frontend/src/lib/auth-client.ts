import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin in dev thanks to Vite's /api proxy.
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
});

export const { signIn, signUp, signOut, useSession } = authClient;
