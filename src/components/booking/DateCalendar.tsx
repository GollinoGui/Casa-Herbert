"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { diffInCalendarDays, formatDateOnly, parseDateOnly, todayDateStr } from "@/lib/utils/date-format";
import { CLOSED_WEEKDAYS } from "@/lib/booking/constants";

interface DateCalendarProps {
  minAdvanceDays: number;
  selectedDate: string | null;
  onSelect: (dateStr: string) => void;
}

const WEEKDAY_HEADERS = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Calendário simples e leve (sem lib externa). A regra de fechamento aqui é
 * só uma pré-filtragem de UX — o servidor (getAvailableSlotsAction /
 * createAppointment) revalida tudo do zero e tem a palavra final.
 */
export function DateCalendar({ minAdvanceDays, selectedDate, onSelect }: DateCalendarProps) {
  const today = todayDateStr();
  const todayDate = parseDateOnly(today);
  const todayMonthStart = startOfMonth(todayDate);

  const [visibleMonth, setVisibleMonth] = useState(() =>
    selectedDate ? startOfMonth(parseDateOnly(selectedDate)) : todayMonthStart
  );

  const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const canGoPrev = visibleMonth.getTime() > todayMonthStart.getTime();

  return (
    <div>
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
          disabled={!canGoPrev}
          aria-label="Mês anterior"
          className="rounded-full p-2 text-brand-forest transition hover:bg-brand-beige disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="font-serif text-lg capitalize text-brand-forest">
          {format(visibleMonth, "MMMM yyyy", { locale: ptBR })}
        </p>
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          aria-label="Próximo mês"
          className="rounded-full p-2 text-brand-forest transition hover:bg-brand-beige"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-brand-graphite/50">
        {WEEKDAY_HEADERS.map((label, i) => (
          <div key={i} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = formatDateOnly(day);
          const inMonth = isSameMonth(day, visibleMonth);
          const weekday = day.getDay();
          const isClosedDay = (CLOSED_WEEKDAYS as readonly number[]).includes(weekday);
          const isTooSoon = diffInCalendarDays(dateStr, today) < minAdvanceDays;
          const disabled = !inMonth || isClosedDay || isTooSoon;
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(dateStr)}
              aria-label={dateStr}
              className={cn(
                "aspect-square rounded-xl text-sm font-medium transition",
                !inMonth && "invisible",
                inMonth && disabled && "cursor-not-allowed text-brand-graphite/25",
                inMonth && !disabled && !isSelected && "text-brand-graphite hover:bg-brand-sage/25",
                isSelected && "bg-brand-forest text-brand-cream hover:bg-brand-forest"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-brand-graphite/50">
        Terça a sábado. Domingos e segundas-feiras não atendemos.
      </p>
    </div>
  );
}
