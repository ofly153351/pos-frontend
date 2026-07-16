"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, AlertCircle, RefreshCw } from "lucide-react";

type Props = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

type ScanState = "starting" | "scanning" | "error";

export function CameraScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScanState>("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const stopRef = useRef<(() => void) | null>(null);
  const detectedRef = useRef(false);

  function startScan() {
    detectedRef.current = false;
    setState("starting");
    setErrorMsg("");
    initScanner();
  }

  async function initScanner() {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!devices.length) throw new Error("ไม่พบกล้องในอุปกรณ์นี้");

      // Prefer rear/environment camera on mobile
      const deviceId =
        devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
        devices[devices.length - 1]?.deviceId;

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (result, err) => {
          if (detectedRef.current) return;
          if (result) {
            detectedRef.current = true;
            stopRef.current?.();
            onDetected(result.getText());
          }
          // Ignore NotFoundException (no barcode in frame yet)
          void err;
        },
      );

      stopRef.current = () => controls.stop();
      setState("scanning");
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message.includes("Permission")
            ? "กรุณาอนุญาตให้ใช้งานกล้อง แล้วลองใหม่"
            : e.message
          : "ไม่สามารถเปิดกล้องได้";
      setErrorMsg(msg);
      setState("error");
    }
  }

  useEffect(() => {
    initScanner();
    return () => { stopRef.current?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      stopRef.current?.();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={handleBackdrop}
    >
      {/* Close button */}
      <button
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={() => { stopRef.current?.(); onClose(); }}
        type="button"
        aria-label="ปิด"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Viewfinder */}
      <div className="relative overflow-hidden rounded-2xl bg-black" style={{ width: 280, height: 280 }}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Corner markers */}
        {(["tl", "tr", "bl", "br"] as const).map((pos) => (
          <div
            key={pos}
            className="absolute h-7 w-7 border-violet-400"
            style={{
              top: pos.startsWith("t") ? 12 : undefined,
              bottom: pos.startsWith("b") ? 12 : undefined,
              left: pos.endsWith("l") ? 12 : undefined,
              right: pos.endsWith("r") ? 12 : undefined,
              borderTopWidth: pos.startsWith("t") ? 3 : 0,
              borderBottomWidth: pos.startsWith("b") ? 3 : 0,
              borderLeftWidth: pos.endsWith("l") ? 3 : 0,
              borderRightWidth: pos.endsWith("r") ? 3 : 0,
              borderRadius:
                pos === "tl" ? "4px 0 0 0" :
                pos === "tr" ? "0 4px 0 0" :
                pos === "bl" ? "0 0 0 4px" : "0 0 4px 0",
            }}
          />
        ))}

        {/* Scanning line */}
        {state === "scanning" && (
          <div className="scan-line pointer-events-none absolute left-3 right-3 h-0.5 bg-violet-400 opacity-80" />
        )}

        {/* Starting overlay */}
        {state === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-2 text-white">
              <Camera className="h-8 w-8 animate-pulse" />
              <p className="text-sm">กำลังเปิดกล้อง…</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {state === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-3 px-4 text-center text-white">
              <AlertCircle className="h-8 w-8 text-rose-400" />
              <p className="text-sm">{errorMsg}</p>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium"
                onClick={startScan}
                type="button"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                ลองใหม่
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-5 text-sm text-white/80">วางบาร์โค้ดให้ตรงกรอบ</p>
      <p className="mt-1 text-xs text-white/50">ระบบจะเพิ่มสินค้าอัตโนมัติเมื่อสแกนได้</p>

      <style>{`
        @keyframes scanline {
          0%   { top: 16px; }
          50%  { top: calc(100% - 20px); }
          100% { top: 16px; }
        }
        .scan-line { animation: scanline 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
