import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type AlertTone = "success" | "error" | "info" | "warning";

const STYLE: Record<AlertTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error:   "border-rose-200   bg-rose-50   text-rose-800",
  info:    "border-violet-200 bg-violet-50 text-violet-800",
  warning: "border-amber-200  bg-amber-50  text-amber-800",
};

const ICON: Record<AlertTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />,
  error:   <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />,
  info:    <Info className="h-4 w-4 shrink-0 text-violet-500" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
};

export function Alert({
  tone = "error",
  children,
  onDismiss,
  className = "",
}: {
  tone?: AlertTone;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${STYLE[tone]} ${className}`}>
      {ICON[tone]}
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-40 transition-opacity hover:opacity-70"
          onClick={onDismiss}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
