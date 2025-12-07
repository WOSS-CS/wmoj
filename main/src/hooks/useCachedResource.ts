import { useEffect, useState, useRef } from "react";

export function getCachedResource<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    return null;
  }
}

export function setCachedResource<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

interface UseCachedResourceOpts<T> {
  key: string;
  metaUrl: string;
  fetchFull: () => Promise<T>;
  intervalMs?: number;
  enabled?: boolean;
}

export function useCachedResource<T>({
  key,
  metaUrl,
  fetchFull,
  intervalMs = 10000,
  enabled = true,
}: UseCachedResourceOpts<T>) {
  interface CachedStore {
    updated_at?: string;
    data: T | null;
  }
  const [store, setStore] = useState<CachedStore>(() => {
    if (typeof window === "undefined")
      return { updated_at: undefined, data: null } as CachedStore;
    const raw = getCachedResource<CachedStore>(key);
    return raw || { updated_at: undefined, data: null };
  });

  const metaTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    async function check() {
      try {
        const res = await fetch(metaUrl);
        if (!res.ok) return; // if meta fails, keep current data
        const meta = await res.json();
        const cached: any = getCachedResource(key);
        if (!cached || cached.updated_at !== meta.updated_at) {
          // resource changed (or no cache) -> fetch full data
          const full = await fetchFull();
          const newStore = {
            updated_at: meta.updated_at,
            data: full,
          } as CachedStore;
          setCachedResource(key, newStore);
          if (mounted) setStore(newStore);
        } else {
          // meta unchanged; ensure data is set from cache
          if (cached && mounted) setStore(cached);
        }
      } catch (e) {
        // ignore
      }
    }

    // On mount: run check (this will read cache and only fetch if meta updated)
    check();

    function startPolling() {
      if (metaTimerRef.current) window.clearInterval(metaTimerRef.current);
      metaTimerRef.current = window.setInterval(() => {
        void check();
      }, intervalMs) as unknown as number;
    }

    // start polling
    startPolling();

    return () => {
      mounted = false;
      if (metaTimerRef.current) window.clearInterval(metaTimerRef.current);
    };
  }, [key, metaUrl, fetchFull, intervalMs]);

  return store;
}
