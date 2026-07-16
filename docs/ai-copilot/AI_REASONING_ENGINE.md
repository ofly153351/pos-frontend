# AI REASONING ENGINE — โมเดลการให้เหตุผลของ Copilot

> เอกสารอ้างอิง: อธิบายว่า Copilot ของ POS Today **ตัดสินใจแนะนำ** อย่างไร และข้อมูลตัวไหนใน `CopilotOverview` เป็นตัวจุดชนวนคำแนะนำแต่ละแบบ
> ผู้อ่านเป้าหมาย: เจ้าของร้าน / ผู้จัดการ ที่อยากเข้าใจว่า "ทำไมระบบถึงบอกให้ทำแบบนี้"

---

## 0. สิ่งที่ต้องเข้าใจก่อน — Copilot นี้ "คิด" แบบไหน

Copilot ตัวนี้ **ไม่ใช่ AI แบบสนทนา (ไม่มี LLM)** — มันคือ **กระดานข้อมูลธุรกิจ (business intelligence) ที่ตอบคำถามด้วยกฎตายตัว**

หลักการทำงาน:

- ข้อมูลทั้งหมดมาจาก **API เดียว** → `CopilotOverview`
- คำตอบทุกแบบเป็น **template ที่เติมตัวเลขลงไป** (deterministic) ไม่ใช่ข้อความที่ AI แต่งเอง
- คำแนะนำทุกข้อ **อิงตัวเลขจริง** ในร้านคุณ ณ เวลาที่ดึงข้อมูล (`generatedAt`)

> **ข้อจำกัดที่ต้องรู้:** Copilot **ลงมือทำแทนไม่ได้** — สร้าง PO / ปรับสต็อก / ส่งใบแจ้งหนี้ ระบบจะตอบว่า "Coming soon" คำแนะนำทุกข้อจึงเป็น "บอกให้ไปทำที่หน้าไหน" ไม่ใช่ "ทำให้เลย"

ข้อมูลที่ Copilot ใช้คิด แบ่งเป็นกลุ่มใหญ่:

| กลุ่มข้อมูล | ฟิลด์หลัก | ใช้ตัดสินเรื่อง |
|---|---|---|
| `healthScore` | overall, sales, inventory, finance, operations | คะแนนสุขภาพร้าน 0–100 |
| `summary` | revenue, netProfit, netMargin, orders, AOV, revenueToday | ภาพรวมเงิน |
| `risks[]` | severity, category, impact, action, value | ความเสี่ยง |
| `opportunities[]` | metric, recommendation, value | โอกาส |
| `inventoryIntelligence` | urgentReorders, reorderRecommendations, topDeadCapital, overstockItems | สต็อก |
| `moneyIntelligence` | agingBuckets, agingCustomers, totalOutstanding, totalOverdue, dataQualityNotes | ลูกหนี้ + กำไร |
| `purchasingIntelligence` | supplierMetrics, concentrationRisk, pendingPO, costChanges | จัดซื้อ + ต้นทุน |
| `decisionEngine` | topPriority, todayPriorities, weekPriorities (action+score+reason+urgencyLabel) | จัดอันดับว่าควรทำอะไรก่อน |

---

## 1. โครงสร้างการให้เหตุผล (Reasoning Template)

คำแนะนำทุกประเภทในเอกสารนี้อธิบายด้วย **7 หัวข้อเดียวกัน** เพื่อให้สแกนอ่านง่าย:

- **ทำไม (Why)** — เหตุผลที่ระบบหยิบเรื่องนี้ขึ้นมา
- **ผลต่อธุรกิจ (Business impact)** — กระทบเงิน/ของ/ลูกค้าอย่างไร
- **ความเสี่ยง (Risk)** — ถ้าปล่อยไว้จะเกิดอะไร
- **โอกาส (Opportunity)** — ถ้าทำแล้วได้อะไรกลับมา
- **ทางเลือกอื่น (Alternative choices)** — ทำได้กี่แบบ
- **ขั้นต่อไป (Next step)** — เข้าเมนูไหน ทำอะไร (เมนูจริงจากระบบ)
- **ผลที่คาดหวัง (Expected outcome)** — เสร็จแล้วตัวเลขควรขยับยังไง

