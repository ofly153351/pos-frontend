# AI Copilot — ชุดทดสอบ Regression (AI Chat Test Cases)

> **วัตถุประสงค์:** ชุดคำถามทดสอบ Copilot (แท็บ "ถามระบบ" / Ask System) สำหรับรันซ้ำทุกครั้งที่แก้ router หรือ intent
> **ภาษาหลัก:** ไทย (เจ้าของร้านเป็นคนไทย) — ผสมอังกฤษ/คำแสลง/พิมพ์ผิด เพื่อทดสอบ keyword router จริง
> **เครื่องยนต์:** Copilot ใช้ **deterministic keyword router** (ไม่มี LLM) — ตอบจากข้อมูล `CopilotOverview` ที่ดึงจาก `/api/stores/{storeId}/copilot` ครั้งเดียว
> **อัปเดตล่าสุด:** 2026-06-30

---

## วิธีอ่านตาราง

| คอลัมน์ | ความหมาย |
|---------|----------|
| **#** | เลขลำดับ test case |
| **Question** | คำถามจริงที่ผู้ใช้พิมพ์ (ไทย / EN / แสลง / พิมพ์ผิด) |
| **Intent** | intent ที่ router ควร match (จาก 17 intent จริง) |
| **Expected answer** | สิ่งที่ Copilot ควรตอบ (อิงข้อมูลที่มีจริงเท่านั้น) |
| **Expected follow-up** | ปุ่ม/คำถามต่อที่ควรเสนอ |
| **Required data** | field ใน `CopilotOverview` ที่ต้องมีเพื่อตอบ |
| **Confidence** | สูง/กลาง/ต่ำ — ความมั่นใจของคำตอบ deterministic |
| **Priority** | P1 (ต้องผ่านเสมอ) / P2 (สำคัญ) / P3 (ขอบ/edge) |

> **หมายเหตุขอบเขต:** Copilot ตอบได้เฉพาะ intent ที่อยู่ในรายการนี้ คำถามที่ไม่ match keyword จะตกไป `fallback` คำถามสั่งให้ "ทำ" (สร้าง PO / ปรับสต็อก / ส่งใบแจ้งหนี้) จะได้คำตอบ "เร็ว ๆ นี้" (Coming soon) เพราะ Copilot สั่งงานจริงไม่ได้

---

## INTENT ที่รองรับจริง (17 ตัว)

`greeting` · `thanks` · `sales` · `profit` · `stock` · `aging` · `stock+purchasing` · `risks` · `opportunities` · `priorities/actions` · `overview` · `best-sellers` · `consequence` · `urgency` · `activity` · `help` · `fallback`

---

# ส่วนที่ 1 — SALES (ยอดขาย)

> Intent: `sales` · Keywords: ยอด, ขาย, revenue, sales
> ข้อมูลจาก `summary`: revenue, revenueChange, orders, averageOrderValue, revenueToday, profitToday, revenueTodayChange

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 1 | ยอดขาย 7 วันเท่าไหร่ | sales | รายได้ 7 วัน + % เทียบช่วงก่อน + ยอดวันนี้ + AOV + จำนวนออเดอร์ | "ดูกำไร?" / "สินค้าขายดี?" | summary.revenue, revenueChange, orders, averageOrderValue | สูง | P1 |
| 2 | วันนี้ขายได้กี่บาท | sales | ยอดวันนี้ (revenueToday) + % เทียบเมื่อวาน + กำไรวันนี้ | "เทียบ 7 วัน?" | summary.revenueToday, profitToday, revenueTodayChange | สูง | P1 |
| 3 | sales | sales | สรุปยอด 7 วัน + วันนี้ + AOV + ออเดอร์ | "กำไร?" | summary.* | สูง | P1 |
| 4 | revenue last week | sales | รายได้ 7 วัน + % change + AOV + order count | "profit?" | summary.revenue, revenueChange | สูง | P1 |
| 5 | ยอดขายเป็นไงบ้าง | sales | สรุปยอด 7 วัน + วันนี้ + แนวโน้ม % | "ภาพรวมร้าน?" | summary.* | สูง | P2 |
| 6 | ขายดีมั้ยช่วงนี้ | sales | ยอด 7 วัน + revenueChange บอกขึ้น/ลง | "สินค้าขายดี?" | summary.revenue, revenueChange | กลาง | P2 |
| 7 | ออเดอร์วันนี้กี่บิล | sales | จำนวนออเดอร์ (orders) + ยอดวันนี้ | "ค่าเฉลี่ยต่อบิล?" | summary.orders, revenueToday | สูง | P2 |
| 8 | บิลเฉลี่ยเท่าไหร่ | sales | AOV (averageOrderValue) | "ยอดรวม?" | summary.averageOrderValue | สูง | P2 |
| 9 | ยอดขายตกมั้ย | sales | revenueChange บอกบวก/ลบ + ตัวเลขเทียบ | "ทำไมตก?" → opportunities | summary.revenueChange, previousRevenue | กลาง | P2 |
| 10 | ยอดดขาย 7 วัน (พิมพ์ผิด) | sales | สรุปยอด 7 วัน (keyword "ยอด"+"ขาย" ยัง match) | "กำไร?" | summary.* | กลาง | P2 |
| 11 | how much did we sell | sales | revenue 7d + today snapshot | "profit?" | summary.revenue | สูง | P2 |
| 12 | ยอดวันนี้ vs เมื่อวาน | sales | revenueToday + revenueTodayChange % | "7 วัน?" | summary.revenueToday, revenueTodayChange | สูง | P2 |
| 13 | total sales | sales | revenue 7 วัน + AOV + orders | "best sellers?" | summary.* | สูง | P3 |
| 14 | ยอดขายเดือนนี้ | sales | ⚠️ ตอบ 7 วัน + แจ้งว่า Copilot มีเฉพาะ snapshot 7 วัน/วันนี้ → แนะนำไป รายงานสรุป | "เปิดรายงานสรุป?" | summary.* (ไม่มี 30d) | กลาง | P1 |
| 15 | ยอดขายปีที่แล้วเทียบปีนี้ | sales | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี YoY) → แนะนำ รายงานสรุป | "เปิดรายงานสรุป?" | — (ไม่มี trend) | สูง | P1 |
| 16 | ขายได้เท่าไหร่อะ | sales | สรุปยอด 7 วัน + วันนี้ | "กำไร?" | summary.* | กลาง | P3 |
| 17 | เซลล์เป็นไง | sales | ยอด 7 วัน + แนวโน้ม | "ภาพรวม?" | summary.* | กลาง | P3 |
| 18 | ยอดขายแยกตามพนักงาน | sales | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (Copilot ไม่ slice ตามพนักงาน) | "ดูยอดรวม?" | — | สูง | P1 |
| 19 | ยอดขายแยกตามสาขา | sales | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี per-branch ใน Copilot) | "ยอดรวมร้าน?" | — | สูง | P2 |
| 20 | กำไรวันนี้ (มาทาง sales) | sales/profit | profitToday + กำไรสุทธิ | "P&L 7 วัน?" | summary.profitToday | สูง | P2 |

---

# ส่วนที่ 2 — PROFIT / FINANCE (กำไร / การเงิน)

> Intent: `profit` · Keywords: กำไร, profit, finance, margin, ขาดทุน
> ข้อมูลจาก `moneyIntelligence`: revenue, refunds, cogs, grossProfit, grossMargin, operatingExpenses, netProfit, netMargin + `summary.profitToday`

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 21 | กำไรเท่าไหร่ | profit | P&L 7 วัน: gross/net/operating + กำไรวันนี้ + ป้ายสถานะ | "ขายดี?" / "ลูกหนี้?" | moneyIntelligence.grossProfit, netProfit | สูง | P1 |
| 22 | profit | profit | P&L snapshot + margins + status badge | "revenue?" | moneyIntelligence.* | สูง | P1 |
| 23 | margin เท่าไหร่ | profit | grossMargin + netMargin % | "กำไรสุทธิ?" | moneyIntelligence.grossMargin, netMargin | สูง | P1 |
| 24 | ร้านขาดทุนมั้ย | profit | netProfit บวก/ลบ + ป้ายสถานะ (กำไร/ขาดทุน) | "ทำไมขาดทุน?" → risks | moneyIntelligence.netProfit, netMargin | สูง | P1 |
| 25 | กำไรขั้นต้นเท่าไหร่ | profit | grossProfit + grossMargin % | "กำไรสุทธิ?" | moneyIntelligence.grossProfit, grossMargin | สูง | P2 |
| 26 | กำไรสุทธิ | profit | netProfit + netMargin % | "ค่าใช้จ่าย?" | moneyIntelligence.netProfit | สูง | P1 |
| 27 | ต้นทุนขายเท่าไหร่ | profit | cogs (ต้นทุนขาย) | "กำไรขั้นต้น?" | moneyIntelligence.cogs | สูง | P2 |
| 28 | ค่าใช้จ่ายดำเนินงานเท่าไหร่ | profit | operatingExpenses | "กำไรสุทธิ?" | moneyIntelligence.operatingExpenses | สูง | P2 |
| 29 | how profitable are we | profit | net/gross margin + status | "expenses?" | moneyIntelligence.* | สูง | P2 |
| 30 | กำไรดีมั้ย | profit | netMargin + ป้ายสถานะ | "ภาพรวม?" | moneyIntelligence.netMargin | กลาง | P2 |
| 31 | กำใร (พิมพ์ผิด) | profit | P&L snapshot ("กำ"... ไม่ match → อาจตก fallback) ⚠️ ทดสอบขอบ | (fallback 6 ปุ่ม) | — | ต่ำ | P3 |
| 32 | กำไรเท่าไหร่วันนี้ | profit | profitToday + P&L 7 วัน | "7 วัน?" | summary.profitToday | สูง | P2 |
| 33 | finance summary | profit | P&L: revenue−cogs=gross−opex=net + margins | "P&L page?" | moneyIntelligence.* | สูง | P2 |
| 34 | ยอดคืนเงินเท่าไหร่ | profit | refunds (ยอดคืน) | "กำไรสุทธิ?" | moneyIntelligence.refunds | กลาง | P2 |
| 35 | กำไรเดือนนี้ | profit | ⚠️ ตอบ 7 วัน + แจ้ง snapshot เท่านั้น → แนะนำ P&L page | "เปิด P&L?" | moneyIntelligence.* | กลาง | P1 |
| 36 | กำไรปีนี้ | profit | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี YoY) → แนะนำ P&L | "เปิด P&L?" | — | สูง | P2 |
| 37 | ทำไมขาดทุน | profit/risks | netProfit ลบ + อาจโยงไป risks (ต้นทุนหาย/ส่วนลด) | "ดูความเสี่ยง?" | moneyIntelligence.netProfit, finance.missingCostLines | กลาง | P1 |
| 38 | margin สินค้าตัวไหนดีสุด | profit | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี margin รายสินค้า) → รายงานสรุป | "เปิดรายงาน?" | — | สูง | P1 |
| 39 | ยอดขายหักต้นทุนเหลือเท่าไหร่ | profit | grossProfit = revenue − cogs | "กำไรสุทธิ?" | moneyIntelligence.grossProfit | สูง | P2 |
| 40 | เงินเข้ากระเป๋าจริงเท่าไหร่ | profit | netProfit (กำไรสุทธิ) | "ค่าใช้จ่าย?" | moneyIntelligence.netProfit | กลาง | P3 |

