import { jsPDF } from 'jspdf';

export interface RenderedPage {
  width: number;
  height: number;
  dataUrl: string;
}

/** Assemble rendered pages into a multi-page PDF (one manga page per PDF page). */
export function buildPdf(pages: RenderedPage[]): ArrayBuffer {
  if (pages.length === 0) return new jsPDF().output('arraybuffer');

  let doc: jsPDF | null = null;
  for (const pg of pages) {
    const orientation = pg.width >= pg.height ? 'landscape' : 'portrait';
    if (!doc) {
      doc = new jsPDF({ unit: 'px', format: [pg.width, pg.height], orientation });
    } else {
      doc.addPage([pg.width, pg.height], orientation);
    }
    doc.addImage(pg.dataUrl, 'PNG', 0, 0, pg.width, pg.height);
  }
  return doc!.output('arraybuffer');
}
