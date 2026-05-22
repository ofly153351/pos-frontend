"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, Printer, Trash2, X } from "lucide-react";

import { ProductBrowser } from "@/components/sales/product-browser";
import type {
  ProductViewMode,
  SalesDictionary,
} from "@/components/sales/types";
import {
  listCustomerLevelDiscounts,
  listCustomers,
} from "@/services/customers";
import { createInvoice } from "@/services/invoices";
import { listProducts } from "@/services/products";
import {
  calculateVat,
  createParkedBill,
  createSale,
  deleteParkedBill,
  getSaleReceiptPreviewHtml,
  listParkedBills,
} from "@/services/sales";
import type { Customer, CustomerLevelDiscount } from "@/types/customer";
import type { Product } from "@/types/product";
import type {
  SaleDiscountType,
  SalePaymentMethod,
  VatCalculateSummary,
} from "@/types/sale";

type CartItem = {
  discountType: SaleDiscountType;
  discountValue: string;
  product: Product;
  quantity: number;
};

type QuantityNumpadState = {
  max: number;
  productId: string;
  value: string;
};
type AmountNumpadField = "bill_discount" | "paid_amount";

type AmountNumpadState = {
  field: AmountNumpadField;
  value: string;
};

export type SalesManagerHandle = {
  toggleVat: () => void;
  holdBill: () => void;
  restoreBill: () => void;
  toggleNote: () => void;
  clearCartExternal: () => void;
  openActions: () => void;
};

type SalesManagerProps = {
  dictionary: SalesDictionary;
  onCartItemsChange?: (count: number) => void;
  externalSearch?: string;
  onExternalSearchChange?: (value: string) => void;
  onCartStateChange?: (state: { applyVat: boolean; showNoteField: boolean }) => void;
};

const productViewStorageKey = "pos-sales-product-view";
const applyVatStorageKey = "pos-sales-apply-vat";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function parsePaidAmountAsCeilInt(value: string) {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(Math.ceil(parsed), 0);
}

