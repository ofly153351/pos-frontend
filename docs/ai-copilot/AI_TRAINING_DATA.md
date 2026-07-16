# AI COPILOT — ข้อมูลฝึกสนทนา (Conversational Training Data)

> เอกสารอ้างอิงสำหรับ **router แบบ keyword (deterministic ไม่ใช้ LLM)** ของ POS Today Copilot
> ภาษาหลัก: **ไทย** (เจ้าของร้านเป็นคนไทย) — ตอบจาก ground truth เท่านั้น
>
> **กฎเหล็กของเอกสารนี้:** ทุกแถวอ้างอิงจาก Capability Map จริง — intent ทั้งหมดตรงกับ router 15 หมวด
> ฟีเจอร์/ข้อมูลที่ระบบ **ไม่มี** จะระบุชัดว่า `ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้` ไม่แต่งเติม

---

## สารบัญ (Sections)

1. วิธีอ่านตาราง + คอลัมน์
2. หลักการ router (deterministic keyword)
3. Intent: greeting (ทักทาย)
4. Intent: thanks (ขอบคุณ)
5. Intent: sales (ยอดขาย)
6. Intent: profit (กำไร / P&L)
7. Intent: stock (สต็อก / เติมของ)
8. Intent: aging (ลูกหนี้ / ค้างชำระ)
9. Intent: stock+purchasing (จัดซื้อ / ซัพพลายเออร์)
10. Intent: bestseller (ขายดี)
11. Intent: priorities / actions (ควรทำอะไร)
12. Intent: overview (ภาพรวม / สุขภาพร้าน)
13. Intent: risks (ความเสี่ยง)
14. Intent: opportunities (โอกาส)
15. Intent: activity (ใครแก้ / log)
16. Intent: help (วิธีใช้ / คู่มือ)
17. Intent: consequence (ถ้าไม่ทำจะเกิดอะไร)
18. Intent: why (ทำไม / เหตุผล)
19. Intent: urgency (ด่วนแค่ไหน)
20. Intent: clarification + fallback (ไม่เข้าใจ / ถามต่อ)
21. Entity Glossary (คำสำคัญที่ใช้จับ intent)
22. ขอบเขตที่ระบบทำไม่ได้ (Hard Boundaries)

---

## 1. วิธีอ่านตาราง

แต่ละ intent มีตารางตัวอย่างประโยค (training utterances) คอลัมน์:

| คอลัมน์ | ความหมาย |
|---------|----------|
| **Intent** | ชื่อหมวด router |
| **Example utterances** | ประโยคจริงที่ผู้ใช้พิมพ์ — ไทย / EN / สแลง / พิมพ์ผิด |
| **Entities** | คีย์เวิร์ดที่ router จับได้ |
| **Expected answer summary** | สรุปสิ่งที่ Copilot ตอบ (อ้างจากฟิลด์ `CopilotOverview` จริง) |
| **Follow-up chips** | ปุ่มถามต่อที่แนะนำ |
| **Related workflow** | เมนู/หน้าจริงในระบบ (label ไทย) |
| **Language** | TH / EN / mix |
| **Confidence** | ความมั่นใจของการ route (สูง = คีย์เวิร์ดชัด) |

> หมายเหตุข้อมูล: Copilot ดึงข้อมูลทั้งหมดจาก `GET /api/stores/{storeId}/copilot` (เรียกครั้งเดียว) คืน type `CopilotOverview` ช่วงเวลาคือ **วันนี้ (today)** กับ **7 วันล่าสุด (7d)** เท่านั้น

---

## 2. หลักการ router

- เป็น **keyword matching ล้วน** ไม่มี LLM ไม่มีการสรุป/สังเคราะห์ข้อความอิสระ
- มี **15 หมวด** + fallback
- เก็บ **context ล่าสุด** (last topic + last items สูงสุด 3 รายการ) เพื่อให้ "ทำไม?" / "อันนั้น" / "เล่าเพิ่ม" ทำงานต่อเนื่องได้
- คำถามนอกชุดคีย์เวิร์ด → ตกไป fallback ("ถามฉันเกี่ยวกับ…" + 6 ปุ่มหัวข้อ)

---

## 3. Intent: greeting (ทักทาย)

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| greeting | "สวัสดี" / "หวัดดีครับ" / "ดีจ้า" | สวัสดี, หวัดดี | ข้อความต้อนรับ + เสนอ 4 หัวข้อเริ่มต้น | ภาพรวมร้าน · ยอดขาย · ควรทำอะไรวันนี้ · ความเสี่ยง | แดชบอร์ด (`/dashboard`) | TH | สูง |
| greeting | "hello" / "hi" / "hey" | hello, hi, hey | คำต้อนรับ + 4 starter follow-ups | Overview · Sales · Priorities · Risks | Dashboard | EN | สูง |
| greeting | "หวัดดี copilot" / "ดีคับผม" (สแลง) | หวัดดี | คำต้อนรับ + ปุ่มเริ่มต้น | (เหมือนข้างบน) | แดชบอร์ด | TH | สูง |
| greeting | "สวีสดี" / "helo" (พิมพ์ผิด) | สวัสดี, hello (ใกล้เคียง) | คำต้อนรับ (จับได้ถ้าคีย์เวิร์ดยังตรง) | ปุ่มเริ่มต้น | แดชบอร์ด | mix | กลาง |

---

