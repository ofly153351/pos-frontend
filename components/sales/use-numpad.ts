"use client";

import { useRef, useState } from "react";
import { parsePaidAmountAsCeilInt } from "./utils/sales-calculations";

type AmountNumpadField = "bill_discount" | "paid_amount";

type QuantityNumpadState = {
  max: number;
  productId: string;
  value: string;
};

type AmountNumpadState = {
  field: AmountNumpadField;
  value: string;
};

/**
 * All quantity numpad + amount numpad state and handlers,
 * factored out of the main sales-manager component.
 */
export function useNumpad({
  billDiscount,
  paidAmount,
  onBillDiscountChange,
  onPaidAmountChange,
  onQuantityApply,
}: {
  billDiscount: string;
  paidAmount: string;
  onBillDiscountChange: (v: string) => void;
  onPaidAmountChange: (v: string) => void;
  onQuantityApply: (productId: string, value: number) => void;
}) {
  // ── Quantity numpad ──
  const [quantityNumpad, setQuantityNumpad] = useState<QuantityNumpadState | null>(null);
  const [isQuantityNumpadOpen, setIsQuantityNumpadOpen] = useState(false);
  const numpadCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openQuantityNumpad(productId: string, currentQuantity: number, maxQuantity: number) {
    if (numpadCloseTimeoutRef.current) {
      clearTimeout(numpadCloseTimeoutRef.current);
      numpadCloseTimeoutRef.current = null;
    }
    setQuantityNumpad({ max: maxQuantity, productId, value: String(currentQuantity) });
    setIsQuantityNumpadOpen(true);
  }

  function closeQuantityNumpad() {
    setIsQuantityNumpadOpen(false);
    numpadCloseTimeoutRef.current = setTimeout(() => {
      setQuantityNumpad(null);
    }, 260);
  }

  function appendNumpadDigit(digit: string) {
    setQuantityNumpad((current) => {
      if (!current) return current;
      const nextValue = current.value === "0" ? digit : `${current.value}${digit}`;
      return { ...current, value: nextValue.slice(0, 6) };
    });
  }

  function clearNumpadValue() {
    setQuantityNumpad((current) => (current ? { ...current, value: "" } : current));
  }

  function backspaceNumpadValue() {
    setQuantityNumpad((current) => {
      if (!current) return current;
      return { ...current, value: current.value.slice(0, -1) };
    });
  }

  function onNumpadInputChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setQuantityNumpad((current) => (current ? { ...current, value: digitsOnly } : current));
  }

  function onNumpadInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); closeQuantityNumpad(); return; }
    if (event.key === "Enter") { event.preventDefault(); applyNumpadQuantity(); return; }
    if (event.key === "Backspace") { event.preventDefault(); backspaceNumpadValue(); }
  }

  function applyNumpadQuantity() {
    if (!quantityNumpad) return;
    const parsed = Number.parseInt(quantityNumpad.value, 10);
    if (Number.isNaN(parsed)) {
      onQuantityApply(quantityNumpad.productId, 1);
    } else {
      const clamped = Math.min(Math.max(parsed, 1), quantityNumpad.max);
      onQuantityApply(quantityNumpad.productId, clamped);
    }
    closeQuantityNumpad();
  }

  // ── Amount numpad ──
  const [amountNumpad, setAmountNumpad] = useState<AmountNumpadState | null>(null);
  const [isAmountNumpadOpen, setIsAmountNumpadOpen] = useState(false);

  function openAmountNumpad(field: AmountNumpadField) {
    const initialValue = field === "bill_discount" ? billDiscount : paidAmount;
    setAmountNumpad({ field, value: initialValue || "" });
    setIsAmountNumpadOpen(true);
  }

  function closeAmountNumpad() {
    setIsAmountNumpadOpen(false);
    setAmountNumpad(null);
  }

  function appendAmountNumpadDigit(digit: string) {
    setAmountNumpad((current) => {
      if (!current) return current;
      const nextValue = `${current.value}${digit}`;
      const pattern = current.field === "paid_amount" ? /^\d*$/ : /^\d*(\.\d{0,2})?$/;
      if (!pattern.test(nextValue)) return current;
      return { ...current, value: nextValue };
    });
  }

  function appendAmountNumpadDecimal() {
    setAmountNumpad((current) => {
      if (!current || current.field === "paid_amount" || current.value.includes(".")) return current;
      return { ...current, value: current.value ? `${current.value}.` : "0." };
    });
  }

  function clearAmountNumpadValue() {
    setAmountNumpad((current) => (current ? { ...current, value: "" } : current));
  }

  function backspaceAmountNumpadValue() {
    setAmountNumpad((current) => {
      if (!current) return current;
      return { ...current, value: current.value.slice(0, -1) };
    });
  }

  function onAmountNumpadInputChange(value: string) {
    setAmountNumpad((current) => {
      if (!current) return current;
      const pattern = current.field === "paid_amount" ? /^\d*$/ : /^\d*(\.\d{0,2})?$/;
      if (!pattern.test(value)) return current;
      return { ...current, value };
    });
  }

  function onAmountNumpadInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); closeAmountNumpad(); return; }
    if (event.key === "Enter") { event.preventDefault(); applyAmountNumpad(); return; }
    if (event.key === "Backspace") { event.preventDefault(); backspaceAmountNumpadValue(); }
  }

  function applyAmountNumpad() {
    if (!amountNumpad) return;
    if (amountNumpad.field === "bill_discount") {
      onBillDiscountChange(amountNumpad.value);
    } else {
      onPaidAmountChange(
        amountNumpad.value
          ? String(parsePaidAmountAsCeilInt(amountNumpad.value))
          : "",
      );
    }
    closeAmountNumpad();
  }

  return {
    // quantity numpad
    quantityNumpad,
    isQuantityNumpadOpen,
    openQuantityNumpad,
    closeQuantityNumpad,
    appendNumpadDigit,
    clearNumpadValue,
    backspaceNumpadValue,
    onNumpadInputChange,
    onNumpadInputKeyDown,
    applyNumpadQuantity,
    // amount numpad
    amountNumpad,
    isAmountNumpadOpen,
    openAmountNumpad,
    closeAmountNumpad,
    appendAmountNumpadDigit,
    appendAmountNumpadDecimal,
    clearAmountNumpadValue,
    backspaceAmountNumpadValue,
    onAmountNumpadInputChange,
    onAmountNumpadInputKeyDown,
    applyAmountNumpad,
    // cleanup ref (for useEffect return)
    numpadCloseTimeoutRef,
  };
}
