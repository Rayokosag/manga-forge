/**
 * Local-first storage for generated panel art.
 *
 * ComfyUI returns a render as a `/view?...` URL served by the running ComfyUI
 * process — ephemeral: it dies when ComfyUI restarts, clears its output, or the
 * machine goes offline. For a local-first app we copy the bytes into the app's
 * own data directory and point the panel at that file, so renders survive
 * restarts and load without ComfyUI running.
 *
 * The pure helpers (extension/filename derivation) carry no Tauri imports so
 * they can be unit-tested in Node; the download itself pulls the Tauri plugins
 * lazily at call time.
 */

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'bmp'] as const;

/** Best-effort image extension from a ComfyUI `/view` URL (or any image URL). */
export function imageExtFromUrl(url: string): string {
  try {
    const u = new URL(url, 'http://local');
    const name = u.searchParams.get('filename') ?? u.pathname;
    const ext = /\.([a-z0-9]{3,4})(?:$|\?|#)/i.exec(name)?.[1]?.toLowerCase();
    return ext && (IMAGE_EXTS as readonly string[]).includes(ext) ? ext : 'png';
  } catch {
    return 'png';
  }
}

/** Unique, filesystem-safe name for a generated panel image. */
export function generatedFileName(
  panelId: string,
  seed: number,
  ext: string,
  now: number = Date.now(),
): string {
  const short = panelId.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'panel';
  const safeSeed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  return `panel_${short}_${safeSeed}_${now}.${ext}`;
}

/** Subdirectory (under the app's local data dir) that holds generated art. */
export const GENERATED_SUBDIR = 'generated';

/**
 * Download a generated image URL into the app's local data dir and return the
 * absolute path to the saved file (render it via the Tauri asset protocol).
 */
export async function downloadGeneratedImage(
  url: string,
  panelId: string,
  seed: number,
): Promise<string> {
  const { fetch } = await import('@tauri-apps/plugin-http');
  const { mkdir, writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
  const { appLocalDataDir, join } = await import('@tauri-apps/api/path');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed (HTTP ${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());

  const name = generatedFileName(panelId, seed, imageExtFromUrl(url));
  await mkdir(GENERATED_SUBDIR, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  await writeFile(`${GENERATED_SUBDIR}/${name}`, bytes, { baseDir: BaseDirectory.AppLocalData });

  return join(await appLocalDataDir(), GENERATED_SUBDIR, name);
}
