/**
 * Extrai os campos de um comprovante (Pix, maquininha, transferência) a partir do texto
 * — o texto embutido do PDF do banco ou o OCR da foto/print. Sem IA e sem custo: regras
 * sobre os rótulos que os bancos brasileiros usam. Funções puras, rodam no navegador.
 * O resultado é só sugestão: a tela sempre mostra os valores para o Herbert conferir.
 */

export type ReceiptMethod = "pix" | "cartao_credito" | "cartao_debito" | "dinheiro" | "outro";

export interface ReceiptData {
  amountCents: number | null;
  payerName: string | null;
  receiverName: string | null;
  date: string | null;
  time: string | null;
  method: ReceiptMethod;
  transactionId: string | null;
  bank: string | null;
}

/** Minúsculas e sem acento, para comparar rótulos com o OCR ("Transação" e "transacao" valem igual). */
function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ---------- valor ----------

const MONEY_WITH_SYMBOL = /(?:r\s?\$|\brs|\$)\s*(\d{1,3}(?:[.\s]\d{3})+,\d{2}|\d+[,.]\d{2})\b/i;
const MONEY_BR = /\b(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2})\b/;

function moneyToCents(raw: string): number | null {
  const compact = raw.replace(/\s/g, "");
  const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

function findMoney(line: string): number | null {
  const match = line.match(MONEY_WITH_SYMBOL) ?? line.match(MONEY_BR);
  return match ? moneyToCents(match[1]) : null;
}

function findAmount(lines: string[], folded: string[]): number | null {
  const ignored = /tarifa|taxa|saldo|limite|juros|multa|desconto/;
  // 1º: o número junto (ou logo abaixo) do rótulo "valor"
  for (let i = 0; i < lines.length; i++) {
    if (!/\bvalor\b/.test(folded[i]) || ignored.test(folded[i])) continue;
    for (let j = i; j <= Math.min(i + 2, lines.length - 1); j++) {
      if (j > i && ignored.test(folded[j])) break;
      const cents = findMoney(lines[j]);
      if (cents) return cents;
    }
  }
  // 2º: o primeiro "R$" que não seja tarifa/saldo
  for (let i = 0; i < lines.length; i++) {
    if (ignored.test(folded[i])) continue;
    const match = lines[i].match(MONEY_WITH_SYMBOL);
    if (match) return moneyToCents(match[1]);
  }
  return null;
}

// ---------- data e hora ----------

const MONTHS: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

function validDate(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function findDate(text: string): string | null {
  const candidates: { index: number; value: string }[] = [];
  for (const m of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g)) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const value = validDate(year, Number(m[2]), Number(m[1]));
    if (value) candidates.push({ index: m.index ?? 0, value });
  }
  for (const m of text.matchAll(/\b(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?\s*(?:de\s+)?(\d{4})\b/g)) {
    const value = validDate(Number(m[3]), Number(MONTHS[m[2]]), Number(m[1]));
    if (value) candidates.push({ index: m.index ?? 0, value });
  }
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0]?.value ?? null;
}