---

# ส่วนที่ 3 — STOCK / INVENTORY (สต็อก / คลังสินค้า)

> Intent: `stock` · Keywords: สต็อก, สินค้า, inventory, reorder, หมด, ใกล้หมด
> ข้อมูลจาก `healthScore.inventory` + `inventoryIntelligence`: outOfStockCount, lowStockCount, urgentReorders[], topDeadCapital[], overstockItems[]

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 41 | สินค้าใกล้หมดมีอะไรบ้าง | stock | จำนวน out-of-stock + low-stock + urgent reorders (top 3) + คำแนะนำคลัง | "สั่งซื้อ?" / "ทุนจม?" | inventory.outOfStockCount, lowStockCount, urgentReorders | สูง | P1 |
| 42 | สต็อกหมดกี่ตัว | stock | outOfStockCount + lowStockCount | "ตัวไหนบ้าง?" | inventory.outOfStockCount | สูง | P1 |
| 43 | ต้องสั่งของอะไรบ้าง | stock | urgentReorders top 3 (ชื่อ + วันคงเหลือ + จำนวนแนะนำสั่ง) | "ดูซัพพลายเออร์?" | inventoryIntelligence.urgentReorders | สูง | P1 |
| 44 | reorder | stock | urgent reorders top 3 + reorder qty | "create PO?" → "เร็ว ๆ นี้" | inventoryIntelligence.urgentReorders | สูง | P1 |
| 45 | inventory | stock | out/low stock count + reorders + dead capital | "warehouse?" | inventory.* | สูง | P1 |
| 46 | ของหมดมีอะไร | stock | outOfStockCount + รายการ urgent reorder | "สั่งซื้อ?" | inventory.outOfStockCount | สูง | P1 |
| 47 | สต๊อก (พิมพ์ผิด) | stock | ⚠️ "สต๊อก" อาจไม่ match "สต็อก" → ทดสอบขอบ; ถ้ามี "สินค้า"/"หมด" ในประโยคจะ match | (อาจ fallback) | inventory.* | ต่ำ | P3 |
| 48 | ทุนจมเท่าไหร่ | stock | topDeadCapital + totalDeadCapitalValue | "ลดราคา?" | inventoryIntelligence.topDeadCapital, totalDeadCapitalValue | สูง | P1 |
| 49 | สินค้าค้างสต็อกตัวไหน | stock | topDeadCapital top รายการ (ชื่อ + มูลค่าจม + ขายล่าสุด) | "รายงานมูลค่าสต็อก?" | inventoryIntelligence.topDeadCapital | สูง | P2 |
| 50 | what should I restock | stock | urgent reorders top 3 | "suppliers?" | inventoryIntelligence.urgentReorders | สูง | P2 |
| 51 | สินค้าค้างนานสุด | stock | topDeadCapital เรียงตาม daysInactive | "ดูมูลค่าสต็อก?" | inventoryIntelligence.topDeadCapital | สูง | P2 |
| 52 | สต็อกเหลือเยอะไปมั้ย | stock | overstockItems + totalOverstockValue | "ลดสต็อก?" | inventoryIntelligence.overstockItems | สูง | P2 |
| 53 | ของล้นคลังมีอะไร | stock | overstockItems (ชื่อ + overstockQty + capitalValue) | "ทุนจม?" | inventoryIntelligence.overstockItems | สูง | P2 |
| 54 | ต้นทุนสินค้าหายกี่ตัว | stock | inventory.missingCostCount | "ดูสินค้า?" | inventory.missingCostCount | สูง | P2 |
| 55 | สต็อกสุขภาพดีมั้ย | stock | inventory.score + out/low summary | "ภาพรวมร้าน?" | inventory.score | กลาง | P2 |
| 56 | ของจะหมดในกี่วัน | stock | urgentReorders[].daysOfStock (top รายการ) | "สั่งเท่าไหร่?" | inventoryIntelligence.urgentReorders[].daysOfStock | สูง | P2 |
| 57 | สั่งของตัวนี้เท่าไหร่ดี | stock | reorderRecommendations[].reorderQty + reasonTh | "ซัพพลายเออร์?" | inventoryIntelligence.reorderRecommendations | สูง | P2 |
| 58 | สินค้าตัวไหนขายหมดแล้ว | stock | outOfStockCount + urgent reorders | "สั่งซื้อ?" | inventory.outOfStockCount | สูง | P3 |
| 59 | ปรับสต็อกให้หน่อย | stock/action | "เร็ว ๆ นี้" (Copilot ปรับสต็อกจริงไม่ได้) → แนะนำ ตรวจนับสินค้า | "เปิดตรวจนับ?" | — (no action) | สูง | P1 |
| 60 | สต็อกที่คลังกับหน้าร้านต่างกันมั้ย | stock | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ใน Copilot (ไม่มี breakdown ready vs storage) → แนะนำ สต็อกสินค้า | "เปิดสต็อกสินค้า?" | — | กลาง | P2 |
| 61 | มีของกี่ชิ้นในคลัง | stock | ขณะนี้ระบบยังไม่มีจำนวนรวมทั้งคลังใน Copilot → แนะนำ สต็อกสินค้า | "เปิดสต็อกสินค้า?" | — | กลาง | P3 |
| 62 | สินค้าตัวไหนต้องสั่งด่วนสุด | stock | urgentReorders เรียงตาม severity → ตัวบนสุด | "สั่งซื้อ?" | inventoryIntelligence.urgentReorders[].severity | สูง | P2 |
| 63 | ทุนจมรวมทั้งร้านเท่าไหร่ | stock | totalDeadCapitalValue | "ตัวไหนจมเยอะสุด?" | inventoryIntelligence.totalDeadCapitalValue | สูง | P2 |
| 64 | มูลค่าของล้นคลังรวม | stock | totalOverstockValue | "ตัวไหนล้น?" | inventoryIntelligence.totalOverstockValue | สูง | P3 |

---

# ส่วนที่ 4 — WAREHOUSE (คลัง / แดชบอร์ดคลัง)

> เมนูจริง: แดชบอร์ดคลัง (`/warehouse/overview`), รับสินค้าเข้า (`/warehouse/receive`)
> Copilot ไม่มี intent "warehouse" แยก — คำถามคลังจะ match `stock` หรือ `operations` ผ่าน health/actions

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 65 | คลังมีปัญหาอะไรมั้ย | stock | inventory.score + out/low/dead summary | "ดูความเสี่ยง?" | inventory.score | กลาง | P2 |
| 66 | มีใบรับสินค้าค้างกี่ใบ | priorities/overview | operations.pendingReceiptsCount | "เปิดรับสินค้าเข้า?" | operations.pendingReceiptsCount | สูง | P1 |
| 67 | ใบรับของยังไม่เสร็จ | priorities | pendingReceiptsCount + action route ไป รับสินค้าเข้า | "เปิดรับสินค้า?" | operations.pendingReceiptsCount | สูง | P2 |
| 68 | รับสินค้าเข้าให้หน่อย | action | "เร็ว ๆ นี้" (สั่งงานจริงไม่ได้) → แนะนำเมนู รับสินค้าเข้า | "เปิดรับสินค้าเข้า?" | — | สูง | P1 |
| 69 | โอนสต็อกระหว่างคลังยังไง | help | ค้น help-topics → ⚠️ ไม่มีหัวข้อ Stock Transfer → fallback help list | (รายการหัวข้อ help) | help-topics (ไม่มีหัวข้อนี้) | กลาง | P1 |
| 70 | คลังไหนของเยอะสุด | stock | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ใน Copilot (ไม่มี per-warehouse) → แดชบอร์ดคลัง | "เปิดแดชบอร์ดคลัง?" | — | กลาง | P2 |
| 71 | warehouse overview | stock | สรุปสุขภาพสต็อก (inventory.score) + reorders | "stock detail?" | inventory.* | กลาง | P3 |
| 72 | จุดจัดเก็บไหนเต็ม | stock | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี bin/location capacity) → ตำแหน่งจัดเก็บ | "เปิดตำแหน่งจัดเก็บ?" | — | สูง | P2 |
| 73 | ดูแดชบอร์ดคลังยังไง | help | ค้น help → หัวข้อ Inventory (ดูระดับสต็อก) | (steps + tips) | help-topics Inventory | กลาง | P3 |

---

# ส่วนที่ 5 — FINANCE / ACCOUNTING (การเงิน / บัญชี)