## 4. Intent: thanks (ขอบคุณ)

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| thanks | "ขอบคุณ" / "ขอบคุณมากครับ" | ขอบคุณ | "ยินดีครับ" + เสนอ 4 หัวข้อเริ่มต้น | ภาพรวมร้าน · ยอดขาย · ควรทำอะไร · ความเสี่ยง | — | TH | สูง |
| thanks | "ขอบใจนะ" / "ขอบใจจ้า" (สแลง) | ขอบใจ | "ยินดีครับ" + ปุ่มเริ่มต้น | (เหมือนข้างบน) | — | TH | สูง |
| thanks | "thank you" / "thanks" / "thx" | thank, thx | "You're welcome" + 4 starters | Overview · Sales · Priorities · Risks | — | EN | สูง |
| thanks | "ขอบคุนนน" / "thnx" (พิมพ์ผิด) | ขอบคุณ, thx | "ยินดีครับ" (จับได้ถ้าคีย์เวิร์ดใกล้) | ปุ่มเริ่มต้น | — | mix | กลาง |

---

## 5. Intent: sales (ยอดขาย)

**ฟิลด์ที่ใช้:** `summary.revenue`, `revenueChange`, `revenueToday`, `revenueTodayChange`, `orders`, `averageOrderValue`

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| sales | "ยอดขายเป็นไง" / "วันนี้ขายได้เท่าไหร่" | ยอด, ขาย | รายได้ 7 วัน + ภาพวันนี้ + ยอดเฉลี่ยต่อบิล (AOV) + จำนวนออเดอร์ | กำไรเท่าไหร่ · สินค้าขายดี · ภาพรวมร้าน | รายงานสรุป (`/reports/summary`) · ประวัติการขาย (`/receipts`) | TH | สูง |
| sales | "ขายดีไหมช่วงนี้" / "ยอดอาทิตย์นี้" | ยอด, ขาย | รายได้ 7d + เทียบเปลี่ยนแปลง + AOV | สินค้าขายดี · กำไร · ภาพรวม | รายงานสรุป | TH | สูง |
| sales | "what are my sales" / "revenue today" | sales, revenue | Revenue 7d + today snapshot + AOV + orders | Profit · Best sellers · Overview | Summary Report | EN | สูง |
| sales | "ขายได้กี่บาท" / "เงินเข้าวันนี้" (สแลง) | ขาย | รายได้วันนี้ + 7d + จำนวนออเดอร์ | กำไร · ขายดี | รายงานสรุป | TH | สูง |
| sales | "ยอดขายเดือนนี้" / "ยอดปีนี้" | ยอด, ขาย | ตอบเฉพาะ today + 7d; เดือน/ปี → `ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้` ใน Copilot ให้เปิด **รายงานสรุป** ที่เลือกช่วงวันได้ | เปิดรายงานสรุป | รายงานสรุป (`/reports/summary`) | TH | กลาง |
| sales | "ยดขาย" / "salez" (พิมพ์ผิด) | ยอด/ขาย, sales | ตอบ sales ถ้าคีย์เวิร์ดยังจับได้ | ปุ่มยอดขาย | รายงานสรุป | mix | กลาง |

---

## 6. Intent: profit (กำไร / P&L)

**ฟิลด์ที่ใช้:** `moneyIntelligence.revenue/refunds/cogs/grossProfit/grossMargin/operatingExpenses/netProfit/netMargin`, `summary.profitToday`, `summary.netMargin`

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| profit | "กำไรเท่าไหร่" / "ได้กำไรไหม" | กำไร, profit | งบ P&L (7d + วันนี้): gross/net/operating + ป้ายสถานะ (กำไร/ขาดทุน) | ยอดขาย · ค่าใช้จ่าย · ภาพรวม | กำไรขาดทุน (`/finance/pnl`) · รายงานสรุป | TH | สูง |
| profit | "มาร์จิ้นเท่าไหร่" / "กำไรขั้นต้น" | margin, กำไร | grossMargin + netMargin + netProfit | ยอดขาย · ลดต้นทุนได้ไหม | กำไรขาดทุน (P&L) | TH | สูง |
| profit | "ร้านขาดทุนรึเปล่า" | ขาดทุน | netProfit + ป้ายสถานะ (ถ้าติดลบ = ขาดทุน) | ค่าใช้จ่าย · ความเสี่ยง | กำไรขาดทุน (P&L) | TH | สูง |
| profit | "what's my profit" / "show p&l" / "net margin" | profit, finance, margin | P&L statement 7d + today + status badge | Sales · Expenses · Overview | P&L Statement | EN | สูง |
| profit | "กำใร" / "profitt" (พิมพ์ผิด) | กำไร, profit | ตอบ P&L ถ้าคีย์เวิร์ดยังจับ | ปุ่มกำไร | กำไรขาดทุน | mix | กลาง |

> **หมายเหตุคุณภาพข้อมูล:** ถ้าสินค้ามีต้นทุนหาย (`finance.missingCostLines` / `inventory.missingCostCount`) กำไรอาจคลาดเคลื่อน — Copilot แจ้งเตือนผ่าน `moneyIntelligence.dataQualityNotes[]`

---

## 7. Intent: stock (สต็อก / เติมของ)

