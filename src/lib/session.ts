/**
 * Server-side session store.
 *
 * Uses in-memory storage attached to globalThis so it survives
 * Next.js HMR in development. This avoids cookie-domain mismatches
 * when developing behind ngrok (localhost vs ngrok domain).
 *
 * In production with multiple users you'd swap this for a
 * database-backed session, but for a single-user tool this is fine.
 */

import { AsyncLocalStorage } from "node:async_hooks";

const g = globalThis as unknown as { _metaToken?: string | null };
if (g._metaToken === undefined) g._metaToken = null;

/** Request-scoped token store for concurrent agent requests */
const asyncTokenStore = new AsyncLocalStorage<string>();

export function getMetaToken(): string | null {
  return asyncTokenStore.getStore() ?? g._metaToken ?? null;
}

/** Run a function with a request-scoped Meta token (used by /api/agent) */
export function withRequestToken<T>(token: string, fn: () => T): T {
  return asyncTokenStore.run(token, fn);
}

export function setMetaToken(token: string): void {
  g._metaToken = token;
}

export function clearMetaToken(): void {
  g._metaToken = null;
}