function removeReceiptPreviewToolbar(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelector(".toolbar")?.remove();
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --receipt-paper-width: 360px;
    }

    html,
    body {
      max-width: 100%;
      overflow-x: hidden;
    }

    body {
      background: #f8fafc !important;
      margin: 0 !important;
      width: auto !important;
    }

    .stage {
      box-sizing: border-box;
      max-width: 100%;
      overflow-x: hidden;
      padding-left: 12px !important;
      padding-right: 12px !important;
    }

    .paper {
      box-sizing: border-box;
      max-width: 100%;
      overflow: visible !important;
      width: min(var(--receipt-paper-width), 100%) !important;
    }

    .paper > style,
    .paper > meta,
    .paper > title {
      display: none !important;
    }

    @media (max-width: 383px) {
      .stage {
        transform: scale(calc((100vw - 24px) / 384));
        transform-origin: top center;
        width: 384px;
      }
    }

    img,
    table {
      max-width: 100%;
    }
  `;
  document.head.appendChild(style);

  return document.documentElement.outerHTML;
}

function getDiscountPerUnit(item: CartItem) {
  const unitPrice = Number(item.product.effective_price ?? 0);
  const rawValue = Number(item.discountValue || 0);
  const discountValue = Number.isFinite(rawValue) ? rawValue : 0;

  if (item.discountType === "percent") {
    return (unitPrice * Math.min(Math.max(discountValue, 0), 100)) / 100;
  }

  return Math.min(Math.max(discountValue, 0), unitPrice);
}

function getCartLine(item: CartItem) {
  const unitPrice = Number(item.product.effective_price ?? 0);
  const discountPerUnit = getDiscountPerUnit(item);
  const lineSubtotal = unitPrice * item.quantity;
  const lineDiscount = discountPerUnit * item.quantity;
  const lineTotal = Math.max(lineSubtotal - lineDiscount, 0);

  return {
    lineDiscount,
    lineSubtotal,
    lineTotal,
    unitPrice,
  };
}

export const SalesManager = forwardRef<SalesManagerHandle, SalesManagerProps>(function SalesManager({
  dictionary,
  onCartItemsChange,
  externalSearch,
  onExternalSearchChange,
  onCartStateChange,
}: SalesManagerProps, ref) {
  const [hasMounted, setHasMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLevelDiscounts, setCustomerLevelDiscounts] = useState<
    CustomerLevelDiscount[]
  >([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Notify parent when cart items change (for cashier modal close confirmation)
  useEffect(() => {
    onCartItemsChange?.(cart.length);
  }, [cart, onCartItemsChange]);
  const [internalSearch, setInternalSearch] = useState("");
  const search = externalSearch !== undefined ? externalSearch : internalSearch;
  const setSearch = onExternalSearchChange ?? setInternalSearch;
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productView, setProductView] = useState<ProductViewMode>("grid");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSettlementMode, setCustomerSettlementMode] = useState<
    "cash_now" | "invoice"
  >("cash_now");
  const [note, setNote] = useState("");
  const [billDiscount, setBillDiscount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [quantityNumpad, setQuantityNumpad] =
    useState<QuantityNumpadState | null>(null);
  const [isQuantityNumpadOpen, setIsQuantityNumpadOpen] = useState(false);
  const [amountNumpad, setAmountNumpad] = useState<AmountNumpadState | null>(
    null,
  );
  const [isAmountNumpadOpen, setIsAmountNumpadOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [applyVat, setApplyVat] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(applyVatStorageKey);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isCheckoutSummaryOpen, setIsCheckoutSummaryOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(applyVatStorageKey, String(applyVat));
    } catch {
      /* ignore */
    }
  }, [applyVat]);
  const [discountEditorProductId, setDiscountEditorProductId] = useState<
    string | null
  >(null);
  const [showNoteField, setShowNoteField] = useState(false);
  const [nameTooltip, setNameTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [isBillDiscountFieldOpen, setIsBillDiscountFieldOpen] = useState(false);
  const [billDiscountType, setBillDiscountType] = useState<
    "amount" | "percent"
  >("amount");
  const [isPaidAmountTouched, setIsPaidAmountTouched] = useState(false);
  const [lastQuickCashAmount, setLastQuickCashAmount] = useState<number | null>(
    null,
  );
  const [vatSummary, setVatSummary] = useState<VatCalculateSummary | null>(
    null,
  );
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPrintPromptOpen, setIsPrintPromptOpen] = useState(false);
  const [isReceiptPreviewLoading, setIsReceiptPreviewLoading] = useState(false);
  const [receiptPreviewHtml, setReceiptPreviewHtml] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isRestoreDrawerOpen, setIsRestoreDrawerOpen] = useState(false);
  const [parkedBills, setParkedBills] = useState<any[]>([]);
  const [isHoldingBill, setIsHoldingBill] = useState(false);
  const [holdBillLabel, setHoldBillLabel] = useState("");
  const numpadCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const receiptPreviewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const cartScrollRef = useRef<HTMLDivElement | null>(null);
  const previousCartLengthRef = useRef(0);
  const barcodeBufferRef = useRef("");
  const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const savedView = window.localStorage.getItem(productViewStorageKey);
    if (savedView === "grid" || savedView === "list") {
      setProductView(savedView);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(productViewStorageKey, productView);
  }, [productView]);

  useEffect(() => {
    return () => {
      if (numpadCloseTimeoutRef.current) {
        clearTimeout(numpadCloseTimeoutRef.current);
      }

      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    startTransition(async () => {
      try {
        const [productsResponse, customersResponse, discountResponse] =
          await Promise.all([
            listProducts({ limit: 500 }),
            listCustomers(),
            listCustomerLevelDiscounts(),
          ]);

        setProducts(productsResponse.data?.items ?? []);
        setCustomers(customersResponse.data ?? []);
        setCustomerLevelDiscounts(discountResponse.data ?? []);
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "Request failed",
        );
      }
    });
  }, []);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach((product) => {
      const name = product.product_type_name ?? product.product_type?.name;
      if (name) {
        categorySet.add(name);
      }
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const saleableProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!product.is_active || (product.total_stock ?? 0) <= 0) {
        return false;
      }

      // Filter by selected category
      if (selectedCategory) {
        const productCategory =
          product.product_type_name ?? product.product_type?.name ?? "";
        if (productCategory !== selectedCategory) {
          return false;
        }
      }

      if (!keyword) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(keyword) ||
        (product.sku ?? "").toLowerCase().includes(keyword) ||
        (product.product_type_name ?? product.product_type?.name ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [products, search, selectedCategory]);
  const saleableSkuMap = useMemo(() => {
    const nextMap = new Map<string, Product>();

    saleableProducts.forEach((product) => {
      const sku = (product.sku ?? "").trim().toLowerCase();
      if (sku) {
        nextMap.set(sku, product);
      }
    });

    return nextMap;
  }, [saleableProducts]);

  const cartSummary = useMemo(() => {
    return cart.reduce(
      (sum, item) => {
        const line = getCartLine(item);

        return {
          discountAmount: sum.discountAmount + line.lineDiscount,
          subtotal: sum.subtotal + line.lineSubtotal,
          total: sum.total + line.lineTotal,
        };
      },
      {
        discountAmount: 0,
        subtotal: 0,
        total: 0,
      },
    );
  }, [cart]);

  const selectedCustomer = useMemo(() => {
    return (
      customers.find((customer) => customer.id === selectedCustomerId) ?? null
    );
  }, [customers, selectedCustomerId]);

  const customerDiscountPercent = useMemo(() => {
    if (!selectedCustomer) {
      return 0;
    }

    const customerLevel = Number(selectedCustomer.level ?? 1);
    const matchedRule = customerLevelDiscounts.find(
      (rule) => rule.level === customerLevel,
    );

    return Number(matchedRule?.discount_percent ?? 0);
  }, [customerLevelDiscounts, selectedCustomer]);

  const customerDiscountAmount = useMemo(() => {
    return (
      (cartSummary.total *
        Math.min(Math.max(customerDiscountPercent, 0), 100)) /
      100
    );
  }, [cartSummary.total, customerDiscountPercent]);

  const parsedBillDiscount = Number(billDiscount || 0);
  const sanitizedBillDiscount = Number.isFinite(parsedBillDiscount)
    ? parsedBillDiscount
    : 0;
  const billDiscountBase = Math.max(
    cartSummary.total - customerDiscountAmount,
    0,
  );
  const billDiscountPercent = Math.min(Math.max(sanitizedBillDiscount, 0), 100);
  const maxBillDiscount = billDiscountBase;
  const billDiscountAmount =
    billDiscountType === "percent"
      ? Math.min(
          (billDiscountBase * billDiscountPercent) / 100,
          maxBillDiscount,
        )
      : Math.min(Math.max(sanitizedBillDiscount, 0), maxBillDiscount);
  const totalDiscountAmount =
    cartSummary.discountAmount + customerDiscountAmount + billDiscountAmount;
  const payableTotal = Math.max(
    cartSummary.total - customerDiscountAmount - billDiscountAmount,
    0,
  );
  const vatAmount = applyVat ? roundCurrency(payableTotal * 0.07) : 0;
  const settlementTotal = applyVat
    ? roundCurrency(payableTotal + vatAmount)
    : roundCurrency(payableTotal);
  const isNetworkCustomerSelected = Boolean(selectedCustomerId);
  const isInvoiceSettlement =
    isNetworkCustomerSelected && customerSettlementMode === "invoice";
  const customerTypeLabel = isNetworkCustomerSelected
    ? dictionary.customerTypeNetwork
    : dictionary.customerTypeGeneral;

  const paidAmountValue = parsePaidAmountAsCeilInt(paidAmount);
  const effectivePaidAmount = isInvoiceSettlement ? 0 : paidAmountValue;
  const changeAmount = effectivePaidAmount - settlementTotal;
  const quickCashOptions = useMemo(() => {
    const baseOptions = [5, 10, 20, 50, 100, 500, 1000];
    const settlementQuickAmount = Math.ceil(Math.max(settlementTotal, 0));

    if (
      settlementQuickAmount > 0 &&
      !baseOptions.includes(settlementQuickAmount)
    ) {
      return [
        ...baseOptions.map((amount) => ({ amount, isExact: false })),
        { amount: settlementQuickAmount, isExact: true },
      ];
    }

    return baseOptions.map((amount) => ({ amount, isExact: false }));
  }, [settlementTotal]);
  const discountEditorItem = useMemo(() => {
    if (!discountEditorProductId) {
      return null;
    }

    return (
      cart.find((item) => item.product.id === discountEditorProductId) ?? null
    );
  }, [cart, discountEditorProductId]);

  useEffect(() => {
    const previousLength = previousCartLengthRef.current;

    if (cart.length > previousLength) {
      const scrollContainer = cartScrollRef.current;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }

    previousCartLengthRef.current = cart.length;
  }, [cart.length]);

  useEffect(() => {
    if (!applyVat || cart.length === 0) {
      setVatSummary(null);
      return;
    }

    let isCancelled = false;

    startTransition(async () => {
      try {
        const response = await calculateVat({
          discount_bill: customerDiscountAmount + billDiscountAmount,
          items: cart.map((item) => {
            const line = getCartLine(item);

            return {
              code: item.product.sku ?? undefined,
              discount_per_unit: getDiscountPerUnit(item),
              name: item.product.name,
              price: line.unitPrice,
              qty: item.quantity,
            };
          }),
          vat_included: false,
          vat_percent: 7,
        });

        if (!isCancelled) {
          setVatSummary(response.data.summary);
        }
      } catch {
        if (!isCancelled) {
          setVatSummary(null);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [
    applyVat,
    billDiscountAmount,
    cart,
    customerDiscountAmount,
    startTransition,
  ]);

  useEffect(() => {
    if (isInvoiceSettlement && billDiscount) {
      setBillDiscount("");
    }
  }, [billDiscount, isInvoiceSettlement]);

  useEffect(() => {
    if (isInvoiceSettlement) {
      setPaidAmount("");
      setIsPaidAmountTouched(false);
      setLastQuickCashAmount(null);
      return;
    }

    if (!isPaidAmountTouched) {
      setPaidAmount(String(Math.ceil(Math.max(settlementTotal, 0))));
      setLastQuickCashAmount(null);
    }
  }, [isInvoiceSettlement, isPaidAmountTouched, settlementTotal]);

  async function reloadData() {
    const [productsResponse, customersResponse, discountResponse] =
      await Promise.all([
        listProducts({ limit: 500 }),
        listCustomers(),
        listCustomerLevelDiscounts(),
      ]);

    setProducts(productsResponse.data?.items ?? []);
    setCustomers(customersResponse.data ?? []);
    setCustomerLevelDiscounts(discountResponse.data ?? []);
  }

  function clearCart() {
    setCart([]);
    setSelectedCustomerId("");
    setCustomerSettlementMode("cash_now");
    setBillDiscount("");
    setNote("");
    setPaidAmount("");
    setApplyVat(true);
    setIsActionsMenuOpen(false);
    setIsCheckoutSummaryOpen(false);
    setDiscountEditorProductId(null);
    setShowNoteField(false);
    setIsBillDiscountFieldOpen(false);
    setBillDiscountType("amount");
    setIsPaidAmountTouched(false);
    setLastQuickCashAmount(null);
    setPaymentMethod("cash");
  }

  useImperativeHandle(ref, () => ({
    toggleVat: () => { setApplyVat((v) => !v); setIsPaidAmountTouched(false); },
    holdBill: () => { setHoldBillLabel(""); setIsHoldingBill(true); },
    restoreBill: () => {
      void (async () => {
        try { const r = await listParkedBills(); setParkedBills(r.data ?? []); }
        catch { setParkedBills([]); }
        setIsRestoreDrawerOpen(true);
      })();
    },
    toggleNote: () => setShowNoteField((c) => !c),
    clearCartExternal: clearCart,
    openActions: () => setIsActionsMenuOpen(true),
  }));

  useEffect(() => {
    onCartStateChange?.({ applyVat, showNoteField });
  }, [applyVat, showNoteField, onCartStateChange]);

  function applyQuickCash(addAmount: number, isExact = false) {
    setPaidAmount((currentValue) => {
      // Exact-amount button: always set to the bill total, never accumulate
      if (isExact) {
        return String(addAmount);
      }

      if (!isPaidAmountTouched || lastQuickCashAmount !== addAmount) {
        return String(addAmount);
      }

      const base = parsePaidAmountAsCeilInt(currentValue);
      return String(base + addAmount);
    });
    setLastQuickCashAmount(addAmount);
    setIsPaidAmountTouched(true);
  }

  function addToCart(product: Product) {
    setError("");
    setSuccessMessage("");
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id,
      );

      if (!existingItem) {
        return [
          ...currentCart,
          {
            discountType: "amount",
            discountValue: "0",
            product,
            quantity: 1,
          },
        ];
      }

      if (existingItem.quantity >= (product.total_stock ?? 0)) {
        return currentCart;
      }

      return currentCart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  useEffect(() => {
    function clearBarcodeBuffer() {
      barcodeBufferRef.current = "";
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
        barcodeTimeoutRef.current = null;
      }
    }

    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      );
    }

    function handleScannerKeydown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "Enter") {
        const scannedCode = barcodeBufferRef.current.trim().toLowerCase();
        clearBarcodeBuffer();

        if (!scannedCode) {
          return;
        }

        const matchedProduct = saleableSkuMap.get(scannedCode);
        if (matchedProduct) {
          addToCart(matchedProduct);
          setError("");
          return;
        }

        setError(`${dictionary.unavailableProduct} (${scannedCode})`);
        return;
      }

      if (
        event.key.length !== 1 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      barcodeBufferRef.current += event.key;
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }

      // Barcode scanners usually stream keys quickly; reset when input pauses.
      barcodeTimeoutRef.current = setTimeout(() => {
        barcodeBufferRef.current = "";
        barcodeTimeoutRef.current = null;
      }, 250);
    }

    window.addEventListener("keydown", handleScannerKeydown);

    return () => {
      window.removeEventListener("keydown", handleScannerKeydown);
    };
  }, [addToCart, dictionary.unavailableProduct, saleableSkuMap]);

  function updateCartQuantity(productId: string, nextQuantity: number) {
    setCart((currentCart) => {
      if (nextQuantity <= 0) {
        if (discountEditorProductId === productId) {
          setDiscountEditorProductId(null);
        }
        return currentCart.filter((item) => item.product.id !== productId);
      }

      return currentCart.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        return {
          ...item,
          quantity: Math.min(nextQuantity, item.product.total_stock ?? 0),
        };
      });
    });
  }

  function updateCartDiscountType(
    productId: string,
    discountType: SaleDiscountType,
  ) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId ? { ...item, discountType } : item,
      ),
    );
  }

  function updateCartDiscountValue(productId: string, discountValue: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId ? { ...item, discountValue } : item,
      ),
    );
  }

  useEffect(() => {
    if (!discountEditorProductId) {
      return;
    }

    const stillExists = cart.some(
      (item) => item.product.id === discountEditorProductId,
    );
    if (!stillExists) {
      setDiscountEditorProductId(null);
    }
  }, [cart, discountEditorProductId]);

  function openQuantityNumpad(
    productId: string,
    currentQuantity: number,
    maxQuantity: number,
  ) {
    if (numpadCloseTimeoutRef.current) {
      clearTimeout(numpadCloseTimeoutRef.current);
      numpadCloseTimeoutRef.current = null;
    }

    setQuantityNumpad({
      max: maxQuantity,
      productId,
      value: String(currentQuantity),
    });
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
      if (!current) {
        return current;
      }

      const nextValue =
        current.value === "0" ? digit : `${current.value}${digit}`;
      return { ...current, value: nextValue.slice(0, 6) };
    });
  }

  function clearNumpadValue() {
    setQuantityNumpad((current) =>
      current ? { ...current, value: "" } : current,
    );
  }

  function backspaceNumpadValue() {
    setQuantityNumpad((current) => {
      if (!current) {
        return current;
      }

      return { ...current, value: current.value.slice(0, -1) };
    });
  }

  function onNumpadInputChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setQuantityNumpad((current) =>
      current ? { ...current, value: digitsOnly } : current,
    );
  }

  function onNumpadInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeQuantityNumpad();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      applyNumpadQuantity();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      backspaceNumpadValue();
    }
  }

  function applyNumpadQuantity() {
    if (!quantityNumpad) {
      return;
    }

    const parsed = Number.parseInt(quantityNumpad.value, 10);

    if (Number.isNaN(parsed)) {
      updateCartQuantity(quantityNumpad.productId, 1);
      closeQuantityNumpad();
      return;
    }

    const clamped = Math.min(Math.max(parsed, 1), quantityNumpad.max);
    updateCartQuantity(quantityNumpad.productId, clamped);
    closeQuantityNumpad();
  }

  function openAmountNumpad(field: AmountNumpadField) {
    const initialValue = field === "bill_discount" ? billDiscount : paidAmount;
    setAmountNumpad({
      field,
      value: initialValue || "",
    });
    setIsAmountNumpadOpen(true);
  }

  function closeAmountNumpad() {
    setIsAmountNumpadOpen(false);
    setAmountNumpad(null);
  }

  function appendAmountNumpadDigit(digit: string) {
    setAmountNumpad((current) => {
      if (!current) {
        return current;
      }

      const nextValue = `${current.value}${digit}`;
      const pattern =
        current.field === "paid_amount" ? /^\d*$/ : /^\d*(\.\d{0,2})?$/;

      if (!pattern.test(nextValue)) {
        return current;
      }

      return { ...current, value: nextValue };
    });
  }

  function appendAmountNumpadDecimal() {
    setAmountNumpad((current) => {
      if (
        !current ||
        current.field === "paid_amount" ||
        current.value.includes(".")
      ) {
        return current;
      }

      return { ...current, value: current.value ? `${current.value}.` : "0." };
    });
  }

  function clearAmountNumpadValue() {
    setAmountNumpad((current) =>
      current ? { ...current, value: "" } : current,
    );
  }

  function backspaceAmountNumpadValue() {
    setAmountNumpad((current) => {
      if (!current) {
        return current;
      }

      return { ...current, value: current.value.slice(0, -1) };
    });
  }

  function onAmountNumpadInputChange(value: string) {
    setAmountNumpad((current) => {
      if (!current) {
        return current;
      }

      const pattern =
        current.field === "paid_amount" ? /^\d*$/ : /^\d*(\.\d{0,2})?$/;
      if (!pattern.test(value)) {
        return current;
      }

      return { ...current, value };
    });
  }

  function onAmountNumpadInputKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAmountNumpad();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      applyAmountNumpad();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      backspaceAmountNumpadValue();
    }
  }

  function appendDiscountEditorDigit(digit: string) {
    if (!discountEditorItem) {
      return;
    }

    const current = discountEditorItem.discountValue || "";
    const nextValue = current === "0" ? digit : `${current}${digit}`;
    if (!/^\d*(\.\d{0,2})?$/.test(nextValue)) {
      return;
    }

    updateCartDiscountValue(discountEditorItem.product.id, nextValue);
  }

  function appendDiscountEditorDecimal() {
    if (!discountEditorItem) {
      return;
    }

    const current = discountEditorItem.discountValue || "";
    if (current.includes(".")) {
      return;
    }

    const nextValue = current ? `${current}.` : "0.";
    updateCartDiscountValue(discountEditorItem.product.id, nextValue);
  }

  function clearDiscountEditorValue() {
    if (!discountEditorItem) {
      return;
    }

    updateCartDiscountValue(discountEditorItem.product.id, "");
  }

  function backspaceDiscountEditorValue() {
    if (!discountEditorItem) {
      return;
    }

    updateCartDiscountValue(
      discountEditorItem.product.id,
      (discountEditorItem.discountValue || "").slice(0, -1),
    );
  }

  function onDiscountEditorInputChange(value: string) {
    if (!discountEditorItem) {
      return;
    }

    if (!/^\d*(\.\d{0,2})?$/.test(value)) {
      return;
    }

    updateCartDiscountValue(discountEditorItem.product.id, value);
  }

  function onDiscountEditorInputKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      setDiscountEditorProductId(null);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      setDiscountEditorProductId(null);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      backspaceDiscountEditorValue();
    }
  }

  function applyDiscountEditor() {
    setDiscountEditorProductId(null);
  }

  function applyAmountNumpad() {
    if (!amountNumpad) {
      return;
    }

    if (amountNumpad.field === "bill_discount") {
      setBillDiscount(amountNumpad.value);
    } else {
      setPaidAmount(
        amountNumpad.value
          ? String(parsePaidAmountAsCeilInt(amountNumpad.value))
          : "",
      );
      setIsPaidAmountTouched(true);
      setLastQuickCashAmount(null);
    }

    closeAmountNumpad();
  }

  function submitSale() {
    setError("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setError(dictionary.emptyCart);
      return;
    }

    if (!isInvoiceSettlement && paidAmountValue < settlementTotal) {
      setError(dictionary.insufficientPayment);
      return;
    }

    startTransition(async () => {
      try {
        const mappedItems = cart.map((item) => {
          const discountValue = Number(item.discountValue || 0);

          return {
            discount_type: discountValue > 0 ? item.discountType : undefined,
            discount_value: discountValue > 0 ? discountValue : undefined,
            product_id: item.product.id,
            quantity: item.quantity,
          };
        });

        if (isInvoiceSettlement) {
          await createInvoice({
            customer_id: selectedCustomerId,
            items: mappedItems,
            note: note.trim() || undefined,
            vat_included: false,
            vat_percent: applyVat ? 7 : 0,
          });

          clearCart();
          setSuccessMessage(dictionary.checkoutSuccess);
          await reloadData();
          return;
        }

        const response = await createSale({
          customer_id: selectedCustomerId || undefined,
          discount_bill:
            billDiscountAmount > 0 ? billDiscountAmount : undefined,
          items: mappedItems,
          note: note.trim() || undefined,
          paid_amount: paidAmountValue,
          payment_method: paymentMethod,
          vat_included: false,
          vat_percent: applyVat ? 7 : 0,
        });

        clearCart();
        setSuccessMessage(dictionary.checkoutSuccess);
        await reloadData();

        if (response.data?.id) {
          setReceiptPreviewHtml("");
          setIsPrintPromptOpen(true);
          void prepareReceiptPreview(response.data.id);
        }
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "Request failed",
        );
      }
    });
  }

  async function prepareReceiptPreview(saleId: string) {
    setIsReceiptPreviewLoading(true);

    try {
      const html = await getSaleReceiptPreviewHtml(saleId);
      setReceiptPreviewHtml(removeReceiptPreviewToolbar(html));
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Request failed",
      );
    } finally {
      setIsReceiptPreviewLoading(false);
    }
  }

  async function handlePrintFromPrompt() {
    const frameWindow = receiptPreviewFrameRef.current?.contentWindow;

    if (!frameWindow) {
      setError(dictionary.printWindowBlockedError);
      return;
    }

    frameWindow.focus();
    frameWindow.print();
    setIsPrintPromptOpen(false);
  }

  function closeReceiptPreview() {
    setIsPrintPromptOpen(false);
    setReceiptPreviewHtml("");
  }

  if (!hasMounted) {
    return (
      <section className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:p-8">
        <p className="text-sm text-slate-500">{dictionary.title}</p>
      </section>
    );
  }

  return (
    <>
      <section className="grid gap-6 xl:h-[calc(100dvh-8rem)] xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        <ProductBrowser
          categories={categories}
          dictionary={dictionary}
          error={error}
          getCartQuantity={(productId) =>
            cart.find((item) => item.product.id === productId)?.quantity ?? 0
          }
          onAddToCart={addToCart}
          onCategoryFilterChange={setSelectedCategory}
          onProductViewChange={setProductView}
          hideSearch={externalSearch !== undefined}
          onSearchChange={setSearch}
          productView={productView}
          products={saleableProducts}
          search={search}
          selectedCategory={selectedCategory}
          successMessage={successMessage}
        />

        {/* ── Right: Cart panel ── */}
        <div className="xl:h-full xl:min-h-0">
          <section className="flex h-full min-h-[74dvh] flex-col rounded-[2rem] border border-violet-100 bg-white shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:min-h-[78dvh]">
            {/* Header */}
            <div className="shrink-0 border-b border-violet-50 px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {dictionary.cartTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-violet-400">
                    {cart.length > 0
                      ? `สินค้า ${cart.length} รายการ`
                      : "ยังไม่มีสินค้า"}
                  </p>
                </div>
                <button
                  className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-100"
                  onClick={clearCart}
                  type="button"
                >
                  <Trash2 className="h-3 w-3" />
                  ล้าง
                </button>
              </div>

              {/* Summary bar */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-2.5">
                <button
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  onClick={() => setIsBillDiscountFieldOpen((c) => !c)}
                  type="button"
                >
                  <ChevronDown
                    className={`h-4 w-4 text-violet-400 transition-transform ${isBillDiscountFieldOpen ? "rotate-180" : ""}`}
                  />
                  {dictionary.netTotalLabel}
                </button>
                <span className="text-lg font-bold text-violet-700">
                  ฿{formatAmount(settlementTotal)}
                </span>
              </div>

              {/* Collapsible discount/note area */}
              {isBillDiscountFieldOpen && (
                <div className="mt-2 space-y-2 rounded-xl border border-violet-100 bg-white p-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-violet-700">
                      {dictionary.discountBillLabel}
                    </label>
                    <div className="flex items-stretch">
                      <input
                        className="w-full rounded-l-xl rounded-r-none border border-r-0 border-violet-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        inputMode="decimal"
                        min="0"
                        onClick={() => openAmountNumpad("bill_discount")}
                        onFocus={(e) => e.target.blur()}
                        placeholder="0.00"
                        readOnly
                        value={billDiscount}
                      />
                      <div className="flex items-center gap-1 rounded-r-xl border border-violet-200 bg-gradient-to-b from-violet-100/60 to-violet-50/60 p-1">
                        <button
                          className={`h-7 min-w-8 rounded-lg px-2 text-[11px] font-extrabold transition ${billDiscountType === "amount" ? "bg-gradient-to-b from-violet-600 to-violet-700 text-white" : "text-slate-600 hover:bg-white/90"}`}
                          onClick={() => setBillDiscountType("amount")}
                          type="button"
                        >
                          ฿
                        </button>
                        <button
                          className={`h-7 min-w-8 rounded-lg px-2 text-[11px] font-extrabold transition ${billDiscountType === "percent" ? "bg-gradient-to-b from-violet-600 to-violet-700 text-white" : "text-slate-600 hover:bg-white/90"}`}
                          onClick={() => setBillDiscountType("percent")}
                          type="button"
                        >
                          %
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{dictionary.summary.subtotalLabel}</span>
                    <span>฿{formatAmount(cartSummary.subtotal)}</span>
                  </div>
                  {totalDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-600">
                      <span>{dictionary.totalDiscountLabel}</span>
                      <span>-฿{formatAmount(totalDiscountAmount)}</span>
                    </div>
                  )}
                  {applyVat && (
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>VAT 7%</span>
                      <span>฿{formatAmount(vatAmount)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Note field */}
              {showNoteField && (
                <textarea
                  className="mt-2 min-h-16 w-full rounded-xl border border-violet-200 bg-violet-50/30 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={dictionary.notePlaceholder}
                  value={note}
                />
              )}
            </div>

            {/* ── Cart items (scrollable) ── */}
            <div
              className="pretty-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3"
              ref={cartScrollRef}
            >
              {cart.length > 0 ? (
                <div className="space-y-2">
                  {cart.map((item) => {
                    const line = getCartLine(item);
                    return (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3.5 shadow-sm"
                      >
                        {/* Thumbnail */}
                        {item.product.image_url ? (
                          <img
                            alt={item.product.name}
                            className="h-10 w-10 shrink-0 rounded-xl border border-violet-100 object-cover"
                            loading="lazy"
                            src={item.product.image_url}
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-600">
                            {item.product.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        {/* Name + unit price */}
                        <div className="min-w-0 flex-1">
                          <p
                            className="cursor-default truncate text-sm font-semibold text-slate-900"
                            tabIndex={0}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget;
                              if (el.scrollWidth > el.clientWidth) {
                                const r = el.getBoundingClientRect();
                                setNameTooltip({ x: r.left, y: r.top, text: item.product.name });
                              }
                            }}
                            onMouseLeave={() => setNameTooltip(null)}
                            onFocus={(e) => {
                              const el = e.currentTarget;
                              const r = el.getBoundingClientRect();
                              setNameTooltip({ x: r.left, y: r.top, text: item.product.name });
                            }}
                            onBlur={() => setNameTooltip(null)}
                          >
                            {item.product.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            ฿{formatAmount(line.unitPrice)}/หน่วย
                          </p>
                        </div>

                        {/* Unit price badge */}
                        {/*<span className="shrink-0 text-sm font-semibold text-slate-700">
                          ฿{formatAmount(line.unitPrice)}
                        </span>*/}

                        {/* Discount button */}
                        <button
                          className="shrink-0 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50"
                          onClick={() =>
                            setDiscountEditorProductId(item.product.id)
                          }
                          title={dictionary.discountTypeLabel}
                          type="button"
                        >
                          {line.lineDiscount > 0 ? (
                            <span className="text-emerald-600">
                              -฿{formatAmount(line.lineDiscount)}
                            </span>
                          ) : (
                            "%ลด"
                          )}
                        </button>

                        {/* Qty stepper */}
                        <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-violet-200">
                          <button
                            className="flex h-8 w-8 items-center justify-center text-sm font-bold text-violet-600 transition hover:bg-violet-50"
                            onClick={() =>
                              updateCartQuantity(
                                item.product.id,
                                item.quantity - 1,
                              )
                            }
                            type="button"
                          >
                            −
                          </button>
                          <input
                            className="h-8 w-8 bg-white text-center text-sm font-bold text-slate-900 outline-none"
                            inputMode="numeric"
                            max={item.product.total_stock ?? 0}
                            min="1"
                            onClick={() =>
                              openQuantityNumpad(
                                item.product.id,
                                item.quantity,
                                item.product.total_stock ?? 0,
                              )
                            }
                            onFocus={(e) => e.target.blur()}
                            pattern="[0-9]*"
                            readOnly
                            type="number"
                            value={item.quantity}
                          />
                          <button
                            className="flex h-8 w-8 items-center justify-center text-sm font-bold text-violet-600 transition hover:bg-violet-50"
                            onClick={() =>
                              updateCartQuantity(
                                item.product.id,
                                item.quantity + 1,
                              )
                            }
                            type="button"
                          >
                            +
                          </button>
                        </div>

                        {/* Line total */}
                        <span className="shrink-0 w-20 text-right text-sm font-bold text-slate-900">
                          ฿{formatAmount(line.lineTotal)}
                        </span>

                        {/* Delete */}
                        <button
                          aria-label={dictionary.removeItemButton}
                          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => updateCartQuantity(item.product.id, 0)}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50/40 text-sm text-violet-300">
                  {dictionary.emptyCart}
                </div>
              )}
            </div>

            {/* ── Checkout button ── */}
            <div className="shrink-0 border-t border-violet-50 px-4 pb-4 pt-3">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.3)] transition hover:from-violet-700 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={cart.length === 0 || isPending}
                onClick={() => setIsCheckoutSummaryOpen(true)}
                type="button"
              >
                {dictionary.checkoutButton} (฿{formatAmount(settlementTotal)})
                <span className="ml-1">→</span>
              </button>
            </div>
          </section>
        </div>
      </section>

      {isActionsMenuOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-950">
                {dictionary.actionsLabel}
              </h3>
              <button
                className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={() => setIsActionsMenuOpen(false)}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <button
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  showNoteField
                    ? "bg-violet-50 text-violet-700"
                    : "text-violet-700 hover:bg-violet-50"
                }`}
                onClick={() => {
                  setShowNoteField((current) => !current);
                  setIsActionsMenuOpen(false);
                }}
                type="button"
              >
                <span>{dictionary.noteLabel}</span>
                <span>{showNoteField ? "✓" : ""}</span>
              </button>
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-50"
                onClick={() => {
                  setHoldBillLabel("");
                  setIsHoldingBill(true);
                }}
                type="button"
              >
                <span>{dictionary.holdBillLabel}</span>
              </button>
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-50"
                onClick={async () => {
                  try {
                    const response = await listParkedBills();
                    setParkedBills(response.data ?? []);
                  } catch {
                    setParkedBills([]);
                  }
                  setIsRestoreDrawerOpen(true);
                  setIsActionsMenuOpen(false);
                }}
                type="button"
              >
                <span>{dictionary.restoreBillLabel}</span>
              </button>
              <div className="my-1 border-t border-violet-100" />
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                onClick={clearCart}
                type="button"
              >
                {dictionary.clearCartButton}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hold Bill prompt */}
      {isHoldingBill ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-950">
              {dictionary.holdBillLabel}
            </h3>
            <div className="mt-4">
              <input
                className="w-full rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(e) => setHoldBillLabel(e.target.value)}
                placeholder={dictionary.holdBillPlaceholderLabel}
                type="text"
                value={holdBillLabel}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 rounded-lg border border-violet-200 px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={() => setIsHoldingBill(false)}
                type="button"
              >
                {dictionary.holdBillCancelLabel}
              </button>
              <button
                className="flex-1 rounded-lg bg-violet-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                onClick={async () => {
                  if (cart.length === 0) {
                    setError(dictionary.emptyCart);
                    setIsHoldingBill(false);
                    return;
                  }

                  const label =
                    holdBillLabel.trim() ||
                    `${dictionary.holdBillLabel} #${Date.now()}`;

                  try {
                    await createParkedBill({
                      applyVat,
                      bill_discount_amount: billDiscountAmount,
                      bill_discount_percent: billDiscountPercent,
                      bill_discount_type: billDiscountType,
                      customerSettlementMode,
                      items: cart.map((item) => {
                        const dv = Number(item.discountValue);
                        return {
                          discount_type: item.discountType || undefined,
                          discount_value: dv > 0 ? dv : undefined,
                          product_id: item.product.id,
                          quantity: item.quantity,
                        };
                      }),
                      label,
                      note,
                      paymentMethod,
                      selectedCustomerId,
                    });

                    clearCart();
                    setSuccessMessage(dictionary.holdBillConfirmLabel);
                    await reloadData();
                  } catch (nextError) {
                    setError(
                      nextError instanceof Error
                        ? nextError.message
                        : "Request failed",
                    );
                  }

                  setIsHoldingBill(false);
                }}
                type="button"
              >
                {dictionary.holdBillConfirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Restore Bill drawer */}
      {isRestoreDrawerOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-950">
                {dictionary.restoreBillDrawerTitle}
              </h3>
              <button
                className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={() => setIsRestoreDrawerOpen(false)}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            <div className="mt-4 max-h-[60dvh] space-y-2 overflow-y-auto">
              {parkedBills.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {dictionary.noParkedBillsLabel}
                </p>
              ) : (
                parkedBills.map((bill) => {
                  const itemCount = bill.items?.length ?? 0;
                  const totalAmount = (bill.items ?? []).reduce(
                    (sum: number, item: any) => {
                      const price = Number(
                        item.effective_price ?? item.price ?? 0,
                      );
                      return sum + price * (item.quantity ?? 0);
                    },
                    0,
                  );

                  return (
                    <button
                      key={bill.id}
                      className="w-full rounded-lg border border-violet-100 bg-white p-4 text-left transition hover:bg-violet-50 hover:border-violet-300"
                      onClick={() => {
                        if (
                          window.confirm(dictionary.restoreBillConfirmLabel)
                        ) {
                          const items = (bill.items ?? []).map((item: any) => ({
                            discountType: item.discount_type ?? "none",
                            discountValue: item.discount_value ?? "0",
                            product:
                              products.find((p) => p.id === item.product_id) ??
                              ({
                                id: item.product_id,
                                effective_price:
                                  item.effective_price ?? item.price ?? 0,
                                image_url: null,
                                name: item.product_name ?? "Unknown",
                                sku: null,
                              } as Product),
                            quantity: item.quantity ?? 0,
                          }));

                          setCart(items);
                          setSelectedCustomerId(bill.selectedCustomerId ?? "");
                          setCustomerSettlementMode(
                            bill.customerSettlementMode ?? "cash_now",
                          );
                          setPaymentMethod(bill.paymentMethod ?? "cash");
                          setNote(bill.note ?? "");
                          setBillDiscount(
                            bill.bill_discount_type === "percent"
                              ? bill.bill_discount_percent > 0
                                ? String(bill.bill_discount_percent)
                                : ""
                              : bill.bill_discount_amount > 0
                                ? String(bill.bill_discount_amount)
                                : "",
                          );
                          setBillDiscountType(
                            bill.bill_discount_type ?? "amount",
                          );
                          setApplyVat(bill.applyVat ?? true);

                          void deleteParkedBill(bill.id);
                          setIsRestoreDrawerOpen(false);
                          setSuccessMessage(dictionary.restoreBillConfirmLabel);
                        }
                      }}
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
      ) : null}

      {isCheckoutSummaryOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-4xl rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-950">
                {dictionary.checkoutSectionTitle}
              </h3>
              <button
                className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={() => setIsCheckoutSummaryOpen(false)}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-violet-800">
                    {dictionary.customerLabel}
                  </label>
                  <select
                    className="w-full rounded-lg border border-violet-200 bg-violet-50/30 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    onChange={(event) =>
                      setSelectedCustomerId(event.target.value)
                    }
                    value={selectedCustomerId}
                  >
                    <option value="">{dictionary.customerPlaceholder}</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name} (L{customer.level ?? 1} •{" "}
                        {customerLevelDiscounts.find(
                          (rule) => rule.level === Number(customer.level ?? 1),
                        )?.discount_percent ?? 0}
                        %)
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    {dictionary.customerTypeLabel}: {customerTypeLabel}
                  </p>
                </div>

                {isNetworkCustomerSelected ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-violet-800">
                      {dictionary.customerSettlementLabel}
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                          customerSettlementMode === "cash_now"
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                        }`}
                        onClick={() => setCustomerSettlementMode("cash_now")}
                        type="button"
                      >
                        {dictionary.customerSettlementCashNow}
                      </button>
                      <button
                        className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                          customerSettlementMode === "invoice"
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                        }`}
                        onClick={() => setCustomerSettlementMode("invoice")}
                        type="button"
                      >
                        {dictionary.customerSettlementInvoice}
                      </button>
                    </div>
                  </div>
                ) : null}

                {!isInvoiceSettlement ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-violet-800">
                      {dictionary.paymentMethodLabel}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          label: dictionary.paymentMethodCashLabel,
                          value: "cash",
                        },
                        {
                          label: dictionary.paymentMethodPromptPay,
                          value: "transfer",
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                            paymentMethod === option.value
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                          }`}
                          onClick={() => setPaymentMethod(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!isInvoiceSettlement ? (
                  <div className="flex flex-col gap-3">
                    <div
                      className={`grid gap-3 ${
                        paymentMethod === "transfer"
                          ? "grid-cols-1"
                          : "grid-cols-2"
                      }`}
                    >
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-800">
                          {dictionary.customerPaymentLabel}
                        </label>
                        <input
                          className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-right text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          inputMode="numeric"
                          min="0"
                          onClick={() => openAmountNumpad("paid_amount")}
                          onFocus={(event) => event.target.blur()}
                          placeholder="0"
                          readOnly
                          value={
                            paidAmount
                              ? `฿${formatAmount(parsePaidAmountAsCeilInt(paidAmount))}`
                              : ""
                          }
                        />
                      </div>
                      {paymentMethod !== "transfer" ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-violet-800">
                            {dictionary.changeLabel}
                          </label>
                          <input
                            className="w-full rounded-lg border border-violet-100 bg-violet-50 px-3 py-2.5 text-right text-xs font-semibold text-slate-700 outline-none"
                            readOnly
                            value={formatCurrency(Math.max(changeAmount, 0))}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        {dictionary.quickCashLabel}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {quickCashOptions.map((option) => (
                          <button
                            key={
                              option.isExact
                                ? `exact-${option.amount}`
                                : option.amount
                            }
                            className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                              lastQuickCashAmount === option.amount
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                            }`}
                            onClick={() =>
                              applyQuickCash(option.amount, option.isExact)
                            }
                            type="button"
                          >
                            {option.isExact
                              ? dictionary.quickCashExactAmountLabel
                              : `+฿${option.amount}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col-reverse lg:flex-col">
                <div className="space-y-1.5 border-t border-violet-100 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                  {/* Secondary rows */}
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{dictionary.summary.subtotalLabel}</span>
                    <span>{formatCurrency(cartSummary.subtotal)}</span>
                  </div>
                  <div
                    className={`flex items-center justify-between text-sm ${cartSummary.discountAmount > 0 ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    <span>{dictionary.summary.discountLabel}</span>
                    <span>
                      {cartSummary.discountAmount > 0
                        ? `-${formatCurrency(cartSummary.discountAmount)}`
                        : formatCurrency(0)}
                    </span>
                  </div>
                  <div
                    className={`flex items-center justify-between text-sm ${billDiscountAmount > 0 ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    <span>
                      {dictionary.discountBillLabel}
                      {billDiscountType === "percent" && billDiscountPercent > 0
                        ? ` (${billDiscountPercent}%)`
                        : ""}
                    </span>
                    <span>
                      {billDiscountAmount > 0
                        ? `-${formatCurrency(billDiscountAmount)}`
                        : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{dictionary.customerTypeLabel}</span>
                    <span className="font-medium text-slate-600">
                      {customerTypeLabel}
                    </span>
                  </div>
                  {selectedCustomerId && customerDiscountAmount > 0 ? (
                    <div className="flex items-center justify-between text-sm text-emerald-600">
                      <span>
                        {dictionary.customerDiscountLabel} (
                        {customerDiscountPercent}%)
                      </span>
                      <span>-{formatCurrency(customerDiscountAmount)}</span>
                    </div>
                  ) : null}
                  {applyVat && (
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>{dictionary.vatAmountLabel}</span>
                      <span>{formatCurrency(vatAmount)}</span>
                    </div>
                  )}

                  <div className="my-1.5 border-t border-dashed border-violet-100" />

                  {/* Net total */}
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-700">
                      {dictionary.summary.totalLabel}
                    </span>
                    <span className="text-xl font-bold text-violet-700">
                      {formatCurrency(settlementTotal)}
                    </span>
                  </div>

                  {/* Paid & change */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      {dictionary.totalPaidLabel}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {formatCurrency(effectivePaidAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      {dictionary.changeLabel}
                    </span>
                    <span
                      className={`text-sm font-bold ${changeAmount > 0 ? "text-emerald-600" : "text-slate-400"}`}
                    >
                      {formatCurrency(Math.max(changeAmount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              className="mt-5 w-full rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 px-4 py-3 text-base font-semibold text-white transition hover:from-violet-700 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={cart.length === 0 || isPending}
              onClick={() => {
                setIsCheckoutSummaryOpen(false);
                submitSale();
              }}
              type="button"
            >
              {dictionary.confirmPaymentButton}
            </button>
          </div>
        </div>
      ) : null}

      {discountEditorItem ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-950">
                {discountEditorItem.product.name}
              </h3>
              <button
                className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={() => setDiscountEditorProductId(null)}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {dictionary.discountTypeLabel}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      icon: "฿",
                      label: dictionary.discountAmountLabel,
                      value: "amount" as const,
                    },
                    {
                      icon: "%",
                      label: dictionary.discountPercentLabel,
                      value: "percent" as const,
                    },
                  ].map((option) => (
                    <button
                      aria-label={option.label}
                      key={option.value}
                      className={`rounded-lg border px-3 py-2 text-base font-bold transition ${
                        discountEditorItem.discountType === option.value
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                      }`}
                      onClick={() =>
                        updateCartDiscountType(
                          discountEditorItem.product.id,
                          option.value,
                        )
                      }
                      type="button"
                    >
                      {option.icon}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {dictionary.discountValueLabel}
                </span>
                <input
                  autoFocus
                  className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  inputMode="decimal"
                  min="0"
                  onChange={(event) =>
                    onDiscountEditorInputChange(event.target.value)
                  }
                  onKeyDown={onDiscountEditorInputKeyDown}
                  placeholder="0"
                  value={discountEditorItem.discountValue}
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-violet-50"
                    key={digit}
                    onClick={() => appendDiscountEditorDigit(digit)}
                    type="button"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                  onClick={clearDiscountEditorValue}
                  type="button"
                >
                  {dictionary.quantityNumpadClear}
                </button>
                <button
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-violet-50"
                  onClick={() => appendDiscountEditorDigit("0")}
                  type="button"
                >
                  0
                </button>
                <button
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-violet-50"
                  onClick={appendDiscountEditorDecimal}
                  type="button"
                >
                  .
                </button>
              </div>

              <button
                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={backspaceDiscountEditorValue}
                type="button"
              >
                {dictionary.quantityNumpadBackspace}
              </button>

              <button
                className="w-full rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                onClick={applyDiscountEditor}
                type="button"
              >
                {dictionary.quantityNumpadApply}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isPrintPromptOpen ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/45 px-4 py-5 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="relative flex max-h-[94dvh] w-fit max-w-[calc(100vw-2rem)] flex-col rounded-[1.75rem] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] ring-1 ring-white/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-6">
            <button
              aria-label={dictionary.closeReceiptButton}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-400 shadow-sm transition hover:bg-violet-100 hover:text-violet-600"
              onClick={closeReceiptPreview}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="min-h-0 w-[384px] max-w-[calc(100vw-4rem)] flex-1 rounded-lg bg-violet-50/60 p-0 shadow-inner sm:max-w-[calc(100vw-5rem)]">
              {isReceiptPreviewLoading ? (
                <div className="flex h-[70dvh] max-h-[35rem] min-h-[30rem] w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500 shadow-sm">
                  <span className="rounded-full bg-violet-100 px-4 py-2">
                    {dictionary.receiptPreviewLoading}
                  </span>
                </div>
              ) : receiptPreviewHtml ? (
                <div className="rounded-md bg-white shadow-[0_12px_34px_rgba(15,23,42,0.12)] ring-1 ring-violet-200/60">
                  <iframe
                    className="h-[70dvh] max-h-[35rem] min-h-[30rem] w-full border-0 bg-white"
                    ref={receiptPreviewFrameRef}
                    srcDoc={receiptPreviewHtml}
                    title={dictionary.receiptPreviewTitle}
                  />
                </div>
              ) : (
                <div className="flex h-[70dvh] max-h-[35rem] min-h-[30rem] w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500 shadow-sm">
                  <span className="rounded-full bg-violet-100 px-4 py-2">
                    {dictionary.receiptPreviewLoading}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-[1.1fr_0.9fr] gap-3">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none"
                disabled={isReceiptPreviewLoading || !receiptPreviewHtml}
                onClick={handlePrintFromPrompt}
                type="button"
              >
                <Printer className="h-4 w-4" />
                {dictionary.printReceiptNowButton}
              </button>
              <button
                className="min-h-12 rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
                onClick={closeReceiptPreview}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {quantityNumpad ? (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-6 transition-opacity duration-300 sm:items-center ${
            isQuantityNumpadOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={closeQuantityNumpad}
        >
          <div
            className={`w-full max-w-sm rounded-[1.75rem] bg-white p-5 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isQuantityNumpadOpen ? "translate-y-0" : "translate-y-8"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-950">
              {dictionary.quantityNumpadTitle}
            </h3>
            <input
              autoFocus
              className="mt-3 w-full rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-center text-2xl font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              inputMode="numeric"
              onChange={(event) => onNumpadInputChange(event.target.value)}
              onKeyDown={onNumpadInputKeyDown}
              pattern="[0-9]*"
              type="text"
              value={quantityNumpad.value}
            />

            <div className="mt-4 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-base font-semibold text-slate-900 transition hover:bg-violet-50"
                  key={digit}
                  onClick={() => appendNumpadDigit(digit)}
                  type="button"
                >
                  {digit}
                </button>
              ))}
              <button
                className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={clearNumpadValue}
                type="button"
              >
                {dictionary.quantityNumpadClear}
              </button>
              <button
                className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-base font-semibold text-slate-900 transition hover:bg-violet-50"
                onClick={() => appendNumpadDigit("0")}
                type="button"
              >
                0
              </button>
              <button
                className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={backspaceNumpadValue}
                type="button"
              >
                {dictionary.quantityNumpadBackspace}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="rounded-lg border border-violet-200 px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={closeQuantityNumpad}
                type="button"
              >
                {dictionary.quantityNumpadCancel}
              </button>
              <button
                className="rounded-lg bg-violet-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                onClick={applyNumpadQuantity}
                type="button"
              >
                {dictionary.quantityNumpadApply}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {amountNumpad ? (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-6 transition-opacity duration-300 sm:items-center ${
            isAmountNumpadOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={closeAmountNumpad}
        >
          <div
            className={`w-full max-w-sm rounded-[1.75rem] bg-white p-5 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isAmountNumpadOpen ? "translate-y-0" : "translate-y-8"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-950">
              {amountNumpad.field === "bill_discount"
                ? dictionary.discountBillLabel
                : dictionary.customerPaymentLabel}
            </h3>
            <input
              autoFocus
              className="mt-3 w-full rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-center text-2xl font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              inputMode={
                amountNumpad.field === "paid_amount" ? "numeric" : "decimal"
              }
              onChange={(event) =>
                onAmountNumpadInputChange(event.target.value)
              }
              onKeyDown={onAmountNumpadInputKeyDown}
              pattern={
                amountNumpad.field === "paid_amount"
                  ? "^\\d*$"
                  : "^\\d*(\\.\\d{0,2})?$"
              }
              type="text"
              value={amountNumpad.value}
            />

            <div className="mt-4 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-base font-semibold text-slate-900 transition hover:bg-violet-50"
                  key={digit}
                  onClick={() => appendAmountNumpadDigit(digit)}
                  type="button"
                >
                  {digit}
                </button>
              ))}
              <button
                className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={clearAmountNumpadValue}
                type="button"
              >
                {dictionary.quantityNumpadClear}
              </button>
              <button
                className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-base font-semibold text-slate-900 transition hover:bg-violet-50"
                onClick={() => appendAmountNumpadDigit("0")}
                type="button"
              >
                0
              </button>
              <button
                className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-base font-semibold text-slate-900 transition hover:bg-violet-50"
                onClick={appendAmountNumpadDecimal}
                type="button"
                disabled={amountNumpad.field === "paid_amount"}
              >
                .
              </button>
            </div>

            <div className="mt-2">
              <button
                className="w-full rounded-lg border border-violet-100 bg-white px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={backspaceAmountNumpadValue}
                type="button"
              >
                {dictionary.quantityNumpadBackspace}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="rounded-lg border border-violet-200 px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={closeAmountNumpad}
                type="button"
              >
                {dictionary.quantityNumpadCancel}
              </button>
              <button
                className="rounded-lg bg-violet-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                onClick={applyAmountNumpad}
                type="button"
              >
                {dictionary.quantityNumpadApply}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Fixed product name tooltip — escapes overflow-y-auto clipping */}
      {nameTooltip && (
        <div
          className="pointer-events-none fixed z-[400] max-w-[260px] break-words rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium leading-snug text-white shadow-xl"
          style={{ left: nameTooltip.x, top: nameTooltip.y - 40 }}
        >
          {nameTooltip.text}
          <div className="absolute left-3 top-full h-2 w-2 -translate-y-0.5 rotate-45 bg-slate-800" />
        </div>
      )}
    </>
  );
});
