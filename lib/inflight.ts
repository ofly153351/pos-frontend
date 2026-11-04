// B28: concurrent callers of the same read share one pending request.
// Nothing is cached after it settles, so data is never stale; this only
// collapses the burst of identical calls fired when a page mounts many
// components at once (sidebar, topbar, role hook, page body).
const pending = new Map<string, Promise<unknown>>();

export function sharedRequest<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}
