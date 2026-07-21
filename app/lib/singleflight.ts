/**
 * Memoiza una carga async: callers concurrentes comparten la misma Promise.
 * Evita thundering herd en prerender Nitro (N rutas × dump de actas).
 */
export function createSingleflight<T>() {
  let value: T | null = null;
  let inflight: Promise<T> | null = null;

  return {
    get(load: () => Promise<T>): Promise<T> {
      if (value !== null) return Promise.resolve(value);
      if (!inflight) {
        inflight = load()
          .then((v) => {
            value = v;
            return v;
          })
          .finally(() => {
            inflight = null;
          });
      }
      return inflight;
    },
    clear() {
      value = null;
      inflight = null;
    },
  };
}
