"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatCurrency, formatDateTime } from "./utils/sales-calculations";

type Dict = {
  restoreBillDrawerTitle: string;
  closeReceiptButton: string;
  noParkedBillsLabel: string;
  productCountLabel: string;
  restoreBillConfirmLabel: string;
};

type Props = {
  isOpen: boolean;
  bills: any[];
  cartLength: number;
  onClose: () => void;
  onConfirmRestore: (bill: any) => void;
  dictionary: Dict;
};

export function ParkedBillsDrawer({
  isOpen,
  bills,
  cartLength,
  onClose,
  onConfirmRestore,
  dictionary,
}: Props) {
  const [confirmBill, setConfirmBill] = useState<any | null>(null);

  if (!isOpen && !confirmBill) {
    return null;
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6 smooth-fade">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl smooth-fade-up">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-950">
                {dictionary.restoreBillDrawerTitle}
              </h3>
              <button
                className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={onClose}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            <div className="mt-4 max-h-[60dvh] space-y-2 overflow-y-auto">
              {bills.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {dictionary.noParkedBillsLabel}
                </p>
              ) : (
                bills.map((bill) => {
                  const itemCount = bill.items?.length ?? 0;
                  const totalAmount = (bill.items ?? []).reduce(
                    (sum: number, item: any) => {
                      const price = Number(item.base_price ?? item.price ?? 0);
                      return sum + price * (item.quantity ?? 0);
                    },
                    0,
                  );

                  return (
                    <button
                      key={bill.id}
                      className="w-full rounded-lg border border-violet-100 bg-white p-4 text-left transition hover:bg-violet-50 hover:border-violet-300"
                      onClick={() => setConfirmBill(bill)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {bill.label}
                        </span>
                        <span className="text-sm font-medium text-violet-600">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span>
                          {itemCount} {dictionary.productCountLabel}
                        </span>
                        <span>•</span>
                        <span>{formatDateTime(bill.created_at)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {confirmBill && (() => {
        const bill = confirmBill;
        const itemCount = bill.items?.length ?? 0;
        const totalAmount = (bill.items ?? []).reduce(
          (sum: number, item: any) => sum + Number(item.base_price ?? item.price ?? 0) * (item.quantity ?? 0),
          0,
        );
        return (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center bg-indigo-950/60 p-4 backdrop-blur-sm smooth-fade"
            onClick={() => setConfirmBill(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-violet-100 bg-white shadow-2xl smooth-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-violet-100 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                  <ChevronDown className="h-5 w-5 rotate-90 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">เรียกบิลคืน</h3>
                  <p className="text-xs text-slate-500">บิลนี้จะถูกโหลดเข้าตะกร้าปัจจุบัน</p>
                </div>
              </div>

              {/* Bill preview */}
              <div className="mx-5 my-4 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{bill.label || "บิลไม่มีชื่อ"}</span>
                  <span className="text-sm font-bold text-violet-700">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span>{itemCount} รายการ</span>
                  <span>•</span>
                  <span>{formatDateTime(bill.created_at)}</span>
                </div>
              </div>

              {/* Warning if cart has items */}
              {cartLength > 0 && (
                <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  <span className="mt-px shrink-0 font-bold">⚠</span>
                  <span>ตะกร้าปัจจุบันมี {cartLength} รายการ จะถูกแทนที่ด้วยบิลที่เลือก</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-violet-100 px-5 py-4">
                <button
                  className="rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50"
                  onClick={() => setConfirmBill(null)}
                  type="button"
                >
                  ยกเลิก
                </button>
                <button
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
                  onClick={() => {
                    onConfirmRestore(bill);
                    setConfirmBill(null);
                  }}
                  type="button"
                >
                  เรียกบิลคืน
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