> ทุกหัวข้อ "ขั้นต่อไป" ชี้ไปเมนูจริงที่มีอยู่ในระบบเท่านั้น ถ้าเรื่องไหนระบบยังทำไม่ได้ จะระบุไว้ชัดเจน

---

## 2. เครื่องยนต์จัดลำดับความสำคัญ (Decision Engine)

ก่อนเข้าคำแนะนำรายตัว ต้องเข้าใจว่า Copilot จัดอันดับ "ควรทำอะไรก่อน" จาก `decisionEngine`:

- `topPriority` — งานที่กระทบมากที่สุด (อาจเป็น `null` ถ้าไม่มีอะไรเร่งด่วน)
- `todayPriorities[]` — งานที่ควรทำวันนี้ (เรียงตามคะแนน)
- `weekPriorities[]` — งานที่ควรทำในสัปดาห์นี้
- แต่ละงานมี: `action`, `score` (คะแนนความเร่งด่วน), `reason` (เหตุผล), `urgencyLabel`

**ป้ายความเร่งด่วน (จาก intent "urgency"):**

| ป้าย | ความหมาย |
|---|---|
| 🔴 Now | ทำเดี๋ยวนี้ |
| 🟡 Today | ทำภายในวันนี้ |
| 🟢 Week | ทำภายในสัปดาห์ |

> **หมายเหตุความโปร่งใส:** Copilot อธิบายได้ว่า *ทำไมงานนี้ถึงสำคัญที่สุด* (ผ่าน `decisionEngine.reason`) แต่ **อธิบายไม่ได้ว่า backend คำนวณคะแนน `score` มาด้วยสูตรอะไร** — ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้

ถามผ่านแชทได้ด้วยคำว่า: `ทำอะไร`, `ควรทำ`, `priority`, `urgent`, `สำคัญ`

---

# ═══════════════════════════════════════
# คำแนะนำประเภทที่ 1 — สั่งซื้อเติมสต็อก (REORDER)
# ═══════════════════════════════════════

**จุดชนวน (CopilotOverview):**
`inventoryIntelligence.urgentReorders[]` + `inventoryIntelligence.reorderRecommendations[]`
และตัวเลขสรุป `healthScore.inventory.outOfStockCount`, `healthScore.inventory.lowStockCount`

ฟิลด์ที่ระบบดู: `daysOfStock`, `currentStock`, `reorderQty`, `avgDailySales`, `hasPendingPO`, `pendingPOQty`, `recommendation` (purchase | wait_for_po | transfer), `reasonTh`, `severity`

---

### ▸ ทำไม (Why)
สินค้าตัวนี้ `daysOfStock` (จำนวนวันที่ของจะหมด) เหลือน้อย เทียบกับ `avgDailySales` (ขายเฉลี่ยต่อวัน) แล้วใกล้ขาดสต็อก ระบบจึงดันขึ้นมาใน `urgentReorders` พร้อม `severity`

### ▸ ผลต่อธุรกิจ (Business impact)
ถ้าของหมด = ขายไม่ได้ = เสียยอด `summary.revenue` ที่ควรได้ และเสียโอกาสต่อหน้าลูกค้า สินค้าที่ `avgDailySales` สูงยิ่งกระทบแรง

### ▸ ความเสี่ยง (Risk)
- ของหมดจริง → ลูกค้าไปซื้อร้านอื่น
- จำนวน `outOfStockCount` / `lowStockCount` สูงขึ้น → คะแนน `healthScore.inventory` ตก
- ถ้า `recommendation = wait_for_po` แปลว่ามี PO ค้างอยู่แล้ว (`hasPendingPO = true`, `pendingPOQty`) — สั่งซ้ำจะได้ของเกิน

### ▸ โอกาส (Opportunity)
เติมของทันเวลา = รักษายอดขายของตัวที่ขายดี (ดูสินค้าหมุนเร็วได้จาก intent "best-sellers" ที่ใช้ `avgDailySales` เป็นตัวแทน)

### ▸ ทางเลือกอื่น (Alternative choices)
ระบบบอกชนิดคำแนะนำไว้ใน `recommendation`:
1. **purchase** — สั่งซื้อใหม่ (ออก PO)
2. **wait_for_po** — รอของจาก PO ที่สั่งไว้แล้ว
3. **transfer** — ย้ายจากคลัง/จุดอื่นมาแทน

