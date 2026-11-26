"use client";

import { useRef, useState } from "react";
import { Loader2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { suggestReceiptMatchesAction, type ReadReceiptActionResult } from "@/lib/actions/admin/receipts";
import { extractReceiptText } from "@/lib/receipts/extract-text";
import { parseReceiptText } from "@/lib/receipts/parse-receipt";
import { cn } from "@/lib/utils/cn";

type Success = Extract<ReadReceiptActionResult, { ok: true }>;

interface ReceiptButtonProps {
  onRead: (result: Success) => void;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "gold" | "ghost";
}

/**
 * Escolhe/fotografa o comprovante (imagem ou PDF) e lê no próprio aparelho — sem custo
 * por leitura. Devolve os dados para conferência; nada é gravado aqui.
 */
export function ReceiptButton({ onRead, label = "Ler comprovante", className, variant = "secondary" }: ReceiptButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("Abrindo o comprovante");
    setError(null);
    try {
      const text = await extractReceiptText(file, (stage, progress) =>
        setStatus(progress != null ? `${stage}... ${Math.round(progress * 100)}%` : `${stage}...`)
      );
      const data = parseReceiptText(text);
      if (!data) {
        setError("Não consegui ler este comprovante. Tente um print mais nítido (ou o PDF do banco) ou preencha à mão.");
        return;
      }
      setStatus("Procurando cliente e produto...");
      const result = await suggestReceiptMatchesAction(data);
      if (result.ok) onRead(result);
      else setError(result.error);
    } catch (e) {
      console.error("ReceiptButton", e);
      setError("Não foi possível ler o comprovante. Confira a internet e tente de novo, ou preencha à mão.");
    } finally {
      setStatus(null);
    }
  }

  const busy = status != null;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Button type="button" variant={variant} onClick={() => inputRef.current?.click()} disabled={busy} className="w-full sm:w-auto">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ReceiptText size={16} />}
        {busy ? status : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {busy ? (
        <p className="text-xs text-brand-graphite/60">A primeira leitura demora um pouco mais (baixa o leitor uma vez só).</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
