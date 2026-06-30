// Copy-set choices per document type — the frontend mirror of the backend
// `doccopy.SpecFor` (internal/platform/doccopy/doccopy.go). Used ONLY to label the
// print / PDF copy selector. The backend stays the source of truth: `?copy=N`
// renders that single 0-based copy; omitting it (idx -1) renders the whole set.
//
// Index mapping must match doccopy.SpecFor exactly:
//   DELIVERY_ORDER → [0] Original (customer), [1] Copy (customer — ตั้งหนี้), [2] Copy (company)
//   all others     → [0] Original (customer), [1] Copy (company)

export interface CopyChoice {
  idx: number; // -1 = all copies (whole set)
  th: string;
  en: string;
}

const ALL_COPIES: CopyChoice = { idx: -1, th: "ทุกชุด", en: "All copies" };

export function copyChoicesFor(docType?: string): CopyChoice[] {
  if (docType === "DELIVERY_ORDER") {
    return [
      ALL_COPIES,
      { idx: 0, th: "ต้นฉบับ (ลูกค้า)", en: "Original (Customer)" },
      { idx: 1, th: "สำเนา (ลูกค้า — ตั้งหนี้)", en: "Copy (Customer — Credit)" },
      { idx: 2, th: "สำเนา (บริษัท)", en: "Company Copy" },
    ];
  }
  return [
    ALL_COPIES,
    { idx: 0, th: "ต้นฉบับ (ลูกค้า)", en: "Original (Customer)" },
    { idx: 1, th: "สำเนา (บริษัท)", en: "Company Copy" },
  ];
}