> เมนูจริง: บันทึกรายจ่าย (`/finance/expenses`), กำไรขาดทุน P&L (`/finance/pnl`)
> Copilot ใช้ intent `profit` สำหรับการเงิน; บัญชีเชิงลึก (ledger/journal) ไม่มีใน Copilot

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 74 | ค่าใช้จ่ายเดือนนี้เท่าไหร่ | profit | operatingExpenses (snapshot) + แจ้ง snapshot → แนะนำ บันทึกรายจ่าย | "เปิดบันทึกรายจ่าย?" | moneyIntelligence.operatingExpenses | กลาง | P1 |
| 75 | บันทึกค่าใช้จ่ายยังไง | help | ค้น help → หัวข้อ "บันทึกค่าใช้จ่าย" (steps) | (steps + category list) | help-topics Finance | สูง | P1 |
| 76 | งบกำไรขาดทุน | profit | P&L: revenue−cogs=gross−opex=net + margins | "เปิด P&L page?" | moneyIntelligence.* | สูง | P1 |
| 77 | P&L | profit | P&L snapshot + status badge | "expenses?" | moneyIntelligence.* | สูง | P1 |
| 78 | บัญชีแยกประเภท / ledger | fallback/help | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ใน Copilot (ไม่มี ledger) | (fallback list) | — | สูง | P1 |
| 79 | สมุดรายวัน journal | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ | (fallback list) | — | สูง | P2 |
| 80 | ภาษีซื้อภาษีขายเท่าไหร่ | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ใน Copilot (ไม่มี VAT report) → ดูเอกสาร/ใบกำกับ | (fallback list) | — | สูง | P1 |
| 81 | กระแสเงินสด cash flow | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี cash flow ใน Copilot) | (fallback list) | — | สูง | P2 |
| 82 | บันทึกรายจ่ายหมวดอะไรได้บ้าง | help | ค้น help → ค่าเช่า/ค่าน้ำค่าไฟ/เงินเดือน/อื่นๆ | (category list) | help-topics Finance | สูง | P2 |
| 83 | expenses this week | profit | operatingExpenses snapshot | "P&L?" | moneyIntelligence.operatingExpenses | กลาง | P2 |
| 84 | กำไรหลังหักค่าใช้จ่าย | profit | netProfit + netMargin | "ค่าใช้จ่าย?" | moneyIntelligence.netProfit | สูง | P2 |
| 85 | งบดุล balance sheet | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มีงบดุล) | (fallback list) | — | สูง | P2 |

---

# ส่วนที่ 6 — AGING / CREDIT / DEBTORS (ลูกหนี้ / ขายเชื่อ / ค้างชำระ)

> Intent: `aging` · Keywords: ลูกหนี้, ค้างชำระ, เก็บเงิน, debtor, overdue, credit
> ข้อมูลจาก `moneyIntelligence`: agingBuckets[], agingCustomers[], totalOutstanding, totalOverdue + `operations.overdueCreditCount/Amount`

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 86 | ลูกหนี้ค้างเท่าไหร่ | aging | totalOutstanding + aging buckets (30/60/90/90+) + ลูกหนี้ค้างนานสุด top 3 | "เก็บใคร?" | moneyIntelligence.totalOutstanding, agingBuckets, agingCustomers | สูง | P1 |
| 87 | ใครค้างเงินบ้าง | aging | agingCustomers top 3 (ชื่อ + ยอดค้าง + วันเกินกำหนด) | "เปิดขายเชื่อ?" | moneyIntelligence.agingCustomers | สูง | P1 |
| 88 | เก็บเงินใครก่อนดี | aging | agingCustomers เรียงตาม daysOverdue → ตัวบนสุด | "ดูทั้งหมด?" | moneyIntelligence.agingCustomers[].daysOverdue | สูง | P1 |
| 89 | ค้างชำระเกิน 90 วันมีใคร | aging | agingBuckets "90_plus" + agingCustomers oldestBucket=90+ | "เก็บใคร?" | moneyIntelligence.agingBuckets, agingCustomers | สูง | P1 |
| 90 | overdue | aging | totalOverdue + aging buckets + top overdue customers | "collect?" | moneyIntelligence.totalOverdue | สูง | P1 |
| 91 | credit | aging | outstanding + buckets + customers | "ขายเชื่อ?" | moneyIntelligence.totalOutstanding | สูง | P1 |
| 92 | หนี้เสียมีเท่าไหร่ | aging | bucket 90+ amount + ลูกหนี้เกินกำหนด | "เก็บใคร?" | moneyIntelligence.agingBuckets (90_plus) | กลาง | P2 |
| 93 | ลูกค้าค้างนานสุดคือใคร | aging | agingCustomers[0] (oldestBucket + daysOverdue) | "ทั้งหมด?" | moneyIntelligence.agingCustomers | สูง | P2 |
| 94 | ยอดขายเชื่อค้างรวม | aging | totalOutstanding | "แยกตามอายุ?" | moneyIntelligence.totalOutstanding | สูง | P2 |
| 95 | ลูกหนี้ค้าง 30-60 วันเท่าไหร่ | aging | agingBuckets "30_60" (count + amount) | "60-90?" | moneyIntelligence.agingBuckets (30_60) | สูง | P2 |
| 96 | เปิดบิลเชื่อยังไง | help | ค้น help → "เปิดบิลเชื่อให้ลูกค้า" (steps) | (steps) | help-topics Credit Sales | สูง | P1 |
| 97 | รับชำระหนี้ยังไง | help | ค้น help → "รับชำระหนี้" (steps) | (steps) | help-topics Credit Sales | สูง | P1 |
| 98 | คืนสินค้ายืมทำไง | help | ค้น help → "คืนสินค้ายืม" (steps: restock) | (steps) | help-topics Credit Sales | สูง | P1 |
| 99 | ยืม (loan) ค้างเท่าไหร่ | aging | ⚠️ Copilot รวมเป็น outstanding (aging ไม่แยก loan vs credit) → totalOutstanding | "เปิดขายเชื่อ?" | moneyIntelligence.totalOutstanding | กลาง | P2 |
| 100 | จำนวนลูกหนี้เกินกำหนด | aging | operations.overdueCreditCount + amount | "เก็บใคร?" | operations.overdueCreditCount, overdueCreditAmount | สูง | P2 |
| 101 | who owes me money | aging | top overdue customers + outstanding | "open credit sales?" | moneyIntelligence.agingCustomers | สูง | P2 |
| 102 | ลูกหนี้ค้างชำระ (พิมพ์ปกติ) | aging | full aging summary | "เก็บใคร?" | moneyIntelligence.* | สูง | P1 |
| 103 | เก็บเงินลูกค้า A ให้หน่อย | aging/action | "เร็ว ๆ นี้" (รับชำระจริงไม่ได้) → แนะนำ ขายเชื่อ | "เปิดขายเชื่อ?" | — | สูง | P1 |
| 104 | ส่งใบแจ้งหนี้ให้ลูกหนี้ | action | "เร็ว ๆ นี้" (ส่งจริงไม่ได้) | "เปิดเอกสาร?" | — | สูง | P2 |
| 105 | ลูกหนี้รายไหนใกล้ครบกำหนด | aging | agingBuckets "current" / "30_60" + customers | "ทั้งหมด?" | moneyIntelligence.agingBuckets, agingCustomers | กลาง | P3 |

---

# ส่วนที่ 7 — PURCHASING / SUPPLIERS / PO / GOODS RECEIVING (จัดซื้อ / ซัพพลายเออร์ / ใบสั่งซื้อ / รับสินค้า)

> Intent: `stock+purchasing` · Keywords: ซื้อ, สั่งซื้อ, ซัพ, supplier, po, ต้นทุน
> ข้อมูลจาก `purchasingIntelligence`: supplierMetrics[], concentrationIndex/Risk, totalPurchaseValue, pendingPOCount/Value, costChanges[], singleSupplierProducts, noSupplierProducts

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 106 | ซื้อของเดือนนี้ไปเท่าไหร่ | stock+purchasing | totalPurchaseValue + supplier count + ความเสี่ยงกระจุก + PO ค้าง + top suppliers (3) | "ต้นทุนเปลี่ยน?" | purchasingIntelligence.totalPurchaseValue, supplierMetrics | สูง | P1 |
| 107 | ซัพพลายเออร์เจ้าไหนซื้อเยอะสุด | stock+purchasing | supplierMetrics เรียงตาม totalSpend → top 3 (ชื่อ + spend + share%) | "ดูทั้งหมด?" | purchasingIntelligence.supplierMetrics | สูง | P1 |
| 108 | po ค้างกี่ใบ | stock+purchasing | pendingPOCount + pendingPOValue | "เปิดใบสั่งซื้อ?" | purchasingIntelligence.pendingPOCount, pendingPOValue | สูง | P1 |
| 109 | ต้นทุนสินค้าเปลี่ยนมั้ย | stock+purchasing | costChanges[] (ชื่อ + ต้นทุนเก่า→ใหม่ + % + ซัพ) | "ดูสินค้า?" | purchasingIntelligence.costChanges | สูง | P1 |
| 110 | supplier | stock+purchasing | total spend + supplier count + top suppliers | "po?" | purchasingIntelligence.supplierMetrics | สูง | P1 |
| 111 | po | stock+purchasing | pending PO count/value + total spend | "create PO?" → "เร็ว ๆ นี้" | purchasingIntelligence.pendingPOCount | สูง | P1 |
| 112 | พึ่งซัพเจ้าเดียวเกินไปมั้ย | stock+purchasing | concentrationRisk (low/medium/high) + concentrationIndex | "กระจายซัพ?" | purchasingIntelligence.concentrationRisk, concentrationIndex | สูง | P2 |
| 113 | สินค้าที่มีซัพเจ้าเดียว | stock+purchasing | singleSupplierProducts (จำนวน) | "ดูสินค้า?" | purchasingIntelligence.singleSupplierProducts | สูง | P2 |
| 114 | สินค้าที่ยังไม่มีซัพ | stock+purchasing | noSupplierProducts (จำนวน) | "ผูกซัพ?" | purchasingIntelligence.noSupplierProducts | สูง | P2 |
| 115 | ต้นทุนตัวไหนขึ้นเยอะสุด | stock+purchasing | costChanges เรียงตาม changePct → ตัวบนสุด | "ดูซัพ?" | purchasingIntelligence.costChanges[].changePct | สูง | P2 |
| 116 | ความเสี่ยงซัพพลายเออร์ | stock+purchasing/risks | concentrationRisk + อาจรวม risks category=purchasing | "ดูความเสี่ยงทั้งหมด?" | purchasingIntelligence.concentrationRisk | กลาง | P2 |
| 117 | สร้างใบสั่งซื้อยังไง | help | ค้น help → "สร้างใบสั่งซื้อ" (steps) | (steps) | help-topics Purchasing | สูง | P1 |
| 118 | สร้าง PO ให้หน่อย | action | "เร็ว ๆ นี้" (Copilot สร้าง PO จริงไม่ได้) → แนะนำ การสั่งซื้อ | "เปิดใบสั่งซื้อ?" | — | สูง | P1 |
| 119 | จัดการซัพพลายเออร์ยังไง | help | ค้น help → "จัดการซัพพลายเออร์" (Tax ID 13 หลัก, Net 30) | (steps) | help-topics Purchasing | สูง | P2 |
| 120 | รับสินค้าเข้าคลังยังไง | help | ค้น help → "รับสินค้าเข้าคลัง" (steps + link PO) | (steps) | help-topics Inventory | สูง | P1 |
| 121 | เครดิตเทอมซัพแต่ละเจ้ากี่วัน | stock+purchasing | supplierMetrics[].creditDays | "ดูทั้งหมด?" | purchasingIntelligence.supplierMetrics[].creditDays | สูง | P2 |
| 122 | how much did we buy | stock+purchasing | totalPurchaseValue + top suppliers | "cost changes?" | purchasingIntelligence.totalPurchaseValue | สูง | P2 |
| 123 | ซัพเจ้านี้ขายเราคิดเป็นกี่ % | stock+purchasing | supplierMetrics[].sharePercent | "ทั้งหมด?" | purchasingIntelligence.supplierMetrics[].sharePercent | สูง | P3 |
| 124 | มูลค่า PO ค้างรวม | stock+purchasing | pendingPOValue | "กี่ใบ?" | purchasingIntelligence.pendingPOValue | สูง | P2 |
| 125 | ซัพเจ้าไหนของแพงขึ้น | stock+purchasing | costChanges[].supplierName + changePct | "ดูทั้งหมด?" | purchasingIntelligence.costChanges | กลาง | P3 |
| 126 | อนุมัติใบสั่งซื้อให้หน่อย | action | "เร็ว ๆ นี้" (อนุมัติจริงไม่ได้) | "เปิดใบสั่งซื้อ?" | — | สูง | P2 |
| 127 | ยืนยันรับสินค้าให้หน่อย | action | "เร็ว ๆ นี้" (ยืนยันรับจริงไม่ได้) → แนะนำ รับสินค้าเข้า | "เปิดรับสินค้า?" | — | สูง | P2 |