### ▸ ขั้นต่อไป (Next step)
- ออก PO: **จัดซื้อ › การสั่งซื้อ** (`/purchases`) → "+ สร้างใบสั่งซื้อใหม่" → เลือกซัพพลายเออร์ → ใส่สินค้า+จำนวน (`reorderQty` เป็นตัวเลขแนะนำ)
- ดูภาพรวมสต็อกก่อนตัดสินใจ: **คลังสินค้า › สต็อกสินค้า** (`/inventory`)
- บนแดชบอร์ด: ส่วน "สินค้าที่ต้องติดตาม" คลิกชื่อสินค้า แล้วกด "สั่งซื้อ" เพื่อออก PO ตัวนั้นได้เลย

### ▸ ผลที่คาดหวัง (Expected outcome)
หลังรับของเข้า `currentStock` เพิ่ม → `daysOfStock` ยืดออก → สินค้าหลุดจาก `urgentReorders` → `lowStockCount` ลดลง → คะแนน `healthScore.inventory` ดีขึ้น

> ถาม Copilot ได้ด้วยคำว่า: `สต็อก`, `ใกล้หมด`, `reorder`, `หมด` → ระบบคืน out-of-stock, low-stock, urgent reorders (3 อันดับแรก)

---

# ═══════════════════════════════════════
# คำแนะนำประเภทที่ 2 — ตามเก็บหนี้ลูกค้า (COLLECT DEBT)
# ═══════════════════════════════════════

**จุดชนวน (CopilotOverview):**
`moneyIntelligence.agingBuckets[]` + `moneyIntelligence.agingCustomers[]`
และ `healthScore.operations.overdueCreditCount`, `healthScore.operations.overdueCreditAmount`

ฟิลด์ที่ระบบดู: `totalOutstanding`, `totalOverdue`, bucket `label` (current | 30_60 | 60_90 | 90_plus), `count`, `amount`; ลูกหนี้ราย: `customerName`, `outstanding`, `oldestBucket`, `daysOverdue`

---

### ▸ ทำไม (Why)
มีลูกหนี้ค้างชำระเกินกำหนด ระบบจับจาก `agingBuckets` (จัดกลุ่มตามอายุหนี้) และดันลูกค้าที่ค้างนานสุดขึ้นมาใน `agingCustomers` พร้อม `daysOverdue`

### ▸ ผลต่อธุรกิจ (Business impact)
หนี้ค้าง = เงินสดที่ควรอยู่ในร้านแต่ยังอยู่ข้างนอก กระทบสภาพคล่อง ยิ่ง bucket `90_plus` มี `amount` สูง ยิ่งเสี่ยงกลายเป็นหนี้สูญ

### ▸ ความเสี่ยง (Risk)
- หนี้ยิ่งเก่า (`oldestBucket` ขยับไป `60_90` → `90_plus`) ยิ่งเก็บยาก
- `totalOverdue` สูง → คะแนน `healthScore.operations` ตก
- เงินจมในลูกหนี้ทำให้เติมสต็อก/จ่ายค่าใช้จ่ายลำบาก

### ▸ โอกาส (Opportunity)
เก็บหนี้ก้อนเก่าได้ = เงินสดกลับเข้าร้านทันที เอาไปหมุนเติมสต็อกตัวขายดีต่อได้

### ▸ ทางเลือกอื่น (Alternative choices)
1. ไล่เก็บจาก **ลูกค้าที่ค้างนานสุดก่อน** (`daysOverdue` มากสุด / bucket `90_plus`)
2. ไล่เก็บจาก **ยอดค้างสูงสุดก่อน** (`outstanding` มากสุด) เพื่อดึงเงินสดกลับเร็ว
> การส่งใบแจ้งยอด/ทวงหนี้อัตโนมัติ — ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (Copilot สั่งทำแทนไม่ได้)

### ▸ ขั้นต่อไป (Next step)
- **ขายเชื่อ / ยืม** (`/credit-sales`) → หาบิลลูกค้า → "รับชำระหนี้" → ใส่ยอด + วิธีชำระ → ยืนยัน (สถานะเปลี่ยนเป็น "ชำระแล้ว")
- ดูบิลค้างชำระรวม: **เอกสาร › บิลค้างชำระ** (`/documents/pending`)

