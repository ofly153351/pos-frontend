/**
 * Skeleton loading primitives — violet/slate theme, animate-pulse.
 *
 * Usage:
 *   import { Skeleton, SkeletonText, SkeletonCard, ... } from "@/components/ui/skeleton";
 */

// ── Base ─────────────────────────────────────────────────────────────────────

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// ── Text lines ────────────────────────────────────────────────────────────────

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 animate-pulse rounded-md bg-slate-200 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

export function SkeletonTableRow({ cols = 5, className = "" }: { cols?: number; className?: string }) {
  const widths = ["w-8", "w-full", "w-20", "w-16", "w-12", "w-24", "w-10"];
  return (
    <div className={`flex items-center gap-4 px-4 py-3.5 ${className}`} aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className={`h-4 animate-pulse rounded-md bg-slate-200 ${widths[i % widths.length]} flex-shrink-0 ${i === 1 ? "flex-1" : ""}`}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5, className = "" }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={`divide-y divide-slate-100 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

export function SkeletonKPICard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`} aria-hidden="true">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-24 animate-pulse rounded-md bg-slate-200" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-3 w-32 animate-pulse rounded-md bg-slate-100" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

// ── List item (sidebar card) ──────────────────────────────────────────────────

export function SkeletonListItem({ className = "" }: SkeletonProps) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 ${className}`} aria-hidden="true">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="h-5 w-12 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

// ── Product grid card ─────────────────────────────────────────────────────────

export function SkeletonProductCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white overflow-hidden ${className}`} aria-hidden="true">
      <div className="h-[190px] w-full animate-pulse bg-slate-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded-md bg-slate-100" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────

export function SkeletonSettingsPanel({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`rounded-2xl border border-violet-100 bg-white p-6 shadow-sm space-y-6 ${className}`} aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-3.5 w-48 animate-pulse rounded-md bg-slate-100" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-36 animate-pulse rounded-md bg-slate-200" />
              <div className="h-3 w-56 animate-pulse rounded-md bg-slate-100" />
            </div>
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat row (dashboard low/high stock) ──────────────────────────────────────

export function SkeletonStatRow({ className = "" }: SkeletonProps) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${className}`} aria-hidden="true">
      <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-slate-200" />
        <div className="h-2.5 w-1/2 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="h-4 w-10 animate-pulse rounded-md bg-slate-200 flex-shrink-0" />
    </div>
  );
}

// ── Document / receipt row ────────────────────────────────────────────────────

export function SkeletonDocumentRow({ className = "" }: SkeletonProps) {
  return (
    <div className={`flex items-center gap-4 border-b border-slate-100 px-4 py-3 ${className}`} aria-hidden="true">
      <div className="h-5 w-5 animate-pulse rounded-md bg-slate-200 flex-shrink-0" />
      <div className="w-28 h-4 animate-pulse rounded-md bg-slate-200 flex-shrink-0" />
      <div className="flex-1 h-4 animate-pulse rounded-md bg-slate-200" />
      <div className="w-24 h-4 animate-pulse rounded-md bg-slate-100 flex-shrink-0" />
      <div className="w-20 h-4 animate-pulse rounded-md bg-slate-100 flex-shrink-0" />
      <div className="w-16 h-6 animate-pulse rounded-full bg-slate-100 flex-shrink-0" />
      <div className="w-16 h-6 animate-pulse rounded-full bg-slate-100 flex-shrink-0" />
    </div>
  );
}

// ── Chart placeholder ─────────────────────────────────────────────────────────

export function SkeletonChart({ height = "h-48", className = "" }: { height?: string; className?: string }) {
  return (
    <div className={`${height} ${className} flex items-end gap-1.5 px-4 pb-4 pt-8`} aria-hidden="true">
      {[60, 80, 45, 90, 65, 75, 50, 85, 70, 55, 88, 72].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-sm bg-violet-100"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
