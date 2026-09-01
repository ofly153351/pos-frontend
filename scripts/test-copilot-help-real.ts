/**
 * Real-corpus test: replicate searchHelpTopics (new scorer + legacy signal)
 * against the ACTUAL HELP_CATEGORIES and the 7 QA prompts.
 * Run: npx tsx scripts/test-copilot-help-real.ts
 */
import { HELP_CATEGORIES } from "../lib/help/help-topics"
import { scoreHelpTopic, normLower } from "../lib/copilot/query-match"

const THAI_TONE = /[็-๎]/g
const helpNorm = (s: string) => s.toLowerCase().replace(THAI_TONE, "")

const HELP_STOPWORDS = /วิธีการ|วิธี|ทำยังไง|ทำอย่างไร|ขั้นตอน|คู่มือ|ช่วยสอน|สอนหน่อย|ใช้งานยังไง|ใช้งานอย่างไร|ยังไง|ยังงัย|อย่างไร|หน่อย|ครับ|ค่ะ|คะ|ไหม|มั้ย|บ้าง|อะไร|ของ|ที่|จะ|ต้อง|อยากดู|ดูแล|เช็ค|ตรวจสอบ|อยากรู้|พิมพ์|สแกน|อ่าน|ดู|how to|how do i?|how can i?|step by step|teach me|guide me|tutorial|the|a |an |please/gi

const HELP_DICT = Array.from(
  new Set(
    HELP_CATEGORIES.flatMap((c) => [
      c.title,
      c.subtitle,
      ...c.subtitle.split(/[,\s]+/),
      ...c.topics.flatMap((t) => [t.title, ...(t.description ? [t.description] : [])]),
    ]),
  ),
)
  .map((w) => normLower(w))
  .filter((w) => w.length >= 4)

function searchReplica(rawQ: string) {
  const results: { categoryTitle: string; topicTitle: string; score: number }[] = []
  for (const cat of HELP_CATEGORIES) {
    const catL = helpNorm(cat.title)
    const subL = helpNorm(cat.subtitle)
    for (const topic of cat.topics) {
      const titleL = helpNorm(topic.title)
      const descL = helpNorm(topic.description)
      let score = scoreHelpTopic(rawQ, topic, HELP_DICT)
      const core = helpNorm(rawQ.toLowerCase().replace(HELP_STOPWORDS, " "))
        .replace(/\s+/g, " ")
        .trim()
      const words = core.split(/\s+/).filter((w) => w.length > 1)
      for (const w of words) {
        if (titleL.includes(w)) score += 5
        if (descL.includes(w)) score += 3
        if (catL.includes(w)) score += 9
        if (subL.includes(w)) score += 3
      }
      if (score > 0) results.push({ categoryTitle: cat.title, topicTitle: topic.title, score })
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 3)
}

let pass = 0, fail = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`) }
}

console.log("corpus topics:", HELP_CATEGORIES.reduce((n, c) => n + c.topics.length, 0))

console.log("\n[5] วิธีเพิ่มสินค้าใหม่พร้อมรูปภาพทำอย่างไร (real corpus)")
const r5 = searchReplica("วิธีเพิ่มสินค้าใหม่พร้อมรูปภาพทำอย่างไร")
console.log("   top:", r5.map((r) => `${r.topicTitle}(${r.score})`).join(" | "))
check("top-1 = เพิ่มสินค้าใหม่", r5[0]?.topicTitle === "เพิ่มสินค้าใหม่", `got ${r5[0]?.topicTitle}`)

console.log("\n[6] วิธีเพิ่มสินค้า (regression, real corpus)")
const r6 = searchReplica("วิธีเพิ่มสินค้า")
console.log("   top:", r6.map((r) => `${r.topicTitle}(${r.score})`).join(" | "))
check("top-1 = เพิ่มสินค้าใหม่", r6[0]?.topicTitle === "เพิ่มสินค้าใหม่", `got ${r6[0]?.topicTitle}`)

console.log("\n[6b] other help presets keep working")
for (const [label, q, expectSub] of [
  ["รับชำระเงิน", "วิธีรับชำระเงิน", "รับชำระเงิน"],
  ["เปิดบิลเชื่อ", "วิธีเปิดบิลเชื่อ", "บิลเชื่อ"],
  ["รับสินค้าเข้าคลัง", "วิธีรับสินค้าเข้าคลัง", "คลัง"],
] as const) {
  const r = searchReplica(q)
  check(
    `${label} → top contains '${expectSub}'`,
    (r[0]?.topicTitle ?? "").includes(expectSub),
    `got ${r[0]?.topicTitle}`,
  )
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
