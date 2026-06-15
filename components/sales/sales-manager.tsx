"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";

import { ProductBrowser } from "@/components/sales/product-browser";
import type {
  ProductViewMode,
  SalesDictionary,
} from "@/components/sales/types";
import { publishDisplayState, WELCOME } from "@/lib/customer-display";
import { fetchPromptPayQR } from "@/services/payment";
import {
  listCustomerLevelDiscounts,
  listCustomers,
} from "@/services/customers";
import { convertToDeliveryOrder, createDocument } from "@/services/documents";
import { toast } from "@/components/ui/toast";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { listProducts } from "@/services/products";
import {
  listLocations,
  listLocationProducts,
  type Location,
} from "@/services/locations";
import { canManageStore, useStoreRole } from "@/lib/use-store-role";
import { ApiError } from "@/services/api";
import { listPromotions } from "@/services/promotions";
import {
  BILL_LEVEL_TYPES,
  evaluatePromotion,
  LINE_LEVEL_TYPES,
  matchesScope,
} from "@/components/promotions/promotion-engine";
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
  locale?: string;
  onCartItemsChange?: (count: number) => void;
  externalSearch?: string;
  onExternalSearchChange?: (value: string) => void;
  onCartStateChange?: (state: { applyVat: boolean; showNoteField: boolean }) => void;
  onHoldBillSuccess?: () => void;
};

const productViewStorageKey = "pos-sales-product-view";

// Prefer a backend field-level message (e.g. the Thai sale-location validation copy that
// the API places in error.fields[], not the generic top-level "validation failed") so the
// cashier sees the actionable message rather than the envelope text.
function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.fields?.length) {
    return err.fields[0]?.message || err.message;
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
}

