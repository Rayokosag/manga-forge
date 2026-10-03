import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Loads an HTMLImageElement for a Konva <Image>. Accepts a local filesystem
 * path (converted through the Tauri asset protocol) or a plain URL. Returns
 * undefined until the image is ready.
 */
export function useHtmlImage(path: string | null | undefined): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement>();

  useEffect(() => {
    if (!path) {
      setImg(undefined);
      return;
    }
    const src = /^(https?|data|blob):/.test(path) ? path : convertFileSrc(path);
    const image = new window.Image();
    let cancelled = false;
    image.onload = () => !cancelled && setImg(image);
    image.onerror = () => !cancelled && setImg(undefined);
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [path]);

  return img;
}