**ฟิลด์ที่ใช้:** `healthScore.inventory.outOfStockCount/lowStockCount/deadStockValue`, `inventoryIntelligence.urgentReorders[]`, `topDeadCapital[]`

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| stock | "ของจะหมดไหม" / "สินค้าใกล้หมด" | สต็อก, สินค้า, ใกล้หมด | จำนวนของหมด + จำนวนสต็อกต่ำ + เร่งสั่งซื้อ (top 3) + ทุนจม + ทิปคลัง | สั่งซื้อเลย · ดูสต็อก · ทุนจม | สต็อกสินค้า (`/inventory`) · การสั่งซื้อ (`/purchases`) | TH | สูง |
| stock | "ต้องสั่งของอะไรบ้าง" / "เติมสต็อกไหม" | สต็อก, reorder | urgentReorders top 3 (ชื่อ + วันคงเหลือ + จำนวนแนะนำสั่ง) | สั่งซื้อ · ดูแดชบอร์ดคลัง | สต็อกสินค้า · แดชบอร์ดคลัง (`/warehouse/overview`) | TH | สูง |
| stock | "อะไรหมดสต็อกบ้าง" / "ของขาด" | หมด, สต็อก | outOfStockCount + รายการเร่งสั่ง | สั่งซื้อ · ตรวจนับสินค้า | สต็อกสินค้า · ตรวจนับสินค้า (`/inventory/counts`) | TH | สูง |
| stock | "what's low on stock" / "need to reorder?" / "inventory status" | inventory, reorder, stock | Out-of-stock + low-stock + urgent reorders top 3 + dead capital | Reorder now · View stock · Dead capital | Stock Levels | EN | สูง |
| stock | "สต๊อก" / "สินค๊า" / "inventry" (พิมพ์ผิด) | สต็อก, inventory | ตอบ stock ถ้าคีย์เวิร์ดใกล้ | ปุ่มสต็อก | สต็อกสินค้า | mix | กลาง |

> **เรื่องของ reorder:** `reorderRecommendations[]` มี `recommendation` = purchase / wait_for_po / transfer และ `reasonTh` (เหตุผลภาษาไทย) — Copilot แนะนำตามนี้ ไม่สร้าง PO ให้ (ดูข้อ 22)

---

## 8. Intent: aging (ลูกหนี้ / ค้างชำระ)

**ฟิลด์ที่ใช้:** `moneyIntelligence.agingBuckets[]` (current/30_60/60_90/90_plus), `agingCustomers[]`, `totalOutstanding`, `totalOverdue`

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| aging | "ใครค้างเงินบ้าง" / "ลูกหนี้เท่าไหร่" | ลูกหนี้, ค้างชำระ | ยอดค้างรวม + แบ่งช่วงอายุ (30/60/90/90+) + ลูกหนี้ค้างนานสุด top 3 | ทวงใคร่ก่อน · ความเสี่ยง · ภาพรวม | ขายเชื่อ (`/credit-sales`) · บิลค้างชำระ (`/documents/pending`) | TH | สูง |
| aging | "ต้องตามเก็บเงินใคร" / "หนี้ค้างนานสุด" | เก็บเงิน, ลูกหนี้ | agingCustomers เรียงตาม daysOverdue + ยอดค้าง | ดูขายเชื่อ · รับชำระหนี้ | ขายเชื่อ · บิลค้างชำระ | TH | สูง |
| aging | "บิลค้างชำระมีไหม" | ค้างชำระ, credit | totalOverdue + buckets | บิลค้างชำระ · ความเสี่ยง | บิลค้างชำระ (`/documents/pending`) | TH | สูง |
| aging | "who owes me money" / "overdue debtors" / "AR aging" | debtor, overdue, credit | Outstanding total + aging buckets + top 3 overdue customers | Collect from · Risks · Overview | Credit Sales | EN | สูง |
| aging | "ลูกนี้" / "คนค้าง" (สแลง/พิมพ์ผิด) | ลูกหนี้/ค้าง | ตอบ aging ถ้าคีย์เวิร์ดใกล้ | ปุ่มลูกหนี้ | ขายเชื่อ | mix | กลาง |

---

## 9. Intent: stock+purchasing (จัดซื้อ / ซัพพลายเออร์)

**ฟิลด์ที่ใช้:** `purchasingIntelligence.supplierMetrics[]`, `concentrationIndex/Risk`, `totalPurchaseValue`, `pendingPOCount/Value`, `costChanges[]`, `singleSupplierProducts`, `noSupplierProducts`

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| stock+purchasing | "ซื้อของจากใครเยอะสุด" / "ซัพไหนหลักๆ" | ซื้อ, ซัพ, supplier | ยอดซื้อรวม + จำนวนซัพ + ความเสี่ยงกระจุกตัว + PO ค้าง + ซัพ top 3 + ต้นทุนเปลี่ยน | ดูซัพพลายเออร์ · สร้าง PO · ต้นทุนขึ้น? | ผู้จัดจำหน่าย (`/purchases/suppliers`) · การสั่งซื้อ (`/purchases`) | TH | สูง |
| stock+purchasing | "PO ค้างมีกี่ใบ" / "ใบสั่งซื้อค้าง" | po, สั่งซื้อ | pendingPOCount + pendingPOValue | ดูการสั่งซื้อ · รับสินค้าเข้า | การสั่งซื้อ · รับสินค้าเข้า (`/warehouse/receive`) | TH | สูง |
| stock+purchasing | "ต้นทุนสินค้าขึ้นไหม" | ต้นทุน | costChanges[] (ต้นทุนเก่า→ใหม่ + %เปลี่ยน + ซัพ) | กำไรกระทบไหม · ดูซัพ | ผู้จัดจำหน่าย · กำไรขาดทุน | TH | สูง |
| stock+purchasing | "supplier spend" / "po pending" / "cost changes" | supplier, po, ต้นทุน | Total spend + supplier count + concentration risk + pending POs + top suppliers + cost shifts | View suppliers · Create PO · Receive | Suppliers | EN | สูง |
| stock+purchasing | "ซัพพายเออ" / "suppli" (พิมพ์ผิด) | ซัพ, supplier | ตอบ purchasing ถ้าคีย์เวิร์ดใกล้ | ปุ่มจัดซื้อ | ผู้จัดจำหน่าย | mix | กลาง |

