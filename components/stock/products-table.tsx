"use client";

import type { ManagementDictionary } from "@/components/stock/types";
import type { Product } from "@/types/product";

type ProductsTableProps = {
  emptyState: string;
  isPending: boolean;
  loadingLabel: string;
  managementDictionary: ManagementDictionary;
  onDelete: (productId: string) => void;
  onEdit: (product: Product) => void;
  products: Product[];
  tableDictionary: {
    actions: string;
    category: string;
    deleteAction: string;
    editAction: string;
    price: string;
    productDetails: string;
    sku: string;
    stock: string;
  };
};

export function ProductsTable({
  emptyState,
  isPending,
  loadingLabel,
  managementDictionary,
  onDelete,
  onEdit,
  products,
  tableDictionary,
}: ProductsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-100 text-xs uppercase tracking-widest text-slate-500">
            <th className="px-6 py-4 font-bold">{tableDictionary.productDetails}</th>
            <th className="px-6 py-4 font-bold">{tableDictionary.category}</th>
            <th className="px-6 py-4 font-bold">{tableDictionary.sku}</th>
            <th className="px-6 py-4 font-bold">{tableDictionary.price}</th>
            <th className="px-6 py-4 font-bold">{tableDictionary.stock}</th>
            <th className="px-6 py-4 text-right font-bold">{tableDictionary.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.length === 0 ? (
            <tr>
              <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={6}>
                {isPending ? loadingLabel : emptyState}
              </td>
            </tr>
          ) : null}
          {products.map((product, index) => (
            <tr
              key={product.id}
              className={`${index % 2 === 1 ? "bg-slate-50/50" : "bg-white"} group transition hover:bg-slate-50`}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                  {product.image_url ? (
                    <img
                      alt={product.name}
                      className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 object-cover shadow-inner"
                      loading="lazy"
                      src={product.image_url}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 shadow-inner">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{product.name}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {product.is_active
                          ? managementDictionary.activeLabel
                          : managementDictionary.inactiveLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="rounded px-2 py-1 text-[11px] font-bold uppercase text-blue-800">
                  {product.product_type_name ?? product.product_type?.name ?? "-"}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">{product.sku ?? "-"}</td>
              <td className="px-6 py-4 text-sm font-bold text-blue-700">
                {product.effective_price}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">{product.quantity}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    className="rounded-lg p-2 text-blue-700 transition hover:bg-blue-50"
                    onClick={() => onEdit(product)}
                    type="button"
                  >
                    {tableDictionary.editAction}
                  </button>
                  <button
                    className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                    onClick={() => onDelete(product.id)}
                    type="button"
                  >
                    {tableDictionary.deleteAction}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
