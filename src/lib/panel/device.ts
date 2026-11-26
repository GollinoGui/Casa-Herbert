"use client";

import { useSyncExternalStore } from "react";
import { DEVICE_PREFS_STORAGE_KEY } from "@/lib/panel/device-script";

/**
 * Preferências deste aparelho (celular, computador do balcão...), guardadas no
 * localStorage. Não vão para o banco: cada aparelho tem as suas, e limpar os
 * dados do navegador volta ao padrão.
 *
 * O que muda a primeira pintura (tamanho do texto, valores escondidos, espaço
 * da barra de atalhos) vira atributo no <html> pelo DEVICE_PREFS_SCRIPT
 * (device-script.ts), antes da hidratação — o CSS faz o resto, sem piscar.
 */

export const SHORTCUTS = {
  inicio: "Início",
  agenda: "Agenda",
  agendamentos: "Agendamentos",
  clientes: "Clientes",
  novaVenda: "Nova venda",
  comprovante: "Comprovante",
  novoAgendamento: "Novo agendamento",
  vendas: "Vendas",
  estoque: "Estoque",
  financeiro: "Saldo e extrato",
  receber: "Contas a receber",
  pagar: "Contas a pagar",
  relatorios: "Relatórios",
} as const;

export type ShortcutId = keyof typeof SHORTCUTS;
export const MAX_SHORTCUTS = 5;

export const TEXT_SIZES = { normal: "Normal", confortavel: "Confortável", grande: "Grande" } as const;
export type TextSize = keyof typeof TEXT_SIZES;

export const AGENDA_VIEWS = {
  auto: "Automática (dia no celular, semana no computador)",
  timeGridDay: "Dia",
  timeGridWeek: "Semana",
  dayGridMonth: "Mês",
} as const;
export type AgendaView = keyof typeof AGENDA_VIEWS;

export interface DevicePrefs {
  shortcutBar: boolean;
  shortcuts: ShortcutId[];
  textSize: TextSize;
  hideMoney: boolean;
  agendaView: AgendaView;
}

export const DEFAULT_DEVICE_PREFS: DevicePrefs = {
  shortcutBar: true,
  shortcuts: ["inicio", "agenda", "novaVenda", "clientes"],
  textSize: "normal",
  hideMoney: false,
  agendaView: "auto",
};

const STORAGE_KEY = DEVICE_PREFS_STORAGE_KEY;
const CHANGE_EVENT = "painel-aparelho";

function parse(raw: string | null): DevicePrefs {
  const d = DEFAULT_DEVICE_PREFS;
  let stored: Record<string, unknown> = {};
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (value && typeof value === "object") stored = value;
  } catch {
    // valor corrompido: volta ao padrão
  }
  const shortcuts = Array.isArray(stored.shortcuts)
    ? stored.shortcuts.filter((s, i, all): s is ShortcutId => typeof s === "string" && s in SHORTCUTS && all.indexOf(s) === i)
    : d.shortcuts;
  return {
    shortcutBar: typeof stored.shortcutBar === "boolean" ? stored.shortcutBar : d.shortcutBar,
    shortcuts: shortcuts.slice(0, MAX_SHORTCUTS),
    textSize: typeof stored.textSize === "string" && stored.textSize in TEXT_SIZES ? (stored.textSize as TextSize) : d.textSize,
    hideMoney: typeof stored.hideMoney === "boolean" ? stored.hideMoney : d.hideMoney,
    agendaView:
      typeof stored.agendaView === "string" && stored.agendaView in AGENDA_VIEWS ? (stored.agendaView as AgendaView) : d.agendaView,
  };
}

/** Escreve os atributos que o CSS lê. Mesma regra do DEVICE_PREFS_SCRIPT. */
function applyToDocument(prefs: DevicePrefs) {
  const html = document.documentElement;
  html.dataset.texto = prefs.textSize;
  html.dataset.valores = prefs.hideMoney ? "ocultos" : "visiveis";
  html.dataset.barra = prefs.shortcutBar && prefs.shortcuts.length ? "sim" : "nao";
}


let cachedRaw: string | null | undefined;
let cached: DevicePrefs = DEFAULT_DEVICE_PREFS;

function read(): DevicePrefs {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // navegador sem storage (aba anônima bloqueada): fica no que já está em memória
    return cached;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDevicePrefs(): DevicePrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_DEVICE_PREFS);
}

/** true depois da hidratação: antes disso useDevicePrefs() devolve o padrão, não o salvo. */
export function useDevicePrefsReady(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function updateDevicePrefs(patch: Partial<DevicePrefs>) {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sem storage: vale só até recarregar
    cachedRaw = JSON.stringify(next);
    cached = next;
  }
  applyToDocument(next);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetDevicePrefs() {
  updateDevicePrefs(DEFAULT_DEVICE_PREFS);
}
