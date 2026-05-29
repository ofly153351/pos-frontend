import type { Sale } from "@/types/sale";

type InvoiceDict = {
  title: string;
  combinedTitle: string;
  invoiceNo: string;
  date: string;
  reference: string;
  customer: string;
  phone: string;
  cashier: string;
  paymentMethod: string;
  seller: string;
  sellerTaxId: string;
  notConfigured: string;
  no: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  subtotal: string;
  itemDiscount: string;
  billDiscount: string;
  beforeVat: string;
  vat: string;
  total: string;
  note: string;
  authorizedSignature: string;
  customerSignature: string;
  originalCopy: string;
  generalCustomer: string;
  cash: string;
  transfer: string;
  card: string;
  promptpay: string;
  vatIncluded: string;
  vatExcluded: string;
};

type Props = {
  sale: Sale;
  dict: InvoiceDict;
  invoiceNo: string;
};

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(s));
}

function paymentLabel(method: string, dict: InvoiceDict) {
  const map: Record<string, string> = {
    cash: dict.cash,
    transfer: dict.transfer,
    card: dict.card,
    promptpay: dict.promptpay,
  };
  return map[method] ?? method;
}

export function InvoiceA4({ sale, dict, invoiceNo }: Props) {
  const items = sale.items ?? [];
  const itemDiscountTotal = items.reduce((s, i) => s + (i.line_discount_total ?? 0), 0);
  const billDiscount = sale.bill_discount_amount ?? 0;
  const vatAmt = sale.vat_amount ?? 0;
  const total = sale.total_amount ?? 0;
  const subtotal = sale.subtotal_amount ?? 0;
  const beforeVat = subtotal - itemDiscountTotal - billDiscount;
  const customerName = sale.customer_name?.trim() || dict.generalCustomer;
  const dateStr = sale.created_at ? fmtDate(sale.created_at) : "";
  const storeTaxId = sale.store_tax_id?.trim() || "";

  return (
    <div
      className="invoice-a4 bg-white font-sans text-slate-800"
      style={{ width: "210mm", minHeight: "297mm", padding: "14mm 18mm", boxSizing: "border-box" }}
    >
      {/* === Header: Revenue Code §86/4 items 1–4 === */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8mm" }}>
        {/* Seller info — §86/4 item 2: ชื่อ ที่อยู่ เลขประจำตัวผู้เสียภาษี */}
        <div>
          <div style={{ fontSize: "17pt", fontWeight: 800, color: "#1e1b4b", marginBottom: "2mm" }}>
            {sale.store_name || ""}
          </div>
          {sale.store_address && (
            <div style={{ fontSize: "8.5pt", color: "#475569", marginBottom: "1mm", maxWidth: "85mm" }}>
              {sale.store_address}
            </div>
          )}
          {sale.store_phone && (
            <div style={{ fontSize: "8.5pt", color: "#475569", marginBottom: "1mm" }}>
              {dict.phone}: {sale.store_phone}
            </div>
          )}
          {/* TIN — legally required on full tax invoice */}
          <div style={{ fontSize: "8.5pt", marginTop: "1mm" }}>
            <span style={{ color: "#64748b" }}>{dict.sellerTaxId}: </span>
            {storeTaxId ? (
              <span style={{ fontWeight: 600, letterSpacing: "0.5px", fontFamily: "monospace" }}>{storeTaxId}</span>
            ) : (
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>{dict.notConfigured}</span>
            )}
          </div>
        </div>

        {/* Document title + number — §86/4 items 1 & 4 */}
        <div style={{ textAlign: "right" }}>
          {/* §86/4 item 1: "ใบกำกับภาษี" must appear prominently */}
          <div style={{ fontSize: "9pt", color: "#6d28d9", fontWeight: 600, marginBottom: "0.5mm", letterSpacing: "1px" }}>
            {dict.combinedTitle}
          </div>
          <div style={{ fontSize: "20pt", fontWeight: 800, color: "#6d28d9", marginBottom: "3mm" }}>
            ใบกำกับภาษี
          </div>
          <table style={{ marginLeft: "auto", fontSize: "8.5pt", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: "4mm", color: "#64748b", textAlign: "right" }}>{dict.invoiceNo}</td>
                <td style={{ fontWeight: 600, fontFamily: "monospace" }}>{invoiceNo}</td>
              </tr>
              <tr>
                {/* §86/4 item 7: วัน เดือน ปี */}
                <td style={{ paddingRight: "4mm", color: "#64748b", textAlign: "right" }}>{dict.date}</td>
                <td>{dateStr}</td>
              </tr>
              <tr>
                <td style={{ paddingRight: "4mm", color: "#64748b", textAlign: "right" }}>{dict.reference}</td>
                <td style={{ fontFamily: "monospace", fontSize: "8pt", color: "#475569" }}>{sale.sale_number ?? ""}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Purple rule */}
      <div style={{ borderTop: "2px solid #6d28d9", marginBottom: "6mm" }} />

      {/* Customer + payment — §86/4 item 3: ชื่อ ที่อยู่ ของผู้ซื้อ */}
      <div style={{ display: "flex", gap: "10mm", marginBottom: "7mm" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "7.5pt", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1.5mm" }}>
            {dict.customer}
          </div>
          <div style={{ fontSize: "11pt", fontWeight: 600 }}>{customerName}</div>
          {sale.customer_phone && (
            <div style={{ fontSize: "8.5pt", color: "#475569", marginTop: "1mm" }}>{dict.phone}: {sale.customer_phone}</div>
          )}
        </div>
        <div style={{ minWidth: "60mm" }}>
          <div style={{ fontSize: "7.5pt", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1.5mm" }}>
            {dict.paymentMethod}
          </div>
          <div style={{ fontSize: "9.5pt" }}>{paymentLabel(sale.payment_method, dict)}</div>
          {sale.cashier_name && (
            <div style={{ fontSize: "8.5pt", color: "#475569", marginTop: "1mm" }}>{dict.cashier}: {sale.cashier_name}</div>
          )}
        </div>
      </div>

      {/* Items table — §86/4 item 5: ชื่อ ชนิด ประเภท ปริมาณ มูลค่า */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm", fontSize: "8.5pt" }}>
        <thead>
          <tr style={{ backgroundColor: "#ede9fe" }}>
            <th style={{ padding: "2mm 3mm", textAlign: "center", width: "8mm", borderBottom: "1px solid #c4b5fd" }}>{dict.no}</th>
            <th style={{ padding: "2mm 3mm", textAlign: "left", borderBottom: "1px solid #c4b5fd" }}>{dict.description}</th>
            <th style={{ padding: "2mm 3mm", textAlign: "center", width: "16mm", borderBottom: "1px solid #c4b5fd" }}>{dict.unit}</th>
            <th style={{ padding: "2mm 3mm", textAlign: "center", width: "14mm", borderBottom: "1px solid #c4b5fd" }}>{dict.quantity}</th>
            <th style={{ padding: "2mm 3mm", textAlign: "right", width: "26mm", borderBottom: "1px solid #c4b5fd" }}>{dict.unitPrice}</th>
            <th style={{ padding: "2mm 3mm", textAlign: "right", width: "22mm", borderBottom: "1px solid #c4b5fd" }}>{dict.discount}</th>
            <th style={{ padding: "2mm 3mm", textAlign: "right", width: "28mm", borderBottom: "1px solid #c4b5fd" }}>{dict.amount}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const discountAmt = item.line_discount_total ?? 0;
            const lineTotal = item.line_total ?? 0;
            return (
              <tr key={item.id ?? i} style={{ borderBottom: "0.5px solid #e2e8f0" }}>
                <td style={{ padding: "2mm 3mm", textAlign: "center", color: "#64748b" }}>{i + 1}</td>
                <td style={{ padding: "2mm 3mm" }}>
                  <div style={{ fontWeight: 500 }}>{item.product_name ?? ""}</div>
                  {item.sku && (
                    <div style={{ fontSize: "7pt", color: "#94a3b8" }}>SKU: {item.sku}</div>
                  )}
                </td>
                <td style={{ padding: "2mm 3mm", textAlign: "center", color: "#64748b" }}>
                  {item.unit_type ?? "ชิ้น"}
                </td>
                <td style={{ padding: "2mm 3mm", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ padding: "2mm 3mm", textAlign: "right", fontFamily: "monospace" }}>{fmt(item.unit_price ?? 0)}</td>
                <td style={{ padding: "2mm 3mm", textAlign: "right", fontFamily: "monospace", color: discountAmt > 0 ? "#dc2626" : "#94a3b8" }}>
                  {discountAmt > 0 ? `-${fmt(discountAmt)}` : "-"}
                </td>
                <td style={{ padding: "2mm 3mm", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{fmt(lineTotal)}</td>
              </tr>
            );
          })}
          {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ borderBottom: "0.5px solid #e2e8f0" }}>
              {Array.from({ length: 7 }).map((_, j) => (
                <td key={j} style={{ padding: "2mm 3mm", fontSize: "8pt" }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals + note */}
      <div style={{ display: "flex", gap: "10mm", marginBottom: "10mm" }}>
        <div style={{ flex: 1 }}>
          {sale.note && (
            <>
              <div style={{ fontSize: "7.5pt", color: "#64748b", marginBottom: "1mm" }}>{dict.note}</div>
              <div style={{ fontSize: "8.5pt", color: "#475569", maxWidth: "90mm" }}>{sale.note}</div>
            </>
          )}
        </div>

        {/* §86/4 item 6: จำนวนภาษีมูลค่าเพิ่ม แยกออกจากมูลค่า (must be SEPARATE, not merged into total) */}
        <div style={{ minWidth: "80mm" }}>
          <table style={{ width: "100%", fontSize: "8.5pt", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "1mm 3mm", color: "#64748b" }}>{dict.subtotal}</td>
                <td style={{ padding: "1mm 3mm", textAlign: "right", fontFamily: "monospace" }}>{fmt(subtotal)}</td>
              </tr>
              {itemDiscountTotal > 0 && (
                <tr>
                  <td style={{ padding: "1mm 3mm", color: "#64748b" }}>{dict.itemDiscount}</td>
                  <td style={{ padding: "1mm 3mm", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>-{fmt(itemDiscountTotal)}</td>
                </tr>
              )}
              {billDiscount > 0 && (
                <tr>
                  <td style={{ padding: "1mm 3mm", color: "#64748b" }}>{dict.billDiscount}</td>
                  <td style={{ padding: "1mm 3mm", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>-{fmt(billDiscount)}</td>
                </tr>
              )}
              {vatAmt > 0 && (
                <tr>
                  <td style={{ padding: "1mm 3mm", color: "#64748b" }}>{dict.beforeVat}</td>
                  <td style={{ padding: "1mm 3mm", textAlign: "right", fontFamily: "monospace" }}>{fmt(beforeVat)}</td>
                </tr>
              )}
              {/* §86/4 item 6 — VAT MUST be shown as its own explicit line, not buried in total */}
              <tr style={{ borderTop: "0.5px solid #e2e8f0" }}>
                <td style={{ padding: "1.5mm 3mm", color: "#64748b" }}>
                  {dict.vat} {sale.vat_percent ?? 7}%
                  <span style={{ fontSize: "7pt", color: "#94a3b8", marginLeft: "2mm" }}>
                    ({sale.vat_included ? dict.vatIncluded : dict.vatExcluded})
                  </span>
                </td>
                <td style={{ padding: "1.5mm 3mm", textAlign: "right", fontFamily: "monospace" }}>
                  {vatAmt > 0 ? fmt(vatAmt) : "0.00"}
                </td>
              </tr>
              <tr style={{ borderTop: "2px solid #6d28d9" }}>
                <td style={{ padding: "2mm 3mm", fontWeight: 700, fontSize: "11pt" }}>{dict.total}</td>
                <td style={{ padding: "2mm 3mm", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: "12pt", color: "#6d28d9" }}>
                  {fmt(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature area */}
      <div style={{ display: "flex", gap: "10mm", marginTop: "6mm" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ marginBottom: "9mm" }}>&nbsp;</div>
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "1.5mm", fontSize: "8pt", color: "#64748b" }}>
            {dict.authorizedSignature}
          </div>
          <div style={{ fontSize: "7.5pt", color: "#94a3b8", marginTop: "0.5mm" }}>{sale.store_name ?? ""}</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ marginBottom: "9mm" }}>&nbsp;</div>
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "1.5mm", fontSize: "8pt", color: "#64748b" }}>
            {dict.customerSignature}
          </div>
          <div style={{ fontSize: "7.5pt", color: "#94a3b8", marginTop: "0.5mm" }}>{customerName}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "6mm", borderTop: "0.5px solid #e2e8f0", paddingTop: "2.5mm", display: "flex", justifyContent: "space-between", fontSize: "7pt", color: "#94a3b8" }}>
        <span>{dict.originalCopy} — {dict.invoiceNo} {invoiceNo}</span>
        <span>
          {storeTaxId ? `${dict.sellerTaxId}: ${storeTaxId}` : ""}
        </span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}