### ▸ ผลที่คาดหวัง (Expected outcome)
รับชำระแล้ว → `totalOutstanding` / `totalOverdue` ลดลง → bucket อายุหนี้ขยับ → `overdueCreditCount` ลด → คะแนน `healthScore.operations` ดีขึ้น

> ถาม Copilot ได้ด้วยคำว่า: `ลูกหนี้`, `ค้างชำระ`, `เก็บเงิน`, `overdue`, `credit` → คืนยอดค้างรวม, aging buckets, ลูกหนี้เกินกำหนด 3 อันดับแรก

---

# ═══════════════════════════════════════
# คำแนะนำประเภทที่ 3 — ระบายสต็อกค้าง / ทุนจม (CLEAR DEAD STOCK)
# ═══════════════════════════════════════

**จุดชนวน (CopilotOverview):**
`inventoryIntelligence.topDeadCapital[]` + `inventoryIntelligence.overstockItems[]`
และ `inventoryIntelligence.totalDeadCapitalValue`, `totalOverstockValue`, `healthScore.inventory.deadStockValue`

ฟิลด์ที่ระบบดู: dead capital → `productName`, `remaining`, `tiedValue`, `lastSold`, `neverSold`, `daysInactive`; overstock → `currentStock`, `maxStock`, `overstockQty`, `capitalValue`

---

### ▸ ทำไม (Why)
มีสินค้าไม่ขยับนาน (`daysInactive` สูง หรือ `neverSold = true`) ทำให้เงินทุนจมอยู่ในของที่ขายไม่ออก ระบบรวมมูลค่าเป็น `tiedValue` ต่อชิ้นและ `totalDeadCapitalValue` รวม

### ▸ ผลต่อธุรกิจ (Business impact)
ทุนจม = เงินที่จ่ายซื้อของไปแล้วแต่ยังไม่กลับมาเป็นยอดขาย กินพื้นที่เก็บ และ `deadStockValue` ดึงคะแนน `healthScore.inventory` ลง

### ▸ ความเสี่ยง (Risk)
- ยิ่งเก็บนาน ของยิ่งเสื่อม/ตกรุ่น ขายได้ราคาต่ำลง
- เงินทุนที่ควรหมุนไปสินค้าขายดี ติดอยู่กับของไม่ขยับ
- overstock (`overstockQty` เกิน `maxStock`) = ซื้อเกินความต้องการจริง

### ▸ โอกาส (Opportunity)
ระบายของค้างออก = ปลดเงินทุน `tiedValue` กลับมาหมุน + เคลียร์พื้นที่เก็บ + ลดความเสี่ยงของหมดอายุ

### ▸ ทางเลือกอื่น (Alternative choices)
1. **ลดราคา/จัดโปร** เพื่อเร่งระบาย
2. **จับคู่ขายพ่วง** กับสินค้าขายดี
> การ markdown ราคาอัตโนมัติจาก Copilot — ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ต้องไปตั้งโปรเอง)

### ▸ ขั้นต่อไป (Next step)
- ดูรายการของค้างเป็นทางการ: **รายงาน › มูลค่าสต็อก & สินค้าค้าง** (`/reports/inventory-value`) → ดูสินค้าหมุนช้า 30/60/90 วัน → ตัดสินใจลดราคา/เคลียร์ → Export Excel ได้
- ตั้งโปรระบาย: **โปรโมชั่น** (`/promotions`) → "+ สร้างโปรโมชั่น" → เลือกชนิด (%, บาท, ซื้อครบลด, ซื้อแถม, คอมโบ) → กำหนดสินค้า+ช่วงเวลา → "เปิดใช้งาน"

### ▸ ผลที่คาดหวัง (Expected outcome)
ขายของค้างออก → `remaining` ลด → `tiedValue` / `totalDeadCapitalValue` ลด → `deadStockValue` ลด → คะแนน `healthScore.inventory` ดีขึ้น

> ถาม Copilot ได้ด้วยคำว่า: `สต็อก`, `inventory` → ในคำตอบจะมีส่วน dead capital พ่วงมาด้วย

