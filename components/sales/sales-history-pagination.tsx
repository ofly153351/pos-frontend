"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageSizeDropdown } from "@/components/ui/page-size-dropdown";

export type SalesHistoryPaginationDict = {
  pageShowing: string;
  pageOf: string;
  pageRecords: string;
  pagePerPage: string;
};

/**
 * Pagination footer for the sales-history table.
 * Sits flush inside the table card's footer (rounded-b-2xl border-t-0),
 * so NO overflow constraint — dropdown popup is never clipped.
 */
export function SalesHistoryPagination({
  total,
  page,
  pageSize,
  pageSizeOptions,
  dict,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  dict: SalesHistoryPaginationDict;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
}) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);

  const pageNumbers = useMemo(() => {
    const start = Math.max(page - 2, 1);
    const end = Math.min(start + 4, totalPages);
    return Array.from({ length: Math.max(end - start + 1, 0) }, (_, i) => start + i);
  }, [page, totalPages]);

  if (total === 0) return null;

  const preventScroll = (e: React.MouseEvent) => e.preventDefault();

  const btnBase =
    "flex h-8 min-w-[32px] items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors";
  const btnIdle = "text-slate-500 hover:bg-violet-50 hover:text-violet-700";
  const btnActive = "bg-violet-600 text-white shadow-sm";
  const btnEdge =
    "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-700 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Left — summary */}
      <span className="text-sm text-slate-400">
        {dict.pageShowing}{" "}
        <span className="font-semibold tabular-nums text-slate-600">
          {pageStart + 1}–{pageEnd}
        </span>{" "}
        {dict.pageOf}{" "}
        <span className="font-semibold tabular-nums text-slate-600">{total}</span>{" "}
        {dict.pageRecords}
      </span>

      {/* Right — page-size + nav */}
      <div className="flex items-center gap-3">
        <PageSizeDropdown
          value={pageSize}
          options={pageSizeOptions}
          perPageLabel={dict.pagePerPage}
          onChange={onPageSizeChange}
        />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={page <= 1}
            onMouseDown={preventScroll}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className={btnEdge}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              onMouseDown={preventScroll}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${p === page ? btnActive : btnIdle}`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onMouseDown={preventScroll}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className={btnEdge}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
