"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select, FieldLabel } from "@/components/ui/Field";
import {
  createTestimonialAction,
  updateTestimonialAction,
  deleteTestimonialAction,
} from "@/lib/actions/admin/testimonials";
import { cn } from "@/lib/utils/cn";
import type { Testimonial } from "@/types";

export function TestimonialsManager({ testimonials }: { testimonials: Testimonial[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remover este depoimento?")) return;
    await deleteTestimonialAction(id);
    router.refresh();
  }

  async function handleTogglePublish(t: Testimonial) {
    await updateTestimonialAction(t.id, { isPublished: !t.isPublished });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} /> Novo depoimento
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {testimonials.length === 0 ? (
          <p className="text-sm text-brand-graphite/60">Nenhum depoimento cadastrado.</p>
        ) : (
          testimonials.map((t) => (
            <Card key={t.id} className={cn("p-4", !t.isPublished && "opacity-60")}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="min-w-0 font-medium text-brand-graphite">{t.customerName}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    t.isPublished ? "bg-brand-forest/10 text-brand-forest" : "bg-brand-graphite/10 text-brand-graphite/70"
                  )}
                >
                  {t.isPublished ? "Publicado" : "Rascunho"}
                </span>
              </div>
              <div className="mb-2 flex gap-0.5 text-brand-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < t.rating ? "currentColor" : "none"} />
                ))}
              </div>
              <p className="text-sm text-brand-graphite/80">{t.content}</p>
              <div className="-mx-2 mt-2 flex flex-wrap gap-1 text-xs">
                <button
                  onClick={() => {
                    setEditing(t);
                    setModalOpen(true);
                  }}
                  className="rounded-lg px-2 py-2 font-medium text-brand-forest hover:underline"
                >
                  Editar
                </button>
                <button onClick={() => handleTogglePublish(t)} className="rounded-lg px-2 py-2 font-medium text-brand-moss hover:underline">
                  {t.isPublished ? "Despublicar" : "Publicar"}
                </button>
                <button onClick={() => handleDelete(t.id)} className="rounded-lg px-2 py-2 font-medium text-red-600 hover:underline">
                  Excluir
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      <TestimonialFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        testimonial={editing}
        onSaved={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function TestimonialFormModal({
  open,
  onClose,
  testimonial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  testimonial: Testimonial | null;
  onSaved: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerName(testimonial?.customerName ?? "");
      setRating(testimonial?.rating ?? 5);
      setContent(testimonial?.content ?? "");
      setIsPublished(testimonial?.isPublished ?? true);
    }
  }, [open, testimonial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (testimonial) {
      await updateTestimonialAction(testimonial.id, { customerName, rating, content, isPublished });
    } else {
      await createTestimonialAction({ customerName, rating, content, isPublished });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={testimonial ? "Editar depoimento" : "Novo depoimento"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="t-name">Nome do cliente</FieldLabel>
          <Input id="t-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </div>
        <div>
          <FieldLabel htmlFor="t-rating">Avaliação</FieldLabel>
          <Select id="t-rating" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "estrela" : "estrelas"}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="t-content">Depoimento</FieldLabel>
          <Textarea id="t-content" rows={4} value={content} onChange={(e) => setContent(e.target.value)} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 rounded border-brand-beige"
          />
          Publicado no site
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