---

# ═══════════════════════════════════════
# คำแนะนำประเภทที่ 4 — เติมต้นทุนสินค้าที่หายไป (FIX MISSING COST)
# ═══════════════════════════════════════

**จุดชนวน (CopilotOverview):**
`healthScore.inventory.missingCostCount` + `healthScore.finance.missingCostLines`
และ `moneyIntelligence.dataQualityNotes[]` (คำเตือนเรื่องข้อมูลไม่ครบ)

---

### ▸ ทำไม (Why)
มีสินค้าหรือบรรทัดขายที่ **ไม่มีราคาทุน** (`missingCostCount` / `missingCostLines`) ทำให้ระบบคำนวณกำไรได้ไม่ครบ และจะมีคำเตือนใน `dataQualityNotes`

### ▸ ผลต่อธุรกิจ (Business impact)
ไม่มีต้นทุน = คำนวณ COGS (`moneyIntelligence.cogs`) ผิด → `grossProfit`, `grossMargin`, `netProfit`, `netMargin` เพี้ยน → ตัวเลขกำไรในรายงานเชื่อไม่ได้

### ▸ ความเสี่ยง (Risk)
- ตัดสินใจตั้งราคา/ทำโปรจากกำไรปลอม → อาจขายขาดทุนโดยไม่รู้ตัว
- รายงาน P&L และ Summary แสดงกำไรสูงเกินจริง
- `dataQualityNotes` เตือนว่าข้อมูลการเงินบางส่วนไม่น่าเชื่อถือ

### ▸ โอกาส (Opportunity)
เติมต้นทุนครบ = ตัวเลขกำไรจริง = วางแผนราคา/โปรได้แม่นยำ และคะแนน `healthScore.finance` สะท้อนความจริง

### ▸ ทางเลือกอื่น (Alternative choices)
1. แก้ต้นทุนทีละตัวในหน้าสินค้า
2. นำเข้า/อัปเดตหลายตัวพร้อมกันผ่าน Excel (SKU ซ้ำจะอัปเดตตัวเดิมให้)

### ▸ ขั้นต่อไป (Next step)
- แก้รายตัว: **สินค้า › รายการสินค้า** (`/products`) → เปิดสินค้า → "แก้ไข" → กรอก **ราคาทุน** → "บันทึก"
- แก้ทีละมาก: **สินค้า › รายการสินค้า** → "นำเข้า Excel" → ดาวน์โหลด Template → กรอกต้นทุน → อัปโหลด → ยืนยัน
- เช็กผลที่: **รายงาน › กำไรขาดทุน (P&L)** (`/finance/pnl`)

### ▸ ผลที่คาดหวัง (Expected outcome)
เติมต้นทุนครบ → `missingCostCount` / `missingCostLines` ลดเหลือ 0 → `cogs` คำนวณครบ → `grossMargin` / `netMargin` ตรงความจริง → `dataQualityNotes` ลดคำเตือน

> เคล็ด: ในคู่มือระบุชัด — "ราคาทุนมีผลต่อการคำนวณกำไรในรายงาน ต้องกรอกให้ถูกต้อง"

---

# ═══════════════════════════════════════
# คำแนะนำประเภทที่ 5 — เคลียร์ใบรับสินค้าค้าง (APPROVE RECEIPT)
# ═══════════════════════════════════════

**จุดชนวน (CopilotOverview):**
`healthScore.operations.pendingReceiptsCount`
และ `purchasingIntelligence.pendingPOCount`, `pendingPOValue`

> เชื่อมโยงกับสต็อก: `reorderRecommendations[].hasPendingPO` / `pendingPOQty` — ถ้ามีของกำลังเข้า ระบบจะแนะนำให้ "รอ PO" แทนการสั่งซ้ำ

---

### ▸ ทำไม (Why)
มีใบรับสินค้า (GRN) ที่ยังค้างไม่ได้ยืนยัน (`pendingReceiptsCount`) และ/หรือ PO ที่สั่งแล้วแต่ยังไม่ปิด (`pendingPOCount`, `pendingPOValue`)