---

# ส่วนที่ 8 — RISKS (ความเสี่ยง)

> Intent: `risks` · Keywords: risk, issue, problem, ความเสี่ยง, ปัญหา
> ข้อมูลจาก `risks[]`: id, category (inventory|finance|operations|customer|purchasing), severity, title, description, impact, action, value

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 128 | ร้านมีความเสี่ยงอะไรบ้าง | risks | รายการ risks top 5 (title) จัดตาม severity | "อันแรกทำไม?" → consequence | risks[] | สูง | P1 |
| 129 | มีปัญหาอะไรต้องระวัง | risks | risks top 5 จัดกลุ่มตาม severity | "ถ้าไม่ทำจะเป็นไง?" | risks[] | สูง | P1 |
| 130 | risk | risks | top 5 risks by severity | "why?" | risks[] | สูง | P1 |
| 131 | problem | risks | top 5 risks | "what happens if ignored?" | risks[] | สูง | P2 |
| 132 | เสี่ยงตรงไหนบ้าง | risks | risks top 5 + category | "อันไหนด่วนสุด?" → urgency | risks[] | สูง | P2 |
| 133 | ความเสี่ยงด้านการเงิน | risks | risks ที่ category=finance | "ดูทั้งหมด?" | risks[].category | กลาง | P2 |
| 134 | ความเสี่ยงสต็อก | risks | risks ที่ category=inventory | "ทั้งหมด?" | risks[].category | กลาง | P2 |
| 135 | ปัญหาเร่งด่วนที่สุด | risks | risk severity=critical ตัวบนสุด + title | "ถ้าไม่ทำ?" | risks[].severity | สูง | P2 |
| 136 | issue list | risks | top 5 risks | "details?" | risks[] | สูง | P3 |
| 137 | มีอะไรน่าห่วงมั้ย | risks | risks top 5 หรือ "ไม่มีความเสี่ยงเด่น" ถ้า array ว่าง | "ภาพรวม?" | risks[] | กลาง | P2 |
| 138 | ความเสี่ยงลูกค้า | risks | risks ที่ category=customer (เช่นลูกหนี้) | "เก็บเงิน?" | risks[].category | กลาง | P3 |
| 139 | risks ตอนนี้มีกี่อัน | risks | จำนวน risks ทั้งหมด + top 5 | "อันแรก?" | risks[] | กลาง | P3 |

---

# ส่วนที่ 9 — OPPORTUNITIES (โอกาส)

> Intent: `opportunities` · Keywords: opportunity, grow, improve, โอกาส, เติบโต
> ข้อมูลจาก `opportunities[]`: id, category (sales|inventory|finance|customer|purchasing), title, description, metric, recommendation, value

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 140 | มีโอกาสโตตรงไหนบ้าง | opportunities | รายการ opportunities ทั้งหมด (title + metric + recommendation) | "อันไหนคุ้มสุด?" | opportunities[] | สูง | P1 |
| 141 | จะเพิ่มยอดขายยังไง | opportunities | opportunities category=sales (recommendation) | "ดูทั้งหมด?" | opportunities[].category | กลาง | P1 |
| 142 | opportunity | opportunities | all opportunities + metric + recommendation | "which one?" | opportunities[] | สูง | P1 |
| 143 | grow | opportunities | opportunities list | "details?" | opportunities[] | สูง | P2 |
| 144 | improve | opportunities | opportunities list + recommendation | "priorities?" | opportunities[] | สูง | P2 |
| 145 | ทำไงให้กำไรดีขึ้น | opportunities | opportunities category=finance | "ทั้งหมด?" | opportunities[].category | กลาง | P2 |
| 146 | โอกาสเพิ่มกำไร | opportunities | opportunities + recommendation | "ทำอะไรก่อน?" → priorities | opportunities[] | กลาง | P2 |
| 147 | เติบโต | opportunities | opportunities list | "ทั้งหมด?" | opportunities[] | สูง | P3 |
| 148 | มีอะไรให้ปรับปรุงมั้ย | opportunities | opportunities หรือ "ยังไม่พบโอกาสเด่น" ถ้า array ว่าง | "ภาพรวม?" | opportunities[] | กลาง | P2 |
| 149 | โอกาสด้านสินค้า | opportunities | opportunities category=inventory | "ทั้งหมด?" | opportunities[].category | กลาง | P3 |

---

# ส่วนที่ 10 — PRIORITIES / ACTIONS (ควรทำอะไร / สิ่งสำคัญ)

> Intent: `priorities/actions` · Keywords: ทำอะไร, ควรทำ, priority, urgent, สำคัญ
> ข้อมูลจาก `decisionEngine`: topPriority, todayPriorities[], weekPriorities[] + `actions[]`

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 150 | วันนี้ควรทำอะไรก่อน | priorities/actions | today priorities top 3 (action + impact + reason) + week 2 | "ถ้าไม่ทำ?" → consequence | decisionEngine.todayPriorities | สูง | P1 |
| 151 | สิ่งสำคัญที่สุดตอนนี้ | priorities/actions | topPriority (action + reason + urgencyLabel) | "ทำไมอันนี้?" | decisionEngine.topPriority | สูง | P1 |
| 152 | priority | priorities/actions | top 3 today + 2 week priorities | "why this?" | decisionEngine.* | สูง | P1 |
| 153 | urgent | priorities/actions | today priorities (urgent) + impact | "consequence?" | decisionEngine.todayPriorities | สูง | P1 |
| 154 | ทำอะไรดี | priorities/actions | today priorities top 3 | "ทำไม?" | decisionEngine.todayPriorities | สูง | P1 |
| 155 | สัปดาห์นี้ควรโฟกัสอะไร | priorities/actions | weekPriorities + reason | "วันนี้?" | decisionEngine.weekPriorities | สูง | P2 |
| 156 | what should I do today | priorities/actions | today top 3 + reason | "this week?" | decisionEngine.todayPriorities | สูง | P2 |
| 157 | งานด่วนมีอะไร | priorities/actions | actions severity=urgent (title + impact) | "ถ้าไม่ทำ?" | actions[].severity, decisionEngine | สูง | P2 |
| 158 | ทำไมอันนี้สำคัญ | priorities/actions | decisionEngine.reason ของ topPriority | "อันต่อไป?" | decisionEngine.topPriority.reason | กลาง | P2 |
| 159 | มีอะไรต้องทำมั้ย | priorities/actions | today priorities หรือ "วันนี้ยังไม่มีงานด่วน" ถ้าว่าง | "ภาพรวม?" | decisionEngine.todayPriorities | กลาง | P2 |
| 160 | งานสำคัญทั้งหมด | priorities/actions | today + week priorities | "details?" | decisionEngine.* | สูง | P3 |
| 161 | ควรเริ่มจากตรงไหน | priorities/actions | topPriority + reason | "อันต่อไป?" | decisionEngine.topPriority | กลาง | P3 |

---

# ส่วนที่ 11 — OVERVIEW / HEALTH (ภาพรวม / สุขภาพร้าน)

