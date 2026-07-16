"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Maximize2,
  Palette,
  QrCode,
  ShoppingCart,
  Smartphone,
  Tag,
  User,
  Wallet,
} from "lucide-react";

import {
  subscribeDisplayState,
  WELCOME,
  AUTO_RETURN_MS,
  type DisplayItem,
  type DisplayState,
} from "@/lib/customer-display";

type Dict = {
  welcomeTitle: string;
  welcomeSub: string;
  waitingForSale: string;
  items: string;
  qty: string;
  vat: string;
  total: string;
  payTitle: string;
  payScanQr: string;
  payCash: string;
  amountDue: string;
  successTitle: string;
  successThanks: string;
  change: string;
  fullscreen: string;
  pieces: string;
  statusWelcome: string;
  statusReceiving: string;
  statusReadyToPay: string;
  statusSuccess: string;
  generalCustomer: string;
  memberLabel: string;
  memberLevel: string;
  appliedPromotions: string;
  subtotalBeforeDiscount: string;
  itemDiscount: string;
  memberDiscount: string;
  promoDiscount: string;
  billDiscount: string;
  coupon: string;
  promoAndCouponDiscount: string;
  received: string;
  processingPayment: string;
  levelSilver: string;
  levelGold: string;
  levelPlatinum: string;
  levelVip: string;
  levelGeneral: string;
  methodCash: string;
  methodCard: string;
  methodPromptPay: string;
  methodTransfer: string;
  methodQr: string;
  methodBankTransfer: string;
  methodOther: string;
  bankTransferTitle: string;
  bankTransferInstruction: string;
  /** "กรุณาตรวจสอบรายการก่อนชำระเงิน" — shown in right panel when no member/promo active */
  reviewItems: string;
  /** "ลดทั้งรายการ" — label for whole-line fixed-amount discount */
  wholeLineDiscount: string;
  /** "ลด" — prefix for per-unit discount ("ลด ฿5.00/ชิ้น") */
  perUnitDiscountPrefix: string;
  /** "รวมส่วนลด" — total discount sub-row for per-unit case */
  totalItemDiscount: string;
  /** "ส่วนลด" — prefix for percentage discount ("ส่วนลด 10%") */
  percentDiscountLabel: string;
  /** Column header for the product name column */
  productColumn: string;
  /** Column header for the unit price column */
  unitPrice: string;
  /** Column header for the line total column */
  colTotal: string;
};

type Palette = "light" | "dark";

type ThemeConfig = {
  id: string;
  label: string;
  gradient: string;
  stickyBg: string;
  palette: Palette;
};

// tx: pick class based on palette
function tx(palette: Palette, dark: string, light: string) {
  return palette === "dark" ? dark : light;
}

const THEMES: ThemeConfig[] = [
  {
    id: "violet",
    label: "ม่วงระบบ",
    gradient: "linear-gradient(160deg,#2e1065 0%,#5b21b6 45%,#7c3aed 100%)",
    stickyBg: "rgba(46,16,101,0.97)",
    palette: "dark",
  },
  {
    id: "forest",
    label: "เขียวป่า",
    gradient: "linear-gradient(160deg,#103824 0%,#1a6040 45%,#228558 100%)",
    stickyBg: "rgba(16,56,36,0.97)",
    palette: "dark",
  },
  {
    id: "white",
    label: "สว่าง (White)",
    gradient: "linear-gradient(160deg,#fafafa 0%,#f3f0ff 50%,#ede8ff 100%)",
    stickyBg: "rgba(250,250,250,0.97)",
    palette: "light",
  },
  {
    id: "dark",
    label: "มืดสบายตา (Dark)",
    gradient: "linear-gradient(160deg,#0f172a 0%,#1e293b 45%,#334155 100%)",
    stickyBg: "rgba(15,23,42,0.97)",
    palette: "dark",
  },
];