> **ความเสี่ยงกระจุกตัว:** `concentrationRisk` = low/medium/high — ถ้า high หมายถึงพึ่งซัพรายเดียวมาก; `singleSupplierProducts` = สินค้าที่มีซัพเดียว, `noSupplierProducts` = สินค้าไม่มีซัพ

---

## 10. Intent: bestseller (ขายดี)

**ฟิลด์ที่ใช้:** `inventoryIntelligence.urgentReorders[]` เรียงตาม `avgDailySales` (top 5)

> ⚠️ **สำคัญ:** ระบบ **ไม่มี** field จัดอันดับยอดขายต่อสินค้า (per-product revenue ranking) — Copilot ใช้ความเร็วในการขาย (`avgDailySales`) จาก urgentReorders เป็น proxy เท่านั้น และจะ **บอกผู้ใช้ชัดเจน** ว่าไม่ใช่อันดับยอดขายจริง พร้อมชี้ไป **รายงานสรุป**

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| bestseller | "สินค้าขายดีคืออะไร" / "อะไรฮิตสุด" | ขายดี, ฮิต | สินค้าหมุนเร็ว top 5 (จาก avgDailySales) + หมายเหตุ "ไม่ใช่อันดับยอดขายต่อสินค้า — ดูรายงานสรุป" | เปิดรายงานสรุป · ต้องเติมของไหม | รายงานสรุป (`/reports/summary`) · สต็อกสินค้า | TH | กลาง |
| bestseller | "ตัวไหนขายดี" / "สินค้าวิ่งเร็ว" | ขายดี | top 5 by velocity + note ชี้รายงานสรุป | รายงานสรุป · สั่งซื้อ | รายงานสรุป | TH | กลาง |
| bestseller | "what are my best sellers" / "top selling product" | best sell, top seller | Fast-moving top 5 (velocity proxy) + explicit note "not per-product ranking → Reports › Summary" | Open Summary · Reorder? | Summary Report | EN | กลาง |
| bestseller | "อันดับสินค้าขายดีจริงๆ ต่อชิ้น" | ขายดี | `ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้` ใน Copilot (ไม่มี per-product revenue ranking) → แนะนำเปิด **รายงานสรุป** | เปิดรายงานสรุป | รายงานสรุป | TH | กลาง |

---

## 11. Intent: priorities / actions (ควรทำอะไร)

**ฟิลด์ที่ใช้:** `decisionEngine.topPriority/todayPriorities[]/weekPriorities[]`, `actions[]` (severity urgent/high/medium/low, route, impactValue)

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| priorities | "วันนี้ควรทำอะไร" / "ทำอะไรก่อนดี" | ทำอะไร, ควรทำ | งานสำคัญวันนี้ top 3 + งานสัปดาห์ 2 รายการ (พร้อม impact + เหตุผล) | ทำไมต้องทำ · ถ้าไม่ทำจะเป็นไง · ภาพรวม | (ตาม `action.route` ของแต่ละงาน) | TH | สูง |
| priorities | "อะไรด่วนสุด" / "เรื่องสำคัญที่สุด" | urgent, สำคัญ | topPriority + งานวันนี้ | ด่วนแค่ไหน · ทำไม | (ตาม route ของ action) | TH | สูง |
| priorities | "what should I do today" / "top priority" / "urgent tasks" | priority, urgent | Top 3 today priorities + 2 week priorities (impact/reason) | Why · Consequence · Overview | (action.route) | EN | สูง |
| priorities | "งานวันนี้" / "todo" (สแลง) | ควรทำ/todo | งานสำคัญวันนี้ top 3 | ทำไม · ถ้าไม่ทำ | (action.route) | mix | กลาง |
| priorities | "ควนทำอะไร" / "priorty" (พิมพ์ผิด) | ควรทำ, priority | ตอบ priorities ถ้าคีย์เวิร์ดใกล้ | ปุ่มงานวันนี้ | (action.route) | mix | กลาง |

> หมายเหตุ: บาง action ไม่มีลิงก์ (`actionRoute`/`route` อาจเป็น null) และ `impactValue`/`badge` เป็น optional

---

## 12. Intent: overview (ภาพรวม / สุขภาพร้าน)

**ฟิลด์ที่ใช้:** `healthScore.overall` (0–100) + sub-scores (sales/inventory/finance/operations), `summary.revenueToday/profitToday`, risk summary

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| overview | "ภาพรวมร้านเป็นไง" / "สรุปวันนี้หน่อย" | ภาพรวม, สรุป | คะแนนสุขภาพร้าน (0–100) + ภาพวันนี้ + สรุปสต็อก/ความเสี่ยง + สถานะกำไร | ความเสี่ยง · ควรทำอะไร · ยอดขาย | แดชบอร์ด (`/dashboard`) | TH | สูง |
| overview | "ร้านสุขภาพดีไหม" / "คะแนนร้าน" | สุขภาพ, health | healthScore.overall + sub-scores 4 ด้าน | ดูความเสี่ยง · ดูโอกาส | แดชบอร์ด | TH | สูง |
| overview | "give me an overview" / "store health" / "summary" | overview, health | Business score 0–100 + today snapshot + inventory/risk summary + profitability status | Risks · Priorities · Sales | Dashboard | EN | สูง |
| overview | "ภาพรวน" / "overvew" (พิมพ์ผิด) | ภาพรวม, overview | ตอบ overview ถ้าคีย์เวิร์ดใกล้ | ปุ่มภาพรวม | แดชบอร์ด | mix | กลาง |