export const SalesManager = forwardRef<SalesManagerHandle, SalesManagerProps>(function SalesManager({
  dictionary,
  locale = "en",
  onCartItemsChange,
  externalSearch,
  onExternalSearchChange,
  onCartStateChange,
  onHoldBillSuccess,
}: SalesManagerProps, ref) {
  const [hasMounted, setHasMounted] = useState(false);
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  // Phase W4B — POS sale-point location. Every sale deducts from exactly one active
  // sale-point location (the store default, or an explicit pick by owner/manager). The
  // displayed/sellable stock is that location's stock, never the product grand total.
  const [saleLocations, setSaleLocations] = useState<Location[]>([]);
  const [selectedSaleLocationId, setSelectedSaleLocationId] = useState("");
  const [saleLocationStock, setSaleLocationStock] = useState<Record<string, number>>({});
  const [locationStockReady, setLocationStockReady] = useState(false);
  const [locationStockError, setLocationStockError] = useState(false);
  const { role: storeRole } = useStoreRole();
  const canSelectSaleLocation = canManageStore(storeRole);
  // Idempotency lifecycle: a stable key per checkout intent so a retried submit (double
  // click / network retry) returns the original sale instead of creating a second one.
  const saleIdempotencyKeyRef = useRef("");
  const saleIntentSigRef = useRef("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLevelDiscounts, setCustomerLevelDiscounts] = useState<
    CustomerLevelDiscount[]
  >([]);
  // True when member-tier discount data could not be loaded. The POS still opens
  // (resilient), but checkout is blocked for a selected member so a missing tier
  // discount can never be silently applied as 0% (see submitSale).
  const [discountsError, setDiscountsError] = useState(false);
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(false);
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

  function loadInitialData() {
    setLoadError(false);
    setIsLoadingData(true);
    startTransition(async () => {
      try {
        // Required POS data — products (catalog), customers and locations. A failure
        // here is fatal and shows the retryable error screen. All three are readable at
        // operate level, so cashiers load the POS just like owners/managers.
        const [productsResponse, customersResponse, locationsResponse] =
          await Promise.all([
            listProducts({ limit: 500 }),
            listCustomers(),
            listLocations({ limit: 500 }),
          ]);

        setRawProducts(productsResponse.data?.items ?? []);
        setCustomers(customersResponse.data ?? []);

        // Only active sale-point locations are eligible to sell from.
        const sellable = (locationsResponse.data?.items ?? []).filter(
          (loc) => loc.is_active && loc.is_sale_point,
        );
        setSaleLocations(sellable);
        // Resolve the active sale location: keep the current pick if still valid,
        // else the store default sale location, else the first active sale point.
        setSelectedSaleLocationId((current) => {
          if (current && sellable.some((loc) => loc.id === current)) {
            return current;
          }
          const fallback =
            sellable.find((loc) => loc.is_default_sale) ?? sellable[0];
          return fallback?.id ?? "";
        });

        // Optional POS data — member-tier discounts. A failure must NOT crash the POS;
        // instead we flag it (discountsError) and block checkout for a selected member in
        // submitSale, so a missing discount can never be silently applied as 0%.
        try {
          const discountResponse = await listCustomerLevelDiscounts();
          setCustomerLevelDiscounts(discountResponse.data ?? []);
          setDiscountsError(false);
        } catch {
          setCustomerLevelDiscounts([]);
          setDiscountsError(true);
        }
      } catch (nextError) {
        setLoadError(true);
        setError(
          nextError instanceof Error ? nextError.message : "Request failed",
        );
      } finally {
        setIsLoadingData(false);
      }
    });
  }

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load (and reload) the on-hand stock for the active sale location. This is the single
  // source of POS availability; products with no row here are treated as 0 at this point.
  async function loadSaleLocationStock(locationId: string) {
    if (!locationId) {
      setSaleLocationStock({});
      setLocationStockReady(true);
      return;
    }
    const response = await listLocationProducts(locationId, { limit: 1000 });
    const next: Record<string, number> = {};
    (response.data?.items ?? []).forEach((row) => {
      next[row.product_id] = row.quantity;
    });
    setSaleLocationStock(next);
    setLocationStockReady(true);
  }

  // Re-fetch sale-point stock whenever the active sale location changes (§11 cart
  // revalidation is driven off the resulting saleLocationStock change below).
  useEffect(() => {
    setLocationStockReady(false);
    setLocationStockError(false);
    let active = true;
    void (async () => {
      try {
        if (!active) return;
        await loadSaleLocationStock(selectedSaleLocationId);
      } catch {
        if (active) {
          // Surface a retryable error instead of a silently-empty catalog.
          setSaleLocationStock({});
          setLocationStockError(true);
          setLocationStockReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedSaleLocationId]);

  // §11 — cart revalidation: when sale-point stock changes (location switch or a
  // post-sale refresh), re-clamp every cart line to what the active location now holds
  // and drop lines that are no longer available, warning the cashier once.
  useEffect(() => {
    if (!locationStockReady) return;
    setCart((currentCart) => {
      if (currentCart.length === 0) return currentCart;
      let reduced = false;
      const next = currentCart
        .map((item) => {
          const available = saleLocationStock[item.product.id] ?? 0;
          const clampedQty = Math.min(item.quantity, available);
          if (clampedQty < item.quantity) reduced = true;
          return {
            ...item,
            // keep the cart line's product stock in sync with the active location
            product: { ...item.product, total_stock: available },
            quantity: clampedQty,
          };
        })
        .filter((item) => item.quantity > 0);
      if (reduced) {
        toast.info(dictionary.saleLocationCartAdjusted);
      }
      // Always return the re-synced lines so each line's max reflects the active
      // location; the effect only re-runs when the location/stock actually changes.
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleLocationStock, locationStockReady]);

  // Location-aware product list: total_stock is overridden with the on-hand quantity at
  // the active sale location, so every downstream consumer (cards, search, add-to-cart
  // guards, cart clamps) reflects sale-point availability rather than the grand total.
  const products = useMemo(
    () =>
      rawProducts.map((product) => ({
        ...product,
        total_stock: saleLocationStock[product.id] ?? 0,
      })),
    [rawProducts, saleLocationStock],
  );

  const activeSaleLocation = useMemo(
    () => saleLocations.find((loc) => loc.id === selectedSaleLocationId) ?? null,
    [saleLocations, selectedSaleLocationId],
  );

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
        (product.barcode ?? "").toLowerCase().includes(keyword) ||
        (product.product_type_name ?? product.product_type?.name ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [products, search, selectedCategory]);
  // Keyed by both SKU and barcode (lowercased) so a scanned EAN/UPC — which is
  // usually stored in `barcode`, not `sku` — resolves to the product.
  const saleableScanMap = useMemo(() => {
    const nextMap = new Map<string, Product>();

    saleableProducts.forEach((product) => {
      const sku = (product.sku ?? "").trim().toLowerCase();
      if (sku) {
        nextMap.set(sku, product);
      }
      const barcode = (product.barcode ?? "").trim().toLowerCase();
      if (barcode) {
        nextMap.set(barcode, product);
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

  // Active promotions, evaluated client-side: line-level promos discount each
  // scope-matched cart line (best wins); bill-level promos (coupon, spend-x, bundle,
  // gift) are evaluated once against their scoped subtotal. The result is folded into
  // the bill discount so it reaches the persisted sale, the receipt and revenue reports.
  const promotionsQuery = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => (await listPromotions()).data,
  });
  const [couponCode, setCouponCode] = useState("");
  const promoDiscountAmount = useMemo(() => {
    const active = (promotionsQuery.data ?? []).filter((p) => p.status === "active");
    if (active.length === 0 || cart.length === 0) return { amount: 0, ids: [] as string[] };
    const now = new Date();
    const customerLevel = selectedCustomer ? Number(selectedCustomer.level ?? 1) : undefined;
    const code = couponCode.trim();
    // Track which active promotions actually contributed, so the backend can verify
    // the claimed promo discount against these real promotions (server-side check).
    const idSet = new Set<string>();
    const scopeOf = (product: Product) => ({
      sku: product.sku,
      category: product.product_type_name ?? product.product_type?.name,
      brand: product.brand_name,
    });

    // Line-level: best scope-matched promo per cart line.
    let lineTotal = 0;
    for (const item of cart) {
      // Promotions must be computed from the EFFECTIVE selling price — the active
      // special_price when its window is live, else base_price — so a promo never
      // stacks on top of the full list price when an item is already on special.
      const unitPrice = Number(item.product.effective_price ?? item.product.base_price ?? 0);
      let best = 0;
      let bestId = "";
      for (const promo of active) {
        if (!LINE_LEVEL_TYPES.includes(promo.type)) continue;
        if (!matchesScope(promo, scopeOf(item.product))) continue;
        const res = evaluatePromotion(promo, { unitPrice, quantity: item.quantity, customerLevel, now });
        if (res.applies && res.discountTotal > best) {
          best = res.discountTotal;
          bestId = promo.id;
        }
      }
      lineTotal += best;
      if (best > 0 && bestId) idSet.add(bestId);
    }

    // Bill-level: best single promo evaluated once against its scoped subtotal.
    let billBest = 0;
    let billBestId = "";
    for (const promo of active) {
      if (!BILL_LEVEL_TYPES.includes(promo.type)) continue;
      let scopedQty = 0;
      let scopedSubtotal = 0;
      for (const item of cart) {
        if (!matchesScope(promo, scopeOf(item.product))) continue;
        scopedQty += item.quantity;
        // Effective price (special when active) — bill-level promos scope off the
        // same price the cart actually charges, preventing double-discounting.
        scopedSubtotal += Number(item.product.effective_price ?? item.product.base_price ?? 0) * item.quantity;
      }
      if (scopedQty === 0) continue;
      const res = evaluatePromotion(promo, {
        unitPrice: scopedSubtotal / scopedQty,
        quantity: scopedQty,
        customerLevel,
        couponCode: code,
        now,
      });
      if (res.applies && res.discountTotal > billBest) {
        billBest = res.discountTotal;
        billBestId = promo.id;
      }
    }
    if (billBest > 0 && billBestId) idSet.add(billBestId);

    return { amount: roundCurrency(lineTotal + billBest), ids: Array.from(idSet) };
  }, [promotionsQuery.data, cart, selectedCustomer, couponCode]);

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
  const payableBeforePromo = Math.max(
    cartSummary.total - customerDiscountAmount - billDiscountAmount,
    0,
  );
  // Cap the promotion discount to the remaining payable so the total never goes negative.
  const appliedPromoDiscount = Math.min(promoDiscountAmount.amount, payableBeforePromo);
  const appliedPromotionIds =
    appliedPromoDiscount > 0 ? promoDiscountAmount.ids : [];
  const totalDiscountAmount =
    cartSummary.discountAmount +
    customerDiscountAmount +
    billDiscountAmount +
    appliedPromoDiscount;
  const payableTotal = Math.max(payableBeforePromo - appliedPromoDiscount, 0);
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

  // ── Customer display sync (screen 2) ──────────────────────────────────────
  // welcome (empty) · payment (checkout open — QR when PromptPay) · selling (otherwise).
  // Re-runs when the payment method or amount changes so the QR always matches.
  useEffect(() => {
    if (cart.length === 0) {
      publishDisplayState(WELCOME);
      return;
    }

    // Checkout open → payment screen. QR methods (promptpay/transfer/qr) → fetch a
    // live QR for the current total so the customer can scan to pay.
    if (isCheckoutSummaryOpen && !quotationMode) {
      let active = true;
      const total = roundCurrency(settlementTotal);
      const isQrMethod = ["promptpay", "transfer", "qr"].includes(paymentMethod);
      if (isQrMethod) {
        publishDisplayState({ phase: "payment", total, method: paymentMethod }); // immediate (QR loading)
        fetchPromptPayQR(total)
          .then((res) => {
            if (active && res.data?.qr) {
              publishDisplayState({ phase: "payment", total, method: paymentMethod, qr: res.data.qr });
            }
          })
          .catch(() => {/* keep no-QR payment screen */});
      } else {
        publishDisplayState({ phase: "payment", total, method: paymentMethod });
      }
      return () => { active = false; };
    }

    // Default: live cart on the customer screen.
    publishDisplayState({
      phase: "selling",
      items: cart.map((item) => {
        const line = getCartLine(item);
        return {
          name: item.product.name,
          qty: item.quantity,
          unitPrice: roundCurrency(line.lineSubtotal / Math.max(item.quantity, 1)),
          lineTotal: roundCurrency(line.lineTotal),
        };
      }),
      subtotal: roundCurrency(cartSummary.subtotal),
      discount: roundCurrency(totalDiscountAmount),
      vat: roundCurrency(vatAmount),
      total: roundCurrency(settlementTotal),
      customer: selectedCustomer?.full_name || undefined,
    });
  }, [
    cart,
    cartSummary,
    totalDiscountAmount,
    vatAmount,
    settlementTotal,
    selectedCustomer,
    isCheckoutSummaryOpen,
    quotationMode,
    paymentMethod,
  ]);

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
        // Refresh the active sale-point stock so the freshly-deducted quantities show
        // immediately after a sale (§ query invalidation).
        loadSaleLocationStock(selectedSaleLocationId),
      ]);

    setRawProducts(productsResponse.data?.items ?? []);
    setCustomers(customersResponse.data ?? []);
    setCustomerLevelDiscounts(discountResponse.data ?? []);
  }

  function clearCart() {
    setCart([]);
    setSelectedCustomerId("");
    setCustomerSettlementMode("cash_now");
    setBillDiscount("");
    setCouponCode("");
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

        const matchedProduct = saleableScanMap.get(scannedCode);
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
  }, [addToCart, dictionary.unavailableProduct, saleableScanMap]);

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

    // §3 — a real (stock-deducting) sale needs an active sale-point location. Invoice
    // settlement creates a document via a separate flow and is not gated here.
    if (!isInvoiceSettlement && !selectedSaleLocationId) {
      setError(dictionary.saleLocationRequired);
      return;
    }

    // Resilience guard (no silent misprice): if member-tier discount data could not be
    // loaded, block checkout for a selected member rather than apply a wrong (0%) tier
    // discount. Walk-in sales (no selected customer) are unaffected.
    if (selectedCustomer && discountsError) {
      setError(dictionary.customerDiscountUnavailable);
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

        // Idempotency: derive a stable key from this checkout's intent. A retried
        // submit of the same cart/payment/location reuses the key (backend returns the
        // original sale); any change to the intent mints a new key.
        const intentSig = JSON.stringify({
          location: selectedSaleLocationId,
          payment: paymentMethod,
          paid: paidAmountValue,
          customer: selectedCustomerId,
          note: note.trim(),
          manual: billDiscountAmount,
          promo: appliedPromoDiscount,
          promotionIds: appliedPromotionIds,
          vat: applyVat,
          items: mappedItems,
        });
        if (
          saleIntentSigRef.current !== intentSig ||
          !saleIdempotencyKeyRef.current
        ) {
          saleIntentSigRef.current = intentSig;
          saleIdempotencyKeyRef.current =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }

        const response = await createSale(
          {
            customer_id: selectedCustomerId || undefined,
            location_id: selectedSaleLocationId || undefined,
            // discount_bill kept during rollout so an un-migrated backend still reads the
            // total; the new backend prefers the verified split below and ignores it.
            discount_bill:
              billDiscountAmount + appliedPromoDiscount > 0
                ? billDiscountAmount + appliedPromoDiscount
                : undefined,
            manual_discount: billDiscountAmount > 0 ? billDiscountAmount : undefined,
            promo_discount:
              appliedPromoDiscount > 0 ? appliedPromoDiscount : undefined,
            promotion_ids:
              appliedPromotionIds.length > 0 ? appliedPromotionIds : undefined,
            items: mappedItems,
            note: note.trim() || undefined,
            paid_amount: paidAmountValue,
            payment_method: paymentMethod,
            vat_included: false,
            vat_percent: applyVat ? 7 : 0,
          },
          saleIdempotencyKeyRef.current,
        );

        // Sale committed — the intent is consumed; clear the key so the next bill mints
        // a fresh one (and a true retry before this point still reuses the same key).
        saleIntentSigRef.current = "";
        saleIdempotencyKeyRef.current = "";

        // Customer display: payment success (before clearing the cart's totals).
        publishDisplayState({
          phase: "success",
          total: settlementTotal,
          change: changeAmount > 0 ? changeAmount : undefined,
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
        setError(errorMessage(nextError));
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
    // Clamp restored lines to the active sale point's stock (§11): a bill parked when more
    // was on hand must not re-enter the cart over-quantity. Lines now unavailable are dropped.
    let restoreReduced = false;
    const items = (bill.items ?? [])
      .map((item: any) => {
        const available = saleLocationStock[item.product_id] ?? 0;
        const requested = item.quantity ?? 0;
        const quantity = Math.min(requested, available);
        if (quantity < requested) restoreReduced = true;
        const baseProduct =
          products.find((p) => p.id === item.product_id) ??
          ({
            id: item.product_id,
            base_price: item.base_price ?? item.price ?? 0,
            image_url: null,
            name: item.product_name ?? "Unknown",
            sku: null,
          } as Product);
        return {
          discountType: item.discount_type ?? "none",
          discountValue: item.discount_value ?? "0",
          product: { ...baseProduct, total_stock: available },
          quantity,
        };
      })
      .filter((line: CartItem) => line.quantity > 0);
    setCart(items);
    if (restoreReduced) {
      toast.info(dictionary.saleLocationCartAdjusted);
    }
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

  // Keep the loading screen up until the active sale location's stock has been fetched
  // once, so the catalog never flashes empty (every product would read total_stock=0
  // before the location stock arrives).
  if (
    !hasMounted ||
    isLoadingData ||
    (selectedSaleLocationId && !locationStockReady && !locationStockError)
  ) {
    return (
      <section className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:p-8">
        <p className="text-sm text-slate-500">{dictionary.title}</p>
      </section>
    );
  }

  if (locationStockError) {
    return (
      <section className="grid place-items-center xl:h-[calc(100dvh-8rem)]">
        <QueryErrorState
          locale={locale}
          onRetry={() => {
            setLocationStockError(false);
            setLocationStockReady(false);
            void loadSaleLocationStock(selectedSaleLocationId).catch(() => {
              setLocationStockError(true);
              setLocationStockReady(true);
            });
          }}
          className="max-w-md"
        />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="grid place-items-center xl:h-[calc(100dvh-8rem)]">
        <QueryErrorState locale={locale} onRetry={loadInitialData} className="max-w-md" />
      </section>
    );
  }

  return (
    <>
      {promotionsQuery.isError ? (
        <div className="mb-4">
          <QueryErrorState
            locale={locale}
            onRetry={() => void promotionsQuery.refetch()}
            className="!py-4"
          />
        </div>
      ) : null}
      {/* Phase W4B — active sale point. Stock shown/sold is this location's stock. */}
      {saleLocations.length === 0 ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dictionary.saleLocationRequired}
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            {dictionary.saleLocationLabel}
          </span>
          {canSelectSaleLocation ? (
            <select
              value={selectedSaleLocationId}
              onChange={(event) => setSelectedSaleLocationId(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-violet-400 focus:outline-none"
            >
              {saleLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                  {loc.warehouse_name ? ` · ${loc.warehouse_name}` : ""}
                  {loc.is_default_sale ? " ★" : ""}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium text-slate-700">
              {activeSaleLocation?.name ?? "—"}
              {activeSaleLocation?.warehouse_name
                ? ` · ${activeSaleLocation.warehouse_name}`
                : ""}
            </span>
          )}
        </div>
      )}
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
          couponCode={couponCode}
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
          onCouponChange={setCouponCode}
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