### ▸ ผลต่อธุรกิจ (Business impact)
ของมาถึงแต่ยังไม่ยืนยันรับ = **สต็อกในระบบต่ำกว่าความจริง** → ระบบอาจเตือนให้สั่งซื้อซ้ำทั้งที่ของมีอยู่แล้ว และ `pendingPOValue` คือเงินที่ผูกไว้กับของที่ยังไม่เข้าระบบ

### ▸ ความเสี่ยง (Risk)
- สั่งซื้อซ้ำซ้อนเพราะระบบไม่เห็นของที่มาถึงแล้ว
- ตัวเลขสต็อกผิด กระทบการตัดสินใจ reorder ทั้งกระดาน
- `pendingReceiptsCount` สูง → คะแนน `healthScore.operations` ตก

### ▸ โอกาส (Opportunity)
ยืนยันรับของให้ครบ = สต็อกตรงความจริง = คำแนะนำ reorder ทั้งหมดแม่นยำขึ้น และปิดวงจรจัดซื้อ → รับ → ขาย

### ▸ ทางเลือกอื่น (Alternative choices)
1. ยืนยันรับของที่ผูกกับ PO เดิม (เลือก PO ตอนสร้าง GRN)
2. รับของแบบไม่มี PO (กรอกรายการเอง)
> Copilot กดยืนยันรับของแทนไม่ได้ — ต้องทำในหน้า GRN เอง

### ▸ ขั้นต่อไป (Next step)
- **จัดซื้อ / รับสินค้า › รับสินค้าเข้า** (`/warehouse/receive`) → "สร้างใบรับสินค้าใหม่" หรือเปิดใบที่ค้าง → เดินทีละขั้น (Step 1 เลือกสินค้า → Step 2 ตรวจจำนวน → Step 3 ปิดใบ) → "ยืนยันรับสินค้า" → สต็อกเพิ่มทันที
- ตรวจ PO ที่ค้าง: **จัดซื้อ › การสั่งซื้อ** (`/purchases`)

### ▸ ผลที่คาดหวัง (Expected outcome)
ยืนยันรับครบ → `pendingReceiptsCount` ลด → สต็อกในระบบตรงของจริง → `reorderRecommendations` ที่เคยเป็น `wait_for_po` อัปเดต → `pendingPOValue` ลด → คะแนน `healthScore.operations` ดีขึ้น

> ถาม Copilot ได้ด้วยคำว่า: `ซื้อ`, `สั่งซื้อ`, `ซัพ`, `supplier`, `po`, `ต้นทุน` → คืน pending POs, ซัพพลายเออร์, cost changes

---

# ═══════════════════════════════════════
# คำแนะนำประเภทที่ 6 — ลดค่าใช้จ่าย (REDUCE EXPENSE)
# ═══════════════════════════════════════

**จุดชนวน (CopilotOverview):**
`moneyIntelligence.operatingExpenses`, `netProfit`, `netMargin`
เทียบกับ `moneyIntelligence.revenue`, `grossProfit`, `grossMargin`
และ `healthScore.finance.netProfit`, `netMargin`, `score`

---

### ▸ ทำไม (Why)
เมื่อ `operatingExpenses` สูงเทียบกับ `grossProfit` จน `netMargin` บางหรือ `netProfit` ติดลบ ระบบจะสะท้อนผ่านคะแนน `healthScore.finance` ที่ต่ำ — สัญญาณว่าค่าใช้จ่ายกินกำไร

### ▸ ผลต่อธุรกิจ (Business impact)
ขายดี (`revenue` สูง, `grossMargin` ดี) แต่ค่าใช้จ่ายดำเนินงานสูง → กำไรสุทธิ (`netProfit`) หาย ร้านอาจขาดทุนทั้งที่ยอดขายดูดี

### ▸ ความเสี่ยง (Risk)
- `netMargin` บางลงเรื่อย ๆ → ร้านเปราะต่อเดือนที่ยอดตก
- `netProfit` ติดลบต่อเนื่อง = เงินสดหด
- คะแนน `healthScore.finance` ต่ำดึง `overall` ลง

### ▸ โอกาส (Opportunity)
ตัดค่าใช้จ่ายที่ไม่จำเป็น = กำไรสุทธิเพิ่มทันทีโดยไม่ต้องเพิ่มยอดขาย (กำไรทุกบาทที่ประหยัดได้ ตกถึงบรรทัดสุดท้ายเต็ม ๆ)

