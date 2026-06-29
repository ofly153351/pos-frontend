"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";

import { ProductBrowser } from "@/components/sales/product-browser";
import type {
  ProductViewMode,
  SalesDictionary,
} from "@/components/sales/types";
import { publishDisplayState, WELCOME, AUTO_RETURN_MS } from "@/lib/customer-display";
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
import { listBankAccounts } from "@/services/stores";
import { getReceiptSettings } from "@/services/receipt-settings";
import {
  BILL_LEVEL_TYPES,
  evaluatePromotion,
  LINE_LEVEL_TYPES,
  matchesScope,
} from "@/components/promotions/promotion-engine";
import type { Campaign } from "@/components/promotions/promotion-types";
import { buildPromoDisplayIndex } from "@/components/sales/promo-display";
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

import { MapPin } from "lucide-react";
import {
  roundCurrency,
  parsePaidAmountAsCeilInt,
  removeReceiptPreviewToolbar,
  getApiDiscountPerUnit,
  getCartLine,
} from "./utils/sales-calculations";
import { CheckoutSummaryModal } from "./checkout-summary-modal";
import { ReceiptPreviewModal, type ReceiptPreviewStatus } from "./receipt-preview-modal";
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

// Sentinel category value selecting the promotion tab (vs. a product-type name).
const PROMO_CATEGORY = "__promo__";