---

## 13. Intent: risks (ความเสี่ยง)

**ฟิลด์ที่ใช้:** `risks[]` — `category` (inventory/finance/operations/customer/purchasing), `severity` (critical/high/medium/low), `title`, `description`, `impact`, `action`, `value`

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| risks | "มีความเสี่ยงอะไรบ้าง" / "ร้านมีปัญหาไหม" | ความเสี่ยง, ปัญหา | รายการความเสี่ยง top 5 (แสดงหัวข้อ) จัดตาม severity | เล่าเพิ่ม · ถ้าไม่ทำจะเป็นไง · ควรทำอะไร | (ตาม risk.category → เมนูที่เกี่ยว) | TH | สูง |
| risks | "อะไรน่าห่วงสุด" / "เรื่องเสี่ยงสุด" | ความเสี่ยง | ความเสี่ยงระดับ critical/high ก่อน | รายละเอียด · ทำไม | (risk.category) | TH | สูง |
| risks | "what are the risks" / "any problems" / "issues" | risk, issue, problem | List of risks top 5 (title), grouped by severity | Tell me more · Consequence · Priorities | (risk.category) | EN | สูง |
| risks | "ความเสียง" / "rissk" (พิมพ์ผิด) | ความเสี่ยง, risk | ตอบ risks ถ้าคีย์เวิร์ดใกล้ | ปุ่มความเสี่ยง | (risk.category) | mix | กลาง |

---

## 14. Intent: opportunities (โอกาส)

**ฟิลด์ที่ใช้:** `opportunities[]` — `category` (sales/inventory/finance/customer/purchasing), `title`, `description`, `metric`, `recommendation`, `value`

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| opportunities | "มีโอกาสโตตรงไหน" / "ทำยอดเพิ่มได้ไง" | โอกาส, เติบโต | รายการโอกาสทั้งหมด (หัวข้อ + metric + คำแนะนำ) | เล่าเพิ่ม · ทำไม · ควรทำอะไร | (ตาม opportunity.category) | TH | สูง |
| opportunities | "เพิ่มกำไรได้ตรงไหน" / "โอกาสขายดีขึ้น" | โอกาส | opportunities ที่เกี่ยว sales/finance | รายละเอียด · ยอดขาย | (opportunity.category) | TH | สูง |
| opportunities | "any opportunities" / "how to grow" / "improve sales" | opportunity, grow, improve | All opportunities (title + metric + recommendation) | Tell me more · Why · Priorities | (opportunity.category) | EN | สูง |
| opportunities | "โอกาด" / "oportunity" (พิมพ์ผิด) | โอกาส, opportunity | ตอบ opportunities ถ้าคีย์เวิร์ดใกล้ | ปุ่มโอกาส | (opportunity.category) | mix | กลาง |

> หมายเหตุ: บางโอกาสไม่มีตัวเลข metric (`metric` อาจ null) — Copilot แสดงเฉพาะ title + recommendation

---

## 15. Intent: activity (ใครแก้ / log)

**กลไก:** async — query ข้อมูลบันทึกกิจกรรมจริง แสดงการเปลี่ยนแปลงราคา / การลบ / การแก้ไขสำคัญ (รองรับ "วันนี้" vs "7 วัน")

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| activity | "ใครแก้ราคาสินค้า X" / "ใครเปลี่ยนอะไรบ้าง" | ใครแก้, ใครเปลี่ยน | ดึง activity log แสดงการแก้ราคา (ก่อน→หลัง) / การลบ / การแก้ไขสำคัญ | ดูบันทึกกิจกรรมทั้งหมด · เรื่องนี้สำคัญไหม | บันทึกกิจกรรม (`/settings/activity-logs`) | TH | สูง |
| activity | "ใครลบสินค้า" / "เมื่อกี้ใครแก้" | ใครแก้ | log การลบ/แก้ไข เรียงล่าสุด | เปิด activity logs | บันทึกกิจกรรม | TH | สูง |
| activity | "who changed the price" / "activity log" / "who edited this" | who changed, activity log | Async: queries logs → price changes, deletions, critical edits | Open activity logs · Is it important | Activity Logs | EN | สูง |
| activity | "ใครแก้ราคา" / "who chnged" (พิมพ์ผิด) | ใครแก้, who changed | ตอบ activity ถ้าคีย์เวิร์ดใกล้ | ปุ่ม activity | บันทึกกิจกรรม | mix | กลาง |

> รองรับ context: ถามต่อ "วันนี้" จะ filter เฉพาะวันนี้; default ขยายได้ถึง 7 วัน

---

## 16. Intent: help (วิธีใช้ / คู่มือ)

