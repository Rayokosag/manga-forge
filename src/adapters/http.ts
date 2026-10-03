import { fetch } from '@tauri-apps/plugin-http';

/**
 * JSON HTTP helpers routed through the Tauri HTTP plugin (Rust-side fetch),
 * which avoids webview CORS when talking to local AI servers.
 */

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

interface RequestOpts {
  timeoutMs?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(
  method: 'GET' | 'POST',
  url: string,
  body?: unknown,
  opts: RequestOpts = {},
): Promise<T> {
  const { timeoutMs = 120_000, headers = {}, signal } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort());

  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new HttpError(`${method} ${url} → ${res.status}`, res.status, text);
    }
    return (text ? JSON.parse(text) : undefined) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new HttpError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw new HttpError(
      `Could not reach ${url}. Is the server running? (${err instanceof Error ? err.message : String(err)})`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export const getJson = <T>(url: string, opts?: RequestOpts) => request<T>('GET', url, undefined, opts);
export const postJson = <T>(url: string, body: unknown, opts?: RequestOpts) =>
  request<T>('POST', url, body, opts);

/**
 * Fetch a remote image as a `data:` URL via the HTTP plugin. Loading images
 * this way (same-origin data URI) avoids tainting the export canvas, so
 * Konva `toDataURL()` keeps working for PDF/ZIP rendering.
 */
export async function fetchDataUrl(url: string, timeoutMs = 30_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    if (!res.ok) throw new HttpError(`GET ${url} → ${res.status}`, res.status);
    const type = res.headers.get('content-type') || 'image/png';
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    return `data:${type};base64,${btoa(binary)}`;
  } finally {
    clearTimeout(timer);
  }
}
