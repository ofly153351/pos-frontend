import type { Sale } from "@/types/sale";
import { SignatureBlock } from "./signature-block";

type InvoiceDict = {
  shortTitle: string;
  taxInvoiceTitle: string;
  invoiceNo: string;
  date: string;
  reference: string;
  customer: string;
  phone: string;
  cashier: string;
  paymentMethod: string;
  sellerTaxId: string;
  notConfigured: string;
  no: string;
  description: string;
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
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "short" }).format(new Date(s));
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

export function InvoiceShort({ sale, dict, invoiceNo }: Props) {
  const items = sale.items ?? [];
  const itemDiscountTotal = items.reduce((s, i) => s + (i.line_discount_total ?? 0), 0);
  const billDiscount = sale.bill_discount_amount ?? 0;
  const vatAmt = sale.vat_amount ?? 0;
  const subtotal = sale.subtotal_amount ?? 0;
  const beforeVat = subtotal - itemDiscountTotal - billDiscount;
  const total = sale.total_amount ?? 0;
  const customerName = sale.customer_name?.trim() || dict.generalCustomer;
  const dateStr = sale.created_at ? fmtDate(sale.created_at) : "";
  const storeTaxId = sale.store_tax_id?.trim() || "";

  return (
    <div
      className="invoice-short bg-white font-sans text-slate-800"
      style={{ width: "148mm", minHeight: "210mm", padding: "10mm 12mm", boxSizing: "border-box" }}
    >
      {/* Store header */}
      <div style={{ textAlign: "center", marginBottom: "4mm" }}>
        <div style={{ fontSize: "14pt", fontWeight: 800, color: "#1e1b4b" }}>{sale.store_name ?? ""}</div>
        {sale.store_address && (
          <div style={{ fontSize: "7.5pt", color: "#64748b", marginTop: "1mm" }}>{sale.store_address}</div>
        )}
        {sale.store_phone && (
          <div style={{ fontSize: "7.5pt", color: "#64748b" }}>{dict.phone}: {sale.store_phone}</div>
        )}
        {/* §86/4 item 2 — seller TIN required even for short form */}
        <div style={{ fontSize: "7.5pt", marginTop: "1mm" }}>
          <span style={{ color: "#64748b" }}>{dict.sellerTaxId}: </span>
          {storeTaxId ? (
            <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{storeTaxId}</span>
          ) : (
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>{dict.notConfigured}</span>
          )}
        </div>
      </div>

      {/* Title — §86/4 item 1: "ใบกำกับภาษี" must appear prominently */}
      <div style={{ textAlign: "center", borderTop: "2px solid #6d28d9", borderBottom: "2px solid #6d28d9", padding: "2mm 0", marginBottom: "4mm" }}>
        <div style={{ fontSize: "6pt", color: "#6d28d9", letterSpacing: "1px", marginBottom: "0.5mm" }}>
          {dict.taxInvoiceTitle}
        </div>
        <div style={{ fontSize: "13pt", fontWeight: 700, color: "#6d28d9" }}>ใบกำกับภาษีอย่างย่อ</div>
      </div>

      {/* Info rows */}
      <table style={{ width: "100%", fontSize: "8pt", marginBottom: "4mm", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ color: "#64748b", width: "30mm", paddingBottom: "1mm" }}>{dict.invoiceNo}</td>
            <td style={{ fontWeight: 600, paddingBottom: "1mm" }}>{invoiceNo}</td>
            <td style={{ color: "#64748b", width: "18mm", textAlign: "right", paddingBottom: "1mm" }}>{dict.date}</td>
            {/* §86/4 item 7 — date */}
            <td style={{ textAlign: "right", paddingBottom: "1mm" }}>{dateStr}</td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", paddingBottom: "1mm" }}>{dict.reference}</td>
            <td colSpan={3} style={{ fontFamily: "monospace", fontSize: "7.5pt", color: "#475569", paddingBottom: "1mm" }}>{sale.sale_number ?? ""}</td>
          </tr>
          {/* §86/4 item 3 — buyer name (short form can omit address/TIN for retail POS) */}
          <tr>
            <td style={{ color: "#64748b", paddingBottom: "1mm" }}>{dict.customer}</td>
            <td colSpan={3} style={{ fontWeight: 500, paddingBottom: "1mm" }}>{customerName}</td>
          </tr>
          {sale.customer_phone && (
            <tr>
              <td style={{ color: "#64748b", paddingBottom: "1mm" }}>{dict.phone}</td>
              <td colSpan={3} style={{ paddingBottom: "1mm" }}>{sale.customer_phone}</td>
            </tr>
          )}
          <tr>
            <td style={{ color: "#64748b" }}>{dict.paymentMethod}</td>
            <td colSpan={3}>{paymentLabel(sale.payment_method, dict)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderTop: "0.5px solid #cbd5e1", marginBottom: "3mm" }} />

      {/* §86/4 item 5 — items */}
      <table style={{ width: "100%", fontSize: "7.5pt", borderCollapse: "collapse", marginBottom: "3mm" }}>
        <thead>
          <tr style={{ backgroundColor: "#ede9fe" }}>
            <th style={{ padding: "1.5mm 2mm", textAlign: "left", borderBottom: "1px solid #c4b5fd", width: "6mm" }}>{dict.no}</th>
            <th style={{ padding: "1.5mm 2mm", textAlign: "left", borderBottom: "1px solid #c4b5fd" }}>{dict.description}</th>
            <th style={{ padding: "1.5mm 2mm", textAlign: "center", width: "12mm", borderBottom: "1px solid #c4b5fd" }}>{dict.quantity}</th>
            <th style={{ padding: "1.5mm 2mm", textAlign: "right", width: "22mm", borderBottom: "1px solid #c4b5fd" }}>{dict.unitPrice}</th>
            <th style={{ padding: "1.5mm 2mm", textAlign: "right", width: "22mm", borderBottom: "1px solid #c4b5fd" }}>{dict.amount}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const lineTotal = item.line_total ?? 0;
            return (
              <tr key={item.id ?? i} style={{ borderBottom: "0.5px solid #f1f5f9" }}>
                <td style={{ padding: "1.5mm 2mm", color: "#94a3b8", textAlign: "center" }}>{i + 1}</td>
                <td style={{ padding: "1.5mm 2mm" }}>{item.product_name ?? ""}</td>
                <td style={{ padding: "1.5mm 2mm", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ padding: "1.5mm 2mm", textAlign: "right", fontFamily: "monospace" }}>{fmt(item.unit_price ?? 0)}</td>
                <td style={{ padding: "1.5mm 2mm", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{fmt(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ borderTop: "0.5px solid #cbd5e1", marginBottom: "3mm" }} />

      {/* §86/4 item 6 — VAT MUST be a separate explicit line */}
      <table style={{ width: "100%", fontSize: "8pt", borderCollapse: "collapse", marginBottom: "4mm" }}>
        <tbody>
          {itemDiscountTotal > 0 && (
            <tr>
              <td style={{ padding: "1mm 2mm", color: "#64748b" }}>{dict.itemDiscount}</td>
              <td style={{ padding: "1mm 2mm", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>-{fmt(itemDiscountTotal)}</td>
            </tr>
          )}
          {billDiscount > 0 && (
            <tr>
              <td style={{ padding: "1mm 2mm", color: "#64748b" }}>{dict.billDiscount}</td>
              <td style={{ padding: "1mm 2mm", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>-{fmt(billDiscount)}</td>
            </tr>
          )}
          {vatAmt > 0 && (
            <tr>
              <td style={{ padding: "1mm 2mm", color: "#64748b" }}>{dict.beforeVat}</td>
              <td style={{ padding: "1mm 2mm", textAlign: "right", fontFamily: "monospace" }}>{fmt(beforeVat)}</td>
            </tr>
          )}
          {/* VAT line — explicitly separate per Revenue Code §86/4 item 6 */}
          <tr style={{ borderTop: "0.5px solid #e2e8f0" }}>
            <td style={{ padding: "1.5mm 2mm", color: "#64748b" }}>
              {dict.vat} {sale.vat_percent ?? 7}%
              <span style={{ fontSize: "6.5pt", color: "#94a3b8", marginLeft: "2mm" }}>
                ({sale.vat_included ? dict.vatIncluded : dict.vatExcluded})
              </span>
            </td>
            <td style={{ padding: "1.5mm 2mm", textAlign: "right", fontFamily: "monospace" }}>
              {vatAmt > 0 ? fmt(vatAmt) : "0.00"}
            </td>
          </tr>
          <tr style={{ borderTop: "2px solid #6d28d9" }}>
            <td style={{ padding: "2mm 2mm", fontWeight: 700, fontSize: "11pt" }}>{dict.total}</td>
            <td style={{ padding: "2mm 2mm", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: "12pt", color: "#6d28d9" }}>
              {fmt(total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Note */}
      {sale.note && (
        <div style={{ fontSize: "7.5pt", color: "#64748b", marginBottom: "3mm" }}>
          <span style={{ fontWeight: 500 }}>{dict.note}:</span> {sale.note}
        </div>
      )}

      <SignatureBlock
        leftTH="ผู้รับเงิน"
        leftEN="Received By"
        rightTH="ผู้จ่ายเงิน"
        rightEN="Paid By"
      />
    </div>
  );
}