> Intent: `overview` · Keywords: overview, health, ภาพรวม, สุขภาพ, สรุป
> ข้อมูลจาก `healthScore`: overall + sales/inventory/finance/operations scores + `summary`

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 162 | ภาพรวมร้านเป็นไง | overview | คะแนนรวม 0-100 + ยอดวันนี้ + สรุปสต็อก/ความเสี่ยง + สถานะกำไร | "ทำอะไรก่อน?" → priorities | healthScore.overall, summary | สูง | P1 |
| 163 | สุขภาพร้านดีมั้ย | overview | overall score + 4 ด้านย่อย | "ดูความเสี่ยง?" | healthScore.* | สูง | P1 |
| 164 | สรุปให้หน่อย | overview | business score + today snapshot + inventory/risk summary | "priorities?" | healthScore, summary | สูง | P1 |
| 165 | overview | overview | health 0-100 + snapshot + summary | "actions?" | healthScore, summary | สูง | P1 |
| 166 | health | overview | overall + sub-scores | "risks?" | healthScore.* | สูง | P1 |
| 167 | คะแนนสุขภาพร้านเท่าไหร่ | overview | healthScore.overall (0-100) | "ด้านไหนแย่สุด?" | healthScore.overall | สูง | P2 |
| 168 | ร้านโอเคมั้ย | overview | overall score + สถานะกำไร | "มีปัญหาอะไร?" → risks | healthScore.overall | กลาง | P2 |
| 169 | สรุปวันนี้ | overview | snapshot วันนี้ (revenueToday/profitToday) + score | "7 วัน?" | summary, healthScore | สูง | P2 |
| 170 | give me a summary | overview | score + snapshot + inventory/risk | "priorities?" | healthScore, summary | สูง | P2 |
| 171 | ด้านไหนของร้านแย่สุด | overview | sub-score ต่ำสุด (sales/inventory/finance/operations) | "แก้ยังไง?" → opportunities | healthScore.sales/inventory/finance/operations | กลาง | P2 |
| 172 | สุขภาพการเงินเป็นไง | overview/profit | finance.score + netProfit/netMargin | "P&L?" | healthScore.finance | กลาง | P2 |
| 173 | สุขภาพสต็อกเป็นไง | overview/stock | inventory.score + out/low/dead summary | "สั่งซื้อ?" | healthScore.inventory | กลาง | P2 |
| 174 | สุขภาพการขายเป็นไง | overview/sales | sales.score + revenueChange | "ยอดขาย?" | healthScore.sales | กลาง | P3 |
| 175 | สุขภาพการดำเนินงาน | overview | operations.score + pendingReceipts/overdueCredit | "งานด่วน?" | healthScore.operations | กลาง | P3 |

---

# ส่วนที่ 12 — BEST SELLERS (สินค้าขายดี)

> Intent: `best-sellers` · Keywords: ขายดี, top seller, best sell, ฮิต
> ⚠️ ข้อจำกัดสำคัญ: Copilot **ไม่มี per-product sales ranking** — ใช้ `urgentReorders[].avgDailySales` เป็น proxy (สินค้าหมุนเร็ว) เท่านั้น และต้องแจ้งชัดว่าไม่ใช่อันดับยอดขาย → ชี้ไป รายงานสรุป

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 176 | สินค้าขายดีอะไรบ้าง | best-sellers | สินค้าหมุนเร็ว top 5 (จาก avgDailySales) + ⚠️ หมายเหตุ "ไม่ใช่อันดับยอดขายต่อสินค้า" → แนะนำ รายงานสรุป | "เปิดรายงานสรุป?" | inventoryIntelligence.urgentReorders[].avgDailySales | สูง | P1 |
| 177 | top seller | best-sellers | fast-moving top 5 + disclaimer | "open summary report?" | urgentReorders[].avgDailySales | สูง | P1 |
| 178 | สินค้าฮิต | best-sellers | fast-moving proxy + หมายเหตุ + ชี้รายงาน | "เปิดรายงาน?" | urgentReorders[].avgDailySales | สูง | P2 |
| 179 | ตัวไหนขายดีสุด | best-sellers | fast-moving อันดับ 1 (avgDailySales สูงสุด) + disclaimer | "รายงานสรุป?" | urgentReorders[].avgDailySales | กลาง | P1 |
| 180 | best selling product | best-sellers | fast-moving proxy + explicit note not ranking | "summary report?" | urgentReorders[].avgDailySales | สูง | P2 |
| 181 | สินค้าไหนหมุนเร็วสุด | best-sellers | urgentReorders เรียง avgDailySales | "สั่งซื้อ?" | urgentReorders[].avgDailySales | สูง | P2 |
| 182 | อันดับสินค้าขายดี 1-10 | best-sellers | ⚠️ ไม่มี ranking จริง → fast-moving top 5 + แนะนำ รายงานสรุป (ขณะนี้ Copilot ยังไม่มีอันดับยอดขายต่อสินค้า) | "เปิดรายงานสรุป?" | — (no ranking) | สูง | P1 |
| 183 | สินค้าทำเงินสุด | best-sellers | ⚠️ ไม่มี revenue ต่อสินค้า → แนะนำ รายงานสรุป | "เปิดรายงานสรุป?" | — | สูง | P1 |
| 184 | สินค้าขายไม่ออก | stock | ตรงข้าม → topDeadCapital (ทุนจม/ไม่ขยับ) | "ลดราคา?" | inventoryIntelligence.topDeadCapital | สูง | P2 |

---

# ส่วนที่ 13 — CONSEQUENCE (ถ้าไม่ทำจะเป็นไง)

> Intent: `consequence` · Keywords: ถ้าไม่ทำ, what happens if ignored
> ตอบแบบ context-aware จาก topic/item ก่อนหน้า (stockout impact / bad debt / lost revenue / timeline)

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 185 | ถ้าไม่ทำจะเป็นไง | consequence | ผลกระทบตาม context ล่าสุด (เช่น สต็อกหมด→ขาดขาย / ลูกหนี้→หนี้เสีย) + timeline | "ทำยังไง?" | context (last topic/items) | สูง | P1 |
| 186 | what happens if ignored | consequence | fallout based on last topic | "how urgent?" → urgency | context | สูง | P1 |
| 187 | ปล่อยไว้จะเกิดอะไร | consequence | impact ตาม context | "ด่วนแค่ไหน?" | context | กลาง | P2 |
| 188 | ไม่สั่งของจะเป็นไง | consequence | (context=stock) สต็อกหมด→เสียยอดขาย + ประมาณการ | "สั่งเท่าไหร่?" | context (stock), urgentReorders | สูง | P2 |
| 189 | ไม่เก็บหนี้จะเป็นไง | consequence | (context=aging) หนี้เสีย/กระแสเงินสดตึง | "เก็บใคร?" | context (aging), agingCustomers | สูง | P2 |
| 190 | ถ้าไม่ทำ (ไม่มี context ก่อนหน้า) | consequence | ⚠️ ไม่มี context → fallback หรือถามว่าหมายถึงเรื่องไหน | (fallback / clarify) | context = null | กลาง | P1 |
| 191 | so what (ตามหลัง risks) | consequence | fallout ของ risk ก่อนหน้า | "how urgent?" | context (risk) | กลาง | P3 |

---

# ส่วนที่ 14 — URGENCY (ด่วนแค่ไหน)

> Intent: `urgency` · Keywords: ควรทำวันนี้, how urgent (ทำงานเฉพาะเมื่อมี item ใน context)
> ตอบป้าย severity: 🔴 ทำเดี๋ยวนี้ / 🟡 วันนี้ / 🟢 สัปดาห์นี้

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 192 | ด่วนแค่ไหน | urgency | ป้าย severity ของ item ก่อนหน้า (🔴/🟡/🟢) | "ทำยังไง?" | context item severity | สูง | P1 |
| 193 | ควรทำวันนี้เลยมั้ย | urgency | 🔴 Now / 🟡 Today / 🟢 Week ตาม severity | "ผลถ้าไม่ทำ?" → consequence | context item severity | สูง | P1 |
| 194 | how urgent | urgency | severity badge (only if item in context) | "consequence?" | context item severity | สูง | P2 |
| 195 | ด่วนแค่ไหน (ไม่มี context) | urgency | ⚠️ ไม่มี item → fallback / ถามว่าเรื่องไหน | (fallback / clarify) | context = null | กลาง | P1 |
| 196 | รีบมั้ย | urgency | severity badge ตาม context | "ผลถ้าช้า?" | context item severity | กลาง | P3 |

---

# ส่วนที่ 15 — ACTIVITY (ใครแก้ / ประวัติกิจกรรม)

> Intent: `activity` · Keywords: ใครแก้, ใครเปลี่ยน, who changed, activity log
> **Async**: query บันทึกกิจกรรม → ตอบ price changes / deletions / critical edits พร้อม before→after
> เมนูจริง: บันทึกกิจกรรม (`/settings/activity-logs`) — เฉพาะ owner/manager

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 197 | ใครแก้ราคาสินค้า | activity | (async) ดึง activity log → ใครเปลี่ยนราคา + ก่อน→หลัง | "เปิดบันทึกกิจกรรม?" | activity logs (price changes) | สูง | P1 |
| 198 | ใครเปลี่ยนอะไรบ้างวันนี้ | activity | (async) สรุปการเปลี่ยนแปลง + ใคร + เมื่อไหร่ | "ดูทั้งหมด?" | activity logs | สูง | P1 |
| 199 | who changed price | activity | (async) price change log + before→after | "open activity logs?" | activity logs | สูง | P1 |
| 200 | activity log | activity | (async) รายการกิจกรรมล่าสุด (สำคัญ) | "เปิดหน้าบันทึกกิจกรรม?" | activity logs | สูง | P2 |
| 201 | ใครลบสินค้า | activity | (async) deletions log + ใคร + เมื่อไหร่ | "ดูทั้งหมด?" | activity logs (deletions) | สูง | P2 |
| 202 | ใครแก้ราคาสินค้า X | activity | (async) เจาะ resource → ก่อน→หลัง ของสินค้า X | "เปิดบันทึกกิจกรรม?" | activity logs (resource) | กลาง | P2 |
| 203 | มีการแก้ไขสำคัญอะไรบ้าง | activity | (async) critical edits | "ดูทั้งหมด?" | activity logs (critical) | สูง | P2 |
| 204 | ใครแก้ (สั้น) | activity | (async) การแก้ไขล่าสุด | "เปิดบันทึกกิจกรรม?" | activity logs | กลาง | P3 |
| 205 | ใครปรับสต็อก | activity | (async) stock adjustment log | "ดูทั้งหมด?" | activity logs | กลาง | P3 |
| 206 | ประวัติการเปลี่ยนแปลงเมื่อวาน | activity | (async) ⚠️ Copilot activity = "today" เป็นหลัก → อาจแจ้งให้เปิดหน้าบันทึกกิจกรรมเพื่อกรองวัน | "เปิดบันทึกกิจกรรม?" | activity logs (today scope) | กลาง | P2 |

---

# ส่วนที่ 16 — HELP / วิธีใช้ (how-to / คู่มือ)

