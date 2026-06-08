/**
 * Minimal multi-page PDF writer — embeds one JPEG image per page.
 * Pure JS, no external library. Byte-accurate xref table.
 *
 * Each page is a rasterized image (a full label, a strip, or an A4 sheet)
 * scaled to fill the page's MediaBox.
 */

export type PdfImagePage = {
  /** Raw JPEG bytes (DCTDecode). */
  jpeg: Uint8Array;
  /** Source raster size in pixels. */
  pxWidth: number;
  pxHeight: number;
  /** Page size in PDF points (1pt = 1/72 inch). */
  widthPt: number;
  heightPt: number;
};

export function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** Strip the `data:image/jpeg;base64,` prefix from a canvas data URL. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  return base64ToUint8Array(dataUrl.slice(comma + 1));
}

export function buildPdf(pages: PdfImagePage[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const offsets: number[] = [];

  const push = (bytes: Uint8Array) => { chunks.push(bytes); offset += bytes.length; };
  const pushStr = (s: string) => push(enc.encode(s));
  const mark = (objNum: number) => { offsets[objNum] = offset; };

  const round = (n: number) => Math.round(n * 100) / 100;

  pushStr("%PDF-1.3\n");

  // 1 = Catalog, 2 = Pages tree. Then per page i: page=3+3i, image=4+3i, content=5+3i.
  mark(1);
  pushStr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  mark(2);
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach((pg, i) => {
    const pageObj = 3 + i * 3;
    const imgObj = 4 + i * 3;
    const contentObj = 5 + i * 3;
    const w = round(pg.widthPt);
    const h = round(pg.heightPt);

    mark(pageObj);
    pushStr(
      `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] ` +
      `/Resources << /XObject << /Im0 ${imgObj} 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`,
    );

    mark(imgObj);
    pushStr(
      `${imgObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pg.pxWidth} /Height ${pg.pxHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`,
    );
    push(pg.jpeg);
    pushStr("\nendstream\nendobj\n");

    // Image space is a unit square; the cm matrix scales it to fill the page.
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    mark(contentObj);
    pushStr(`${contentObj} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  });

  const xrefOffset = offset;
  const totalObjs = 2 + pages.length * 3;
  pushStr(`xref\n0 ${totalObjs + 1}\n`);
  pushStr("0000000000 65535 f \n");
  for (let n = 1; n <= totalObjs; n++) {
    pushStr(String(offsets[n] ?? 0).padStart(10, "0") + " 00000 n \n");
  }
  pushStr(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}
