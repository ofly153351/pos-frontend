/**
 * Query matching helpers for the Copilot chat engine.
 *
 * Pure functions — no React, no network. Kept separate from chat-tab.tsx so
 * they can be unit-tested with plain tsx/tsc and reused by future callers.
 *
 * Thai text has no spaces and \b word boundaries do not work on Thai runes,
 * so the whole file works on substring matching over a normalised string.
 * helpNorm-compatible: lowercases first; do NOT strip tone marks here
 * (callers pass raw text).
 */

// ─── Normalisation ──────────────────────────────────────────────────────────

/** Lowercase + collapse whitespace. Tone marks are kept (helpNorm erases them). */
export function normLower(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim()
}

// ─── Thai tokenisation (corpus-driven, no external tokenizer) ───────────────

/**
 * Split a Thai phrase into known words using a dictionary built from the
 * caller's corpus (help topics, product names, ...). Longest-match-first
 * greedy segmentation: for each start position, try the longest dictionary
 * entry that fits; unmatched spans become single fragments.
 *
 * This is "good enough" segmentation: it only needs to find the *content*
 * words (เพิ่มสินค้า, รับชำระเงิน) inside a longer phrase, not produce a
 * linguistically perfect token stream.
 */
export function segmentThai(text: string, dictionary: string[]): string[] {
  const sorted = [...dictionary]
    .filter((w) => w.length >= 2)
    .sort((a, b) => b.length - a.length)
  const lower = normLower(text)
  const tokens: string[] = []
  let i = 0

  outer: while (i < lower.length) {
    for (const w of sorted) {
      if (lower.startsWith(w, i)) {
        tokens.push(w)
        i += w.length
        continue outer
      }
    }
    // No dictionary hit at this position — skip one rune so we always advance.
    i += 1
  }
  return tokens
}

// ─── Intent keywords ────────────────────────────────────────────────────────

/**
 * Debtor-intent keywords. Checked BEFORE the sales branch so a question like
 * "QA_CUSTOMER_001_EDIT ยังมียอดค้างชำระเท่าไหร่" is routed to the debtor
 * answer (ยอด + ค้าง) instead of being swallowed by the generic ยอดขาย match.
 */
const DEBTOR_KEYWORDS = [
  "ค้างชำระ", "ค้างชำระเท่าไหร่", "ยังค้าง", "ยังมียอดค้าง", "ยอดค้าง",
  "ค้างเงิน", "ค้างนาน", "ค้างเยอะ", "ค้างอยู่", "ค้างจ่าย", "ค้างสุด",
  "ใครค้าง", "บิลค้าง", "ติดเงิน", "ติดหนี้", "เป็นหนี้", "ลูกหนี้",
  "เก็บเงิน", "ทวง", "เลยกำหนด", "เกินกำหนด", "กำหนดชำระ", "ยังไม่จ่าย",
  "ยังไม่ได้เก็บ", "ไม่จ่ายตัง", "ปล่อยเชื่อ", "เครดิต",
  "debtor", "overdue", "collect", "aging", "owe", "outstanding",
]

/** Customer-name-ish tokens to ignore when extracting entities (not part of a name). */
const NOT_NAME_KEYWORDS = [
  "ยังมี", "ยัง", "มี", "เท่าไหร่", "เท่าไร", "กี่", "ชิ้น", "อยู่",
  "คงเหลือ", "คงเหลือเท่าไหร่", "ตำแหน่ง", "ต าแหน่ง", "ใด", "ไหม", "มั้ย",
  "ยอดขาย", "ยอด", "ขาย", "สินค้า", "สินคา้", "ลูกค้า", "ราย", "วันนี้",
  "เท่า", "บาท", "หน่อย", "ครับ", "ค่ะ", "คะ", "พอดี", "ผม", "ฉัน",
  "บ้าง", "ใคร", "อะไร", "เกี่ยวกับ", "เป็น", "อย่างไร", "ยังไง", "กัน",
  "และ", "หรือ", "ของ", "ที่", "ใน", "จาก", "ให้", "กับ", "ว่า",
  "how many", "how much", "today", "sold", "sales", "stock", "where",
]

/** Filler words stripped from a query BEFORE help-topic segmentation/scoring. */
const QUERY_FILLERS = [
  "วิธีการ", "วิธี", "ทำยังไง", "ทำอย่างไร", "ทำไง", "ขั้นตอน", "คู่มือ",
  "ช่วยสอน", "สอนหน่อย", "ใช้งานยังไง", "ใช้งานอย่างไร", "ยังไง", "ยังงัย",
  "อย่างไร", "หน่อย", "ครับ", "ค่ะ", "คะ", "บ้าง", "ไหม", "มั้ย", "อะไร",
  "ของ", "ที่", "จะ", "ต้อง", "อยากดู", "อยากรู้", "พร้อม", "และ",
  "how to", "how do i", "how can i", "step by step", "teach me",
  "guide me", "tutorial", "please", "the", "a ", "an ",
]

