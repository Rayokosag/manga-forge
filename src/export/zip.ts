import JSZip from 'jszip';

export interface ZipPage {
  name: string;
  dataUrl: string;
}

/** Bundle project.json + rendered page PNGs into a ZIP byte array. */
export async function buildZip(json: string, pages: ZipPage[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('project.json', json);
  const folder = zip.folder('pages');
  for (const p of pages) {
    const base64 = p.dataUrl.split(',')[1];
    if (base64) folder?.file(p.name, base64, { base64: true });
  }
  zip.file(
    'README.txt',
    'Manga Forge export.\n\n- project.json: full project data (re-importable)\n- pages/: rendered page images\n',
  );
  return zip.generateAsync({ type: 'uint8array' });
}
