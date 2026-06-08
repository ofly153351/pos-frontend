"use client";

import Image from "next/image";
import { Plus } from "lucide-react";

import { resolveCardImageHeight, type CardSettings } from "@/lib/card-settings";

// Minimal shape the card needs — works for real products and preview samples.
export type ProductCardItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string | null;
};

export type ProductCardLabels = {
  stock: string; // e.g. "สต็อก"
  outOfStock: string; // e.g. "หมด"
  add: string; // add-to-cart aria/title
};

type ProductCardProps = {
  item: ProductCardItem;
  config: CardSettings;
  qtyInCart: number;
  onAdd: () => void;
  labels: ProductCardLabels;
};

// ── Literal class maps — Tailwind scanner sees every class, no safelist needed ──
const CLAMP: Record<CardSettings["lines"], string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
};

// Every visual dimension scales together per size — sm feels compact, lg feels generous.
const SIZE: Record<
  CardSettings["size"],
  {
    radius: string;
    pad: string;
    nameText: string;
    namePad: string;
    footPad: string;
    price: string;
    addBtn: string;
    addIcon: string;
    initials: string;
    badge: string;
    qty: string;
    stockPos: string;
    qtyPos: string;
  }
> = {
  sm: {
    radius: "rounded-xl",
    pad: "px-2.5",
    nameText: "text-[12px]",
    namePad: "mt-2",
    footPad: "px-2.5 pb-2.5 pt-1.5",
    price: "text-[12.5px]",
    addBtn: "h-6 w-6",
    addIcon: "h-3 w-3",
    initials: "text-[22px]",
    badge: "px-1.5 py-0.5 text-[9px]",
    qty: "h-5 min-w-5 px-1 text-[10px]",
    stockPos: "right-1.5 top-1.5",
    qtyPos: "left-1.5 top-1.5",
  },
  md: {
    radius: "rounded-[14px]",
    pad: "px-3",
    nameText: "text-[14px]",
    namePad: "mt-2.5",
    footPad: "px-3 pb-3 pt-2",
    price: "text-[15px]",
    addBtn: "h-8 w-8",
    addIcon: "h-4 w-4",
    initials: "text-[32px]",
    badge: "px-2 py-0.5 text-[10px]",
    qty: "h-6 min-w-6 px-1.5 text-[11px]",
    stockPos: "right-2 top-2",
    qtyPos: "left-2 top-2",
  },
  lg: {
    radius: "rounded-2xl",
    pad: "px-4",
    nameText: "text-[15.5px]",
    namePad: "mt-3",
    footPad: "px-4 pb-4 pt-2.5",
    price: "text-[17px]",
    addBtn: "h-9 w-9",
    addIcon: "h-[18px] w-[18px]",
    initials: "text-[42px]",
    badge: "px-2.5 py-1 text-[11px]",
    qty: "h-7 min-w-7 px-2 text-[12px]",
    stockPos: "right-2.5 top-2.5",
    qtyPos: "left-2.5 top-2.5",
  },
};

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function stockBadge(item: ProductCardItem, labels: ProductCardLabels) {
  if (item.stock === 0) {
    return { txt: labels.outOfStock, cls: "bg-rose-100 text-rose-700" };
  }
  if (item.stock <= 15) {
    return { txt: `${labels.stock} ${item.stock}`, cls: "bg-amber-100 text-amber-700" };
  }
  return {
    txt: `${labels.stock} ${item.stock}`,
    cls: "border border-slate-200 bg-white/90 text-slate-600",
  };
}

export function ProductCard({ item, config, qtyInCart, onAdd, labels }: ProductCardProps) {
  const outOfStock = item.stock === 0;
  const inCart = qtyInCart > 0;
  const badge = stockBadge(item, labels);
  const s = SIZE[config.size];
  const imageHeight = resolveCardImageHeight(config);

  const Name = (
    <div
      className={`${s.pad} ${s.nameText} ${s.namePad} font-semibold leading-[1.6] text-slate-900 ${CLAMP[config.lines]}`}
      style={{ minHeight: `calc(${config.lines} * 1.6em)` }}
    >
      {item.name}
    </div>
  );

  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={onAdd}
      className={`flex flex-col overflow-hidden border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 ${s.radius} ${
        inCart ? "border-violet-400 ring-1 ring-violet-300" : "border-violet-100 hover:border-violet-300"
      }`}
    >
      {config.namePos === "top" ? Name : null}

      {/* Image box — FIXED height (resolver) + shrink-0 so flex can never squeeze it */}
      <div
        className="relative flex w-full shrink-0 items-center justify-center overflow-hidden bg-violet-50"
        style={{ height: imageHeight }}
      >
        {config.showStock ? (
          <span className={`absolute z-10 rounded-full font-semibold ${s.badge} ${s.stockPos} ${badge.cls}`}>
            {badge.txt}
          </span>
        ) : null}

        {inCart ? (
          <span className={`absolute z-10 flex items-center justify-center rounded-full bg-violet-600 font-mono font-bold text-white shadow-sm ${s.qty} ${s.qtyPos}`}>
            x{qtyInCart}
          </span>
        ) : null}

        {item.image ? (
          <Image
            alt={item.name}
            src={item.image}
            width={320}
            height={320}
            unoptimized
            loading="lazy"
            className={`h-full w-full ${config.fit === "contain" ? "object-contain p-2" : "object-cover"}`}
          />
        ) : (
          <span className={`font-extrabold text-violet-200 ${s.initials}`}>
            {item.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {config.namePos !== "top" ? Name : null}

      {/* Footer pinned to bottom */}
      <div className={`mt-auto flex items-center justify-between gap-2 ${s.footPad}`}>
        <span className={`font-mono tabular-nums font-bold text-slate-900 ${s.price}`}>
          ฿{baht(item.price)}
        </span>
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center rounded-full text-white transition ${s.addBtn} ${
            outOfStock ? "bg-slate-200 text-slate-400" : "bg-violet-600"
          }`}
          title={labels.add}
        >
          <Plus className={s.addIcon} />
        </span>
      </div>
    </button>
  );
}
