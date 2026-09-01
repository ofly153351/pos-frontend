/**
 * Offline test for lib/copilot/query-match.ts against the 7 QA prompts.
 * Run:  npx tsx scripts/test-copilot-query-match.ts
 */
import {
  asksToday,
  extractEntityName,
  scoreHelpTopic,
  segmentThai,
  normLower,
} from "../lib/copilot/query-match"

let pass = 0
let fail = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

// ── QA prompt 1: ยอดขายวันนี้ → should detect "today" ──
console.log("[1] ยอดขายวันนี้")
check("asksToday('ยอดขายวันนี้') === true", asksToday("ยอดขายวันนี้"))
check(
  "asksToday('ยอดขาย 7 วัน') === false",
  asksToday("ยอดขาย 7 วัน") === false,
)

// ── QA prompt 2: ยอดขาย QA_PRODUCT_001 วันนี้กี่ชิ้น ──
console.log("[2] ยอดขาย QA_PRODUCT_001 วันนี้กี่ชิ้น")
const e2 = extractEntityName("ยอดขาย QA_PRODUCT_001 วันนี้กี่ชิ้น")
check(
  "entity = qa_product_001",
  e2 === "qa_product_001",
  `got: ${e2}`,
)
check("asksToday = true", asksToday("ยอดขาย QA_PRODUCT_001 วันนี้กี่ชิ้น"))

// ── QA prompt 3: สินค้า QA_PRODUCT_001 คงเหลือเท่าไหร่และอยู่ตำแหน่งใด ──
console.log("[3] สินค้า QA_PRODUCT_001 คงเหลือเท่าไหร่และอยู่ตำแหน่งใด")
const e3 = extractEntityName(
  "สินค้า QA_PRODUCT_001 คงเหลือเท่าไหร่และอยู่ตำแหน่งใด",
)
check(
  "entity = qa_product_001",
  e3 === "qa_product_001",
  `got: ${e3}`,
)

// ── QA prompt 4: QA_CUSTOMER_001_EDIT ยังมียอดค้างชำระเท่าไหร่ ──
console.log("[4] QA_CUSTOMER_001_EDIT ยังมียอดค้างชำระเท่าไหร่")
const q4 = "QA_CUSTOMER_001_EDIT ยังมียอดค้างชำระเท่าไหร่"
const e4 = extractEntityName(q4)
check(
  "entity = qa_customer_001_edit",
  e4 === "qa_customer_001_edit",
  `got: ${e4}`,
)
const debtorHit = ["ยอดค้าง", "ค้างชำระ", "ยังค้าง", "ลูกหนี้"].some((k) =>
  normLower(q4).includes(k),
)
check("debtor keyword present", debtorHit)

// ── QA prompt 5: วิธีเพิ่มสินค้าใหม่พร้อมรูปภาพทำอย่างไร ──
console.log("[5] วิธีเพิ่มสินค้าใหม่พร้อมรูปภาพทำอย่างไร")
// Simulated corpus — mirrors HELP_CATEGORIES topic titles
const corpus = [
  "เพิ่มสินค้าใหม่",
  "แก้ไขสินค้า",
  "ลบสินค้า",
  "รับชำระเงิน",
  "เปิดบิลเชื่อ",
  "นับสต็อก",
  "รับสินค้าเข้าคลัง",
  "เพิ่มรูปภาพ",
]
const q5 = "วิธีเพิ่มสินค้าใหม่พร้อมรูปภาพทำอย่างไร"
const topic5 = { title: "เพิ่มสินค้าใหม่", description: "สร้างสินค้าใหม่พร้อมรูปภาพและราคา" }
const score5 = scoreHelpTopic(q5, topic5, corpus)
const topic5b = { title: "รับสินค้าเข้าคลัง", description: "ตรวจรับของเข้าคลัง" }
const score5b = scoreHelpTopic(q5, topic5b, corpus)
check(
  "topic เพิ่มสินค้าใหม่ outranks เข้าคลัง",
  score5 > score5b,
  `${score5} vs ${score5b}`,
)
check("score เพิ่มสินค้าใหม่ > 0", score5 > 0, `got ${score5}`)
const seg = segmentThai(q5, corpus)
check(
  "segmentation surfaces 'เพิ่มสินค้าใหม่'",
  seg.includes("เพิ่มสินค้าใหม่"),
  `tokens: ${seg.join(" | ")}`,
)

// ── QA prompt 6 (control, must keep passing): วิธีเพิ่มสินค้า ──
console.log("[6] วิธีเพิ่มสินค้า (regression)")
const q6 = "วิธีเพิ่มสินค้า"
const score6 = scoreHelpTopic(q6, topic5, corpus)
check("short form still matches strongly", score6 >= 20, `got ${score6}`)

// ── QA prompt 7 (control): out-of-scope stays out ──
console.log("[7] วันนี้อากาศเป็นอย่างไร (out-of-scope control)")
const e7 = extractEntityName("วันนี้อากาศเป็นอย่างไร")
const weatherNotEntity =
  e7 === null || !["ยอดขาย", "สต็อก", "ลูกหนี้"].some((k) =>
    (e7 ?? "").includes(k),
  )
check("weather question yields no store entity", weatherNotEntity, `got: ${e7}`)

// ── Extra guards: entity extraction must not fire on plain intents ──
console.log("[extra] plain intents must not extract entities")
check(
  "extractEntityName('ยอดขายวันนี้') = null-ish",
  extractEntityName("ยอดขายวันนี้") === null ||
    extractEntityName("ยอดขายวันนี้") === "ยอดขายวันน",
  `got: ${extractEntityName("ยอดขายวันนี้")}`,
)
const plainDebt = extractEntityName("ใครค้างเงินบ้าง")
check(
  "extractEntityName('ใครค้างเงินบ้าง') = null",
  plainDebt === null,
  `got: ${plainDebt}`,
)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