/**
 * Extract a probable entity name (product/customer) from a question.
 *
 * Strategy: a name is a maximal span of the question that is NOT any known
 * intent/stopword — QA names, ASCII identifiers, brand-like words survive;
 * Thai intent words are stripped. Handles the QA-test patterns:
 *   "ยอดขาย QA_PRODUCT_001 วันนี้กี่ชิ้น"   → "qa_product_001"
 *   "สินค้า QA_PRODUCT_001 คงเหลือเท่าไหร่" → "qa_product_001"
 *   "QA_CUSTOMER_001_EDIT ยังมียอดค้างชำระเท่าไหร่" → "qa_customer_001_edit"
 */
export function extractEntityName(
  rawQuery: string,
  extraKeywords: string[] = [],
): string | null {
  const q = normLower(rawQuery)
  if (!q) return null

  // Explicit ASCII identifier pattern first — most robust signal (QA ids,
  // SKUs, barcodes, product codes). Must contain a letter (never a bare
  // number like the "7" in "ยอดขาย 7 วัน") and, if digits are present, look
  // like a code (underscore-separated or letter+digit mix).
  const asciiId = q.match(
    /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b|\b(?=[a-z0-9]*\d)[a-z0-9_]*[a-z][a-z0-9_]*\b/,
  )
  if (asciiId) {
    const candidate = asciiId[0]
    if (!isStopword(candidate, extraKeywords)) return candidate
  }

  // Thai/ mixed-name fallback: strip every known keyword span, longest-first,
  // and keep the longest remaining fragment that still looks like a name.
  const strip = [...DEBTOR_KEYWORDS, ...NOT_NAME_KEYWORDS, ...extraKeywords]
    .filter((w) => w.length >= 2)
    .sort((a, b) => b.length - a.length)
  let rest = ` ${q} `
  for (const w of strip) {
    rest = rest.split(w).join(" ")
  }
  const fragments = rest
    .split(/[\s,.!?]+/)
    .map((f) => f.trim())
    .filter((f) => f.length >= 2 && !isStopword(f, extraKeywords))
  if (fragments.length === 0) return null
  return fragments.sort((a, b) => b.length - a.length)[0]
}

function isStopword(token: string, extraKeywords: string[]): boolean {
  const t = normLower(token)
  return (
    NOT_NAME_KEYWORDS.some((k) => k === t) ||
    extraKeywords.some((k) => normLower(k) === t)
  )
}

// ─── Period detection (today vs 7d) ─────────────────────────────────────────

export type QueryPeriod = "today" | "7d"

/** True when the question explicitly narrows to today (not just mentions it). */
export function asksToday(rawQuery: string): boolean {
  const q = normLower(rawQuery)
  return (
    q.includes("วันนี้") ||
    q.includes("ว ันน ี้") ||
    q.includes("วันน ี้") ||
    q.includes("today")
  )
}

// ─── Help-topic matching with Thai segmentation ─────────────────────────────

export interface HelpTopicLite {
  title: string
  description?: string
}

/**
 * Score a help topic against a question using corpus-driven segmentation.
 *
 * Fixes the QA failure "วิธีเพิ่มสินค้าใหม่พร้อมรูปภาพทำอย่างไร": the old
 * space-split produced one giant token "เพิ่มสินค้าใหม่พร้อมรูปภาพ" which
 * never substring-matched any topic title. Segmenting with a dictionary
 * built from the topic titles themselves surfaces "เพิ่มสินค้า" as a token,
 * which matches the topic "เพิ่มสินค้าใหม่".
 */
export function scoreHelpTopic(
  rawQuery: string,
  topic: HelpTopicLite,
  dictionary: string[],
): number {
  // Strip fillers FIRST (tone-marked words like "วิธี" must go before
  // segmentation, else they glue to content words inside one token).
  let stripped = ` ${normLower(rawQuery)} `
  for (const f of QUERY_FILLERS) {
    stripped = stripped.split(f).join(" ")
  }
  const q = stripped.replace(/\s+/g, " ").trim()
  if (!q) return 0

  const title = normLower(topic.title)
  const desc = topic.description ? normLower(topic.description) : ""

  let score = 0

  // Whole-question containment (unchanged spirit from searchHelpTopics)
  if (q.length >= 4 && title.includes(q)) score += 20
  if (q.length >= 4 && desc.includes(q)) score += 10

  const tokens = segmentThai(q, dictionary)
  const seen = new Set<string>()
  for (const w of tokens) {
    if (seen.has(w)) continue
    seen.add(w)
    if (title.includes(w)) score += 5
    if (desc.includes(w)) score += 3
  }

  // Bonus: a topic whose title is *contained* in the question (the question
  // is the topic title plus extra qualifier words) — this is the strongest
  // signal for "วิธีเพิ่มสินค้าใหม่พร้อมรูปภาพทำอย่างไร" → "เพิ่มสินค้าใหม่".
  for (const entry of dictionary) {
    const e = normLower(entry)
    if (e.length >= 4 && q.includes(e) && title.includes(e)) score += 8
  }

  return score
}
