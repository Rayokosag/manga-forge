import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from '../client';

/**
 * Next fractional order index for an ordered, scoped list.
 * Returns max(orderColumn) within the scope + 1, or 1 for an empty list.
 */
export async function nextOrderIndex(
  table: SQLiteTable,
  orderColumn: SQLiteColumn,
  scope?: SQL,
): Promise<number> {
  const query = db
    .select({ max: sql<number>`coalesce(max(${orderColumn}), 0)` })
    .from(table);
  const [row] = scope ? await query.where(scope) : await query;
  return (row?.max ?? 0) + 1;
}

/** Convenience for the common single-column scope `column = value`. */
export function scopeEq(column: SQLiteColumn, value: unknown): SQL {
  return eq(column, value as never);
}

export { and, eq };
