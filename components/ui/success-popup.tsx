"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

type SuccessPopupProps = {
  message: string | null;
  autoClose?: boolean;
  duration?: number;
  onClose?: () => void;
};

export default function SuccessPopup({
  message,
  autoClose = true,
  duration = 1000,
  onClose,
}: SuccessPopupProps) {
  const [animClass, setAnimClass] = useState("");

  // Reset the animation class whenever the popup message clears — "adjust
  // state during render" pattern (setState-in-effect is forbidden).
  const [prevMessage, setPrevMessage] = useState(message);
  if (prevMessage !== message) {
    setPrevMessage(message);
    if (!message) setAnimClass("");
  }

  useEffect(() => {
    if (!message) return;

    // Enter animation: opacity-0 scale-95 → opacity-100 scale-100
    const raf = requestAnimationFrame(() =>
      setAnimClass("opacity-100 scale-100"),
    );

    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    if (autoClose) {
      exitTimer = setTimeout(() => {
        setAnimClass("opacity-0 scale-95");
        closeTimer = setTimeout(() => {
          onClose?.();
        }, 200);
      }, duration);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (exitTimer) clearTimeout(exitTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [message, autoClose, duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
      <div
        className={`flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-white px-8 py-10 shadow-2xl transition-all duration-200 ${
          animClass || "opacity-0 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <p className="text-center text-base font-semibold text-slate-900">
          {message}
        </p>
      </div>
    </div>
  );
}