type CartItem = {
  discountScope: "line" | "unit";
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
  /** Resolve a camera-scanned code and add it to the cart (fullscreen modal). */
  scanCode: (code: string) => void;
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
  const { role: storeRole, storeName, storeLogoUrl } = useStoreRole();
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
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [productView, setProductView] = useState<ProductViewMode>("grid");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSettlementMode, setCustomerSettlementMode] = useState<
    "cash_now" | "invoice"
  >("cash_now");
  const [note, setNote] = useState("");
  const [billDiscount, setBillDiscount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
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
  const [receiptStatus, setReceiptStatus] = useState<ReceiptPreviewStatus>("loading");
  const [receiptPreviewHtml, setReceiptPreviewHtml] = useState("");
  // Remembered so Retry re-renders the preview with the same payment method
  // (drives cash-only QR stripping) without re-creating the sale.
  const [receiptMethod, setReceiptMethod] = useState<string | undefined>(undefined);
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const [isTaxInvoicePending, startTaxInvoiceTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [isRestoreDrawerOpen, setIsRestoreDrawerOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parkedBills, setParkedBills] = useState<any[]>([]);
  const [isHoldingBill, setIsHoldingBill] = useState(false);
  const [holdBillLabel, setHoldBillLabel] = useState("");
  const cartScrollRef = useRef<HTMLDivElement | null>(null);
  const previousCartLengthRef = useRef(0);
  const barcodeBufferRef = useRef("");
  const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the customer-display success window: prevents cart.length===0 from
  // immediately overwriting the success phase. Set on sale completion, cleared by
  // its own timer (which also publishes WELCOME) or when a new sale starts.
  const successWindowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      if (successWindowTimerRef.current) {
        clearTimeout(successWindowTimerRef.current);
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

  const promotionsQuery = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => (await listPromotions()).data,
  });

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

  // Short per-card promo badge label, localized from the campaign's type + value.
  const promoBadgeLabel = useCallback(
    (c: Campaign): string => {
      const b = dictionary.promo.badge;
      switch (c.type) {
        case "percentage":
        case "happy_hour":
          return b.percent.replace("{v}", String(c.percentOff ?? 0));
        case "fixed_amount":
          return b.amount.replace("{v}", String(c.amountOff ?? 0));
        case "fixed_price":
          return b.price.replace("{v}", String(c.fixedPrice ?? 0));
        case "buy_x_get_y":
          return b.bxgy
            .replace("{b}", String(c.buyQty ?? 1))
            .replace("{g}", String(c.getQty ?? 1));
        case "member_price":
          return b.member;
        default:
          return b.generic;
      }
    },
    [dictionary.promo.badge],
  );

  // POS promotion display index — drives the promo tab, per-promo sub-chips, the
  // per-card discount badge and the store-wide info strip. `new Date()` re-evaluates
  // each build so time-gated promos (happy hour) appear/disappear with their window.
  const promoIndex = useMemo(
    () => buildPromoDisplayIndex(promotionsQuery.data, products, new Date(), promoBadgeLabel),
    [promotionsQuery.data, products, promoBadgeLabel],
  );
  const promotionProductIds = promoIndex.coveredProductIds;

  // Leaving the promo tab clears the active sub-chip so it doesn't silently filter
  // a regular category view when the user returns.
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    if (category !== PROMO_CATEGORY) setSelectedPromoId(null);
  }, []);

  const saleableProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const isPromoFilter = selectedCategory === PROMO_CATEGORY;

    return products.filter((product) => {
      if (!product.is_active || (product.total_stock ?? 0) <= 0) {
        return false;
      }

      if (isPromoFilter) {
        if (selectedPromoId) {
          // A specific promo sub-chip is selected → only its matched products.
          const ids = promoIndex.promoIdsByProduct.get(product.id);
          if (!ids || !ids.has(selectedPromoId)) return false;
        } else if (!promotionProductIds.has(product.id)) {
          // "All promotions" → union of every product-targeting promo.
          return false;
        }
      } else if (selectedCategory) {
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
  }, [products, search, selectedCategory, selectedPromoId, promoIndex, promotionProductIds]);
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
    return roundCurrency(
      (cartSummary.total * Math.min(Math.max(customerDiscountPercent, 0), 100)) / 100,
    );
  }, [cartSummary.total, customerDiscountPercent]);

  // Active promotions, evaluated client-side: line-level promos discount each
  // scope-matched cart line (best wins); bill-level promos (coupon, spend-x, bundle,
  // gift) are evaluated once against their scoped subtotal. The result is folded into
  // the bill discount so it reaches the persisted sale, the receipt and revenue reports.

  const bankAccountsQuery = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const storeId = (await import("@/lib/store-storage")).getCurrentStoreId();
      if (!storeId) return [];
      return (await listBankAccounts(storeId)).data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const receiptSettingsQuery = useQuery({
    queryKey: ["receipt-settings-channels"],
    queryFn: async () => (await getReceiptSettings()).data,
    staleTime: 5 * 60 * 1000,
  });
  const enabledPaymentChannels = useMemo(
    () => (receiptSettingsQuery.data?.payment_channels ?? []).filter((c) => c.enabled).map((c) => c.key),
    [receiptSettingsQuery.data],
  );
  const [couponCode, setCouponCode] = useState("");
  const promoDiscountAmount = useMemo(() => {
    const active = (promotionsQuery.data ?? []).filter((p) => p.status === "active");
    if (active.length === 0 || cart.length === 0) return { amount: 0, ids: [] as string[], discountByPromoId: new Map<string, number>() };
    const now = new Date();
    const customerLevel = selectedCustomer ? Number(selectedCustomer.level ?? 1) : undefined;
    const code = couponCode.trim();
    // Track which active promotions actually contributed, so the backend can verify
    // the claimed promo discount against these real promotions (server-side check).
    const idSet = new Set<string>();
    const scopeOf = (product: Product) => ({
      id: product.id,
      sku: product.sku,
      category: product.product_type_name ?? product.product_type?.name,
      brand: product.brand_name,
    });

    // Track per-promo contribution for the cart breakdown display.
    const discountByPromoId = new Map<string, number>();

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
      if (best > 0 && bestId) {
        idSet.add(bestId);
        discountByPromoId.set(bestId, (discountByPromoId.get(bestId) ?? 0) + best);
      }
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
    if (billBest > 0 && billBestId) {
      idSet.add(billBestId);
      discountByPromoId.set(billBestId, (discountByPromoId.get(billBestId) ?? 0) + billBest);
    }

    return { amount: roundCurrency(lineTotal + billBest), ids: Array.from(idSet), discountByPromoId };
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
          roundCurrency((billDiscountBase * billDiscountPercent) / 100),
          maxBillDiscount,
        )
      : Math.min(Math.max(sanitizedBillDiscount, 0), maxBillDiscount);
  const payableBeforePromo = roundCurrency(
    Math.max(cartSummary.total - customerDiscountAmount - billDiscountAmount, 0),
  );
  // Cap the promotion discount to the remaining payable so the total never goes negative.
  const appliedPromoDiscount = Math.min(promoDiscountAmount.amount, payableBeforePromo);
  const appliedPromotionIds =
    appliedPromoDiscount > 0 ? promoDiscountAmount.ids : [];
  // Per-promo breakdown: name + amount contributed — shown in cart so cashier
  // can verify each campaign applied correctly.
  const promoNameById = new Map(
    (promotionsQuery.data ?? []).map((p) => [p.id, p.name] as const),
  );
  const appliedPromoBreakdown = appliedPromotionIds
    .map((id) => ({
      name: promoNameById.get(id) ?? id,
      amount: roundCurrency(
        Math.min(
          promoDiscountAmount.discountByPromoId.get(id) ?? 0,
          appliedPromoDiscount,
        ),
      ),
    }))
    .filter((p) => p.amount > 0);
  const appliedPromoNames = appliedPromoBreakdown.map((p) => p.name);
  const totalDiscountAmount = roundCurrency(
    cartSummary.discountAmount +
    customerDiscountAmount +
    billDiscountAmount +
    appliedPromoDiscount,
  );
  const payableTotal = roundCurrency(Math.max(payableBeforePromo - appliedPromoDiscount, 0));
  const vatAmount = applyVat ? roundCurrency(payableTotal * 0.07) : 0;
  const settlementTotal = applyVat
    ? Math.round(payableTotal + vatAmount)
    : Math.round(payableTotal);
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
      // If we just published success, the success-window timer owns the WELCOME
      // transition — don't overwrite the success phase from this path.
      if (!successWindowTimerRef.current) {
        publishDisplayState(WELCOME);
      }
      return;
    }

    // A new sale started while the success window was still active — cancel it.
    if (successWindowTimerRef.current) {
      clearTimeout(successWindowTimerRef.current);
      successWindowTimerRef.current = null;
    }

    // Checkout open → payment screen. QR methods (promptpay/transfer/qr) → fetch a
    // live QR for the current total so the customer can scan to pay.
    if (isCheckoutSummaryOpen && !quotationMode) {
      let active = true;
      const total = roundCurrency(settlementTotal);
      const isQrMethod = ["promptpay", "transfer", "qr"].includes(paymentMethod);
      if (isQrMethod) {
        publishDisplayState({ phase: "payment", storeName: storeName || undefined, storeLogoUrl, total, method: paymentMethod }); // immediate (QR loading)
        fetchPromptPayQR(total)
          .then((res) => {
            if (active && res.data?.qr) {
              publishDisplayState({ phase: "payment", storeName: storeName || undefined, storeLogoUrl, total, method: paymentMethod, qr: res.data.qr });
            }
          })
          .catch(() => {/* keep no-QR payment screen */});
      } else if (paymentMethod === "bank_transfer") {
        const acc = bankAccounts.find((a) => a.id === selectedBankAccountId && a.is_active)
          ?? bankAccounts.find((a) => a.is_active);
        publishDisplayState({
          phase: "payment",
          storeName: storeName || undefined,
          storeLogoUrl,
          total,
          method: paymentMethod,
          bankAccount: acc ? { bankName: acc.bank_name, accountName: acc.account_name, accountNo: acc.account_no } : undefined,
        });
      } else {
        publishDisplayState({ phase: "payment", storeName: storeName || undefined, storeLogoUrl, total, method: paymentMethod });
      }
      return () => { active = false; };
    }

    // Default: live cart on the customer screen.
    publishDisplayState({
      phase: "selling",
      storeName: storeName || undefined,
      storeLogoUrl,
      items: cart.map((item) => {
        const line = getCartLine(item);
        const origUnit = roundCurrency(line.unitPrice);
        const finalUnit = roundCurrency(line.lineTotal / Math.max(item.quantity, 1));
        const discVal = Number(item.discountValue || 0);
        // Build DisplayItemDiscount when a cashier discount is applied.
        // For per-unit amount: effective value = totalDiscount / qty (capped by getCartLine).
        // For whole-line amount: effective value = totalDiscount itself.
        // For percent: value is the rate (e.g. 10 for 10%).
        let discField: import("@/lib/customer-display").DisplayItemDiscount | undefined;
        if (line.lineDiscount > 0 && discVal > 0 && item.discountType) {
          let displayValue: number;
          if (item.discountType === "percent") {
            displayValue = Math.min(Math.max(discVal, 0), 100);
          } else if (item.discountScope === "unit") {
            displayValue = item.quantity > 0 ? roundCurrency(line.lineDiscount / item.quantity) : 0;
          } else {
            displayValue = roundCurrency(line.lineDiscount);
          }
          discField = {
            type: item.discountType as "amount" | "percent",
            scope: item.discountScope,
            value: displayValue,
            totalDiscount: roundCurrency(line.lineDiscount),
          };
        }
        return {
          name: item.product.name,
          qty: item.quantity,
          originalUnitPrice: origUnit,
          unitPrice: finalUnit,
          lineTotal: roundCurrency(line.lineTotal),
          hasItemDiscount: line.lineDiscount > 0,
          imageUrl: item.product.image_url ?? null,
          discount: discField,
        };
      }),
      subtotalBeforeDiscount: roundCurrency(cartSummary.subtotal),
      itemDiscount: roundCurrency(cartSummary.discountAmount),
      customerDiscount: roundCurrency(customerDiscountAmount),
      customerDiscountPercent: customerDiscountPercent,
      promoDiscount: roundCurrency(appliedPromoDiscount),
      billDiscount: roundCurrency(billDiscountAmount),
      couponCode: couponCode.trim() || undefined,
      vat: roundCurrency(vatAmount),
      total: roundCurrency(settlementTotal),
      customerName: selectedCustomer?.full_name || undefined,
      customerLevel: selectedCustomer ? Number(selectedCustomer.level ?? 1) : undefined,
    });
  }, [
    cart,
    cartSummary,
    customerDiscountAmount,
    customerDiscountPercent,
    billDiscountAmount,
    appliedPromoDiscount,
    vatAmount,
    settlementTotal,
    selectedCustomer,
    couponCode,
    isCheckoutSummaryOpen,
    quotationMode,
    paymentMethod,
    storeName,
    storeLogoUrl,
    bankAccounts,
    selectedBankAccountId,
  ]);

  const quickCashOptions = useMemo(() => {
    const baseOptions = [5, 10, 20, 50, 100, 500, 1000];
    const settlementQuickAmount = Math.max(settlementTotal, 0);

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
              discount_per_unit: getApiDiscountPerUnit(item),
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
      setPaidAmount(String(Math.max(settlementTotal, 0)));
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
    scanCode: handleCameraScan,
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
            discountScope: "line",
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

  // Camera scan (mobile): resolve the decoded code exactly like the physical
  // scanner's trailing-Enter path — an exact match in the saleable map adds to
  // the cart; otherwise surface the same "not available" message.
  function handleCameraScan(code: string) {
    const scannedCode = code.trim().toLowerCase();
    if (!scannedCode) return;
    const matchedProduct = saleableScanMap.get(scannedCode);
    if (matchedProduct) {
      addToCart(matchedProduct);
      setError("");
      return;
    }
    setError(`${dictionary.unavailableProduct} (${scannedCode})`);
  }

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

  function updateCartDiscountScope(
    productId: string,
    discountScope: "line" | "unit",
  ) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId ? { ...item, discountScope } : item,
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
            unit_price: item.product.effective_price ?? item.product.base_price,
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
          // Convert line-scope amount discounts to per-unit for the backend API
          // (backend contract: discount_value is always per-unit × qty = line total).
          const apiDiscountValue = discountValue > 0 ? getApiDiscountPerUnit(item) : undefined;

          return {
            discount_type: apiDiscountValue ? item.discountType : undefined,
            discount_value: apiDiscountValue,
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
              unit_price: item.product.effective_price ?? item.product.base_price,
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
          storeName: storeName || undefined,
          storeLogoUrl,
          total: settlementTotal,
          receivedAmount: effectivePaidAmount > 0 ? roundCurrency(effectivePaidAmount) : undefined,
          change: changeAmount > 0 ? changeAmount : undefined,
          method: paymentMethod,
        });
        // Block the cart-clear effect from immediately overwriting success with WELCOME.
        // After AUTO_RETURN_MS the timer publishes WELCOME itself (matching the display
        // subscriber's own timer), so localStorage is never stale past the success window.
        if (successWindowTimerRef.current) clearTimeout(successWindowTimerRef.current);
        successWindowTimerRef.current = setTimeout(() => {
          successWindowTimerRef.current = null;
          publishDisplayState(WELCOME);
        }, AUTO_RETURN_MS);

        clearCart();
        toast.success(dictionary.checkoutSuccess);
        await reloadData();

        if (response.data?.id) {
          setCompletedSaleId(response.data.id);
          setIsPrintPromptOpen(true);
          void prepareReceiptPreview(response.data.id, paymentMethod);
        }
      } catch (nextError) {
        setError(errorMessage(nextError));
      }
    });
  }

  // Loads the receipt HTML for an already-created sale. This is a read-only
  // render — it never re-submits payment, so it is safe to call again on Retry.
  async function prepareReceiptPreview(saleId: string, method?: string) {
    setReceiptStatus("loading");
    setReceiptPreviewHtml("");
    setReceiptMethod(method);

    try {
      const html = await getSaleReceiptPreviewHtml(saleId);
      setReceiptPreviewHtml(removeReceiptPreviewToolbar(html, method));
      setReceiptStatus("success");
    } catch (nextError) {
      // Keep the raw transport error out of the UI; the modal shows a localized
      // message instead. Log enough to diagnose, but never tokens/credentials.
      setReceiptPreviewHtml("");
      setReceiptStatus("error");
      console.error("[receipt-preview] failed to load", {
        saleId,
        status: nextError instanceof ApiError ? nextError.status : undefined,
        message: nextError instanceof Error ? nextError.message : "unknown error",
      });
    }
  }

  // Retries only the receipt render for the already-completed sale — never the
  // checkout. Disabled cases are guarded by the missing completedSaleId.
  function retryReceiptPreview() {
    if (!completedSaleId) return;
    void prepareReceiptPreview(completedSaleId, receiptMethod);
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
          vat_rate: sale.vat_percent ?? 7,
          items: (sale.items ?? []).map((item) => ({
            product_id: item.product_id ?? undefined,
            description: item.product_name ?? "",
            quantity: item.quantity,
            unit_price: item.unit_price ?? 0,
            discount_type: (item.line_discount_total ?? 0) > 0 ? ("AMOUNT" as const) : ("" as const),
            discount_value: item.line_discount_total ?? 0,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function confirmRestoreBill(bill: any) {
    // Clamp restored lines to the active sale point's stock (§11): a bill parked when more
    // was on hand must not re-enter the cart over-quantity. Lines now unavailable are dropped.
    let restoreReduced = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (bill.items ?? []).map((item: any) => {
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
          // Bills parked before the scope field existed default to "unit" to
          // preserve the original per-unit semantics of that era.
          discountScope: (item.discount_scope as "line" | "unit") ?? "unit",
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
            discount_scope: item.discountScope,
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

  // ── Adaptive sale-point slots (evaluated after all loading gates are passed) ──
  // Case A (0 locations): blocker replaces the product grid.
  // Case B (1 location):  auto-selected by loadInitialData; no UI shown.
  // Case C (>1 + manage): compact select in ProductBrowser toolbar.
  // Case D (>1 + operate-only): compact read-only label in toolbar.
  const salePointBlockerNode = saleLocations.length === 0 ? (
    <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <MapPin className="h-7 w-7 text-amber-500" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-900">
          {dictionary.noSalePointConfigured}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {dictionary.noSalePointDescription}
        </p>
      </div>
      {canSelectSaleLocation ? (
        <a
          href={`/${locale}/settings/storage-locations`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          {dictionary.configureSalePoint}
        </a>
      ) : (
        <p className="text-sm font-medium text-amber-700">
          {dictionary.contactManager}
        </p>
      )}
    </div>
  ) : undefined;

  const salePointSlotNode = saleLocations.length > 1 ? (
    canSelectSaleLocation ? (
      // Case C: compact selector for owner / manager
      <div className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 transition hover:border-violet-400">
        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-violet-600">
          {dictionary.saleLocationLabel}
        </span>
        <select
          aria-label={dictionary.saleLocationLabel}
          className="min-w-[120px] cursor-pointer border-none bg-transparent text-sm font-medium text-slate-700 outline-none"
          onChange={(e) => setSelectedSaleLocationId(e.target.value)}
          value={selectedSaleLocationId}
        >
          {saleLocations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}{loc.is_default_sale ? " ★" : ""}
            </option>
          ))}
        </select>
      </div>
    ) : (
      // Case D: read-only label for cashier (multiple locations, no switch allowed)
      <div className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dictionary.saleLocationLabel}
        </span>
        <span className="text-sm font-medium text-slate-700">
          {activeSaleLocation?.name ?? "—"}
        </span>
      </div>
    )
  ) : undefined;

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
      <section className="grid gap-6 xl:h-[calc(100dvh-8rem)] xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        <ProductBrowser
          categories={categories}
          dictionary={dictionary}
          error={error}
          getCartQuantity={(productId) =>
            cart.find((item) => item.product.id === productId)?.quantity ?? 0
          }
          onAddToCart={addToCart}
          onCategoryFilterChange={handleCategoryChange}
          onProductViewChange={setProductView}
          hideSearch={externalSearch !== undefined}
          onSearchChange={setSearch}
          onScanDetected={handleCameraScan}
          productView={productView}
          products={saleableProducts}
          promoCategory={PROMO_CATEGORY}
          promotionProductIds={promotionProductIds}
          promoChips={promoIndex.chips}
          promoStoreWide={promoIndex.storeWide}
          selectedPromoId={selectedPromoId}
          onPromoSelect={setSelectedPromoId}
          productPromoLabels={promoIndex.badgeByProduct}
          search={search}
          selectedCategory={selectedCategory}
          salePointSlot={salePointSlotNode}
          salePointBlocker={salePointBlockerNode}
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
          itemDiscountAmount={roundCurrency(cartSummary.discountAmount)}
          customerDiscountAmount={customerDiscountAmount}
          billDiscountAmount={billDiscountAmount}
          promoDiscountAmount={appliedPromoDiscount}
          promoBreakdown={appliedPromoBreakdown}
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
        selectedBankAccountId={selectedBankAccountId}
        setSelectedBankAccountId={setSelectedBankAccountId}
        bankAccounts={bankAccounts}
        paidAmount={paidAmount}
        note={note}
        setNote={setNote}
        billDiscountAmount={billDiscountAmount}
        billDiscountPercent={billDiscountPercent}
        billDiscountType={billDiscountType}
        customerDiscountAmount={customerDiscountAmount}
        customerDiscountPercent={customerDiscountPercent}
        promoDiscountAmount={appliedPromoDiscount}
        promoNames={appliedPromoNames}
        changeAmount={changeAmount}
        isPending={isPending}
        isCreatingQuotation={isCreatingQuotation}
        quotationMode={quotationMode}
        setQuotationMode={setQuotationMode}
        quotationValidUntil={quotationValidUntil}
        setQuotationValidUntil={setQuotationValidUntil}
        quickCashOptions={quickCashOptions}
        lastQuickCashAmount={lastQuickCashAmount}
        customerTypeLabel={customerTypeLabel}
        cartLength={cart.length}
        enabledPaymentChannels={enabledPaymentChannels}
        onClose={() => { setIsCheckoutSummaryOpen(false); setQuotationMode(false); }}
        onSubmit={() => { setIsCheckoutSummaryOpen(false); submitSale(); }}
        onCreateQuotation={handleCreateQuotation}
        onApplyQuickCash={applyQuickCash}
        onPaidAmountChange={(v) => { setPaidAmount(v); setIsPaidAmountTouched(true); }}
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
        onDiscountScopeChange={updateCartDiscountScope}
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
        status={receiptStatus}
        onClose={closeReceiptPreview}
        onPrint={handlePrintFromPrompt}
        onRetry={retryReceiptPreview}
        onCreateTaxInvoice={completedSaleId ? handleCreateTaxInvoiceFromReceipt : undefined}
        isTaxInvoicePending={isTaxInvoicePending}
        dictionary={{
          receiptPreviewLoading: dictionary.receiptPreviewLoading,
          receiptPreviewError: dictionary.receiptPreviewError,
          receiptPreviewRetryButton: dictionary.receiptPreviewRetryButton,
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
