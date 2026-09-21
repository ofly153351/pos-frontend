"use client";

import { useState } from "react";
import { Camera } from "lucide-react";

import { CameraScanner } from "@/components/shared/camera-scanner";
import type { ScanButtonScanButtonProps } from "./types";


const DEFAULT_TITLE = "สแกนบาร์โค้ดด้วยกล้อง (มือถือ)";



// Reusable camera-scan trigger: a single icon button that opens the shared
// CameraScanner overlay and forwards the decoded code to `onScan`. Used next to
// every product-search input so mobile users can scan instead of type.
export function ScanButton({ onScan, title, disabled = false, className }: ScanButtonScanButtonProps) {
  const [showCamera, setShowCamera] = useState(false);
  const label = title ?? DEFAULT_TITLE;

  return (
    <>
      <button
        aria-label={label}
        className={
          className ??
          "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-600 transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
        }
        disabled={disabled}
        onClick={() => setShowCamera(true)}
        title={label}
        type="button"
      >
        <Camera className="h-4 w-4" />
      </button>

      {showCamera && (
        <CameraScanner
          onClose={() => setShowCamera(false)}
          onDetected={(code) => {
            setShowCamera(false);
            onScan(code);
          }}
        />
      )}
    </>
  );
}
