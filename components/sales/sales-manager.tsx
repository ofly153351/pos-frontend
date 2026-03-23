"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { SalesDictionary } from "@/components/sales/types";
import { listCustomerLevelDiscounts, listCustomers } from "@/services/customers";
import { listProducts } from "@/services/products";
import { createSale, getSaleById, listSales } from "@/services/sales";
import type { Customer, CustomerLevelDiscount } from "@/types/customer";
import type { Product } from "@/types/product";
import type { Sale, SaleDiscountType, SalePaymentMethod } from "@/types/sale";

type CartItem = {
  discountType: SaleDiscountType;
  discountValue: string;
  product: Product;
  quantity: number;
};

type SalesManagerProps = {
  dictionary: SalesDictionary;
};

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [note, setNote] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [error, setError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isReceiptPending, startReceiptTransition] = useTransition();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    startTransition(async () => {
      try {
        const [productsResponse, salesResponse, customersResponse, discountResponse] = await Promise.all([
          listProducts(),
          listSales(),
          listCustomers(),
          listCustomerLevelDiscounts(),
        ]);

        setProducts(productsResponse.data ?? []);
        setSales(salesResponse.data ?? []);
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

  const payableTotal = Math.max(cartSummary.total - customerDiscountAmount, 0);

  const paidAmountValue = Number(paidAmount || 0);
  const changeAmount = paidAmountValue - payableTotal;

  async function reloadData() {
    const [productsResponse, salesResponse, customersResponse, discountResponse] = await Promise.all([
      listProducts(),
      listSales(),
      listCustomers(),
      listCustomerLevelDiscounts(),
    ]);

    setProducts(productsResponse.data ?? []);
    setSales(salesResponse.data ?? []);
    setCustomers(customersResponse.data ?? []);
    setCustomerLevelDiscounts(discountResponse.data ?? []);
  }

  function clearCart() {
    setCart([]);
    setSelectedCustomerId("");
    setNote("");
    setPaidAmount("");
    setPaymentMethod("cash");
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

  function updateCartQuantity(productId: string, nextQuantity: number) {
    setCart((currentCart) => {
      if (nextQuantity <= 0) {
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

  function submitSale() {
    setError("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setError(dictionary.emptyCart);
      return;
    }

    if (paidAmountValue < payableTotal) {
      setError(dictionary.insufficientPayment);
      return;
    }

    startTransition(async () => {
      try {
        const response = await createSale({
          customer_id: selectedCustomerId || undefined,
          items: cart.map((item) => {
            const discountValue = Number(item.discountValue || 0);

            return {
              discount_type: discountValue > 0 ? item.discountType : undefined,
              discount_value: discountValue > 0 ? discountValue : undefined,
              product_id: item.product.id,
              quantity: item.quantity,
            };
          }),
          note: note.trim() || undefined,
          paid_amount: paidAmountValue,
          payment_method: paymentMethod,
        });

        clearCart();
        setSuccessMessage(dictionary.checkoutSuccess);
        await reloadData();

        if (response.data?.id) {
          await openReceipt(response.data.id);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
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
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold text-slate-950">{dictionary.title}</h2>
            <div className="w-full max-w-sm">
              <input
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={dictionary.searchPlaceholder}
                value={search}
              />
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {saleableProducts.length > 0 ? (
              saleableProducts.map((product) => {
                const currentQuantity =
                  cart.find((item) => item.product.id === product.id)?.quantity ?? 0;

                return (
                  <div
                    key={product.id}
                    className="rounded-[1.5rem] border border-sky-100 bg-sky-50/55 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
                          {product.product_type_name ?? product.product_type?.name ?? "-"}
                        </p>
                        <p className="mt-3 text-lg font-semibold text-slate-950">
                          {product.name}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {dictionary.stockLabel} {product.quantity}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-base font-semibold text-slate-900">
                        {formatCurrency(product.effective_price)}
                      </span>
                      {currentQuantity > 0 ? (
                        <span className="rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white">
                          {dictionary.quantityLabel} {currentQuantity}
                        </span>
                      ) : null}
                    </div>

                    <button
                      className="mt-5 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                      disabled={currentQuantity >= product.quantity}
                      onClick={() => addToCart(product)}
                      type="button"
                    >
                      {currentQuantity >= product.quantity
                        ? dictionary.productOutOfStock
                        : dictionary.addButton}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="sm:col-span-2 xl:col-span-3">
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  {dictionary.emptyProducts}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-slate-950">{dictionary.cartTitle}</h2>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={clearCart}
                type="button"
              >
                {dictionary.clearCartButton}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {cart.length > 0 ? (
                cart.map((item) => {
                  const line = getCartLine(item);

                  return (
                    <div
                      key={item.product.id}
                      className="rounded-[1.25rem] border border-sky-100 bg-sky-50/60 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-950">{item.product.name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {dictionary.unitPriceLabel} {formatCurrency(line.unitPrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(line.lineTotal)}
                          </p>
                          {line.lineDiscount > 0 ? (
                            <p className="mt-1 text-xs font-medium text-emerald-700">
                              {dictionary.discountLabel} {formatCurrency(line.lineDiscount)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-end">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {dictionary.quantityLabel}
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              type="button"
                            >
                              -
                            </button>
                            <input
                              className="h-9 w-16 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-300"
                              inputMode="numeric"
                              max={item.product.quantity}
                              min="1"
                              onChange={(event) => {
                                const nextQuantity = Number.parseInt(event.target.value, 10);

                                if (Number.isNaN(nextQuantity)) {
                                  return;
                                }

                                updateCartQuantity(item.product.id, nextQuantity);
                              }}
                              pattern="[0-9]*"
                              step="1"
                              type="number"
                              value={item.quantity}
                            />
                            <button
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {dictionary.discountTypeLabel}
                            </span>
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                              onChange={(event) =>
                                updateCartDiscountType(
                                  item.product.id,
                                  event.target.value as SaleDiscountType,
                                )
                              }
                              value={item.discountType}
                            >
                              <option value="amount">{dictionary.discountAmountLabel}</option>
                              <option value="percent">{dictionary.discountPercentLabel}</option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {dictionary.discountValueLabel}
                            </span>
                            <input
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                              inputMode="decimal"
                              min="0"
                              onChange={(event) =>
                                updateCartDiscountValue(item.product.id, event.target.value)
                              }
                              placeholder="0"
                              value={item.discountValue}
                            />
                          </label>
                        </div>

                        <button
                          className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                          onClick={() => updateCartQuantity(item.product.id, 0)}
                          type="button"
                        >
                          {dictionary.removeItemButton}
                        </button>
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
              </div>

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

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {dictionary.customerPaymentLabel}
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => setPaidAmount(event.target.value)}
                  placeholder="0.00"
                  value={paidAmount}
                />
              </div>

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
            </div>

            <div className="mt-6 space-y-3 border-t border-sky-100 pt-5 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>{dictionary.summary.subtotalLabel}</span>
                <span>{formatCurrency(cartSummary.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{dictionary.summary.discountLabel}</span>
                <span>{formatCurrency(cartSummary.discountAmount)}</span>
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
                <span>{dictionary.totalPaidLabel}</span>
                <span>{formatCurrency(paidAmountValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{dictionary.changeLabel}</span>
                <span>{formatCurrency(Math.max(changeAmount, 0))}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-950">
                <span>{dictionary.summary.totalLabel}</span>
                <span>{formatCurrency(payableTotal)}</span>
              </div>
            </div>

            <button
              className="mt-6 w-full rounded-2xl bg-sky-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              disabled={cart.length === 0 || isPending}
              onClick={submitSale}
              type="button"
            >
              {isPending ? dictionary.confirmPaymentButton : dictionary.checkoutButton}
            </button>
          </section>

          <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-slate-950">{dictionary.historyTitle}</h2>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                {dictionary.itemCountLabel} {sales.length}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-[1.25rem] border border-sky-100 bg-sky-50/60 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{sale.payment_method}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {dictionary.saleAtLabel} {formatDateTime(sale.created_at)}
                        </p>
                        {(sale.discount_amount ?? 0) > 0 ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            {dictionary.discountSummaryLabel} {formatCurrency(sale.discount_amount ?? 0)}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(sale.total_amount ?? 0)}
                      </p>
                    </div>

                    <button
                      className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      onClick={() => openReceipt(sale.id)}
                      type="button"
                    >
                      {dictionary.viewReceiptButton}
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {dictionary.emptyHistory}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

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
    </>
  );
}
