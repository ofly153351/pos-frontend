/**
 * Barcode symbology layer — CODE128B, EAN-13, EAN-8, UPC-A + QR dispatch.
 * Pure SVG generation, no external libraries.
 *
 * Label layout / printing / rasterization live in lib/label.ts and lib/label-raster.ts.
 */

import { generateQrSvg } from "@/lib/qr";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BarcodeType = "code128" | "ean13" | "ean8" | "upca" | "qr";
export type PrintTemplate = "small" | "medium" | "large" | "shelf" | "qr";
export type PrinterMode = "label" | "a4" | "58mm" | "80mm";

export type LabelContentFlags = {
  showName: boolean;
  showSku: boolean;
  showPrice: boolean;
  showBarcodeNumber: boolean;
  showCategory: boolean;
  showBrand: boolean;
  showLocation: boolean;
  showStoreName: boolean;
};

export const DEFAULT_LABEL_FLAGS: LabelContentFlags = {
  showName: true,
  showSku: true,
  showPrice: false,
  showBarcodeNumber: true,
  showCategory: false,
  showBrand: false,
  showLocation: false,
  showStoreName: false,
};

// ── CODE128B ──────────────────────────────────────────────────────────────────

const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312",
  "132212","221213","221312","231212","112232","122132","122231","113222",
  "123122","123221","223211","221132","221231","213212","223112","312131",
  "311222","321122","321221","312212","322112","322211","212123","212321",
  "232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121",
  "313121","211331","231131","213113","213311","213131","311123","311321",
  "331121","312113","312311","332111","314111","221411","431111","111224",
  "111422","121124","121421","141122","141221","112214","112412","122114",
  "122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112",
  "421211","212141","214121","412121","111143","111341","131141","114113",
  "114311","411113","411311","113141","114131","311141","411131","211412",
  "211214","211232","2331112",
];

export function encodeCode128B(value: string): number[] | null {
  if (!value) return null;
  const encoded: number[] = [];
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) return null;
    encoded.push(code - 32);
  }
  let checksum = 104;
  encoded.forEach((v, i) => { checksum += v * (i + 1); });
  return [104, ...encoded, checksum % 103, 106];
}

