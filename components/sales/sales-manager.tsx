"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { ProductBrowser } from "@/components/sales/product-browser";
import type { ProductViewMode, SalesDictionary } from "@/components/sales/types";
import { listCustomerLevelDiscounts, listCustomers } from "@/services/customers";
import { createInvoice } from "@/services/invoices";
import { listProducts } from "@/services/products";
import {
  calculateVat,
  createSale,
  getSaleById,
  getSaleReceiptHtml,
} from "@/services/sales";
import type { Customer, CustomerLevelDiscount } from "@/types/customer";
import type { Product } from "@/types/product";
import type { Sale, SaleDiscountType, SalePaymentMethod, VatCalculateSummary } from "@/types/sale";

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

type SalesManagerProps = {
  dictionary: SalesDictionary;
};

const productViewStorageKey = "pos-sales-product-view";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
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

function getDiscountPerUnit(item: CartItem) {
  const unitPrice = Number(item.product.effective_price ?? 0);
  const rawValue = Number(item.discountValue || 0);
  const discountValue = Number.isFinite(rawValue) ? rawValue : 0;

  if (item.discountType === "percent") {
    return unitPrice * Math.min(Math.max(discountValue, 0), 100) / 100;
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

export function SalesManager({ dictionary }: SalesManagerProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLevelDiscounts, setCustomerLevelDiscounts] = useState<CustomerLevelDiscount[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [productView, setProductView] = useState<ProductViewMode>("grid");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSettlementMode, setCustomerSettlementMode] = useState<"cash_now" | "invoice">("cash_now");
  const [note, setNote] = useState("");
  const [billDiscount, setBillDiscount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [quantityNumpad, setQuantityNumpad] = useState<QuantityNumpadState | null>(null);
  const [isQuantityNumpadOpen, setIsQuantityNumpadOpen] = useState(false);
  const [amountNumpad, setAmountNumpad] = useState<AmountNumpadState | null>(null);
  const [isAmountNumpadOpen, setIsAmountNumpadOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [applyVat, setApplyVat] = useState(true);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isCheckoutSummaryOpen, setIsCheckoutSummaryOpen] = useState(false);
  const [discountEditorProductId, setDiscountEditorProductId] = useState<string | null>(null);
  const [showVatControls, setShowVatControls] = useState(false);
  const [showNoteField, setShowNoteField] = useState(false);
  const [isPaidAmountTouched, setIsPaidAmountTouched] = useState(false);
  const [lastQuickCashAmount, setLastQuickCashAmount] = useState<number | null>(null);
  const [vatSummary, setVatSummary] = useState<VatCalculateSummary | null>(null);
  const [error, setError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPrintPromptOpen, setIsPrintPromptOpen] = useState(false);
  const [lastCompletedSaleId, setLastCompletedSaleId] = useState<string | null>(null);
  const [isReceiptPreviewLoading, setIsReceiptPreviewLoading] = useState(false);
  const [receiptPreviewHtml, setReceiptPreviewHtml] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isReceiptPending, startReceiptTransition] = useTransition();
  const numpadCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receiptPreviewFrameRef = useRef<HTMLIFrameElement | null>(null);
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
        const [productsResponse, customersResponse, discountResponse] = await Promise.all([
          listProducts(),
          listCustomers(),
          listCustomerLevelDiscounts(),
        ]);

        setProducts(productsResponse.data?.items ?? []);
        setCustomers(customersResponse.data ?? []);
        setCustomerLevelDiscounts(discountResponse.data ?? []);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }, []);

  const saleableProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!product.is_active || product.quantity <= 0) {
        return false;
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
  }, [products, search]);
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
    return customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  }, [customers, selectedCustomerId]);

  const customerDiscountPercent = useMemo(() => {
    if (!selectedCustomer) {
      return 0;
    }

    const customerLevel = Number(selectedCustomer.level ?? 1);
    const matchedRule = customerLevelDiscounts.find((rule) => rule.level === customerLevel);

    return Number(matchedRule?.discount_percent ?? 0);
  }, [customerLevelDiscounts, selectedCustomer]);

  const customerDiscountAmount = useMemo(() => {
    return cartSummary.total * Math.min(Math.max(customerDiscountPercent, 0), 100) / 100;
  }, [cartSummary.total, customerDiscountPercent]);

  const parsedBillDiscount = Number(billDiscount || 0);
  const sanitizedBillDiscount = Number.isFinite(parsedBillDiscount) ? parsedBillDiscount : 0;
  const maxBillDiscount = Math.max(cartSummary.total - customerDiscountAmount, 0);
  const billDiscountAmount = Math.min(Math.max(sanitizedBillDiscount, 0), maxBillDiscount);
  const payableTotal = Math.max(cartSummary.total - customerDiscountAmount - billDiscountAmount, 0);
  const fallbackNetBeforeVat = applyVat ? roundCurrency(payableTotal / 1.07) : roundCurrency(payableTotal);
  const fallbackVatAmount = applyVat ? roundCurrency(payableTotal - fallbackNetBeforeVat) : 0;
  const vatAmount = applyVat
    ? roundCurrency(vatSummary?.vat_amount ?? fallbackVatAmount)
    : 0;
  const settlementTotal = applyVat
    ? roundCurrency(vatSummary?.grand_total ?? payableTotal)
    : roundCurrency(payableTotal);
  const isNetworkCustomerSelected = Boolean(selectedCustomerId);
  const isInvoiceSettlement = isNetworkCustomerSelected && customerSettlementMode === "invoice";
  const customerTypeLabel = isNetworkCustomerSelected
    ? dictionary.customerTypeNetwork
    : dictionary.customerTypeGeneral;

  const parsedPaidAmount = Number(paidAmount || 0);
  const paidAmountValue = Number.isFinite(parsedPaidAmount) ? parsedPaidAmount : 0;
  const effectivePaidAmount = isInvoiceSettlement ? 0 : paidAmountValue;
  const changeAmount = effectivePaidAmount - settlementTotal;
  const quickCashOptions = useMemo(() => {
    const baseOptions = [100, 500, 1000];
    const settlementQuickAmount = Math.ceil(Math.max(settlementTotal, 0));

    if (settlementQuickAmount > 0 && !baseOptions.includes(settlementQuickAmount)) {
      return [...baseOptions, settlementQuickAmount];
    }

    return baseOptions;
  }, [settlementTotal]);
  const discountEditorItem = useMemo(() => {
    if (!discountEditorProductId) {
      return null;
    }

    return cart.find((item) => item.product.id === discountEditorProductId) ?? null;
  }, [cart, discountEditorProductId]);

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
          vat_included: true,
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
  }, [applyVat, billDiscountAmount, cart, customerDiscountAmount, startTransition]);

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
      setPaidAmount(settlementTotal.toFixed(2));
      setLastQuickCashAmount(null);
    }
  }, [isInvoiceSettlement, isPaidAmountTouched, settlementTotal]);

  async function reloadData() {
    const [productsResponse, customersResponse, discountResponse] = await Promise.all([
      listProducts(),
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
    setShowVatControls(false);
    setShowNoteField(false);
    setIsPaidAmountTouched(false);
    setLastQuickCashAmount(null);
    setPaymentMethod("cash");
  }

  function applyQuickCash(addAmount: number) {
    setPaidAmount((currentValue) => {
      if (!isPaidAmountTouched) {
        return String(addAmount);
      }

      if (lastQuickCashAmount !== addAmount) {
        return String(addAmount);
      }

      const parsed = Number(currentValue || 0);
      const base = Number.isFinite(parsed) ? parsed : 0;
      return String(base + addAmount);
    });
    setLastQuickCashAmount(addAmount);
    setIsPaidAmountTouched(true);
  }

  function addToCart(product: Product) {
    setError("");
    setSuccessMessage("");
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.product.id === product.id);

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

      if (existingItem.quantity >= product.quantity) {
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
          quantity: Math.min(nextQuantity, item.product.quantity),
        };
      });
    });
  }

  function updateCartDiscountType(productId: string, discountType: SaleDiscountType) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId
          ? { ...item, discountType }
          : item,
      ),
    );
  }

  function updateCartDiscountValue(productId: string, discountValue: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId
          ? { ...item, discountValue }
          : item,
      ),
    );
  }

  useEffect(() => {
    if (!discountEditorProductId) {
      return;
    }

    const stillExists = cart.some((item) => item.product.id === discountEditorProductId);
    if (!stillExists) {
      setDiscountEditorProductId(null);
    }
  }, [cart, discountEditorProductId]);

  function openQuantityNumpad(productId: string, currentQuantity: number, maxQuantity: number) {
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

      const nextValue = current.value === "0" ? digit : `${current.value}${digit}`;
      return { ...current, value: nextValue.slice(0, 6) };
    });
  }

  function clearNumpadValue() {
    setQuantityNumpad((current) => (current ? { ...current, value: "" } : current));
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
    setQuantityNumpad((current) => (current ? { ...current, value: digitsOnly } : current));
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
      if (!/^\d*(\.\d{0,2})?$/.test(nextValue)) {
        return current;
      }

      return { ...current, value: nextValue };
    });
  }

  function appendAmountNumpadDecimal() {
    setAmountNumpad((current) => {
      if (!current || current.value.includes(".")) {
        return current;
      }

      return { ...current, value: current.value ? `${current.value}.` : "0." };
    });
  }

  function clearAmountNumpadValue() {
    setAmountNumpad((current) => (current ? { ...current, value: "" } : current));
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
    if (!/^\d*(\.\d{0,2})?$/.test(value)) {
      return;
    }

    setAmountNumpad((current) => (current ? { ...current, value } : current));
  }

  function applyAmountNumpad() {
    if (!amountNumpad) {
      return;
    }

    if (amountNumpad.field === "bill_discount") {
      setBillDiscount(amountNumpad.value);
    } else {
      setPaidAmount(amountNumpad.value);
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
            vat_included: applyVat,
            vat_percent: applyVat ? 7 : 0,
          });

          clearCart();
          setSuccessMessage(dictionary.checkoutSuccess);
          await reloadData();
          return;
        }

        const response = await createSale({
          customer_id: selectedCustomerId || undefined,
          discount_bill: billDiscountAmount > 0 ? billDiscountAmount : undefined,
          items: mappedItems,
          note: note.trim() || undefined,
          paid_amount: paidAmountValue,
          payment_method: paymentMethod,
          vat_included: applyVat,
          vat_percent: applyVat ? 7 : 0,
        });

        clearCart();
        setSuccessMessage(dictionary.checkoutSuccess);
        await reloadData();

        if (response.data?.id) {
          setLastCompletedSaleId(response.data.id);
          setReceiptPreviewHtml("");
          setIsPrintPromptOpen(true);
          void prepareReceiptPreview(response.data.id);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function prepareReceiptPreview(saleId: string) {
    setIsReceiptPreviewLoading(true);

    try {
      const html = await getSaleReceiptHtml(saleId);
      setReceiptPreviewHtml(html);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Request failed");
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

    if (lastCompletedSaleId) {
      await openReceipt(lastCompletedSaleId);
    }
  }

  async function openReceipt(saleId: string) {
    setReceiptError("");
    setSelectedSale(null);
    setIsReceiptOpen(true);

    startReceiptTransition(async () => {
      try {
        const response = await getSaleById(saleId);
        setSelectedSale(response.data);
      } catch (nextError) {
        setReceiptError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  if (!hasMounted) {
    return (
      <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8">
        <p className="text-sm text-slate-500">{dictionary.title}</p>
      </section>
    );
  }

  return (
    <>
      <section className="grid gap-6 xl:h-[calc(100dvh-8rem)] xl:grid-cols-[1.15fr_0.85fr]">
        <ProductBrowser
          dictionary={dictionary}
          error={error}
          getCartQuantity={(productId) =>
            cart.find((item) => item.product.id === productId)?.quantity ?? 0
          }
          onAddToCart={addToCart}
          onProductViewChange={setProductView}
          onSearchChange={setSearch}
          productView={productView}
          products={saleableProducts}
          search={search}
          successMessage={successMessage}
        />

        <div className="space-y-6 xl:h-full xl:min-h-0">
          <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-slate-950">{dictionary.cartTitle}</h2>
              <button
                aria-label={dictionary.actionsLabel}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => setIsActionsMenuOpen(true)}
                type="button"
              >
                <span className="text-xl leading-none">...</span>
              </button>
            </div>

            <div className="pretty-scroll mt-6 space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
              {cart.length > 0 ? (
                cart.map((item) => {
                  const line = getCartLine(item);

                  return (
                    <div
                      key={item.product.id}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          {item.product.image_url ? (
                            <img
                              alt={item.product.name}
                              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
                              loading="lazy"
                              src={item.product.image_url}
                            />
                          ) : null}
                          <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">{item.product.name}</p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {dictionary.unitPriceLabel} {formatCurrency(line.unitPrice)}
                          </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(line.lineTotal)}
                          </p>
                          {line.lineDiscount > 0 ? (
                            <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                              {dictionary.discountLabel} {formatCurrency(line.lineDiscount)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-end justify-between gap-2.5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {dictionary.quantityLabel}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              type="button"
                            >
                              -
                            </button>
                            <input
                              className="h-8 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-slate-900 outline-none transition focus:border-sky-300"
                              inputMode="numeric"
                              max={item.product.quantity}
                              min="1"
                              onClick={() =>
                                openQuantityNumpad(
                                  item.product.id,
                                  item.quantity,
                                  item.product.quantity,
                                )
                              }
                              onFocus={(event) => event.target.blur()}
                              pattern="[0-9]*"
                              readOnly
                              step="1"
                              type="number"
                              value={item.quantity}
                            />
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex items-end gap-1.5">
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            onClick={() => setDiscountEditorProductId(item.product.id)}
                            title={dictionary.discountTypeLabel}
                            type="button"
                          >
                            ...
                          </button>
                          <button
                            aria-label={dictionary.removeItemButton}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                            onClick={() => updateCartQuantity(item.product.id, 0)}
                            title={dictionary.removeItemButton}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {dictionary.emptyCart}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4 border-t border-sky-100 pt-5">
              {showVatControls ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {dictionary.vatToggleLabel}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        applyVat
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setApplyVat(true);
                        setIsPaidAmountTouched(false);
                      }}
                      type="button"
                    >
                      {dictionary.vatToggleOn}
                    </button>
                    <button
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        !applyVat
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setApplyVat(false);
                        setIsPaidAmountTouched(false);
                      }}
                      type="button"
                    >
                      {dictionary.vatToggleOff}
                    </button>
                  </div>
                </div>
              ) : null}

              {showNoteField ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {dictionary.noteLabel}
                  </label>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={dictionary.notePlaceholder}
                    value={note}
                  />
                </div>
              ) : null}
            </div>

            <button
              className="mt-6 w-full rounded-2xl bg-sky-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              disabled={cart.length === 0 || isPending}
              onClick={() => setIsCheckoutSummaryOpen(true)}
              type="button"
            >
              {dictionary.checkoutButton}
            </button>
          </section>

        </div>
      </section>

      {isActionsMenuOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-950">{dictionary.actionsLabel}</h3>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setIsActionsMenuOpen(false)}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <button
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  showNoteField
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-700 hover:bg-slate-50"
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
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  showVatControls
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setShowVatControls((current) => !current);
                  setIsActionsMenuOpen(false);
                }}
                type="button"
              >
                <span>{dictionary.vatToggleLabel}</span>
                <span>{showVatControls ? "✓" : ""}</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                onClick={clearCart}
                type="button"
              >
                {dictionary.clearCartButton}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCheckoutSummaryOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-4xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-950">{dictionary.checkoutSectionTitle}</h3>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setIsCheckoutSummaryOpen(false)}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {dictionary.customerLabel}
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                    value={selectedCustomerId}
                  >
                    <option value="">{dictionary.customerPlaceholder}</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name} (L{customer.level ?? 1} • {customerLevelDiscounts.find((rule) => rule.level === Number(customer.level ?? 1))?.discount_percent ?? 0}%)
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    {dictionary.customerTypeLabel}: {customerTypeLabel}
                  </p>
                </div>

                {isNetworkCustomerSelected ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {dictionary.customerSettlementLabel}
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          customerSettlementMode === "cash_now"
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        onClick={() => setCustomerSettlementMode("cash_now")}
                        type="button"
                      >
                        {dictionary.customerSettlementCashNow}
                      </button>
                      <button
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          customerSettlementMode === "invoice"
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {dictionary.paymentMethodLabel}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: dictionary.paymentMethodCashLabel, value: "cash" },
                        { label: dictionary.paymentMethodCard, value: "card" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            paymentMethod === option.value
                              ? "border-sky-600 bg-sky-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {dictionary.discountBillLabel}
                        </label>
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                          inputMode="decimal"
                          min="0"
                          onClick={() => openAmountNumpad("bill_discount")}
                          onFocus={(event) => event.target.blur()}
                          placeholder="0.00"
                          readOnly
                          value={billDiscount}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {dictionary.customerPaymentLabel}
                        </label>
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                          inputMode="decimal"
                          min="0"
                          onClick={() => openAmountNumpad("paid_amount")}
                          onFocus={(event) => event.target.blur()}
                          placeholder="0.00"
                          readOnly
                          value={paidAmount}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {dictionary.quickCashLabel}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {quickCashOptions.map((amount) => (
                          <button
                            key={amount}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                              lastQuickCashAmount === amount
                                ? "border-sky-600 bg-sky-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() => applyQuickCash(amount)}
                            type="button"
                          >
                            +{amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 border-t border-sky-100 pt-4 text-sm text-slate-600 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <div className="flex items-center justify-between">
                  <span>{dictionary.summary.subtotalLabel}</span>
                  <span>{formatCurrency(cartSummary.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dictionary.summary.discountLabel}</span>
                  <span>{formatCurrency(cartSummary.discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dictionary.customerTypeLabel}</span>
                  <span>{customerTypeLabel}</span>
                </div>
                {selectedCustomerId ? (
                  <div className="flex items-center justify-between">
                    <span>
                      {dictionary.customerDiscountLabel} ({customerDiscountPercent}%)
                    </span>
                    <span>-{formatCurrency(customerDiscountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span>{dictionary.discountBillLabel}</span>
                  <span>-{formatCurrency(billDiscountAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dictionary.vatAmountLabel}</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dictionary.totalPaidLabel}</span>
                  <span>{formatCurrency(effectivePaidAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dictionary.changeLabel}</span>
                  <span>{formatCurrency(Math.max(changeAmount, 0))}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-slate-950">
                  <span>{dictionary.summary.totalLabel}</span>
                  <span>{formatCurrency(settlementTotal)}</span>
                </div>
              </div>
            </div>

            <button
              className="mt-5 w-full rounded-2xl bg-sky-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
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
          <div className="w-full max-w-sm rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-950">{discountEditorItem.product.name}</h3>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
                    { label: dictionary.discountAmountLabel, value: "amount" as const },
                    { label: dictionary.discountPercentLabel, value: "percent" as const },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        discountEditorItem.discountType === option.value
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => updateCartDiscountType(discountEditorItem.product.id, option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {dictionary.discountValueLabel}
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                  inputMode="decimal"
                  min="0"
                  onChange={(event) =>
                    updateCartDiscountValue(discountEditorItem.product.id, event.target.value)
                  }
                  placeholder="0"
                  value={discountEditorItem.discountValue}
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {isReceiptOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-950">{dictionary.receiptTitle}</h3>
                {selectedSale ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {dictionary.saleAtLabel} {formatDateTime(selectedSale.created_at)}
                  </p>
                ) : null}
              </div>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  setIsReceiptOpen(false);
                  setSelectedSale(null);
                  setReceiptError("");
                }}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            {receiptError ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {receiptError}
              </div>
            ) : null}

            {isReceiptPending && !selectedSale ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {dictionary.viewReceiptButton}
              </div>
            ) : null}

            {selectedSale ? (
              <>
                <div className="mt-6 space-y-3">
                  {(selectedSale.items ?? []).map((item) => (
                    <div
                      key={`${item.product_id}-${item.id ?? item.product_name ?? "item"}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.product_name ?? dictionary.unavailableProduct}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {dictionary.quantityLabel} {item.quantity}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {dictionary.unitPriceLabel} {formatCurrency(item.unit_price ?? 0)}
                        </p>
                        {(item.line_discount_total ?? 0) > 0 ? (
                          <p className="mt-1 text-sm text-emerald-700">
                            {dictionary.discountLabel} {formatCurrency(item.line_discount_total ?? 0)}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(item.line_total ?? item.total_amount ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>{dictionary.summary.subtotalLabel}</span>
                    <span>{formatCurrency(selectedSale.subtotal_amount ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{dictionary.summary.discountLabel}</span>
                    <span>{formatCurrency(selectedSale.discount_amount ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{dictionary.summary.totalLabel}</span>
                    <span>{formatCurrency(selectedSale.total_amount ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{dictionary.totalPaidLabel}</span>
                    <span>{formatCurrency(selectedSale.paid_amount ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{dictionary.changeLabel}</span>
                    <span>{formatCurrency(selectedSale.change_amount ?? 0)}</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {isPrintPromptOpen ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/45 px-4 py-6 transition-opacity duration-300">
          <div className="w-full max-w-4xl rounded-[1.5rem] bg-white p-6 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-7">
            <h3 className="text-xl font-semibold text-slate-950">{dictionary.printReceiptAskTitle}</h3>
            <p className="mt-2 text-sm text-slate-600">{dictionary.printReceiptAskBody}</p>

            <div className="mt-5 h-[52vh] rounded-2xl border border-slate-200 bg-slate-100 p-3">
              {isReceiptPreviewLoading ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500">
                  {dictionary.receiptPreviewLoading}
                </div>
              ) : receiptPreviewHtml ? (
                <iframe
                  className="h-full w-full rounded-xl border border-slate-200 bg-white"
                  ref={receiptPreviewFrameRef}
                  srcDoc={receiptPreviewHtml}
                  title={dictionary.receiptPreviewTitle}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500">
                  {dictionary.receiptPreviewLoading}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={async () => {
                  setIsPrintPromptOpen(false);
                  setReceiptPreviewHtml("");
                  if (lastCompletedSaleId) {
                    await openReceipt(lastCompletedSaleId);
                  }
                }}
                type="button"
              >
                {dictionary.printReceiptSkipButton}
              </button>
              <button
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                disabled={isReceiptPreviewLoading || !receiptPreviewHtml}
                onClick={handlePrintFromPrompt}
                type="button"
              >
                {dictionary.printReceiptNowButton}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {quantityNumpad ? (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-6 transition-opacity duration-300 sm:items-center ${
            isQuantityNumpadOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
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
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold text-slate-900 outline-none transition focus:border-sky-300"
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
                  key={digit}
                  onClick={() => appendNumpadDigit(digit)}
                  type="button"
                >
                  {digit}
                </button>
              ))}
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={clearNumpadValue}
                type="button"
              >
                {dictionary.quantityNumpadClear}
              </button>
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={() => appendNumpadDigit("0")}
                type="button"
              >
                0
              </button>
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={backspaceNumpadValue}
                type="button"
              >
                {dictionary.quantityNumpadBackspace}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={closeQuantityNumpad}
                type="button"
              >
                {dictionary.quantityNumpadCancel}
              </button>
              <button
                className="rounded-xl bg-sky-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
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
            isAmountNumpadOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
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
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold text-slate-900 outline-none transition focus:border-sky-300"
              inputMode="decimal"
              onChange={(event) => onAmountNumpadInputChange(event.target.value)}
              pattern="^\d*(\.\d{0,2})?$"
              type="text"
              value={amountNumpad.value}
            />

            <div className="mt-4 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
                  key={digit}
                  onClick={() => appendAmountNumpadDigit(digit)}
                  type="button"
                >
                  {digit}
                </button>
              ))}
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={clearAmountNumpadValue}
                type="button"
              >
                {dictionary.quantityNumpadClear}
              </button>
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={() => appendAmountNumpadDigit("0")}
                type="button"
              >
                0
              </button>
              <button
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={appendAmountNumpadDecimal}
                type="button"
              >
                .
              </button>
            </div>

            <div className="mt-2">
              <button
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={backspaceAmountNumpadValue}
                type="button"
              >
                {dictionary.quantityNumpadBackspace}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={closeAmountNumpad}
                type="button"
              >
                {dictionary.quantityNumpadCancel}
              </button>
              <button
                className="rounded-xl bg-sky-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                onClick={applyAmountNumpad}
                type="button"
              >
                {dictionary.quantityNumpadApply}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
