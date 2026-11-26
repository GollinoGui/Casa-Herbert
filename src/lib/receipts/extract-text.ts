/**
 * Tira o texto do comprovante no navegador do Herbert — nada vai para serviço pago.
 * PDF do banco: lê o texto embutido (pdf.js). Foto/print, ou PDF escaneado: OCR (Tesseract).
 * Os dois baixam os arquivos do CDN na primeira leitura e o navegador guarda em cache.
 */

import type * as PdfJs from "pdfjs-dist";

// Mesmo número do pdfjs-dist em devDependencies (lá só para os tipos). Carregado do CDN em
// tempo de execução porque o webpack do Next 14 não empacota bem o .mjs do pdf.js.
const PDFJS_VERSION = "6.5.438";
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build`;

export type ProgressHandler = (stage: string, progress?: number) => void;

async function loadPdfJs(): Promise<typeof PdfJs> {
  const lib = (await import(/* webpackIgnore: true */ `${PDFJS_BASE}/pdf.min.mjs`)) as typeof PdfJs;
  lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
  return lib;
}

/** Reduz fotos enormes (leitura lenta) e amplia prints pequenos (OCR erra letra miúda). */
async function prepareImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > 2400 ? 2400 / longest : longest < 1000 ? 2 : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.filter = "grayscale(1) contrast(1.15)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

async function ocr(image: HTMLCanvasElement, onProgress?: ProgressHandler): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  onProgress?.("Preparando a leitura");
  const worker = await createWorker("por", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") onProgress?.("Lendo o comprovante", m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

async function pdfText(file: File, onProgress?: ProgressHandler): Promise<string> {
  onProgress?.("Abrindo o PDF");
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  try {
    let text = "";
    for (let n = 1; n <= Math.min(doc.numPages, 2); n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      for (const item of content.items) {
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      }
      text += "\n";
    }
    if (text.replace(/\s/g, "").length >= 20) return text;

    // PDF sem texto (foto escaneada): desenha a 1ª página e passa no OCR.
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return ocr(canvas, onProgress);
  } finally {
    await task.destroy();
  }
}

export async function extractReceiptText(file: File, onProgress?: ProgressHandler): Promise<string> {
  if (file.type === "application/pdf") return pdfText(file, onProgress);
  if (!file.type.startsWith("image/")) throw new Error("Envie uma foto, um print ou o PDF do comprovante.");
  return ocr(await prepareImage(file), onProgress);
}
