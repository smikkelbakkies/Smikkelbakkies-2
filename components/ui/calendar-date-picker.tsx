"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
}

const MONTH_NAMES_NL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December"
];

const DAY_NAMES_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Selecteer datum...",
  className,
  align = "right"
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const parsedDate = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate calendar grid (Monday = 0 to Sunday = 6)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1; // 0 = Mon, 6 = Sun
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const formatted = `${viewYear}-${mm}-${dd}`;
    onChange(formatted);
    setOpen(false);
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className={cn("relative space-y-1", className)} ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-foreground">{label}</label>}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-xs font-medium transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-gold",
            !value && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gold" />
            {value ? formatDate(value) : placeholder}
          </span>
          <span className="text-[10px] text-gold border border-gold/40 rounded px-1.5 py-0.5 bg-gold/10 font-semibold">📅 Kalender</span>
        </button>

        {open && (
          <div
            className={cn(
              "absolute top-11 z-50 w-72 rounded-xl border bg-background p-4 shadow-2xl backdrop-blur-xl border-gold/40 space-y-3",
              align === "right" ? "right-0 left-auto" : "left-0"
            )}
          >
            {/* Header: Month & Year controls */}
            <div className="flex items-center justify-between border-b pb-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-[11px] font-bold text-gold hover:bg-gold/20 flex items-center gap-1 border border-gold/30"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" /> Vorige
              </Button>

              <span className="text-xs font-extrabold text-foreground tracking-tight">
                {MONTH_NAMES_NL[viewMonth]} {viewYear}
              </span>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-[11px] font-bold text-gold hover:bg-gold/20 flex items-center gap-1 border border-gold/30"
                onClick={handleNextMonth}
              >
                Volgende <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground">
              {DAY_NAMES_NL.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {/* Empty padding cells */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const mm = String(viewMonth + 1).padStart(2, "0");
                const dd = String(dayNum).padStart(2, "0");
                const dateStr = `${viewYear}-${mm}-${dd}`;
                const isSelected = value === dateStr;
                const isToday = todayStr === dateStr;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition",
                      isSelected
                        ? "bg-gold text-background font-bold shadow-md"
                        : isToday
                        ? "border border-gold text-gold font-bold bg-gold/15"
                        : "hover:bg-accent text-foreground"
                    )}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Footer Quick Today button */}
            <div className="flex items-center justify-between border-t pt-2 text-[11px]">
              <button
                type="button"
                className="text-gold font-bold hover:underline"
                onClick={() => {
                  onChange(todayStr);
                  setOpen(false);
                }}
              >
                Vandaag ({formatDate(todayStr)})
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground font-medium"
                onClick={() => setOpen(false)}
              >
                Sluiten
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
