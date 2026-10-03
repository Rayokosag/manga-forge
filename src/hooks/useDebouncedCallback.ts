import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable debounced wrapper around `fn`. The latest `fn` is always
 * invoked (no stale closures), and any pending call is flushed/cancelled on
 * unmount to avoid writing after the component is gone.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 500,
): (...args: A) => void {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}
