import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';

type Filter = { name: string; extensions: string[] };

/** Prompt for a location and write text. Returns the path, or null if cancelled. */
export async function saveTextFile(
  defaultName: string,
  content: string,
  filters: Filter[],
): Promise<string | null> {
  const path = await save({ defaultPath: defaultName, filters });
  if (!path) return null;
  await writeTextFile(path, content);
  return path;
}

/** Prompt for a location and write bytes. Returns the path, or null if cancelled. */
export async function saveBinaryFile(
  defaultName: string,
  bytes: Uint8Array,
  filters: Filter[],
): Promise<string | null> {
  const path = await save({ defaultPath: defaultName, filters });
  if (!path) return null;
  await writeFile(path, bytes);
  return path;
}

/** Prompt the user to pick a text file and return its contents. */
export async function pickTextFile(filters: Filter[]): Promise<string | null> {
  const selected = await open({ multiple: false, filters });
  if (!selected || Array.isArray(selected)) return null;
  return readTextFile(selected);
}
