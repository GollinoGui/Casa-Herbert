"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ActiveBadge } from "@/components/ui/Badge";
import { Input, FieldLabel, FieldError } from "@/components/ui/Field";
import { productFormSchema } from "@/lib/booking/validators";
import { createProductAction, updateProductAction, setProductActiveAction } from "@/lib/actions/admin/products";
import { formatServicePrice } from "@/lib/utils/service-format";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/types";

type ProductFormValues = z.infer<typeof productFormSchema>;

const LOW_STOCK_THRESHOLD = 3;

export function ProductsManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(product: Product) {
    setEditing(product);
    setModalOpen(true);
  }

  async function handleToggleActive(product: Product) {
    await setProductActiveAction(product.id, !product.isActive);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={16} /> Novo produto
        </Button>
      </div>

      <ul className="space-y-2 md:hidden">
        {products.length === 0 ? (
          <li className="rounded-2xl border border-brand-beige bg-white px-4 py-8 text-center text-sm text-brand-graphite/50">
            Nenhum produto cadastrado.
          </li>
        ) : (
          products.map((p) => (
            <li
              key={p.id}
              className={cn("rounded-2xl border border-brand-beige bg-white p-4", !p.isActive && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-brand-graphite">{p.name}</p>
                  <p className="mt-0.5 text-xs text-brand-graphite/60">
                    {formatServicePrice(p.priceCents)} ·{" "}
                    <span className={cn(p.stockQuantity <= LOW_STOCK_THRESHOLD && "font-medium text-red-600")}>
                      {p.stockQuantity} em estoque
                      {p.stockQuantity <= LOW_STOCK_THRESHOLD ? " (baixo)" : ""}
                    </span>
                  </p>
                </div>
                <ActiveBadge active={p.isActive} />
              </div>
              <div className="mt-3 flex gap-2 border-t border-brand-beige/70 pt-3">
                <Button variant="secondary" className="flex-1 !px-3 !py-2 text-xs" onClick={() => openEdit(p)}>
                  <Pencil size={14} /> Editar
                </Button>
                <Button variant="ghost" className="flex-1 !px-3 !py-2 text-xs" onClick={() => handleToggleActive(p)}>
                  {p.isActive ? "Desativar" : "Reativar"}
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-brand-beige bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-beige bg-brand-cream/50 text-xs uppercase tracking-wide text-brand-graphite/60">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Estoque</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-graphite/50">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={cn("border-b border-brand-beige/60", !p.isActive && "opacity-60")}>
                  <td className="px-4 py-3 font-medium text-brand-graphite">{p.name}</td>
                  <td className="px-4 py-3">{formatServicePrice(p.priceCents)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(p.stockQuantity <= LOW_STOCK_THRESHOLD && "font-medium text-red-600")}>
                      {p.stockQuantity}
                      {p.stockQuantity <= LOW_STOCK_THRESHOLD ? " · estoque baixo" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={p.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-1.5 text-brand-graphite/60 hover:bg-brand-cream hover:text-brand-forest"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => handleToggleActive(p)}>
                        {p.isActive ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editing}
        onSaved={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function ProductFormModal({
  open,
  onClose,
  product,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    values: product
      ? {
          name: product.name,
          priceCents: product.priceCents,
          stockQuantity: product.stockQuantity,
          isActive: product.isActive,
        }
      : { name: "", priceCents: 0, stockQuantity: 0, isActive: true },
  });

  async function onSubmit(values: ProductFormValues) {
    if (product) {
      await updateProductAction(product.id, values);
    } else {
      await createProductAction(values);
    }
    reset();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? "Editar produto" : "Novo produto"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <FieldLabel htmlFor="name">Nome</FieldLabel>
          <Input id="name" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="priceCents">Preço (centavos)</FieldLabel>
            <Input id="priceCents" type="number" {...register("priceCents")} />
            <FieldError>{errors.priceCents?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="stockQuantity">Quantidade em estoque</FieldLabel>
            <Input id="stockQuantity" type="number" {...register("stockQuantity")} />
            <FieldError>{errors.stockQuantity?.message}</FieldError>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-brand-beige" />
          Produto ativo (disponível para venda)
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
