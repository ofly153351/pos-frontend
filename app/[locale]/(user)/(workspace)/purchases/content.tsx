"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { PurchaseForm } from "@/components/purchasing/purchase-form";
import { PurchaseList } from "@/components/purchasing/purchase-list";

type PurchasingDictionary = {
  title: string;
  suppliers: string;
  purchaseOrders: string;
  createOrder: string;
  editOrder: string;
  supplierName: string;
  supplierPhone: string;
  contactPerson: string;
  address: string;
  taxId: string;
  note: string;
  product: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  status: string;
  pending: string;
  partial: string;
  completed: string;
  cancelled: string;
  receiveStock: string;
  cancelOrder: string;
  orderNumber: string;
  date: string;
  selectSupplier: string;
  selectSupplierFirst: string;
  selectProduct: string;
  addItem: string;
  receiveConfirm: string;
  receiveQuantity: string;
  stockUpdated: string;
  createSupplier: string;
  editSupplier: string;
  supplierIsActive: string;
  save: string;
  saving: string;
  cancel: string;
  deleteConfirm: string;
  deleteLabel: string;
  successCreated: string;
  successUpdated: string;
  successDeleted: string;
  loading: string;
  emptySuppliers: string;
  emptyOrders: string;
  requestFailed: string;
  tableActions: string;
};

type PurchasesContentProps = {
  dictionary: PurchasingDictionary;
};

export function PurchasesContent({ dictionary }: PurchasesContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      {showForm ? (
        <PurchaseForm
          dictionary={dictionary}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
          }}
        />
      ) : null}
      <PurchaseList
        dictionary={dictionary}
        onCreateOrder={() => setShowForm(true)}
      />
    </div>
  );
}