**กลไก:** ค้น help-topics DB (`/lib/help/help-topics.ts`) คืน **ขั้นตอน + ทิป + ป้ายหมวด** — เนื้อหา **ภาษาไทยเท่านั้น**

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| help | "วิธีรับชำระเงิน" / "ขายของยังไง" | วิธี, ทำไง | ขั้นตอน checkout: เลือกสินค้า→รถเข็น→ชำระเงิน→เลือกวิธีจ่าย→ยืนยัน→พิมพ์ใบเสร็จ + ทิป (ปุ่มพอดี / VAT 7%) | หน้าขาย · พักบิล · ส่วนลด | หน้าขาย (`/sales`) | TH | สูง |
| help | "พักบิลทำยังไง" / "วิธีพักบิล" | วิธี, พักบิล | ขั้นตอนพักบิล (เมนู ⋮ → พักบิล → เรียกคืนที่ไอคอน 📋) | ใบเสนอราคา · ส่วนลด | หน้าขาย | TH | สูง |
| help | "สร้างใบเสนอราคายังไง" | วิธี, คู่มือ | ขั้นตอน Quotation (รถเข็น→Checkout→Quotation→ตั้งวันหมดอายุ→สร้าง) | แปลงเป็นใบแจ้งหนี้ · เอกสาร | เอกสาร (`/documents`) | TH | สูง |
| help | "เปิดบิลเชื่อยังไง" / "ขายเชื่อทำไง" | วิธี, ทำไง | ขั้นตอนเปิดบิลเชื่อ (Checkout→แท็บเปิดบิลเชื่อ→เลือกลูกค้า→กำหนดวันครบ→เปิดบิล) | รับชำระหนี้ · คืนสินค้ายืม | ขายเชื่อ (`/credit-sales`) | TH | สูง |
| help | "เพิ่มสินค้ายังไง" / "นำเข้า excel" | วิธี | ขั้นตอนเพิ่มสินค้า / นำเข้า Excel (ดาวน์โหลด template→กรอก→อัปโหลด→ยืนยัน) | ตั้งบาร์โค้ด · หมวดหมู่ | รายการสินค้า (`/products`) | TH | สูง |
| help | "นับสต็อกยังไง" / "รับสินค้าเข้าทำไง" | วิธี | ขั้นตอนนับสต็อก / รับสินค้าเข้า (สร้างรอบ→นับ→ดูส่วนต่าง→ยืนยัน) | ดูสต็อก · สั่งซื้อ | ตรวจนับสินค้า (`/inventory/counts`) · รับสินค้าเข้า (`/warehouse/receive`) | TH | สูง |
| help | "สร้าง PO ยังไง" / "เพิ่มซัพพลายเออร์" | วิธี | ขั้นตอนสร้างใบสั่งซื้อ / จัดการซัพ (เลือกซัพ→เพิ่มสินค้า→ส่ง PO) | รับสินค้าเข้า · ผู้จัดจำหน่าย | การสั่งซื้อ (`/purchases`) | TH | สูง |
| help | "เพิ่มลูกค้ายังไง" / "สร้างโปรโมชั่น" | วิธี | ขั้นตอนเพิ่มลูกค้า / สร้างโปรฯ (เลือกประเภท→ตั้งเงื่อนไข→ตั้งวันที่→เปิดใช้) | ลูกค้า · โปรโมชั่น | ลูกค้า (`/customers`) · โปรโมชั่น (`/promotions`) | TH | สูง |
| help | "อ่านรายงานสรุปยังไง" / "บันทึกค่าใช้จ่าย" | วิธี | ขั้นตอนอ่านรายงาน / บันทึกรายจ่าย (เลือกหมวด→กรอกยอด+วันที่→บันทึก) | กำไรขาดทุน · มูลค่าสต็อก | รายงานสรุป · บันทึกรายจ่าย (`/finance/expenses`) | TH | สูง |
| help | "ตั้งค่าร้านยังไง" / "เพิ่มพนักงาน" | วิธี | ขั้นตอนตั้งค่าร้าน / จัดการพนักงาน (เพิ่มพนักงาน→เลือกบทบาท Owner/Manager/Cashier→ส่งอีเมลเชิญ) | ใบเสร็จและการชำระเงิน · บันทึกกิจกรรม | ตั้งค่าร้านค้า (`/settings`) · พนักงาน (`/settings/staff`) | TH | สูง |
| help | "พิมพ์เอกสารต้นฉบับ/สำเนา" | วิธี | ขั้นตอนพิมพ์ต้นฉบับ/สำเนา (Print→เลือก ต้นฉบับ/สำเนา 1/สำเนา 2 — ใบส่งของมี 3 ชุด) | ประเภทเอกสาร · แปลงเอกสาร | เอกสาร (`/documents`) | TH | สูง |
| help | "how to checkout" / "step by step" (EN) | how to, step by step | เนื้อหา help เป็นไทย → ภาษาอังกฤษได้ fallback list (ไม่มีขั้นตอนละเอียด) — `ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้เป็นภาษาอังกฤษ` | (รายการหัวข้อภาษาไทย) | หน้าขาย | EN | กลาง |