> Intent: `help` · Keywords: วิธี, คู่มือ, how to, step by step, ทำไง
> ค้น `help-topics` DB → คืน steps + tips + category label · **เนื้อหา help เป็นภาษาไทยเท่านั้น** (EN query ได้ fallback list ไม่มี steps)

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 207 | วิธีรับชำระเงิน | help | steps: เลือกสินค้า→ตะกร้า→ชำระเงิน→เลือกวิธี→ยืนยัน→พิมพ์ใบเสร็จ + tips | (steps) | help-topics Sales/POS | สูง | P1 |
| 208 | พักบิลยังไง | help | steps: เมนู ⋮→พักบิล→ตั้งชื่อ→เรียกคืนจากไอคอน 📋 | (steps) | help-topics Sales/POS | สูง | P1 |
| 209 | สร้างใบเสนอราคายังไง | help | steps: ตะกร้า→ชำระเงิน→ใบเสนอราคา→ตั้งวันหมดอายุ→สร้าง | (steps) | help-topics Sales/POS | สูง | P1 |
| 210 | ลดราคาต่อชิ้นยังไง | help | steps: คลิกสินค้าในตะกร้า→ใส่ส่วนลด (บาท/%)→ยืนยัน | (steps) | help-topics Sales/POS | สูง | P2 |
| 211 | เพิ่มสินค้าใหม่ยังไง | help | steps: สินค้า→รายการสินค้า→+เพิ่มสินค้า→กรอกชื่อ/SKU/ราคา/ทุน→บันทึก | (steps) | help-topics Products | สูง | P1 |
| 212 | ตั้งบาร์โค้ดยังไง | help | steps: แก้ไขสินค้า→ใส่บาร์โค้ด/auto-generate→บันทึก→พิมพ์ฉลาก | (steps) | help-topics Products | สูง | P2 |
| 213 | นำเข้าสินค้าจาก Excel ยังไง | help | steps: รายการสินค้า→Import Excel→ดาวน์โหลด Template→อัปโหลด→ยืนยัน | (steps) | help-topics Products | สูง | P2 |
| 214 | ดูระดับสต็อกยังไง | help | steps: คลังสินค้า→สต็อกสินค้า→กรองต่ำกว่าเกณฑ์/หมด/หมวด→คลิกดูประวัติ | (steps) | help-topics Inventory | สูง | P2 |
| 215 | นับสต็อกยังไง | help | steps: ตรวจนับสินค้า→สร้างรอบนับ→กรอก/สแกน→ดู variance→ยืนยัน | (steps + tip) | help-topics Inventory | สูง | P2 |
| 216 | สร้างใบสั่งซื้อยังไง | help | steps: จัดซื้อ→การสั่งซื้อ→+สร้าง PO→เลือกซัพ→เพิ่มสินค้า→ส่ง PO | (steps) | help-topics Purchasing | สูง | P2 |
| 217 | เพิ่มลูกค้ายังไง | help | steps: ลูกค้า→+เพิ่มลูกค้า→กรอกชื่อ/เลขภาษี/ที่อยู่→บันทึก | (steps + tip auto tax invoice) | help-topics Customers | สูง | P2 |
| 218 | สร้างโปรโมชันยังไง | help | steps: โปรโมชั่น→+สร้างโปรโมชัน→เลือกประเภท→ตั้งเงื่อนไข/วันที่→เปิดใช้ | (steps) | help-topics Promotions | สูง | P1 |
| 219 | ตั้งค่าร้านยังไง | help | steps: ตั้งค่าร้านค้า→แก้ไข→ชื่อ/ที่อยู่/โลโก้/บัญชีธนาคาร→บันทึก | (steps) | help-topics Settings | สูง | P2 |
| 220 | เพิ่มพนักงานยังไง | help | steps: ตั้งค่า→พนักงานและผู้ใช้→+เพิ่มพนักงาน→อีเมล/บทบาท→ส่ง invite | (steps + tip cashier sees less) | help-topics Settings | สูง | P1 |
| 221 | ตั้งค่าใบเสร็จและการชำระเงินยังไง | help | steps: ใบเสร็จและการชำระเงิน→PromptPay→ช่องทางชำระ→ข้อความท้ายใบเสร็จ→บันทึก | (steps) | help-topics Settings | สูง | P2 |
| 222 | ดูประวัติกิจกรรมยังไง | help | steps: บันทึกกิจกรรม→ดู timeline→กรอง→คลิกดูก่อน/หลัง→ใช้ Copilot ค้นได้ | (steps) | help-topics Settings | สูง | P2 |
| 223 | อ่านรายงานสรุปยังไง | help | steps: รายงาน&การเงิน→รายงานสรุป→เลือกช่วง→8 KPI cards→ตาราง P&L รายเดือน | (steps + tip red=loss) | help-topics Finance | สูง | P2 |
| 224 | รายงาน P&L อ่านยังไง | help | steps: กำไรขาดทุน→ตั้งช่วง→รายได้−COGS=GP−ค่าใช้จ่าย=NP→net margin % | (steps) | help-topics Finance | สูง | P2 |
| 225 | รายงานมูลค่าสต็อกดูยังไง | help | steps: มูลค่าสต็อก→มูลค่ารวม (ทุน×สต็อก)→สินค้าค้าง 30/60/90→Export | (steps) | help-topics Finance | สูง | P2 |
| 226 | ประเภทเอกสารมีอะไรบ้าง | help | 7 ประเภท: ใบเสนอราคา/ใบแจ้งหนี้/ใบกำกับภาษี/ใบส่งของ/ใบเสร็จ/ใบลดหนี้/ใบคืนสินค้า | (list + tip) | help-topics Documents | สูง | P1 |
| 227 | แปลงเอกสารยังไง | help | steps: เอกสาร→Action→Convert to Invoice/DO→ตรวจข้อมูล→สร้าง | (steps) | help-topics Documents | สูง | P2 |
| 228 | พิมพ์ต้นฉบับ/สำเนายังไง | help | steps: เอกสาร→พิมพ์→เลือกต้นฉบับ/สำเนา 1/สำเนา 2 (DO มี 3 ชุด)→พิมพ์/PDF | (steps + tip DO 3 copies) | help-topics Documents | สูง | P2 |
| 229 | how to checkout | help | ⚠️ help content เป็นไทยเท่านั้น → EN query ได้ fallback list (ไม่มี steps ละเอียด) | (fallback help list) | help-topics (TH only) | กลาง | P1 |
| 230 | how to add product | help | ⚠️ EN → fallback list ไม่มี steps | (fallback list) | help-topics (TH only) | กลาง | P2 |
| 231 | บทบาทผู้ใช้มีอะไรบ้าง | help | Owner (ทุกเมนู) / Manager (เกือบทุก) / Cashier (operations) | (roles) | help-topics Getting Started | สูง | P2 |
| 232 | ภาพรวมระบบ POS | help | steps: login→เลือกร้าน→Dashboard→4 หมวดเมนูหลัก | (overview) | help-topics Getting Started | สูง | P3 |
| 233 | ขายของยังไง | help | (keyword "วิธี"? ถ้าไม่มีอาจ match stock) → ถ้า match help: checkout steps | (steps / stock) | help-topics Sales | กลาง | P3 |
| 234 | คืนสินค้าลูกค้ายังไง (ไม่ใช่ยืม) | help | ⚠️ ไม่มีหัวข้อ Product Returns ใน help → fallback help list | (fallback list) | help-topics (ไม่มีหัวข้อนี้) | สูง | P1 |
| 235 | ปิดยอดสิ้นวันยังไง | help | ⚠️ ไม่มีหัวข้อ End-of-Day ใน help → fallback help list | (fallback list) | help-topics (ไม่มีหัวข้อนี้) | สูง | P1 |
| 236 | โอนสต็อกระหว่างคลังยังไง | help | ⚠️ ไม่มีหัวข้อ Stock Transfer → fallback help list | (fallback list) | help-topics (ไม่มีหัวข้อนี้) | สูง | P1 |
| 237 | คืนของให้ซัพยังไง | help | ⚠️ ไม่มีหัวข้อ Purchase Returns → fallback help list | (fallback list) | help-topics (ไม่มีหัวข้อนี้) | สูง | P2 |
| 238 | ตัดสต็อกของเสียยังไง | help | ⚠️ ไม่มีหัวข้อ Damaged/Waste → fallback help list | (fallback list) | help-topics (ไม่มีหัวข้อนี้) | สูง | P2 |

---

# ส่วนที่ 17 — GREETING / THANKS (ทักทาย / ขอบคุณ)

> Intent: `greeting` (สวัสดี, หวัดดี, hello, hi, hey) / `thanks` (ขอบคุณ, ขอบใจ, thank, thx)

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 239 | สวัสดี | greeting | ข้อความต้อนรับ + 4 ปุ่มเริ่มต้น | 4 starter (ยอดขาย/กำไร/สต็อก/ภาพรวม) | — | สูง | P1 |
| 240 | หวัดดี | greeting | ต้อนรับ + 4 starter | 4 starter | — | สูง | P2 |
| 241 | hello | greeting | welcome + 4 starters | 4 starters | — | สูง | P1 |
| 242 | hi | greeting | welcome + 4 starters | 4 starters | — | สูง | P2 |
| 243 | hey | greeting | welcome + 4 starters | 4 starters | — | สูง | P3 |
| 244 | ขอบคุณ | thanks | "ยินดีครับ" + 4 starter | 4 starter | — | สูง | P1 |
| 245 | ขอบใจ | thanks | ยินดี + 4 starter | 4 starter | — | สูง | P2 |
| 246 | thank you | thanks | you're welcome + 4 starters | 4 starters | — | สูง | P2 |
| 247 | thx | thanks | welcome + 4 starters | 4 starters | — | สูง | P3 |
| 248 | สวัสดีครับ ช่วยดูยอดขายหน่อย | greeting/sales | ⚠️ มีทั้ง greeting + "ยอด/ขาย" → ทดสอบว่า router เลือกอันไหน (คาด greeting match ก่อน หรือ sales) | (ตามที่ match) | summary.* | ต่ำ | P2 |

---

# ส่วนที่ 18 — FALLBACK / OUT-OF-SCOPE (นอกขอบเขต)

