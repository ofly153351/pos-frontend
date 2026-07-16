"use client";

import { Suspense } from "react";
import type { ComponentProps } from "react";

import { PurchaseForm } from "@/components/purchasing/purchase-form";
import { PurchasingWorkspace } from "@/components/purchasing/workspace/purchasing-workspace";
import type { WsDict } from "@/components/purchasing/workspace/workspace-shared";

type PurchasesContentProps = {
  workspace: WsDict;
  purchasing: ComponentProps<typeof PurchaseForm>["dictionary"];
};

// Unified Purchasing & Goods Receiving workspace (Phase 3C). The legacy create
// form is reached via the in-page "Create Purchase Order" quick action.
// Suspense boundary required because the workspace reads ?tab= via useSearchParams.
export function PurchasesContent({ workspace, purchasing }: PurchasesContentProps) {
  return (
    <Suspense fallback={null}>
      <PurchasingWorkspace dict={workspace} formDict={purchasing} />
    </Suspense>
  );
}