> หมวดคู่มือที่มีจริง: เริ่มต้นใช้งาน · แดชบอร์ด · ขายสินค้า · ขายเชื่อ · เอกสาร · สินค้า · คลังสินค้า · จัดซื้อ · ลูกค้า & โปรโมชัน · รายงาน & การเงิน · ตั้งค่า
>
> เวิร์กโฟลว์ที่ **ยังไม่มีในคู่มือ** (ถ้าถูกถาม ตอบ `ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้`): การโอนย้ายสต็อกระหว่างคลัง, ปิดร้าน/กระทบยอดเงินสดสิ้นวัน, รับคืนสินค้าจากลูกค้า (refund), เคลมประกัน/เปลี่ยนสินค้า, ตัดสต็อกของเสีย/สูญหาย, ปรับราคาแบบ bulk, คืนสินค้าให้ซัพพลายเออร์, จองล่วงหน้า/backorder, จัดการวงเงินเครดิตลูกค้า, กระทบยอดเงินเข้าธนาคาร, จัดการกะ/แคชเชียร์หลายเครื่อง, สินค้าชุด/kit, ติดตามการจัดส่ง, จัดการหมวดค่าใช้จ่ายแบบกำหนดเอง

---

## 17. Intent: consequence (ถ้าไม่ทำจะเกิดอะไร)

**กลไก:** context-aware — ใช้ item ล่าสุดในบริบทคำนวณผลกระทบ (stockout / หนี้สูญ / ยอดที่เสียไป / timeline)

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| consequence | "ถ้าไม่ทำจะเกิดอะไร" / "ปล่อยไว้เป็นไง" | ถ้าไม่ทำ | ผลกระทบตามบริบท: ของขาด→เสียยอดขาย, หนี้→เสี่ยงสูญ, พร้อม timeline | ด่วนแค่ไหน · ควรทำอะไร | (ตามบริบทล่าสุด) | TH | กลาง |
| consequence | "ไม่สั่งของจะเป็นไรไหม" (ตามหลัง stock) | ถ้าไม่ทำ | ผลกระทบ stockout: เสียยอด + กระทบลูกค้า | สั่งซื้อ · ด่วนแค่ไหน | สต็อกสินค้า · การสั่งซื้อ | TH | กลาง |
| consequence | "what happens if ignored" / "if I don't do this" | what happens if ignored | Context fallout: stockout impact / bad debt / lost revenue / timeline | How urgent · Priorities | (ตามบริบท) | EN | กลาง |
| consequence | (ถามลอย ไม่มีบริบทก่อน) | ถ้าไม่ทำ | ถ้าไม่มี item ในบริบท → ขอให้ระบุเรื่องก่อน (clarification) | ความเสี่ยง · ควรทำอะไร | — | TH | ต่ำ |

---

## 18. Intent: why (ทำไม / เหตุผล)

**ฟิลด์ที่ใช้:** `decisionEngine.reason` (อธิบาย *ทำไมงานนี้สำคัญ*) — **ไม่สามารถ** อธิบายวิธีคำนวณคะแนนเบื้องหลัง (ดูข้อ 22)

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| why | "ทำไม" / "ทำไมต้องทำอันนี้" (ตามหลัง priority) | ทำไม, why | เหตุผลจาก `decisionEngine.reason` ของ action ในบริบท | ถ้าไม่ทำจะเป็นไง · ด่วนแค่ไหน | (action.route ในบริบท) | TH | กลาง |
| why | "เพราะอะไร" / "ทำไมเสี่ยง" | ทำไม | เหตุผล/impact ของ risk หรือ priority ในบริบท | รายละเอียด · ควรทำอะไร | (ตามบริบท) | TH | กลาง |
| why | "why" / "why is this important" / "tell me more" | why, tell me more | reason ของ item ในบริบท (ขยายรายละเอียด) | Consequence · How urgent | (context route) | EN | กลาง |
| why | "ทำไมระบบให้คะแนนแบบนี้" | ทำไม | `ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้` — อธิบายได้แค่ "ทำไมสำคัญ" ไม่ใช่วิธีคำนวณคะแนนเบื้องหลัง | ถ้าไม่ทำจะเป็นไง · ความเสี่ยง | — | TH | ต่ำ |

---

## 19. Intent: urgency (ด่วนแค่ไหน)

**กลไก:** ทำงานเฉพาะเมื่อมี item ในบริบท คืนป้าย severity: 🔴 ทำเดี๋ยวนี้ (Now) / 🟡 วันนี้ (Today) / 🟢 สัปดาห์นี้ (Week)

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| urgency | "ควรทำวันนี้เลยไหม" / "ด่วนแค่ไหน" (ตามหลัง priority) | ควรทำวันนี้ | ป้ายความด่วน: 🔴 เดี๋ยวนี้ / 🟡 วันนี้ / 🟢 สัปดาห์นี้ | ทำไม · ถ้าไม่ทำจะเป็นไง | (action.route ในบริบท) | TH | กลาง |
| urgency | "รีบไหม" / "ต้องทำก่อนไหม" | ควรทำวันนี้ | severity badge ของ item ในบริบท | รายละเอียด | (context route) | TH | กลาง |
| urgency | "how urgent" / "do I need to do this today" | how urgent | 🔴 Now / 🟡 Today / 🟢 Week badge | Why · Consequence | (context route) | EN | กลาง |
| urgency | (ถามลอย ไม่มีบริบท) | ควรทำวันนี้ | ถ้าไม่มี item → ขอให้เลือกเรื่องก่อน (clarification) | ควรทำอะไร · ความเสี่ยง | — | TH | ต่ำ |

---

## 20. Intent: clarification + fallback (ไม่เข้าใจ / ถามต่อ)

