import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit only *generates* SQL migrations here; it never opens the live
 * database. The Tauri SQL plugin applies the generated files at app startup
 * (see src-tauri/src/lib.rs). `dbCredentials.url` points at a throwaway dev DB
 * used solely for `drizzle-kit studio`.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src-tauri/migrations',
  dbCredentials: {
    url: 'file:./.dev/mangaforge.dev.db',
  },
  verbose: true,
  strict: true,
});
