"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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

      <div className="overflow-x-auto rounded-2xl border border-brand-beige bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
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
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        p.isActive ? "bg-brand-forest/10 text-brand-forest" : "bg-brand-graphite/10 text-brand-graphite/70"
                      )}
                    >
                      {p.isActive ? "Ativo" : "Inativo"}
                    </span>
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