function RealtimeClock({ palette }: { palette: Palette }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  const timeStr = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const dateStr = now.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <div className={["flex flex-col items-center rounded-xl px-4 py-1.5 ring-1", tx(palette, "bg-white/[0.08] ring-white/15", "bg-slate-900/[0.06] ring-slate-900/15")].join(" ")}>
      <span className={["nums text-lg font-bold tabular-nums tracking-widest", tx(palette, "text-white", "text-slate-900")].join(" ")}>{timeStr}</span>
      <span className={["text-[11px] font-medium", tx(palette, "text-white/60", "text-slate-500")].join(" ")}>{dateStr}</span>
    </div>
  );
}

function baht(v: number) {
  return (
    "฿" +
    v.toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function getLevelName(level: number | undefined, dict: Dict): string {
  switch (level) {
    case 2:
      return dict.levelSilver;
    case 3:
      return dict.levelGold;
    case 4:
      return dict.levelPlatinum;
    case 5:
      return dict.levelVip;
    default:
      return dict.levelGeneral;
  }
}

function getMethodLabel(method: string | undefined, dict: Dict): string {
  switch (method) {
    case "cash":
      return dict.methodCash;
    case "card":
      return dict.methodCard;
    case "promptpay":
    case "qr":
      return dict.methodQr;
    case "transfer":
      return dict.methodTransfer;
    case "bank_transfer":
      return dict.methodBankTransfer;
    default:
      return dict.methodOther;
  }
}

export function CustomerDisplay({
  dict,
  locale,
  storeName,
}: {
  dict: Dict;
  /** Route locale ("th" | "en") — drives the root lang attribute. */
  locale?: string;
  storeName: string;
}) {
  const [state, setState] = useState<DisplayState>(WELCOME);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cd-theme") ?? "violet";
    }
    return "navy";
  });
  const activeTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  // Persist the latest store identity across phase changes.
  // WELCOME state carries no store fields; the last known values are kept so the
  // header stays branded when the display cycles back to welcome after a sale.
  const [storeIdentity, setStoreIdentity] = useState<{ name: string; logoUrl: string | null }>({
    name: storeName,
    logoUrl: null,
  });

  useEffect(() => {
    function onFsChange() {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (fs) setThemePickerOpen(false);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    // Combined subscriber: update display state AND store identity in one callback
    // so setState is called from inside the subscription callback, not in the effect body.
    return subscribeDisplayState((next) => {
      setState(next);
      if (next.phase !== "welcome" && next.storeName) {
        setStoreIdentity({ name: next.storeName, logoUrl: next.storeLogoUrl ?? null });
      }
    });
  }, []);

  // Auto-return to welcome after success — cancel if any new state arrives.
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (state.phase === "success") {
      timerRef.current = setTimeout(() => setState(WELCOME), AUTO_RETURN_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);

  function goFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  const statusText = useMemo(() => {
    switch (state.phase) {
      case "welcome":
        return dict.statusWelcome;
      case "selling":
        return dict.statusReceiving;
      case "payment":
        return dict.statusReadyToPay;
      case "success":
        return dict.statusSuccess;
    }
  }, [state.phase, dict]);

  const itemCount = state.phase === "selling" ? state.items.length : 0;
  const unitCount =
    state.phase === "selling"
      ? state.items.reduce((n, it) => n + it.qty, 0)
      : 0;

  const p = activeTheme.palette;

  return (
    <div
      className={["relative flex h-screen w-screen flex-col overflow-hidden select-none", tx(p, "text-white", "text-slate-900")].join(" ")}
      style={{ background: activeTheme.gradient }}
      lang={locale ?? "th"}
    >
      {/* ── Compact fixed header ── */}
      <header className={["flex shrink-0 items-center justify-between gap-6 border-b px-8 py-3", tx(p, "border-white/10", "border-slate-900/10")].join(" ")}>
        {/* Store identity */}
        <div className="flex min-w-0 items-center gap-3">
          {storeIdentity.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storeIdentity.logoUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tx(p, "bg-white/10", "bg-slate-900/8")].join(" ")}>
              <ShoppingCart className={["h-4 w-4", tx(p, "text-white/80", "text-slate-600")].join(" ")} aria-hidden />
            </div>
          )}
          {storeIdentity.name ? (
            <span className={["truncate text-sm font-bold", tx(p, "text-white", "text-slate-900")].join(" ")}>
              {storeIdentity.name}
            </span>
          ) : null}
        </div>

        {/* Status + item count */}
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className={["text-sm font-semibold", tx(p, "text-white", "text-slate-800")].join(" ")}>
            {statusText}
          </span>
          {state.phase === "selling" && itemCount > 0 && (
            <span className={["nums text-xs", tx(p, "text-white/70", "text-slate-500")].join(" ")}>
              {itemCount} {dict.items} · {unitCount} {dict.pieces}
            </span>
          )}
        </div>

        {/* Right: clock + theme picker + fullscreen */}
        <div className="flex shrink-0 items-center gap-3">
          <RealtimeClock palette={p} />

          {!isFullscreen && (
            <>
              {/* Theme picker */}
              <div className="relative">
                <button
                  onClick={() => setThemePickerOpen((v) => !v)}
                  className={["flex h-9 w-9 items-center justify-center rounded-full border transition", tx(p, "border-white/20 bg-white/10 hover:bg-white/20", "border-slate-900/20 bg-slate-900/8 hover:bg-slate-900/12")].join(" ")}
                  aria-label="เลือกธีม"
                  type="button"
                >
                  <Palette className={["h-4 w-4", tx(p, "text-white/80", "text-slate-600")].join(" ")} />
                </button>
                {themePickerOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 flex w-48 flex-col gap-1 rounded-2xl border border-slate-700/30 bg-slate-900/97 p-3 shadow-2xl backdrop-blur-md">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">ธีมสี</p>
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setThemeId(t.id);
                          localStorage.setItem("cd-theme", t.id);
                          setThemePickerOpen(false);
                        }}
                        className={["flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-white/10", themeId === t.id ? "bg-white/15 text-white" : "text-white/70"].join(" ")}
                      >
                        <span
                          className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/20"
                          style={{ background: t.gradient }}
                        />
                        {t.label}
                        {themeId === t.id && <span className="ml-auto text-xs text-violet-300">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen button — hidden once in fullscreen */}
              <button
                onClick={goFullscreen}
                aria-label={dict.fullscreen}
                className={["flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2", tx(p, "border-white/20 bg-white/10 text-white/80 hover:bg-white/20 focus-visible:outline-white/50", "border-slate-900/20 bg-slate-900/8 text-slate-700 hover:bg-slate-900/15 focus-visible:outline-slate-900/50")].join(" ")}
                type="button"
              >
                <Maximize2 className="h-4 w-4" aria-hidden />
                <span className="hidden lg:inline">{dict.fullscreen}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="min-h-0 flex-1 overflow-hidden">
        {state.phase === "welcome" && <WelcomeScreen dict={dict} palette={p} />}
        {state.phase === "selling" && (
          <SellingScreen dict={dict} state={state} stickyBg={activeTheme.stickyBg} palette={p} />
        )}
        {state.phase === "payment" && (
          <PaymentScreen dict={dict} state={state} palette={p} />
        )}
        {state.phase === "success" && (
          <SuccessScreen dict={dict} state={state} palette={p} />
        )}
      </main>
    </div>
  );
}

