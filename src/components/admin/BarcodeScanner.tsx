"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, ScanBarcode } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  title?: string;
}

/**
 * Lê código de barras pela câmera (ao vivo), por uma foto já tirada ou digitado.
 * Leitor USB/Bluetooth também funciona: ele "digita" no campo e manda Enter.
 * A biblioteca (ZXing) só é carregada quando o leitor abre.
 */
export function BarcodeScanner({ open, onClose, onDetected, title = "Ler código de barras" }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [mode, setMode] = useState<"camera" | "idle">("idle");
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setMode("idle");
  }

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    setManual("");
    setError(null);
    // Celular abre direto na câmera; no computador o normal é leitor USB ou foto.
    if (window.matchMedia("(pointer: coarse)").matches) void startCamera();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function finish(code: string) {
    const clean = code.trim();
    if (!clean) return;
    stop();
    onDetected(clean);
  }

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não libera a câmera aqui. Use uma foto ou digite o código.");
      return;
    }
    setMode("camera");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      // espera o <video> montar
      await new Promise((r) => requestAnimationFrame(r));
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current ?? undefined,
        (result) => {
          if (result) {
            navigator.vibrate?.(60);
            finish(result.getText());
          }
        }
      );
    } catch {
      setMode("idle");
      setError("Não foi possível abrir a câmera. Confira a permissão do navegador ou use uma foto.");
    }
  }

  async function readPhoto(file: File) {
    setBusy(true);
    setError(null);
    const url = URL.createObjectURL(file);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
      finish(result.getText());
    } catch {
      setError("Não achei um código nesta foto. Tente de mais perto, com o código reto e bem iluminado.");
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-md">
      <div className="space-y-4">
        {mode === "camera" ? (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
            <p className="absolute inset-x-0 bottom-2 text-center text-xs text-snow/80">Aponte para o código de barras</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={startCamera}>
              <Camera size={16} /> Câmera
            </Button>
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              <ImageUp size={16} /> {busy ? "Lendo..." : "Foto"}
            </Button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void readPhoto(file);
          }}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            finish(manual);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <ScanBarcode size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-graphite/40" />
            <Input
              autoFocus={mode !== "camera"}
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Ou digite / use o leitor"
              aria-label="Código de barras"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={!manual.trim()}>
            OK
          </Button>
        </form>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {mode === "camera" ? (
          <button type="button" onClick={stop} className="text-xs font-medium text-brand-moss hover:underline">
            Fechar câmera
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
