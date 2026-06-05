"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

// Sales page ไม่มี UI ของตัวเอง — set flag แล้ว redirect
// Cashier modal ถูกควบคุมโดย UserWorkspaceLayout ผ่าน localStorage "pos-cashier-open"
export default function SalesPage({ params }: Props) {
  const { locale } = use(params);
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("pos-cashier-open", "1");
    // ถ้ามี history → back, ถ้าไม่มี (เพิ่ง login) → ไป dashboard
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace(`/${locale}/dashboard`);
    }
  }, [locale, router]);

  return null;
}