### ▸ ทางเลือกอื่น (Alternative choices)
1. ลดค่าใช้จ่ายฝั่ง operating (ค่าเช่า/ค่าน้ำไฟ/เงินเดือน/อื่น ๆ)
2. เพิ่มฝั่งกำไรขั้นต้นแทน — ดันยอด (ดูคำแนะนำ reorder/โปร) หรือดูแลต้นทุนให้ `grossMargin` ดีขึ้น
> การวิเคราะห์ค่าใช้จ่ายแยกหมวดเชิงลึก/ตั้งงบประมาณ — ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (Copilot ดูได้แค่ยอดรวม operatingExpenses ไม่มี breakdown รายหมวดใน type)

### ▸ ขั้นต่อไป (Next step)
- บันทึก/ตรวจค่าใช้จ่าย: **รายงาน › บันทึกรายจ่าย** (`/finance/expenses`) → "+ เพิ่มรายจ่าย" → เลือกหมวด (ค่าเช่า/น้ำไฟ/เงินเดือน/อื่น ๆ) → ใส่ยอด+วันที่ → "บันทึก" (สะท้อนใน P&L ทันที)
- ดูภาพรวมกำไร-ขาดทุน: **รายงาน › กำไรขาดทุน (P&L)** (`/finance/pnl`)
- ดูสรุปหลายเดือน: **รายงาน › รายงานสรุป** (`/reports/summary`)

### ▸ ผลที่คาดหวัง (Expected outcome)
ลดค่าใช้จ่าย → `operatingExpenses` ลด → `netProfit` เพิ่ม → `netMargin` กว้างขึ้น → คะแนน `healthScore.finance` ดีขึ้น

> ถาม Copilot ได้ด้วยคำว่า: `กำไร`, `profit`, `margin`, `ขาดทุน` → คืน P&L (7 วัน + วันนี้), gross/net/operating, ป้ายสถานะ

---

# ═══════════════════════════════════════
# 3. ความเสี่ยง & โอกาส แบบรวม (RISKS & OPPORTUNITIES)
# ═══════════════════════════════════════

นอกจากคำแนะนำเฉพาะเรื่อง Copilot ยังมี 2 รายการรวมที่อิงข้อมูลตรง ๆ:

### ความเสี่ยง (`risks[]`)
แต่ละความเสี่ยงมี: `category` (inventory | finance | operations | customer | purchasing), `severity` (critical | high | medium | low), `title`, `description`, `impact`, `action`, `value`
- ถาม: `risk`, `ปัญหา`, `ความเสี่ยง` → คืน 5 อันดับแรก (แสดงเฉพาะหัวข้อ จัดตาม severity)
- `actionRoute` ของบางความเสี่ยงอาจไม่มีลิงก์ → ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้สำหรับรายการนั้น

### โอกาส (`opportunities[]`)
แต่ละโอกาสมี: `category` (sales | inventory | finance | customer | purchasing), `title`, `description`, `metric`, `recommendation`, `value`
- ถาม: `โอกาส`, `เติบโต`, `opportunity`, `grow` → คืนทั้งหมด พร้อม metric + recommendation
- `metric` ของบางโอกาสอาจไม่มีตัวเลขกำกับ → ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้สำหรับรายการนั้น

---

# ═══════════════════════════════════════
# 4. คำถามต่อเนื่องที่ Copilot รองรับ (Follow-ups)
# ═══════════════════════════════════════

Copilot จำ "เรื่องล่าสุด + รายการล่าสุด (ไม่เกิน 3)" ได้ จึงตอบคำถามต่อเนื่องได้:

| ถามต่อว่า | ระบบทำอะไร |
|---|---|
| `ถ้าไม่ทำ` / what happens if ignored | บอกผลกระทบตามบริบท (ของหมด, หนี้เสีย, ยอดที่เสียไป, ไทม์ไลน์) — intent **consequence** |
| `ควรทำวันนี้ไหม` / how urgent | แสดงป้าย 🔴 Now / 🟡 Today / 🟢 Week — intent **urgency** (ต้องมีรายการอยู่ในบริบทก่อน) |
| `ใครแก้...` / who changed | ดึง Activity Logs: การแก้ราคา, การลบ, การแก้สำคัญ (before → after) — intent **activity** |
| `วิธีทำ...` / how to | ค้นคู่มือในระบบ คืนขั้นตอน + เคล็ด (เนื้อหาเป็นภาษาไทย) — intent **help** |

