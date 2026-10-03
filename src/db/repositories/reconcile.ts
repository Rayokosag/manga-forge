/**
 * Pure set-reconciliation used by join-table writers. Given the ids that
 * currently exist and the ids that should exist, returns which to insert and
 * which to delete. No DB access — kept separate so it is unit-testable without
 * the Tauri SQL bridge.
 */
export function reconcileIds(
  existingIds: Iterable<string>,
  wantedIds: Iterable<string>,
): { toAdd: string[]; toRemove: string[] } {
  const existing = new Set(existingIds);
  const wanted = new Set(wantedIds);
  const toAdd = [...wanted].filter((id) => !existing.has(id));
  const toRemove = [...existing].filter((id) => !wanted.has(id));
  return { toAdd, toRemove };
}
