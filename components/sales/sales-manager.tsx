"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useTransition } from "react";

import { ProductBrowser } from "@/components/sales/product-browser";
import type {
  ProductViewMode,
  SalesDictionary,
} from "@/components/sales/types";
import {
  listCustomerLevelDiscounts,
  listCustomers,
} from "@/services/customers";
import { convertToDeliveryOrder, createDocument } from "@/services/documents";
import { toast } from "@/components/ui/toast";
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

import {
  formatAmount,
  roundCurrency,
  parsePaidAmountAsCeilInt,
  removeReceiptPreviewToolbar,
  getDiscountPerUnit,
  getCartLine,
} from "./utils/sales-calculations";
import { CheckoutSummaryModal } from "./checkout-summary-modal";
import { ReceiptPreviewModal } from "./receipt-preview-modal";
import { PostInvoiceModal } from "./post-invoice-modal";
import { ActionsMenuModal } from "./actions-menu-modal";
import { ParkedBillsDrawer } from "./parked-bills-drawer";
import { HoldBillModal } from "./hold-bill-modal";
import { QuantityNumpad } from "./quantity-numpad";
import { AmountNumpad } from "./amount-numpad";
import { DiscountEditorModal } from "./discount-editor-modal";
import { CartPanel } from "./cart-panel";
import { ProductPopup } from "./product-popup";
import { useNumpad } from "./use-numpad";

type CartItem = {
  discountType: SaleDiscountType;
  discountValue: string;
  product: Product;
  quantity: number;
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
  onHoldBillSuccess?: () => void;
};

const productViewStorageKey = "pos-sales-product-view";

