import { describe, expect, it } from 'vitest';
import { generatedFileName, imageExtFromUrl } from './imageStore';

describe('imageExtFromUrl', () => {
  it('reads the extension from a ComfyUI view URL filename param', () => {
    expect(
      imageExtFromUrl('http://127.0.0.1:8188/view?filename=mangaforge_00007_.png&subfolder=&type=output'),
    ).toBe('png');
    expect(imageExtFromUrl('http://127.0.0.1:8188/view?filename=Aya.webp&type=output')).toBe('webp');
  });

  it('falls back to the path extension, then to png', () => {
    expect(imageExtFromUrl('http://host/images/panel.jpeg')).toBe('jpeg');
    expect(imageExtFromUrl('http://host/view?type=output')).toBe('png');
    expect(imageExtFromUrl('not a url')).toBe('png');
  });

  it('ignores non-image extensions', () => {
    expect(imageExtFromUrl('http://host/view?filename=weird.exe')).toBe('png');
  });
});

describe('generatedFileName', () => {
  it('is deterministic for a fixed clock and sanitises the panel id', () => {
    expect(generatedFileName('abc-123-def', 777, 'png', 1000)).toBe('panel_abc123de_777_1000.png');
  });

  it('normalises odd seeds and empty ids', () => {
    expect(generatedFileName('', -42.9, 'webp', 5)).toBe('panel_panel_42_5.webp');
    expect(generatedFileName('!!!', Number.NaN, 'png', 9)).toBe('panel_panel_0_9.png');
  });

  it('produces unique names across calls (timestamp component)', () => {
    const a = generatedFileName('p1', 1, 'png', 1);
    const b = generatedFileName('p1', 1, 'png', 2);
    expect(a).not.toBe(b);
  });
});