> **ดู Activity แบบเต็ม:** **ตั้งค่าร้านค้า › บันทึกกิจกรรม** (`/settings/activity-logs`) → ไทม์ไลน์ใหม่สุดก่อน → กรองตามหมวด/ความสำคัญ/คำค้น → คลิกการ์ดดู before/after

---

# ═══════════════════════════════════════
# 5. ขอบเขตที่ Copilot ทำไม่ได้ (ต้องบอกผู้ใช้ให้ชัด)
# ═══════════════════════════════════════

เพื่อความซื่อตรง — สิ่งเหล่านี้ **Copilot ทำไม่ได้** อย่าคาดหวัง:

- **ลงมือทำแทนไม่ได้** — สร้าง PO / ปรับสต็อก / ส่งใบแจ้งหนี้ / อนุมัติรับของ / รับชำระเงิน ตอบ "Coming soon" → ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้
- **จัดอันดับสินค้าขายดีรายตัวไม่ได้** — `CopilotOverview` ไม่มีฟิลด์ยอดขายรายสินค้า; "ขายดี" ใช้ `avgDailySales` จาก urgent reorders เป็นตัวแทน (ไม่ใช่อันดับยอดขายจริง) → ดูจริงที่ **รายงาน › รายงานสรุป** (`/reports/summary`)
- **คุยนอกเรื่องไม่ได้** — ต้องตรงคำค้น 15 หมวด ถ้าไม่ตรงจะตกไป fallback (พร้อมปุ่มหัวข้อให้เลือก 6 ปุ่ม)
- **ไม่มีแนวโน้มยาวกว่า 7 วัน** — `summary` และ `moneyIntelligence` เป็น snapshot ไม่มี 30 วัน / YoY → ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้
- **กรองตามวันที่/พนักงาน/หมวด เองไม่ได้** — มีแค่ "วันนี้" กับ "7 วันล่าสุด" (activity ใช้ today) → ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้
- **เนื้อหาคู่มือเป็นภาษาไทยเท่านั้น** — ถามเป็นอังกฤษจะได้ fallback ไม่มีขั้นตอนละเอียด
- **อธิบายสูตรคำนวณคะแนน priority ไม่ได้** — บอกได้แค่ `reason` ว่าทำไมสำคัญ ไม่ใช่วิธีคิด `score` → ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้

---

# ═══════════════════════════════════════
# 6. หมายเหตุคุณภาพข้อมูล (Data Quality)
# ═══════════════════════════════════════

ฟิลด์ที่ **อาจว่าง/เป็น null** — ตีความคำแนะนำด้วยความระวังเมื่อเจอ:

- `CopilotRisk.actionRoute` — ความเสี่ยงบางอันไม่มีลิงก์ไปหน้า UI
- `CopilotOpportunity.metric` — โอกาสบางอันไม่มีตัวเลขกำกับ
- `CopilotDeadCapitalItem.lastSold` — null ถ้าไม่เคยขาย (`neverSold = true`)
- `CopilotAction.impactValue`, `badge` — เป็น optional อาจไม่มี
- `moneyIntelligence.dataQualityNotes[]` — **อ่านก่อนเสมอ** เป็นคำเตือนว่าข้อมูลส่วนไหนไม่น่าเชื่อถือ (เช่น ต้นทุนสินค้าหาย, ใบรับของยังไม่ครบ)

> ทุกคำแนะนำสดใหม่แค่ไหน ดูได้จาก `generatedAt` (เวลาที่ดึงข้อมูล) — ถ้านานแล้วให้รีเฟรช

---

*จบเอกสาร — โมเดลการให้เหตุผลนี้อิง `CopilotOverview` ทั้งหมด ทุกคำแนะนำผูกกับข้อมูลจริงในร้าน และทุกขั้นตอนชี้ไปเมนูที่มีอยู่จริงในระบบ*