function findTime(text: string): string | null {
  const m = text.match(/\b([01]?\d|2[0-3])\s?[:h]\s?([0-5]\d)(?::[0-5]\d)?\b/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

// ---------- nomes ----------

const PAYER_HEADER =
  /^(?:dados\s+(?:do|de\s+quem|da\s+conta\s+do)\s+(?:pagador|pagou)|quem\s+pagou|origem|conta\s+de\s+origem|dados\s+da\s+origem|pagador|de|enviado\s+por|pago\s+por)\s*:?$/;
const RECEIVER_HEADER =
  /^(?:dados\s+(?:do|de\s+quem|da\s+conta\s+do)\s+(?:recebedor|recebeu|favorecido|destinatario)|quem\s+recebeu|destino|conta\s+de\s+destino|dados\s+do\s+destino|recebedor|favorecido|destinatario|para|pago\s+para|enviado\s+para)\s*:?$/;
const PAYER_INLINE = /^(?:pagador|nome\s+do\s+pagador|quem\s+pagou|origem|de|pago\s+por|enviado\s+por)\s*[:\-]?\s+(.+)$/;
const RECEIVER_INLINE =
  /^(?:recebedor|nome\s+do\s+recebedor|favorecido|destinatario|quem\s+recebeu|destino|para|pago\s+para|enviado\s+para)\s*[:\-]?\s+(.+)$/;
const NOT_A_NAME =
  /^(?:nome|cpf|cnpj|instituicao|banco|agencia|conta|chave|tipo|valor|data|hora|id|codigo|autenticacao|documento|pix|transferencia|comprovante|situacao|status)\b/;

/** Limpa "Maria Souza  CPF ***.123..." → "Maria Souza"; null se não parece nome de pessoa/empresa. */
function cleanName(raw: string): string | null {
  const value = raw
    .replace(/\b(?:cpf|cnpj)\b.*$/i, "")
    .replace(/[*•·.\-\d/]{3,}.*$/, "")
    .replace(/[|:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (value.length < 3 || value.length > 70) return null;
  if (/\d/.test(value)) return null;
  if ((value.match(/[a-zà-ÿ]/gi) ?? []).length < 3) return null;
  if (NOT_A_NAME.test(fold(value))) return null;
  return value;
}

/** "nome" seguido do valor na mesma linha ou na de baixo. */
function nameAt(lines: string[], folded: string[], i: number): string | null {
  const label = folded[i].match(/^nome(?:\s+completo)?\s*:?\s*(.*)$/);
  if (!label) return null;
  if (label[1]) return cleanName(lines[i].slice(lines[i].length - label[1].length));
  return i + 1 < lines.length ? cleanName(lines[i + 1]) : null;
}

function findNames(lines: string[], folded: string[]) {
  let payer: string | null = null;
  let receiver: string | null = null;
  let section: "payer" | "receiver" | null = null;
  let sectionStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const f = folded[i];
    if (PAYER_HEADER.test(f)) {
      section = "payer";
      sectionStart = i;
      continue;
    }
    if (RECEIVER_HEADER.test(f)) {
      section = "receiver";
      sectionStart = i;
      continue;
    }

    const inlinePayer = f.match(PAYER_INLINE);
    if (inlinePayer && !payer) {
      const name = cleanName(lines[i].slice(lines[i].length - inlinePayer[1].length));
      if (name) {
        payer = name;
        continue;
      }
    }
    const inlineReceiver = f.match(RECEIVER_INLINE);
    if (inlineReceiver && !receiver) {
      const name = cleanName(lines[i].slice(lines[i].length - inlineReceiver[1].length));
      if (name) {
        receiver = name;
        continue;
      }
    }

    if (!section || i - sectionStart > 6) continue;
    // Dentro de uma seção: "Nome: Fulano", ou o nome direto na primeira linha (Itaú, PicPay, Mercado Pago).
    const name = nameAt(lines, folded, i) ?? (i === sectionStart + 1 ? cleanName(lines[i]) : null);
    if (!name) continue;
    if (section === "payer" && !payer) payer = name;
    if (section === "receiver" && !receiver) receiver = name;
    section = null;
  }
  return { payer, receiver };
}

// ---------- ID da transação ----------

function findTransactionId(text: string, lines: string[], folded: string[]): string | null {
  // Pix: E2E ID = "E" + ISPB (8) + AAAAMMDDhhmm (12) + 11 caracteres. O OCR às vezes quebra com espaços.
  const e2e = text.replace(/\s+/g, "").match(/E\d{20}[A-Za-z0-9]{11}/);
  if (e2e) return e2e[0];
  const label = /(?:id\s+da\s+transacao|identificador|codigo\s+(?:da\s+transacao|de\s+autenticacao)|autenticacao)\s*:?\s*(.*)$/;
  for (let i = 0; i < lines.length; i++) {
    const m = folded[i].match(label);
    if (!m) continue;
    const sameLine = m[1] ? lines[i].slice(lines[i].length - m[1].length) : "";
    const raw = (sameLine || lines[i + 1] || "").replace(/\s+/g, "");
    const id = raw.match(/[A-Za-z0-9-]{12,}/)?.[0];
    if (id) return id;
  }
  return null;
}

// ---------- forma de pagamento e banco ----------

function findMethod(f: string): ReceiptMethod {
  if (/\bpix\b/.test(f)) return "pix";
  if (/credito/.test(f)) return "cartao_credito";
  if (/debito/.test(f)) return "cartao_debito";
  return "outro";
}

const BANKS: [RegExp, string][] = [
  [/nubank|nu pagamentos/, "Nubank"],
  [/\bitau\b/, "Itaú"],
  [/bradesco/, "Bradesco"],
  [/santander/, "Santander"],
  [/banco do brasil|\bbb\b/, "Banco do Brasil"],
  [/caixa economica|\bcaixa\b/, "Caixa"],
  [/banco inter|\binter\b/, "Inter"],
  [/\bc6\b/, "C6 Bank"],
  [/picpay/, "PicPay"],
  [/mercado ?pago/, "Mercado Pago"],
  [/pagbank|pagseguro/, "PagBank"],
  [/sicoob/, "Sicoob"],
  [/sicredi/, "Sicredi"],
  [/\bneon\b/, "Neon"],
  [/\bbtg\b/, "BTG"],
  [/will ?bank/, "Will Bank"],
  [/\bstone\b/, "Stone"],
  [/cielo/, "Cielo"],
  [/getnet/, "Getnet"],
  [/infinitepay|infinite pay/, "InfinitePay"],
  [/sumup/, "SumUp"],
];

export function parseReceiptText(text: string): ReceiptData | null {
  // NFC: assim o texto sem acento (fold) tem o mesmo comprimento do original e os cortes por índice batem.
  const lines = text
    .normalize("NFC")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const folded = lines.map(fold);
  const all = folded.join("\n");

  const { payer, receiver } = findNames(lines, folded);
  const data: ReceiptData = {
    amountCents: findAmount(lines, folded),
    payerName: payer,
    receiverName: receiver,
    date: findDate(all),
    time: findTime(all),
    method: findMethod(all),
    transactionId: findTransactionId(text, lines, folded),
    bank: BANKS.find(([re]) => re.test(all))?.[1] ?? null,
  };
  const found = data.amountCents || data.payerName || data.receiverName || data.date || data.transactionId;
  return found ? data : null;
}