function generateCode128Svg(code: string, includeText: boolean): string {
  const normalized = code.trim().toUpperCase();
  const enc = encodeCode128B(normalized);
  if (!enc) return "";
  const mw = 2, qz = 20, top = 8;
  const h = includeText ? 86 : 96;
  let x = qz, bars = "";
  for (const val of enc) {
    const pat = CODE128_PATTERNS[val];
    if (!pat) return "";
    let isBar = true;
    for (const ch of pat) {
      const w = Number(ch) * mw;
      if (isBar) bars += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="#0f172a"/>`;
      x += w;
      isBar = !isBar;
    }
  }
  const tw = x + qz;
  const th = includeText ? top + h + 20 : top + h + 8;
  const text = includeText
    ? `<text x="${tw / 2}" y="${top + h + 14}" text-anchor="middle" font-family="monospace" font-size="13" fill="#0f172a">${normalized}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}"><rect width="${tw}" height="${th}" fill="white"/>${bars}${text}</svg>`;
}

// ── EAN / UPC shared symbols ──────────────────────────────────────────────────

const EAN_L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const EAN_G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const EAN_R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
const EAN13_PARITY = [
  [0,0,0,0,0,0],[0,0,1,0,1,1],[0,0,1,1,0,1],[0,0,1,1,1,0],
  [0,1,0,0,1,1],[0,1,1,0,0,1],[0,1,1,1,0,0],[0,1,0,1,0,1],
  [0,1,0,1,1,0],[0,1,1,0,1,0],
];

function ean13CheckDigit(d12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(d12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function ean8CheckDigit(d7: string): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += parseInt(d7[i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

function generateEan13Svg(code: string, includeText: boolean): string {
  if (!/^\d{12,13}$/.test(code)) return "";
  const d = code.length === 12 ? code + ean13CheckDigit(code) : code;
  if (d.length !== 13) return "";

  const first = parseInt(d[0]);
  const left = d.slice(1, 7).split("").map(Number);
  const right = d.slice(7).split("").map(Number);
  const parity = EAN13_PARITY[first];
  const mw = 2, qz = 14;
  const H = 90;
  const guardH = includeText ? H : H;
  const shortH = includeText ? 76 : H;
  const textY = H + 14;
  const totalH = includeText ? textY + 4 : H + 6;
  let x = qz, bars = "";

  const add = (pat: string, tall: boolean) => {
    for (const bit of pat) {
      if (bit === "1") {
        const hh = tall ? guardH : shortH;
        bars += `<rect x="${x}" y="0" width="${mw}" height="${hh}" fill="#0f172a"/>`;
      }
      x += mw;
    }
  };

  add("101", true);
  for (let i = 0; i < 6; i++) add(parity[i] === 0 ? EAN_L[left[i]] : EAN_G[left[i]], false);
  add("01010", true);
  for (const dig of right) add(EAN_R[dig], false);
  add("101", true);

  const tw = x + qz;
  let text = "";
  if (includeText) {
    const groupW = 6 * 7 * mw;
    const leftCenter = qz + 3 * mw + groupW / 2;
    const rightCenter = qz + 3 * mw + 42 * mw + 5 * mw + groupW / 2;
    text =
      `<text x="${qz - 4}" y="${textY}" text-anchor="end" font-family="monospace" font-size="13" fill="#0f172a">${d[0]}</text>` +
      `<text x="${leftCenter}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="13" fill="#0f172a">${d.slice(1, 7)}</text>` +
      `<text x="${rightCenter}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="13" fill="#0f172a">${d.slice(7)}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${totalH}" viewBox="0 0 ${tw} ${totalH}"><rect width="${tw}" height="${totalH}" fill="white"/>${bars}${text}</svg>`;
}

function generateEan8Svg(code: string, includeText: boolean): string {
  if (!/^\d{7,8}$/.test(code)) return "";
  const d = code.length === 7 ? code + ean8CheckDigit(code) : code;
  const left = d.slice(0, 4).split("").map(Number);
  const right = d.slice(4).split("").map(Number);
  const mw = 2, qz = 14;
  const H = 90;
  const shortH = includeText ? 76 : H;
  const textY = H + 14;
  const totalH = includeText ? textY + 4 : H + 6;
  let x = qz, bars = "";

  const add = (pat: string, tall: boolean) => {
    for (const bit of pat) {
      if (bit === "1") {
        const hh = tall ? H : shortH;
        bars += `<rect x="${x}" y="0" width="${mw}" height="${hh}" fill="#0f172a"/>`;
      }
      x += mw;
    }
  };

  add("101", true);
  for (const dig of left) add(EAN_L[dig], false);
  add("01010", true);
  for (const dig of right) add(EAN_R[dig], false);
  add("101", true);

  const tw = x + qz;
  let text = "";
  if (includeText) {
    const groupW = 4 * 7 * mw;
    const leftCenter = qz + 3 * mw + groupW / 2;
    const rightCenter = qz + 3 * mw + 28 * mw + 5 * mw + groupW / 2;
    text =
      `<text x="${leftCenter}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="13" fill="#0f172a">${d.slice(0, 4)}</text>` +
      `<text x="${rightCenter}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="13" fill="#0f172a">${d.slice(4)}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${totalH}" viewBox="0 0 ${tw} ${totalH}"><rect width="${tw}" height="${totalH}" fill="white"/>${bars}${text}</svg>`;
}

// UPC-A = EAN-13 with a leading zero.
function generateUpcaSvg(code: string, includeText: boolean): string {
  if (!/^\d{11,12}$/.test(code)) return "";
  const pad = code.length === 11 ? "0" + code : "0" + code.slice(0, 11);
  return generateEan13Svg(pad, includeText);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** CODE128 SVG with embedded human-readable text — kept for the table view. */
export function generateBarcodeSvg(code: string): string {
  return generateCode128Svg(code, true);
}

/**
 * Generate a barcode SVG for any supported type.
 * @param includeText when false, omits the human-readable digits from the graphic
 *                    (used by label layouts that render the number separately).
 */
export function generateBarcodeSvgByType(code: string, type: BarcodeType, includeText = true): string {
  const trimmed = code.trim();
  if (!trimmed) return "";
  switch (type) {
    case "code128": return generateCode128Svg(trimmed.toUpperCase(), includeText);
    case "ean13":   return generateEan13Svg(trimmed, includeText);
    case "ean8":    return generateEan8Svg(trimmed, includeText);
    case "upca":    return generateUpcaSvg(trimmed, includeText);
    case "qr":      return generateQrSvg(trimmed);
  }
}

export function validateBarcodeForType(code: string, type: BarcodeType): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  switch (type) {
    case "code128":
      for (const ch of trimmed) {
        const c = ch.charCodeAt(0);
        if (c < 32 || c > 126) return "มีอักขระที่ไม่รองรับใน CODE128";
      }
      return null;
    case "ean13":
      if (!/^\d{12,13}$/.test(trimmed)) return "EAN-13 ต้องเป็นตัวเลข 12–13 หลัก";
      return null;
    case "ean8":
      if (!/^\d{7,8}$/.test(trimmed)) return "EAN-8 ต้องเป็นตัวเลข 7–8 หลัก";
      return null;
    case "upca":
      if (!/^\d{11,12}$/.test(trimmed)) return "UPC-A ต้องเป็นตัวเลข 11–12 หลัก";
      return null;
    case "qr":
      if (trimmed.length > 17) return "QR Code (V1) รองรับไม่เกิน 17 ตัวอักษร";
      return null;
  }
}
