import { useState, useEffect, useRef, useCallback } from 'react';

const cache = new Map<string, unknown>();

export function clearCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function invalidateCache(key: string) {
  cache.delete(key);
}

export function useBackgroundFetch<T>(cacheKey: string, fetcher: () => Promise<T>) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(() => (cache.get(cacheKey) as T) ?? null);
  const [loading, setLoading] = useState(() => !cache.has(cacheKey));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(cacheKey) as T | undefined;

    if (cached !== undefined) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setData(null);
      setLoading(true);
      setRefreshing(false);
    }
    setError(null);

    fetcherRef.current()
      .then(result => {
        if (cancelled) return;
        cache.set(cacheKey, result);
        setData(result);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
        setRefreshing(false);
      });

    return () => { cancelled = true; };
  }, [cacheKey]);

  const refresh = useCallback(() => {
    const isBackground = cache.has(cacheKey);
    if (isBackground) setRefreshing(true);
    else setLoading(true);
    setError(null);

    fetcherRef.current()
      .then(result => {
        cache.set(cacheKey, result);
        setData(result);
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [cacheKey]);

  return { data, loading, refreshing, error, refresh };
}
