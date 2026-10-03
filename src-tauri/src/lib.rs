//! Tauri entrypoint. Registers the SQL plugin and applies Drizzle-generated
//! migrations against the app's local SQLite database.

use tauri_plugin_sql::{Migration, MigrationKind};

/// Ordered list of migrations the SQL plugin applies at startup.
///
/// Workflow for future schema changes:
///   1. Edit `src/db/schema.ts`.
///   2. Add a new `src-tauri/migrations/NNNN_name.sql` with the delta DDL
///      (either hand-written or produced by `npm run db:generate`).
///   3. Append a `Migration` entry below with the next `version`.
///
/// `0000_init.sql` is the baseline schema (matches `schema.ts`).
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("../migrations/0000_init.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:mangaforge.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running Manga Forge");
}
