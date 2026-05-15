// lib/local-cache.ts
interface CacheEntry<T> {
  data: T;
  ts: number;
}

function get<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    return entry.data;
  } catch {
    return null;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data: value, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — degrade gracefully
  }
}

function del(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

function delByPrefix(prefix: string): void {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
}

function isStale(key: string, staleMs: number): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return true;
    const entry = JSON.parse(raw) as CacheEntry<unknown>;
    return Date.now() - entry.ts > staleMs;
  } catch {
    return true;
  }
}

export const localCache = { get, set, del, delByPrefix, isStale };

export const CACHE_KEYS = {
  expenses: (tripId: string) => `cache_expenses_${tripId}`,
  trips: (userId: string) => `cache_trips_${userId}`,
  profile: (userId: string) => `cache_profile_${userId}`,
  members: (tripId: string) => `cache_members_${tripId}`,
};