> Intent: `fallback` (ไม่ match keyword ใด) · คืน "ถามฉันเกี่ยวกับ…" + 6 ปุ่มหัวข้อ
> รวมคำสั่ง "ทำ" ที่ตอบ "เร็ว ๆ นี้" และคำถามที่ระบบไม่มีข้อมูล

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 249 | วันนี้อากาศเป็นไง | fallback | "ถามฉันเกี่ยวกับ…" + 6 ปุ่มหัวข้อ | 6 topic buttons | — | สูง | P1 |
| 250 | เล่าเรื่องตลกหน่อย | fallback | fallback (ไม่มี LLM แต่งข้อความ) | 6 topic buttons | — | สูง | P1 |
| 251 | ช่วยเขียนโพสต์ขายของ | fallback | fallback (ไม่มี generative AI) | 6 topic buttons | — | สูง | P1 |
| 252 | สรุปยอดขายเป็นบทความให้หน่อย | fallback | ⚠️ ไม่มี LLM สรุป/แต่งความ → fallback หรือ sales snapshot (ขณะนี้ระบบยังไม่มีการสรุปเชิงบรรยาย) | 6 topic buttons | — | สูง | P1 |
| 253 | คุยเล่นกับฉันหน่อย | fallback | fallback (ไม่มี open conversation) | 6 topic buttons | — | สูง | P2 |
| 254 | aaaaaaa | fallback | fallback | 6 topic buttons | — | สูง | P3 |
| 255 | ??? | fallback | fallback | 6 topic buttons | — | สูง | P3 |
| 256 | (ข้อความว่าง) | fallback | fallback / ไม่ตอบ | 6 topic buttons | — | กลาง | P2 |
| 257 | สร้างใบเสร็จให้หน่อย | action/fallback | "เร็ว ๆ นี้" (สั่งงานจริงไม่ได้) | (topic buttons) | — | สูง | P1 |
| 258 | ส่งใบกำกับภาษีให้ลูกค้า | action/fallback | "เร็ว ๆ นี้" | (topic buttons) | — | สูง | P2 |
| 259 | ลดราคาสินค้าทุกตัว 10% | action/fallback | "เร็ว ๆ นี้" (Copilot ปรับราคาจริงไม่ได้) | (topic buttons) | — | สูง | P1 |
| 260 | คาดการณ์ยอดขายเดือนหน้า | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี forecast/ทำนาย) | (topic buttons) | — | สูง | P1 |
| 261 | แนะนำสินค้าให้สั่งเพิ่มแบบ AI | fallback/stock | ⚠️ ไม่มี LLM แนะนำ; ใช้ reorderRecommendations (rule-based) → ตอบ stock ได้ | "สั่งซื้อ?" | inventoryIntelligence.reorderRecommendations | กลาง | P2 |
| 262 | เปรียบเทียบร้านฉันกับร้านอื่น | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี benchmark ข้ามร้าน) | (topic buttons) | — | สูง | P2 |
| 263 | ราคาหุ้นวันนี้ | fallback | fallback (นอกขอบเขต) | (topic buttons) | — | สูง | P3 |

---

# ส่วนที่ 19 — CONTEXT / FOLLOW-UP (คำถามต่อเนื่อง)

> ทดสอบ context preservation: เก็บ last topic + last items (≤3) เพื่อให้ "ทำไม / เล่าเพิ่ม / อันนั้น" resolve ถูก

| # | Question (ลำดับ) | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 264 | (หลัง stock) "ทำไม" | stock/consequence | อธิบายเหตุผลของ item สต็อกก่อนหน้า | "ด่วนแค่ไหน?" | context (stock items) | กลาง | P1 |
| 265 | (หลัง priorities) "เล่าเพิ่ม" | priorities | รายละเอียด priority ก่อนหน้า (reason) | "ถ้าไม่ทำ?" | context (priority) | กลาง | P1 |
| 266 | (หลัง aging) "อันนั้น" | aging | เจาะลูกหนี้ที่อ้างถึงก่อนหน้า | "เก็บยังไง?" | context (aging items) | กลาง | P2 |
| 267 | (หลัง risks) "อันแรกคืออะไร" | risks/consequence | เจาะ risk ตัวบนสุด | "ถ้าไม่ทำ?" | context (risk[0]) | กลาง | P2 |
| 268 | (หลัง best-sellers) "ตัวนั้นเหลือเท่าไหร่" | best-sellers/stock | currentStock ของสินค้าที่อ้างถึง | "สั่งซื้อ?" | context + urgentReorders[].currentStock | กลาง | P2 |
| 269 | tell me more (หลัง overview) | overview | ขยายภาพรวม (sub-scores) | "priorities?" | context (overview) | กลาง | P3 |
| 270 | "ทำไม" (ไม่มี context ก่อนหน้า) | consequence/fallback | ⚠️ ไม่มี context → fallback / ถามว่าเรื่องไหน | (clarify / fallback) | context = null | กลาง | P1 |
| 271 | (หลัง purchasing) "เจ้าไหนแพงขึ้น" | stock+purchasing | costChanges จาก context purchasing | "ดูทั้งหมด?" | context + costChanges | กลาง | P3 |

---

# ส่วนที่ 20 — TAX / DOCUMENTS (ภาษี / เอกสาร)

> Copilot ไม่มี intent "tax"/"documents" แยก — คำถามเหล่านี้เข้า `help` (วิธีทำ) หรือ `fallback` (ตัวเลขภาษีรวมไม่มีใน Copilot)
> เมนูจริง: เอกสาร (`/documents`), บิลค้างชำระ (`/documents/pending`)

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 272 | ออกใบกำกับภาษียังไง | help | ⚠️ ไม่มีหัวข้อ "ออกใบกำกับ" ตรง ๆ; help Documents บอก ใบกำกับภาษีสร้างอัตโนมัติหลังชำระ Invoice | (steps Documents) | help-topics Documents | สูง | P1 |
| 273 | VAT 7% ตั้งที่ไหน | help | help Sales บอก toggle VAT 7% ที่ checkout (สวิตช์) | (steps) | help-topics Sales | กลาง | P2 |
| 274 | ภาษีขายเดือนนี้เท่าไหร่ | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ใน Copilot (ไม่มียอดภาษีรวม) | (topic buttons) | — | สูง | P1 |
| 275 | ภ.พ.30 / VAT report | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มีรายงานภาษี) | (topic buttons) | — | สูง | P1 |
| 276 | เอกสารค้างชำระมีกี่ใบ | fallback/aging | ⚠️ Copilot ไม่นับ document status; ลูกหนี้จริงอยู่ที่ aging → แนะนำ บิลค้างชำระ + ตอบ outstanding ผ่าน aging | "เปิดบิลค้างชำระ?" | moneyIntelligence (aging) | กลาง | P2 |
| 277 | ใบเสนอราคาที่ยังไม่แปลงมีกี่ใบ | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ใน Copilot (ไม่มี document count) → แนะนำ เอกสาร | "เปิดเอกสาร?" | — | สูง | P2 |
| 278 | ใบกำกับภาษีเลขที่ X สถานะอะไร | fallback | ขณะนี้ระบบยังไม่มีการค้นเอกสารรายใบใน Copilot → แนะนำ เอกสาร | "เปิดเอกสาร?" | — | สูง | P2 |
| 279 | แปลงใบเสนอราคาเป็นใบแจ้งหนี้ยังไง | help | steps Documents: Action→Convert to Invoice | (steps) | help-topics Documents | สูง | P2 |
| 280 | ใบส่งของพิมพ์กี่สำเนา | help | help Documents: DO มี 3 ชุด (ลูกค้า/บริษัท/คนขับ) | (tip) | help-topics Documents | สูง | P2 |
| 281 | ใบลดหนี้คืออะไร | help | help Documents: ใบลดหนี้ = ลดยอดลูกหนี้ (Credit Note) | (list) | help-topics Documents | สูง | P3 |

---

# ส่วนที่ 21 — MEMBERS / STAFF / SETTINGS (พนักงาน / ผู้ใช้ / ตั้งค่า)

> เมนูจริง: พนักงานและผู้ใช้ (`/settings/staff`), ตั้งค่าร้านค้า (`/settings`), ใบเสร็จและการชำระเงิน (`/settings/receipt-payment`) — owner/manager เท่านั้น
> Copilot ไม่มี intent "staff" แยก → คำถามเข้า `help` (วิธีทำ) เป็นหลัก

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 282 | เพิ่มพนักงานยังไง | help | steps Settings: พนักงานและผู้ใช้→+เพิ่ม→อีเมล/บทบาท→ส่ง invite | (steps) | help-topics Settings | สูง | P1 |
| 283 | บทบาทพนักงานมีอะไรบ้าง | help | Owner/Manager/Cashier (เมนูต่างกัน) | (roles) | help-topics Getting Started | สูง | P2 |
| 284 | พนักงานคนไหนขายดีสุด | fallback/sales | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (Copilot ไม่ slice ตามพนักงาน) | (topic buttons) | — | สูง | P1 |
| 285 | ใครล็อกอินล่าสุด | activity/fallback | ⚠️ Copilot activity เน้นการเปลี่ยนแปลงข้อมูล ไม่ใช่ login session → แนะนำ บันทึกกิจกรรม | "เปิดบันทึกกิจกรรม?" | — | กลาง | P2 |
| 286 | ตั้ง PromptPay ยังไง | help | steps: ใบเสร็จและการชำระเงิน→ตั้ง PromptPay (เบอร์/เลขภาษี) | (steps) | help-topics Settings | สูง | P2 |
| 287 | เปลี่ยนชื่อร้านยังไง | help | steps: ตั้งค่าร้านค้า→แก้ไข→ชื่อ→บันทึก | (steps) | help-topics Settings | สูง | P2 |
| 288 | เพิ่มบัญชีธนาคารยังไง | help | steps Settings: ตั้งค่าร้านค้า→เพิ่มบัญชีธนาคาร (สำหรับ QR/โอน) | (steps) | help-topics Settings | สูง | P3 |
| 289 | กำหนดสิทธิ์พนักงานละเอียดยังไง | help | ⚠️ help มีแค่ 3 บทบาทมาตรฐาน; ขณะนี้ระบบยังไม่มีข้อมูลสิทธิ์ราย permission ใน help → กำหนดบทบาทที่ พนักงานและผู้ใช้ | (roles) | help-topics Settings | กลาง | P2 |
| 290 | เชิญพนักงานเข้าร้านยังไง | help | steps Settings: +เพิ่มพนักงาน→ส่ง invite email | (steps) | help-topics Settings | สูง | P2 |