export const SalesManager = forwardRef<SalesManagerHandle, SalesManagerProps>(function SalesManager({
  dictionary,
  onCartItemsChange,
  externalSearch,
  onExternalSearchChange,
  onCartStateChange,
  onHoldBillSuccess,
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
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [applyVat, setApplyVat] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isCheckoutSummaryOpen, setIsCheckoutSummaryOpen] = useState(false);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [postInvoiceDocId, setPostInvoiceDocId] = useState<string | null>(null);
  const [isPostInvoicePending, startPostInvoiceTransition] = useTransition();
  const [isCreatingQuotation, startQuotationTransition] = useTransition();
  const [quotationMode, setQuotationMode] = useState(false);
  const [quotationValidUntil, setQuotationValidUntil] = useState("");
  const [discountEditorProductId, setDiscountEditorProductId] = useState<
    string | null
  >(null);
  const [showNoteField, setShowNoteField] = useState(false);
  const [productPopup, setProductPopup] = useState<Product | null>(null);
  const [productPopupVisible, setProductPopupVisible] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [isPrintPromptOpen, setIsPrintPromptOpen] = useState(false);
  const [isReceiptPreviewLoading, setIsReceiptPreviewLoading] = useState(false);
  const [receiptPreviewHtml, setReceiptPreviewHtml] = useState("");
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const [isTaxInvoicePending, startTaxInvoiceTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [isRestoreDrawerOpen, setIsRestoreDrawerOpen] = useState(false);
  const [parkedBills, setParkedBills] = useState<any[]>([]);
  const [isHoldingBill, setIsHoldingBill] = useState(false);
  const [holdBillLabel, setHoldBillLabel] = useState("");
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
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  function openProductPopup(product: Product) {
    setProductPopup(product);
    requestAnimationFrame(() => setProductPopupVisible(true));
  }

  function closeProductPopup() {
    setProductPopupVisible(false);
    setTimeout(() => setProductPopup(null), 200);
  }

  function handleLongPressStart(product: Product) {
    longPressTimerRef.current = setTimeout(() => openProductPopup(product), 500);
  }

  function handleLongPressEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

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
    setApplyVat(false);
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

  const {
    quantityNumpad,
    isQuantityNumpadOpen,
    openQuantityNumpad,
    appendNumpadDigit,
    clearNumpadValue,
    backspaceNumpadValue,
    onNumpadInputChange,
    onNumpadInputKeyDown,
    applyNumpadQuantity,
    closeQuantityNumpad,
    amountNumpad,
    isAmountNumpadOpen,
    openAmountNumpad,
    appendAmountNumpadDigit,
    appendAmountNumpadDecimal,
    clearAmountNumpadValue,
    backspaceAmountNumpadValue,
    onAmountNumpadInputChange,
    onAmountNumpadInputKeyDown,
    applyAmountNumpad,
    closeAmountNumpad,
    numpadCloseTimeoutRef,
  } = useNumpad({
    billDiscount,
    paidAmount,
    onBillDiscountChange: setBillDiscount,
    onPaidAmountChange: (v) => {
      setPaidAmount(v);
      setIsPaidAmountTouched(true);
      setLastQuickCashAmount(null);
    },
    onQuantityApply: updateCartQuantity,
  });

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

  function handleCreateQuotation() {
    startQuotationTransition(async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        await createDocument({
          type: "QUOTATION",
          customer_id: selectedCustomerId,
          document_date: today,
          valid_until: quotationValidUntil || undefined,
          items: cart.map((item) => ({
            product_id: item.product.id,
            description: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.effective_price,
            discount_type: Number(item.discountValue || 0) > 0
              ? (item.discountType === "percent" ? "PERCENT" : "AMOUNT")
              : "" as const,
            discount_value: Number(item.discountValue || 0),
          })),
          vat_rate: applyVat ? 7 : 0,
          notes: note.trim() || undefined,
        });
        setIsCheckoutSummaryOpen(false);
        setQuotationMode(false);
        clearCart();
        toast.success("สร้างใบเสนอราคาสำเร็จ");
      } catch {
        toast.error("ไม่สามารถสร้างใบเสนอราคาได้");
      }
    });
  }

  function handlePostInvoiceConfirm() {
    if (!postInvoiceDocId) return;
    startPostInvoiceTransition(async () => {
      try {
        await convertToDeliveryOrder(postInvoiceDocId);
        toast.success("สร้างใบส่งของสำเร็จ");
      } catch {
        toast.error("ไม่สามารถสร้างใบส่งของได้");
      } finally {
        setPostInvoiceDocId(null);
      }
    });
  }

  function submitSale() {
    setError("");

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
          const today = new Date().toISOString().split("T")[0];
          const newDoc = await createDocument({
            type: "INVOICE",
            customer_id: selectedCustomerId,
            document_date: today,
            items: cart.map((item) => ({
              product_id: item.product.id,
              description: item.product.name,
              quantity: item.quantity,
              unit_price: item.product.effective_price,
              discount_type: Number(item.discountValue || 0) > 0
                ? (item.discountType === "percent" ? "PERCENT" : "AMOUNT")
                : "" as const,
              discount_value: Number(item.discountValue || 0),
            })),
            vat_rate: applyVat ? 7 : 0,
            due_date: invoiceDueDate || undefined,
            notes: note.trim() || undefined,
          });

          setIsCheckoutSummaryOpen(false);
          clearCart();
          toast.success(dictionary.checkoutSuccess);
          await reloadData();
          setPostInvoiceDocId(newDoc.id);
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
        toast.success(dictionary.checkoutSuccess);
        await reloadData();

        if (response.data?.id) {
          setCompletedSaleId(response.data.id);
          setReceiptPreviewHtml("");
          setIsPrintPromptOpen(true);
          void prepareReceiptPreview(response.data.id, paymentMethod);
        }
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "Request failed",
        );
      }
    });
  }

  async function prepareReceiptPreview(saleId: string, method?: string) {
    setIsReceiptPreviewLoading(true);

    try {
      const html = await getSaleReceiptPreviewHtml(saleId);
      setReceiptPreviewHtml(removeReceiptPreviewToolbar(html, method));
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Request failed",
      );
    } finally {
      setIsReceiptPreviewLoading(false);
    }
  }

  function handlePrintFromPrompt(frameWindow: Window) {
    frameWindow.focus();
    frameWindow.print();
    setIsPrintPromptOpen(false);
  }

  function closeReceiptPreview() {
    setIsPrintPromptOpen(false);
    setReceiptPreviewHtml("");
    setCompletedSaleId(null);
  }

  function handleCreateTaxInvoiceFromReceipt() {
    if (!completedSaleId) return;
    startTaxInvoiceTransition(async () => {
      try {
        const { getSaleById } = await import("@/services/sales");
        const { createDocument } = await import("@/services/documents");
        const saleRes = await getSaleById(completedSaleId);
        const sale = saleRes.data;
        const today = new Date().toISOString().split("T")[0];
        await createDocument({
          type: "TAX_INVOICE",
          customer_id: sale.customer_id ?? "",
          ...(!sale.customer_id && {
            customer_name: sale.customer_name ?? "ลูกค้าทั่วไป",
            customer_address: "",
            customer_phone: sale.customer_phone ?? "",
          }),
          document_date: today,
          vat_rate: sale.vat_included ? (sale.vat_percent ?? 7) : 0,
          items: (sale.items ?? []).map((item) => ({
            product_id: item.product_id ?? undefined,
            description: item.product_name ?? "",
            quantity: item.quantity,
            unit_price: item.unit_price ?? 0,
            discount_type: "" as const,
            discount_value: 0,
          })),
          notes: sale.note ?? undefined,
        });
        toast.success("สร้างใบกำกับภาษีสำเร็จ");
        closeReceiptPreview();
      } catch {
        toast.error("ไม่สามารถสร้างใบกำกับภาษีได้");
      }
    });
  }

  function confirmRestoreBill(bill: any) {
    const items = (bill.items ?? []).map((item: any) => ({
      discountType: item.discount_type ?? "none",
      discountValue: item.discount_value ?? "0",
      product:
        products.find((p) => p.id === item.product_id) ??
        ({
          id: item.product_id,
          base_price: item.base_price ?? item.price ?? 0,
          image_url: null,
          name: item.product_name ?? "Unknown",
          sku: null,
        } as Product),
      quantity: item.quantity ?? 0,
    }));
    setCart(items);
    setSelectedCustomerId(bill.selectedCustomerId ?? "");
    setCustomerSettlementMode(bill.customerSettlementMode ?? "cash_now");
    setPaymentMethod(bill.paymentMethod ?? "cash");
    setNote(bill.note ?? "");
    setBillDiscount(
      bill.bill_discount_type === "percent"
        ? bill.bill_discount_percent > 0 ? String(bill.bill_discount_percent) : ""
        : bill.bill_discount_amount > 0 ? String(bill.bill_discount_amount) : "",
    );
    setBillDiscountType(bill.bill_discount_type ?? "amount");
    setApplyVat(bill.applyVat ?? false);
    void deleteParkedBill(bill.id);
    setIsRestoreDrawerOpen(false);
    toast.success(dictionary.restoreBillConfirmLabel);
  }

  async function handleHoldBillConfirm() {
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
      toast.success(dictionary.holdBillConfirmLabel);
      await reloadData();
      onHoldBillSuccess?.();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Request failed",
      );
    }

    setIsHoldingBill(false);
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
        />

        {/* ── Right: Cart panel ── */}
        <CartPanel
          cart={cart}
          cartSummary={cartSummary}
          settlementTotal={settlementTotal}
          vatAmount={vatAmount}
          applyVat={applyVat}
          billDiscount={billDiscount}
          billDiscountType={billDiscountType}
          totalDiscountAmount={totalDiscountAmount}
          showNoteField={showNoteField}
          note={note}
          isPending={isPending}
          isBillDiscountFieldOpen={isBillDiscountFieldOpen}
          cartScrollRef={cartScrollRef}
          dictionary={dictionary}
          onClearCart={clearCart}
          onToggleBillDiscountField={() => setIsBillDiscountFieldOpen((c) => !c)}
          onBillDiscountTypeChange={setBillDiscountType}
          onOpenAmountNumpad={openAmountNumpad}
          onNoteChange={setNote}
          onOpenDiscountEditor={setDiscountEditorProductId}
          onUpdateQuantity={updateCartQuantity}
          onOpenQuantityNumpad={openQuantityNumpad}
          onOpenCheckout={() => setIsCheckoutSummaryOpen(true)}
          onLongPressStart={handleLongPressStart}
          onLongPressEnd={handleLongPressEnd}
        />
      </section>

      {/* ── Actions menu modal ── */}
      <ActionsMenuModal
        isOpen={isActionsMenuOpen}
        showNoteField={showNoteField}
        onClose={() => setIsActionsMenuOpen(false)}
        onToggleNote={() => setShowNoteField((c) => !c)}
        onHoldBill={() => { setHoldBillLabel(""); setIsHoldingBill(true); }}
        onOpenRestoreDrawer={(bills) => { setParkedBills(bills); setIsRestoreDrawerOpen(true); }}
        onClearCart={clearCart}
        dictionary={dictionary}
      />

      {/* ── Hold bill modal ── */}
      <HoldBillModal
        isOpen={isHoldingBill}
        label={holdBillLabel}
        onLabelChange={setHoldBillLabel}
        onCancel={() => setIsHoldingBill(false)}
        onConfirm={handleHoldBillConfirm}
        dictionary={dictionary}
      />

      {/* ── Parked bills drawer ── */}
      <ParkedBillsDrawer
        isOpen={isRestoreDrawerOpen}
        bills={parkedBills}
        cartLength={cart.length}
        onClose={() => setIsRestoreDrawerOpen(false)}
        onConfirmRestore={confirmRestoreBill}
        dictionary={dictionary}
      />

      {/* ── Checkout summary modal ── */}
      <CheckoutSummaryModal
        isOpen={isCheckoutSummaryOpen}
        customers={customers}
        customerLevelDiscounts={customerLevelDiscounts}
        cartSummary={cartSummary}
        settlementTotal={settlementTotal}
        vatAmount={vatAmount}
        applyVat={applyVat}
        selectedCustomerId={selectedCustomerId}
        setSelectedCustomerId={setSelectedCustomerId}
        customerSettlementMode={customerSettlementMode}
        setCustomerSettlementMode={setCustomerSettlementMode}
        invoiceDueDate={invoiceDueDate}
        setInvoiceDueDate={setInvoiceDueDate}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paidAmount={paidAmount}
        note={note}
        setNote={setNote}
        billDiscountAmount={billDiscountAmount}
        billDiscountPercent={billDiscountPercent}
        billDiscountType={billDiscountType}
        customerDiscountAmount={customerDiscountAmount}
        customerDiscountPercent={customerDiscountPercent}
        effectivePaidAmount={effectivePaidAmount}
        changeAmount={changeAmount}
        isPending={isPending}
        isCreatingQuotation={isCreatingQuotation}
        quotationMode={quotationMode}
        setQuotationMode={setQuotationMode}
        quotationValidUntil={quotationValidUntil}
        setQuotationValidUntil={setQuotationValidUntil}
        quickCashOptions={quickCashOptions}
        lastQuickCashAmount={lastQuickCashAmount}
        isNetworkCustomerSelected={isNetworkCustomerSelected}
        isInvoiceSettlement={isInvoiceSettlement}
        customerTypeLabel={customerTypeLabel}
        cartLength={cart.length}
        onClose={() => { setIsCheckoutSummaryOpen(false); setQuotationMode(false); }}
        onSubmit={() => { setIsCheckoutSummaryOpen(false); submitSale(); }}
        onCreateQuotation={handleCreateQuotation}
        onApplyQuickCash={applyQuickCash}
        onOpenAmountNumpad={openAmountNumpad}
        dictionary={dictionary}
      />

      {/* ── Post invoice modal ── */}
      <PostInvoiceModal
        docId={postInvoiceDocId}
        isPending={isPostInvoicePending}
        onConfirm={handlePostInvoiceConfirm}
        onClose={() => setPostInvoiceDocId(null)}
      />

      {/* ── Discount editor ── */}
      <DiscountEditorModal
        item={discountEditorItem}
        onClose={() => setDiscountEditorProductId(null)}
        onDiscountTypeChange={updateCartDiscountType}
        onInputChange={onDiscountEditorInputChange}
        onInputKeyDown={onDiscountEditorInputKeyDown}
        onDigit={appendDiscountEditorDigit}
        onDecimal={appendDiscountEditorDecimal}
        onClear={clearDiscountEditorValue}
        onBackspace={backspaceDiscountEditorValue}
        onApply={applyDiscountEditor}
        dictionary={dictionary}
      />

      {/* ── Receipt preview modal ── */}
      <ReceiptPreviewModal
        isOpen={isPrintPromptOpen}
        html={receiptPreviewHtml}
        isLoading={isReceiptPreviewLoading}
        onClose={closeReceiptPreview}
        onPrint={handlePrintFromPrompt}
        onCreateTaxInvoice={completedSaleId ? handleCreateTaxInvoiceFromReceipt : undefined}
        isTaxInvoicePending={isTaxInvoicePending}
        dictionary={{
          receiptPreviewLoading: dictionary.receiptPreviewLoading,
          receiptPreviewTitle: dictionary.receiptPreviewTitle,
          printReceiptNowButton: dictionary.printReceiptNowButton,
          closeReceiptButton: dictionary.closeReceiptButton,
        }}
      />

      {/* ── Quantity numpad ── */}
      {quantityNumpad ? (
        <QuantityNumpad
          value={quantityNumpad.value}
          isOpen={isQuantityNumpadOpen}
          onInputChange={onNumpadInputChange}
          onInputKeyDown={onNumpadInputKeyDown}
          onDigit={appendNumpadDigit}
          onClear={clearNumpadValue}
          onBackspace={backspaceNumpadValue}
          onCancel={closeQuantityNumpad}
          onApply={applyNumpadQuantity}
          dictionary={dictionary}
        />
      ) : null}

      {/* ── Amount numpad ── */}
      {amountNumpad ? (
        <AmountNumpad
          field={amountNumpad.field}
          value={amountNumpad.value}
          isOpen={isAmountNumpadOpen}
          onInputChange={onAmountNumpadInputChange}
          onInputKeyDown={onAmountNumpadInputKeyDown}
          onDigit={appendAmountNumpadDigit}
          onDecimal={appendAmountNumpadDecimal}
          onClear={clearAmountNumpadValue}
          onBackspace={backspaceAmountNumpadValue}
          onCancel={closeAmountNumpad}
          onApply={applyAmountNumpad}
          dictionary={dictionary}
        />
      ) : null}

      {/* Product detail popup — triggered by long press on cart item */}
      <ProductPopup
        product={productPopup}
        visible={productPopupVisible}
        onClose={closeProductPopup}
      />
    </>
  );
});