/* ─── Welcome ──────────────────────────────────────────────────────────────── */

function WelcomeScreen({ dict, palette }: { dict: Dict; palette: Palette }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-10 text-center">
      <div className={["flex h-28 w-28 items-center justify-center rounded-[2rem] ring-1", tx(palette, "bg-white/10 ring-white/20", "bg-slate-900/8 ring-slate-900/15")].join(" ")}>
        <ShoppingCart className={["h-14 w-14", tx(palette, "text-white/90", "text-slate-700")].join(" ")} aria-hidden />
      </div>
      <h1 className="text-5xl font-extrabold tracking-tight">
        {dict.welcomeTitle}
      </h1>
      <p className={["text-xl font-medium", tx(palette, "text-white/80", "text-slate-700")].join(" ")}>{dict.welcomeSub}</p>
      <p className={["text-sm", tx(palette, "text-white/55", "text-slate-500")].join(" ")}>{dict.waitingForSale}</p>
    </div>
  );
}

/* ─── Selling ──────────────────────────────────────────────────────────────── */

function SellingScreen({
  dict,
  state,
  stickyBg,
  palette,
}: {
  dict: Dict;
  state: Extract<DisplayState, { phase: "selling" }>;
  stickyBg: string;
  palette: Palette;
}) {
  // Ref array for individual item DOM nodes — used for auto-scroll.
  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const prevItemsRef = useRef<DisplayItem[]>([]);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  // Track which item changed (new or qty increased) for highlight + scroll.
  useEffect(() => {
    const prev = prevItemsRef.current;
    const curr = state.items;

    // First mount or returning from another phase — don't highlight stale items.
    if (prev.length === 0) {
      prevItemsRef.current = curr;
      return;
    }

    let changedIdx: number | null = null;
    for (let i = 0; i < curr.length; i++) {
      const p = prev.find((x) => x.name === curr[i].name);
      if (!p || p.qty < curr[i].qty) {
        changedIdx = i;
        break;
      }
    }
    prevItemsRef.current = curr;

    if (changedIdx !== null) {
      setHighlightIdx(changedIdx);
      // Auto-scroll to changed item; use "nearest" to avoid jumping when visible.
      requestAnimationFrame(() => {
        itemEls.current[changedIdx!]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    }
  }, [state.items]);

  // Dev-only bill invariant check.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const computed =
      state.subtotalBeforeDiscount -
      state.itemDiscount -
      state.customerDiscount -
      state.promoDiscount -
      state.billDiscount +
      state.vat;
    const delta = Math.abs(computed - state.total);
    if (delta > 0.02) {
      console.warn("[CustomerDisplay] bill invariant Δ=" + delta.toFixed(4), state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.total]);

  const hasAnyDiscount =
    state.itemDiscount > 0 ||
    state.customerDiscount > 0 ||
    state.promoDiscount > 0 ||
    state.billDiscount > 0;

  const isMember =
    state.customerLevel !== undefined && state.customerLevel > 1;

  return (
    <div className="flex h-full">
      {/* ── Left 65%: scrollable item list ── */}
      <section
        className="flex min-h-0 flex-[65] flex-col"
        aria-label="รายการสินค้า"
      >
        <div className="min-h-0 flex-1 overflow-y-auto pretty-scroll">
          {/* Sticky column header */}
          <div className={["sticky top-0 z-10 grid grid-cols-[3rem_minmax(0,1fr)_3.25rem_7rem_7rem] items-center gap-x-3 border-b px-4 py-2 backdrop-blur-sm", tx(palette, "border-white/10", "border-slate-900/10")].join(" ")} style={{ backgroundColor: stickyBg }}>
            <span aria-hidden />
            <span className={["text-xs font-semibold uppercase tracking-wider", tx(palette, "text-white/75", "text-slate-500")].join(" ")}>
              {dict.productColumn}
            </span>
            <span className={["text-right text-xs font-semibold uppercase tracking-wider", tx(palette, "text-white/75", "text-slate-500")].join(" ")}>
              {dict.qty}
            </span>
            <span className={["text-right text-xs font-semibold uppercase tracking-wider", tx(palette, "text-white/75", "text-slate-500")].join(" ")}>
              {dict.unitPrice}
            </span>
            <span className={["text-right text-xs font-semibold uppercase tracking-wider", tx(palette, "text-white/75", "text-slate-500")].join(" ")}>
              {dict.colTotal}
            </span>
          </div>
          <div className="py-2">
            {state.items.map((item, i) => (
              <ItemRow
                key={item.name + String(i)}
                itemRef={(el) => {
                  itemEls.current[i] = el;
                }}
                item={item}
                isHighlighted={highlightIdx === i}
                dict={dict}
                palette={palette}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="my-4 w-px shrink-0 bg-white/10" aria-hidden />

      {/* ── Right 35%: customer + promotions + summary ── */}
      <aside
        className="flex min-h-0 flex-[35] flex-col gap-4 overflow-y-auto px-6 py-4 pretty-scroll"
        aria-label="สรุปรายการ"
      >
        <CustomerPanel dict={dict} state={state} isMember={isMember} palette={palette} />

        {/* "Review items" nudge when right panel would otherwise be empty */}
        {!state.customerName && state.promoDiscount === 0 && state.customerDiscount === 0 && (
          <p className={["px-2 text-center text-sm", tx(palette, "text-white/35", "text-slate-400")].join(" ")}>{dict.reviewItems}</p>
        )}

        {(state.promoDiscount > 0 || state.customerDiscount > 0) && (
          <PromotionsPanel dict={dict} state={state} palette={palette} />
        )}

        <div className="flex-1" />

        <BillSummary
          dict={dict}
          state={state}
          hasAnyDiscount={hasAnyDiscount}
          palette={palette}
        />
      </aside>
    </div>
  );
}

/* ─── Item row ─────────────────────────────────────────────────────────────── */

function ItemRow({
  item,
  isHighlighted,
  itemRef,
  dict,
  palette,
}: {
  item: DisplayItem;
  isHighlighted: boolean;
  itemRef?: (el: HTMLDivElement | null) => void;
  dict: Dict;
  palette: Palette;
}) {
  const disc = item.discount;
  const hasDisc = !!disc && disc.totalDiscount > 0;
  // Show strikethrough + discounted price in unit-price column only when per-unit price differs
  const showUnitDiscount = hasDisc && item.hasItemDiscount;

  function discountLabel(): string {
    if (!disc) return "";
    if (disc.type === "percent") {
      return `${dict.percentDiscountLabel} ${disc.value}%`;
    }
    if (disc.scope === "unit") {
      return `${dict.perUnitDiscountPrefix} ${baht(disc.value)}/${dict.pieces}`;
    }
    return `${dict.wholeLineDiscount} ${baht(disc.totalDiscount)}`;
  }

  return (
    <div
      ref={itemRef}
      className={[
        "grid grid-cols-[3rem_minmax(0,1fr)_3.25rem_7rem_7rem] items-center gap-x-3 rounded-xl px-4 py-2.5 transition-all duration-500",
        isHighlighted
          ? "bg-amber-400/25 ring-2 ring-amber-300/70 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
          : tx(palette, "odd:bg-white/[0.04]", "odd:bg-slate-900/[0.04]"),
      ].join(" ")}
    >
      {/* Col 1: Product image — fixed 48×48 slot */}
      <div className={["relative h-12 w-12 shrink-0 overflow-hidden rounded-lg", tx(palette, "bg-white/10", "bg-slate-900/8")].join(" ")}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tag className={["h-5 w-5", tx(palette, "text-white/30", "text-slate-400")].join(" ")} aria-hidden />
          </div>
        )}
      </div>

      {/* Col 2: Product name (bold, truncated) + discount label when applicable */}
      <div className="min-w-0">
        <p
          className={["truncate text-base font-bold leading-tight transition-colors duration-300", isHighlighted ? tx(palette, "text-amber-200", "text-amber-800") : tx(palette, "text-white", "text-slate-900")].join(" ")}
          title={item.name}
          aria-label={item.name}
        >
          {item.name}
        </p>
        {hasDisc && (
          <p className={["mt-0.5 truncate text-xs font-medium", tx(palette, "text-emerald-300", "text-emerald-700")].join(" ")}>
            {discountLabel()}
          </p>
        )}
      </div>

      {/* Col 3: Quantity */}
      <span className={["nums tabular-nums text-right text-sm font-semibold", tx(palette, "text-white/80", "text-slate-700")].join(" ")}>
        {item.qty}
      </span>

      {/* Col 4: Unit price — strikethrough original + effective when per-unit discount */}
      <div className="flex flex-col items-end">
        {showUnitDiscount && (
          <span className={["nums tabular-nums text-xs line-through", tx(palette, "text-white/40", "text-slate-400")].join(" ")}>
            {baht(item.originalUnitPrice)}
          </span>
        )}
        <span
          className={[
            "nums tabular-nums text-right text-sm",
            showUnitDiscount
              ? tx(palette, "font-semibold text-emerald-300", "font-semibold text-emerald-700")
              : tx(palette, "font-medium text-white/85", "font-medium text-slate-700"),
          ].join(" ")}
        >
          {baht(item.unitPrice)}
        </span>
      </div>

      {/* Col 5: Line total */}
      <span
        className={[
          "nums tabular-nums text-right text-base font-bold",
          hasDisc ? tx(palette, "text-emerald-300", "text-emerald-700") : tx(palette, "text-white", "text-slate-900"),
        ].join(" ")}
      >
        {baht(item.lineTotal)}
      </span>
    </div>
  );
}

/* ─── Customer panel ───────────────────────────────────────────────────────── */

function CustomerPanel({
  dict,
  state,
  isMember,
  palette,
}: {
  dict: Dict;
  state: Extract<DisplayState, { phase: "selling" }>;
  isMember: boolean;
  palette: Palette;
}) {
  return (
    <div className={["flex items-start gap-3 rounded-xl px-4 py-3 ring-1", tx(palette, "bg-white/[0.06] ring-white/10", "bg-slate-900/[0.06] ring-slate-900/10")].join(" ")}>
      <div className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tx(palette, "bg-white/10", "bg-slate-900/8")].join(" ")}>
        <User className={["h-4 w-4", tx(palette, "text-white/70", "text-slate-500")].join(" ")} aria-hidden />
      </div>
      <div className="min-w-0">
        {state.customerName ? (
          <>
            <p className={["text-xs font-semibold uppercase tracking-wider", tx(palette, "text-white/50", "text-slate-500")].join(" ")}>
              {isMember ? dict.memberLabel : dict.generalCustomer}
            </p>
            <p className={["truncate text-base font-bold", tx(palette, "text-white", "text-slate-900")].join(" ")}>
              {state.customerName}
            </p>
            {isMember && (
              <p className={["text-xs font-medium", tx(palette, "text-violet-300", "text-violet-700")].join(" ")}>
                {dict.memberLevel}: {getLevelName(state.customerLevel, dict)}
              </p>
            )}
          </>
        ) : (
          <p className={["text-sm font-medium", tx(palette, "text-white/75", "text-slate-600")].join(" ")}>
            {dict.generalCustomer}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Promotions panel ─────────────────────────────────────────────────────── */

function PromotionsPanel({
  dict,
  state,
  palette,
}: {
  dict: Dict;
  state: Extract<DisplayState, { phase: "selling" }>;
  palette: Palette;
}) {
  const rows: string[] = [];
  if (state.customerDiscount > 0 && state.customerDiscountPercent > 0) {
    rows.push(`${dict.memberDiscount} ${state.customerDiscountPercent}%`);
  }
  if (state.promoDiscount > 0) {
    rows.push(dict.promoDiscount);
    if (state.couponCode) {
      rows.push(`${dict.coupon} ${state.couponCode}`);
    }
  }
  if (rows.length === 0) return null;

  return (
    <div className={["rounded-xl px-4 py-3 ring-1", tx(palette, "bg-white/[0.06] ring-white/10", "bg-slate-900/[0.06] ring-slate-900/10")].join(" ")}>
      <p className={["mb-2 text-xs font-semibold uppercase tracking-wider", tx(palette, "text-white/50", "text-slate-500")].join(" ")}>
        {dict.appliedPromotions}
      </p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <li
            key={i}
            className={["flex items-center gap-2 text-sm font-medium", tx(palette, "text-emerald-300", "text-emerald-700")].join(" ")}
          >
            <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Bill summary ─────────────────────────────────────────────────────────── */

function BillSummary({
  dict,
  state,
  hasAnyDiscount,
  palette,
}: {
  dict: Dict;
  state: Extract<DisplayState, { phase: "selling" }>;
  hasAnyDiscount: boolean;
  palette: Palette;
}) {
  return (
    <div className={["rounded-xl px-5 py-4 ring-1", tx(palette, "bg-white/[0.06] ring-white/10", "bg-slate-900/[0.06] ring-slate-900/10")].join(" ")}>
      <SummaryRow
        label={dict.subtotalBeforeDiscount}
        value={baht(state.subtotalBeforeDiscount)}
        dim
        palette={palette}
      />

      {state.itemDiscount > 0 && (
        <SummaryRow
          label={dict.itemDiscount}
          value={"−" + baht(state.itemDiscount)}
          accent
          palette={palette}
        />
      )}
      {state.customerDiscount > 0 && (
        <SummaryRow
          label={
            state.customerDiscountPercent > 0
              ? `${dict.memberDiscount} ${state.customerDiscountPercent}%`
              : dict.memberDiscount
          }
          value={"−" + baht(state.customerDiscount)}
          accent
          palette={palette}
        />
      )}
      {state.promoDiscount > 0 && (
        <SummaryRow
          label={
            state.couponCode
              ? dict.promoAndCouponDiscount
              : dict.promoDiscount
          }
          value={"−" + baht(state.promoDiscount)}
          accent
          palette={palette}
        />
      )}
      {state.billDiscount > 0 && (
        <SummaryRow
          label={dict.billDiscount}
          value={"−" + baht(state.billDiscount)}
          accent
          palette={palette}
        />
      )}

      {hasAnyDiscount && (
        <div className={["my-3 border-t border-dashed", tx(palette, "border-white/20", "border-slate-900/15")].join(" ")} aria-hidden />
      )}

      {state.vat > 0 && (
        <SummaryRow label={dict.vat} value={baht(state.vat)} dim palette={palette} />
      )}

      <div className="mt-2 flex items-baseline justify-between">
        <span className={["text-xl font-bold", tx(palette, "text-white", "text-slate-900")].join(" ")}>{dict.total}</span>
        <span className={["nums text-4xl font-extrabold", tx(palette, "text-white", "text-slate-900")].join(" ")}>
          {baht(state.total)}
        </span>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  dim,
  accent,
  palette,
}: {
  label: string;
  value: string;
  dim?: boolean;
  accent?: boolean;
  palette: Palette;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between py-0.5 text-sm",
        accent
          ? tx(palette, "font-medium text-emerald-300", "font-medium text-emerald-700")
          : dim
          ? tx(palette, "text-white/70", "text-slate-500")
          : tx(palette, "text-white/90", "text-slate-800"),
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="nums font-semibold">{value}</span>
    </div>
  );
}

/* ─── Payment ──────────────────────────────────────────────────────────────── */

function PaymentScreen({
  dict,
  state,
  palette,
}: {
  dict: Dict;
  state: Extract<DisplayState, { phase: "payment" }>;
  palette: Palette;
}) {
  const isQr = Boolean(state.qr);
  const isCash = state.method === "cash";
  const isBankTransfer = state.method === "bank_transfer";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-10 text-center">
      <h1 className={["text-3xl font-bold", tx(palette, "text-white/80", "text-slate-700")].join(" ")}>
        {isBankTransfer ? dict.bankTransferTitle : dict.payTitle}
      </h1>

      <div className={["nums text-7xl font-extrabold", tx(palette, "text-white", "text-slate-900")].join(" ")}>
        {baht(state.total)}
      </div>
      <p className={["text-lg font-medium", tx(palette, "text-white/55", "text-slate-500")].join(" ")}>{dict.amountDue}</p>

      {isQr ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt="PromptPay QR" className="h-72 w-72" />
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <QrCode className="h-4 w-4 text-violet-600" aria-hidden />
            {dict.payScanQr}
          </span>
        </div>
      ) : isCash ? (
        <div className={["flex items-center gap-3 rounded-2xl px-8 py-5 text-2xl font-semibold ring-1", tx(palette, "bg-white/10 ring-white/15", "bg-slate-900/8 ring-slate-900/15")].join(" ")}>
          <Wallet className={["h-7 w-7", tx(palette, "text-emerald-300", "text-emerald-600")].join(" ")} aria-hidden />
          {dict.payCash}
        </div>
      ) : isBankTransfer && state.bankAccount ? (
        <div className={["flex w-full max-w-sm flex-col gap-3 rounded-2xl px-6 py-5 ring-1", tx(palette, "bg-white/[0.08] ring-white/15", "bg-slate-900/[0.06] ring-slate-900/12")].join(" ")}>
          <p className={["text-sm font-medium", tx(palette, "text-white/60", "text-slate-500")].join(" ")}>{dict.bankTransferInstruction}</p>
          <div className="mt-1 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className={["text-xs font-medium", tx(palette, "text-white/50", "text-slate-500")].join(" ")}>ธนาคาร</span>
              <span className={["text-sm font-bold", tx(palette, "text-white", "text-slate-900")].join(" ")}>{state.bankAccount.bankName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={["text-xs font-medium", tx(palette, "text-white/50", "text-slate-500")].join(" ")}>เลขบัญชี</span>
              <span className={["nums text-lg font-extrabold tracking-widest", tx(palette, "text-violet-300", "text-violet-700")].join(" ")}>{state.bankAccount.accountNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={["text-xs font-medium", tx(palette, "text-white/50", "text-slate-500")].join(" ")}>ชื่อบัญชี</span>
              <span className={["text-sm font-semibold", tx(palette, "text-white", "text-slate-900")].join(" ")}>{state.bankAccount.accountName}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={["flex items-center gap-3 rounded-2xl px-8 py-5 text-2xl font-semibold ring-1", tx(palette, "bg-white/10 ring-white/15", "bg-slate-900/8 ring-slate-900/15")].join(" ")}>
          <Smartphone className={["h-7 w-7", tx(palette, "text-violet-300", "text-violet-600")].join(" ")} aria-hidden />
          {dict.processingPayment}
        </div>
      )}
    </div>
  );
}

/* ─── Success ──────────────────────────────────────────────────────────────── */

function SuccessScreen({
  dict,
  state,
  palette,
}: {
  dict: Dict;
  state: Extract<DisplayState, { phase: "success" }>;
  palette: Palette;
}) {
  const isCash = state.method === "cash";
  const methodLabel = getMethodLabel(state.method, dict);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-10 text-center">
      {/* Success circle — reduced-motion safe */}
      <div
        className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-300/40 motion-safe:animate-[scale-in_200ms_ease-out_both]"
        aria-hidden
      >
        <CheckCircle2 className="h-20 w-20 text-emerald-300" />
      </div>

      <h1 className="text-5xl font-extrabold">{dict.successTitle}</h1>

      {/* Payment receipt summary */}
      <div className={["flex w-full max-w-sm flex-col gap-2 rounded-2xl px-6 py-5 ring-1", tx(palette, "bg-white/[0.08] ring-white/15", "bg-slate-900/[0.06] ring-slate-900/12")].join(" ")}>
        <SuccessRow label={dict.amountDue} value={baht(state.total)} bold palette={palette} />
        {isCash &&
          state.receivedAmount !== undefined &&
          state.receivedAmount > 0 && (
            <SuccessRow label={dict.received} value={baht(state.receivedAmount)} palette={palette} />
          )}
        {isCash && state.change !== undefined && state.change > 0 ? (
          <SuccessRow
            label={dict.change}
            value={baht(state.change)}
            accent
            palette={palette}
          />
        ) : !isCash ? (
          <div className={["flex items-center justify-center gap-2 pt-1 text-sm font-medium", tx(palette, "text-white/60", "text-slate-500")].join(" ")}>
            <CreditCard className="h-4 w-4" aria-hidden />
            {methodLabel}
          </div>
        ) : null}
      </div>

      <p className={["text-xl font-medium", tx(palette, "text-white/60", "text-slate-500")].join(" ")}>{dict.successThanks}</p>
    </div>
  );
}

function SuccessRow({
  label,
  value,
  bold,
  accent,
  palette,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  palette: Palette;
}) {
  return (
    <div className="flex items-center justify-between text-base">
      <span className={bold ? tx(palette, "font-bold text-white", "font-bold text-slate-900") : tx(palette, "text-white/70", "text-slate-500")}>
        {label}
      </span>
      <span
        className={[
          "nums",
          bold ? tx(palette, "text-xl font-extrabold text-white", "text-xl font-extrabold text-slate-900") : "font-semibold",
          accent ? tx(palette, "text-emerald-300", "text-emerald-700") : tx(palette, "text-white/90", "text-slate-800"),
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
