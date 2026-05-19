import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";

const TOKEN_COOKIE = "meta_token";

/** Request-scoped token store for A2A agent requests that pass the token in the body */
const asyncTokenStore = new AsyncLocalStorage<string>();

export async function getMetaToken(): Promise<string | null> {
  const store = asyncTokenStore.getStore();
  if (store) return store;
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

/** Run a function with a request-scoped Meta token (used by /api/agent) */
export function withRequestToken<T>(token: string, fn: () => T): T {
  return asyncTokenStore.run(token, fn);
}

export async function clearMetaToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
}
