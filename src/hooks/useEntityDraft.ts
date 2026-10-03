import { useCallback, useState } from 'react';
import { useDebouncedCallback } from './useDebouncedCallback';

/**
 * Local editable draft of an entity with debounced persistence of each changed
 * field. Intended to be used under a `key={entity.id}` remount so the draft is
 * reset whenever a different entity is opened.
 */
export function useEntityDraft<T extends object>(
  initial: T,
  commit: (patch: Partial<T>) => void,
  delay = 500,
) {
  const [draft, setDraft] = useState<T>(initial);
  const debounced = useDebouncedCallback((patch: Partial<T>) => commit(patch), delay);

  const setField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      debounced({ [key]: value } as unknown as Partial<T>);
    },
    [debounced],
  );

  return { draft, setField, setDraft };
}
