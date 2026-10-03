/**
 * Drizzle client bound to the Tauri SQL plugin.
 *
 * The webview can't open SQLite directly, so we use Drizzle's `sqlite-proxy`
 * driver: every query is forwarded to @tauri-apps/plugin-sql, which runs it in
 * the Rust process against the on-disk database. This keeps a single native
 * SQLite handle (low RAM) while giving the frontend a fully typed Drizzle API.
 */

import Database from '@tauri-apps/plugin-sql';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

/** Path is relative to the app's data dir, resolved by the SQL plugin. */
export const DB_URL = 'sqlite:mangaforge.db';

let sqlitePromise: Promise<Database> | null = null;

async function getSqlite(): Promise<Database> {
  if (!sqlitePromise) sqlitePromise = Database.load(DB_URL);
  return sqlitePromise;
}

/**
 * sqlite-proxy expects `{ rows: unknown[][] }`. @tauri-apps/plugin-sql's
 * `select` returns an array of row objects, so we re-shape to positional arrays.
 * `execute` is used for INSERT/UPDATE/DELETE/DDL.
 */
export const db: SqliteRemoteDatabase<typeof schema> = drizzle(
  async (sqlText, params, method) => {
    const sqlite = await getSqlite();

    if (method === 'run') {
      await sqlite.execute(sqlText, params);
      return { rows: [] };
    }

    const result = await sqlite.select<Record<string, unknown>[]>(sqlText, params);
    const rows = result.map((row) => Object.values(row));
    return { rows: method === 'get' ? (rows[0] ?? []) : rows };
  },
  // All columns use explicit snake_case names in schema.ts, so no casing
  // transform is needed here.
  { schema },
);

export { schema };