| Intent | Example utterances | Entities | Expected answer summary | Follow-up chips | Related workflow | Lang | Confidence |
|--------|--------------------|----------|--------------------------|-----------------|------------------|------|-----------|
| fallback | "วันนี้อากาศดีจัง" / "เล่าเรื่องตลกหน่อย" | (ไม่ match) | "ถามฉันเกี่ยวกับ…" + 6 ปุ่มหัวข้อ (ยอดขาย/กำไร/สต็อก/ลูกหนี้/ความเสี่ยง/ควรทำอะไร) | 6 หัวข้อหลัก | แดชบอร์ด | TH | — |
| fallback | "do my taxes" / "write me a poem" | (no match) | "Ask me about…" + 6 topic buttons | 6 topics | Dashboard | EN | — |
| clarification | "อันนั้น" / "เล่าเพิ่ม" / "that one" | context refs | ใช้ context ล่าสุด (last topic/items) ตอบต่อ; ถ้าไม่มีบริบท → ขอให้ระบุเรื่อง | (ตามบริบท) | (ตามบริบท) | mix | กลาง |
| clarification | "เรื่องราคาน่ะ" (กำกวม) | กำกวม | ถามกลับเพื่อให้ชัด หรือเสนอหัวข้อใกล้เคียง | หัวข้อที่เกี่ยว | — | TH | ต่ำ |

> **Off-topic / สนทนาเปิด:** Copilot **ไม่ใช่** แชตทั่วไป — คำถามนอกชุดคีย์เวิร์ดตกไป fallback เสมอ (ดูข้อ 22)

---

## 21. Entity Glossary (คำสำคัญที่ใช้จับ intent)

| หมวด | คีย์เวิร์ดไทย | คีย์เวิร์ด EN |
|------|---------------|----------------|
| greeting | สวัสดี, หวัดดี | hello, hi, hey |
| thanks | ขอบคุณ, ขอบใจ | thank, thx |
| sales | ยอด, ขาย | revenue, sales |
| profit | กำไร, ขาดทุน, มาร์จิ้น | profit, finance, margin |
| stock | สต็อก, สินค้า, หมด, ใกล้หมด | inventory, reorder, stock |
| aging | ลูกหนี้, ค้างชำระ, เก็บเงิน | debtor, overdue, credit |
| purchasing | ซื้อ, สั่งซื้อ, ซัพ, ต้นทุน | supplier, po |
| risks | ความเสี่ยง, ปัญหา | risk, issue, problem |
| opportunities | โอกาส, เติบโต | opportunity, grow, improve |
| priorities | ทำอะไร, ควรทำ, สำคัญ | priority, urgent |
| overview | ภาพรวม, สุขภาพ, สรุป | overview, health |
| bestseller | ขายดี, ฮิต | top seller, best sell |
| consequence | ถ้าไม่ทำ | what happens if ignored |
| urgency | ควรทำวันนี้ | how urgent |
| activity | ใครแก้, ใครเปลี่ยน | who changed, activity log |
| help | วิธี, คู่มือ, ทำไง | how to, step by step |
| why | ทำไม | why, tell me more |

---

## 22. ขอบเขตที่ระบบทำไม่ได้ (Hard Boundaries)

ระบุไว้เพื่อกันการแต่งคำตอบ — ทุกข้อด้านล่างให้ตอบทำนอง `ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้` หรือชี้ไปหน้าที่ถูกต้อง:

1. **ไม่มี LLM / generative AI** — ทุกคำตอบเป็น template แบบ deterministic ไม่มีการสรุป/สังเคราะห์/เขียนอิสระ
2. **ไม่มีอันดับยอดขายต่อสินค้า** — `CopilotOverview` ไม่มี field per-product revenue; ขายดีใช้ `avgDailySales` เป็น proxy → ชี้ไป **รายงานสรุป**
3. **ไม่ใช่แชตเปิด** — คำถามนอกคีย์เวิร์ดตกไป fallback
4. **สั่งงาน/ทำคำสั่งไม่ได้** — "สร้าง PO" / "ปรับสต็อก" / "ส่งใบแจ้งหนี้" คืน "เร็วๆ นี้" (กำลังพัฒนา)
5. **คู่มือ (help) เป็นภาษาไทยเท่านั้น** — ถามเป็น EN ได้แค่ fallback list ไม่มีขั้นตอนละเอียด
6. **อธิบายได้แค่ "ทำไมสำคัญ" ไม่ใช่วิธีคำนวณคะแนน** — ไม่เปิดเผยสูตร backend
7. **ไม่มีเทรนด์เกิน 7 วัน** — มีแค่ today + 7d; ไม่มี 30 วัน / YoY / กราฟแนวโน้มยาว
8. **กรองเองไม่ได้** — แบ่งตามวันที่/พนักงาน/หมวด ไม่ได้; มีแค่ today vs 7 วัน (เฉพาะ activity)
9. **ไม่โต้ตอบกับข้อมูลจริง** — สร้าง/แก้/ลบ, อนุมัติรับสินค้า, รับชำระเงิน, รัน PO ไม่ได้
10. **ไม่มี LLM ในทุกชั้น** — engine เป็น keyword routing + template filling 100%

**ฟิลด์ที่อาจว่าง/null:** `CopilotRisk.actionRoute`, `CopilotOpportunity.metric`, `CopilotDeadCapitalItem.lastSold`, `CopilotAction.impactValue`/`badge`, `moneyIntelligence.dataQualityNotes[]`

---

*สิ้นสุดเอกสาร — ทุกแถวอ้างอิงจาก POS COPILOT GROUND TRUTH CAPABILITY MAP เท่านั้น*