---

# ส่วนที่ 22 — PROMOTION (โปรโมชัน)

> เมนูจริง: โปรโมชั่น (`/promotions`)
> Copilot ไม่มี intent "promotion" แยก → คำถามเข้า `help` (วิธีสร้าง); ตัวเลขผลโปรไม่มีใน Copilot

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 291 | สร้างโปรโมชันยังไง | help | steps: โปรโมชั่น→+สร้าง→เลือกประเภท (%/บาท/ซื้อครบ/ซื้อแถม/คอมโบ)→วันที่→เปิดใช้ | (steps + tip auto-apply) | help-topics Promotions | สูง | P1 |
| 292 | โปรโมชันมีกี่แบบ | help | %/บาท/ซื้อครบลด/ซื้อ X แถม Y/คอมโบ | (list) | help-topics Promotions | สูง | P2 |
| 293 | โปรไหนทำยอดได้ดีสุด | fallback | ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ (ไม่มี promo performance ใน Copilot) → แนะนำ โปรโมชั่น | "เปิดโปรโมชั่น?" | — | สูง | P1 |
| 294 | โปรโมชันชนกันมั้ย | help | help Promotions: ตรวจ conflict ได้ที่หน้าโปรโมชั่น | (tip) | help-topics Promotions | กลาง | P2 |
| 295 | ส่วนลดรวมเดือนนี้เท่าไหร่ | profit/fallback | ⚠️ Copilot ไม่มี discount total; ⚠️ ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้ → แนะนำ รายงานสรุป (มี KPI ส่วนลดรวม) | "เปิดรายงานสรุป?" | — | สูง | P2 |
| 296 | เปิดโปรโมชันให้หน่อย | action | "เร็ว ๆ นี้" (สร้างโปรจริงไม่ได้) → แนะนำ โปรโมชั่น | "เปิดโปรโมชั่น?" | — | สูง | P2 |
| 297 | ซื้อ 1 แถม 1 ตั้งยังไง | help | steps Promotions: เลือกประเภท ซื้อ X แถม Y → ตั้งเงื่อนไข | (steps) | help-topics Promotions | สูง | P3 |

---

# ส่วนที่ 23 — DASHBOARD (แดชบอร์ด)

> เมนูจริง: แดชบอร์ด (`/dashboard`)
> Copilot ไม่มี intent "dashboard" แยก → คำถามเข้า `overview` (สรุป) หรือ `help` (วิธีอ่าน)

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 298 | แดชบอร์ดดูยังไง | help | steps: เปิดแดชบอร์ด→7 KPI cards→date filter→กราฟแนวโน้ม | (steps + tip purple/orange) | help-topics Dashboard | สูง | P1 |
| 299 | KPI บนแดชบอร์ดมีอะไรบ้าง | help | ยอดขายรวม/กำไรขั้นต้น/จำนวนออเดอร์/มูลค่าสต็อก/ลูกหนี้/ค่าใช้จ่าย/กำไรสุทธิ | (list) | help-topics Dashboard | สูง | P2 |
| 300 | สีม่วงกับสีส้มบนแดชบอร์ดต่างกันยังไง | help | ม่วง = ขายสด, ส้ม = ขายเชื่อ/ลูกหนี้ | (tip) | help-topics Dashboard | สูง | P2 |
| 301 | ดูสินค้าสต็อกต่ำบนแดชบอร์ดยังไง | help | steps: เลื่อนไปส่วน "สินค้าที่ต้องติดตาม"→คลิกชื่อ→สั่งซื้อ | (steps) | help-topics Dashboard | สูง | P2 |
| 302 | สรุปแดชบอร์ดวันนี้ให้หน่อย | overview | business score + today snapshot (revenueToday/profitToday) + สต็อก/ความเสี่ยง | "ทำอะไรก่อน?" | healthScore, summary | สูง | P1 |
| 303 | แดชบอร์ดบอกอะไรได้บ้าง | help | 7 KPI + กราฟ + สินค้าต้องติดตาม | (overview) | help-topics Dashboard | กลาง | P3 |
| 304 | ภาพรวมแดชบอร์ด | overview | score + snapshot + summary | "priorities?" | healthScore, summary | สูง | P2 |

---

# ส่วนที่ 24 — EDGE / SLANG / TYPO (คำแสลง / พิมพ์ผิด / ขอบ)

> ทดสอบ keyword router กับภาษาธรรมชาติจริงของเจ้าของร้านไทย

| # | Question | Intent | Expected answer | Expected follow-up | Required data | Confidence | Priority |
|---|----------|--------|-----------------|--------------------|---------------|-----------|----------|
| 305 | ตังค์เข้าวันนี้เท่าไหร่ | sales | ⚠️ "ตังค์" อาจไม่ match "ยอด/ขาย" → ถ้าไม่ match = fallback (ทดสอบขอบ) | (sales / fallback) | summary.* | ต่ำ | P2 |
| 306 | ของจะหมดแล้วเว้ย | stock | "หมด" + "ของ"(?) → ถ้า match stock: out/low + reorders | "สั่งซื้อ?" | inventory.* | กลาง | P2 |
| 307 | ลูกค้าเบี้ยวหนี้มีใคร | aging | "หนี้" → aging customers | "เก็บใคร?" | moneyIntelligence.agingCustomers | กลาง | P2 |
| 308 | กำไรงามมั้ย | profit | "กำไร" → P&L + margin | "ภาพรวม?" | moneyIntelligence.* | กลาง | P2 |
| 309 | เจ๊งมั้ยร้านนี้ | profit/overview | ⚠️ "เจ๊ง" อาจไม่ match → fallback; ถ้าตีความได้ = สถานะกำไร/ขาดทุน | (profit / fallback) | moneyIntelligence.netProfit | ต่ำ | P3 |
| 310 | สตอกเหลือไรมั่ง | stock | ⚠️ "สตอก" สะกดผิด → ถ้ามี logic fuzzy อาจ match; ไม่งั้น fallback | (stock / fallback) | inventory.* | ต่ำ | P3 |
| 311 | เร่งทำไรดี | priorities/actions | "ทำไร"(?) → ถ้า match = today priorities | "ถ้าไม่ทำ?" | decisionEngine.todayPriorities | ต่ำ | P3 |
| 312 | ยอดดดขายยย | sales | ตัวอักษรซ้ำ — "ยอด"+"ขาย" ยัง substring-match ได้ → sales | "กำไร?" | summary.* | กลาง | P3 |
| 313 | profittt | profit | "profit" substring → P&L | "revenue?" | moneyIntelligence.* | กลาง | P3 |
| 314 | inventryy (พิมพ์ผิด) | stock | ⚠️ "inventry" ไม่ตรง "inventory" → อาจ fallback; ถ้ามี "stock"? = match | (stock / fallback) | inventory.* | ต่ำ | P3 |
| 315 | ซัพเจ้าไหนดีสุด | stock+purchasing | "ซัพ" → supplier metrics top spend (ไม่ใช่ "ดี" เชิงคุณภาพ — ไม่มีข้อมูลคุณภาพ) | "ดูทั้งหมด?" | purchasingIntelligence.supplierMetrics | กลาง | P3 |

---

## สรุปสถิติชุดทดสอบ

| มิติ | จำนวน |
|------|-------|
| Test cases ทั้งหมด | 315 |
| Sections | 24 |
| Intent ที่ครอบคลุม | 17 (ทั้งหมด) |
| P1 (ต้องผ่านเสมอ) | ~70 |
| P2 (สำคัญ) | ~150 |
| P3 (ขอบ/edge) | ~95 |

### รายการ "ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้" ที่ประกาศไว้ (groundedGaps)

ฟีเจอร์/ข้อมูลที่ถูกถามแต่ Copilot ไม่มี — ทุก test case ที่อ้างต้องตอบว่าไม่มี ไม่ใช่แต่งคำตอบ:

1. ยอดขาย/กำไร YoY และ trend เกิน 7 วัน (มีเฉพาะ snapshot 7 วัน + วันนี้)
2. ยอดขาย/กำไร/margin แยกตามพนักงาน
3. ยอดขาย/สต็อก แยกตามสาขา (per-branch)
4. per-product sales ranking + revenue/margin ต่อสินค้า (best-sellers ใช้ velocity proxy เท่านั้น)
5. จำนวนรวมสต็อกทั้งคลัง / breakdown ready-vs-storage / per-warehouse / capacity จุดจัดเก็บ
6. บัญชีแยกประเภท (ledger) / สมุดรายวัน (journal) / งบดุล (balance sheet) / กระแสเงินสด (cash flow)
7. รายงานภาษีซื้อ-ขาย / ภ.พ.30 / ยอด VAT รวม
8. forecast / คาดการณ์ยอดขาย
9. benchmark เปรียบเทียบข้ามร้าน
10. promo performance / โปรไหนทำยอดดีสุด
11. document count / สถานะเอกสารรายใบ / ค้นเอกสารรายเลขที่
12. ส่วนลดรวม (discount total) ใน Copilot — มีที่ รายงานสรุป
13. login session / ใครล็อกอินล่าสุด
14. สิทธิ์ราย permission ละเอียด (help มีแค่ 3 บทบาทมาตรฐาน)
15. การสรุป/แต่งข้อความเชิงบรรยาย (ไม่มี LLM generative)
16. การสั่งงานจริง (สร้าง PO/ปรับสต็อก/ส่งเอกสาร/รับชำระ/อนุมัติ) → ตอบ "เร็ว ๆ นี้"
17. หัวข้อ help ที่ไม่มี: Stock Transfer, End-of-Day, Product Returns (ลูกค้า), Purchase Returns, Damaged/Waste

> **กฎ regression:** ถ้า test case P1 ใด ๆ เริ่ม "แต่ง" คำตอบในหัวข้อ groundedGaps ข้างบน = ถือว่า FAIL ทันที (แปลว่ามี LLM แทรกหรือ router เพี้ยน)
