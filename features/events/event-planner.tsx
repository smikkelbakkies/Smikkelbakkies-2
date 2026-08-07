"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Clock, DollarSign, Edit2, FileText, Filter, MapPin, Plus, Trash2, Users, Utensils, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ProductWithCost, SavedEvent, SavedEventStatus } from "@/types/core";
import { deleteSavedEvent, listSavedEvents, updateEventStatus } from "@/services/events.service";
import { listProducts } from "@/services/recipes.service";
import { PrintableQuoteModal } from "@/components/quotes/printable-quote-modal";
import { EditEventModal } from "./edit-event-modal";

const STATUS_CONFIG: Record<SavedEventStatus, { label: string; tone: "neutral" | "warning" | "success"; colorClass: string }> = {
  concept: { label: "Concept", tone: "neutral", colorClass: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  offerte_verzonden: { label: "Offerte Verzonden", tone: "warning", colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  bevestigd: { label: "Bevestigd", tone: "success", colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  inkoop_gedaan: { label: "Inkoop Gedaan", tone: "success", colorClass: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  afgerond: { label: "Afgerond", tone: "neutral", colorClass: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  gefactureerd: { label: "Gefactureerd", tone: "success", colorClass: "bg-gold/15 text-gold border-gold/30" }
};

const MONTH_NAMES_NL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December"
];

const DAY_NAMES_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export function EventPlanner() {
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuoteEvent, setActiveQuoteEvent] = useState<SavedEvent | null>(null);

  // Edit Event State
  const [editingEvent, setEditingEvent] = useState<SavedEvent | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Filters & Views
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Calendar Month View State
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const { notify } = useToast();

  const loadEvents = async () => {
    setLoading(true);
    try {
      const [eventData, prodData] = await Promise.all([listSavedEvents(), listProducts()]);
      setEvents(eventData);
      setProducts(prodData);
    } catch {
      notify({ title: "Fout bij laden events" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleStatusChange = async (eventId: string, newStatus: SavedEventStatus) => {
    try {
      await updateEventStatus(eventId, newStatus);
      notify({ title: `Status bijgewerkt naar ${STATUS_CONFIG[newStatus].label}` });
      loadEvents();
    } catch {
      notify({ title: "Fout bij bijwerken status" });
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Weet je zeker dat je dit event wilt verwijderen uit de kalender?")) return;
    try {
      await deleteSavedEvent(eventId);
      notify({ title: "Event verwijderd" });
      loadEvents();
    } catch {
      notify({ title: "Fout bij verwijderen event" });
    }
  };

  // Filtered Events
  const filteredEvents = events.filter((evt) => {
    if (selectedStatusFilter !== "all" && evt.status !== selectedStatusFilter) return false;
    if (selectedDateFilter && evt.eventDate !== selectedDateFilter) return false;
    return true;
  });

  // Calculate totals per status for pipeline dashboard
  const statusStats = (Object.keys(STATUS_CONFIG) as SavedEventStatus[]).map((statusKey) => {
    const matching = events.filter((e) => e.status === statusKey);
    const totalTurnover = matching.reduce((acc, curr) => acc + (curr.calculation?.advisedPackagePrice || 0), 0);
    return {
      statusKey,
      config: STATUS_CONFIG[statusKey],
      count: matching.length,
      totalTurnover
    };
  });

  const confirmedEvents = events.filter((e) => e.status === "bevestigd" || e.status === "inkoop_gedaan" || e.status === "afgerond" || e.status === "gefactureerd");
  const totalProjectedVofProfit = confirmedEvents.reduce((sum, e) => sum + (e.calculation?.totalVofProfit || 0), 0);
  const totalProjectedPartnerProfit = totalProjectedVofProfit / 2;

  // Calendar Calculations
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1; // 0 = Mon, 6 = Sun
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const eventsByDateMap = new Map<string, SavedEvent[]>();
  events.forEach((evt) => {
    const list = eventsByDateMap.get(evt.eventDate) || [];
    list.push(evt);
    eventsByDateMap.set(evt.eventDate, list);
  });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Planningskalender laden...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Top Header: Total VOF Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-gold/30 bg-card/60">
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground">Geplande Events</span>
            <div className="mt-2 text-3xl font-extrabold tracking-tight">{events.length} Events</div>
            <p className="mt-1 text-xs text-gold font-medium">{confirmedEvents.length} Bevestigd / Afgerond</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-card/60">
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground">Geprojecteerde VOF Winst</span>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-400">
              {formatCurrency(totalProjectedVofProfit)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Over alle bevestigde klussen</p>
          </CardContent>
        </Card>

        <Card className="border-gold/30 bg-card/60">
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground">Winst per Vennoot (50/50)</span>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-gold">
              {formatCurrency(totalProjectedPartnerProfit)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Netto verdienste per vennoot</p>
          </CardContent>
        </Card>
      </div>

      {/* STATUS PIPELINE DASHBOARD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-gold" /> Event Status Pijplijn
            </h3>
            <p className="text-xs text-muted-foreground">
              Klik op een status-fase om snel te filteren op concepten, verzonden offertes of bevestigde events.
            </p>
          </div>
          {selectedStatusFilter !== "all" && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs text-gold"
              onClick={() => setSelectedStatusFilter("all")}
            >
              Reset Status Filter
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedStatusFilter("all")}
            className={cn(
              "rounded-xl border p-3 text-left transition hover:border-gold/50",
              selectedStatusFilter === "all" ? "border-gold bg-gold/10 ring-1 ring-gold" : "bg-card/40"
            )}
          >
            <span className="block text-[11px] font-medium text-muted-foreground">Alle Events</span>
            <span className="text-lg font-bold text-foreground mt-0.5 block">{events.length}</span>
            <span className="text-[10px] text-muted-foreground">Totaal Overzicht</span>
          </button>

          {statusStats.map((st) => {
            const isSelected = selectedStatusFilter === st.statusKey;
            return (
              <button
                key={st.statusKey}
                type="button"
                onClick={() => setSelectedStatusFilter(st.statusKey)}
                className={cn(
                  "rounded-xl border p-3 text-left transition hover:border-gold/50",
                  isSelected ? "border-gold bg-gold/10 ring-1 ring-gold" : "bg-card/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", st.config.colorClass)}>
                    {st.config.label}
                  </span>
                </div>
                <span className="text-lg font-bold text-foreground mt-1.5 block">{st.count}</span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {st.totalTurnover > 0 ? formatCurrency(st.totalTurnover) : "€ 0"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW SWITCHER & DATE SELECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t pt-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Weergave:</span>
          <div className="flex items-center rounded-lg border bg-muted/30 p-1">
            <Button
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              className={cn("h-7 text-xs font-bold", viewMode === "calendar" && "bg-gold text-background")}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" /> Maandkalender
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className={cn("h-7 text-xs font-bold", viewMode === "list" && "bg-gold text-background")}
              onClick={() => setViewMode("list")}
            >
              <Utensils className="mr-1.5 h-3.5 w-3.5" /> Lijstweergave ({filteredEvents.length})
            </Button>
          </div>
        </div>

        {selectedDateFilter && (
          <div className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
            <span>Filter op datum: <strong>{formatDate(selectedDateFilter)}</strong></span>
            <button type="button" onClick={() => setSelectedDateFilter(null)} className="hover:text-foreground">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* VISUAL MONTHLY CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <Card className="border-gold/30 bg-card/60 shadow-xl overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-bold text-foreground">
                  {MONTH_NAMES_NL[viewMonth]} {viewYear}
                </h2>
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                <strong className="text-gold font-bold">Goud gearceerd</strong> = Gepland Event
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground border-b pb-2">
              {DAY_NAMES_NL.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Monthly Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty padding cells for start of month */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-24 rounded-xl border border-border/20 bg-muted/10 p-2" />
              ))}

              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const mm = String(viewMonth + 1).padStart(2, "0");
                const dd = String(dayNum).padStart(2, "0");
                const dateStr = `${viewYear}-${mm}-${dd}`;

                const dayEvents = eventsByDateMap.get(dateStr) || [];
                const hasEvents = dayEvents.length > 0;
                const isSelectedDate = selectedDateFilter === dateStr;
                const isToday = new Date().toISOString().split("T")[0] === dateStr;

                return (
                  <div
                    key={dayNum}
                    onClick={() => {
                      if (hasEvents) {
                        setSelectedDateFilter(isSelectedDate ? null : dateStr);
                      }
                    }}
                    className={cn(
                      "min-h-24 rounded-xl border p-2 flex flex-col justify-between transition cursor-pointer text-xs",
                      hasEvents
                        ? "border-gold/60 bg-gradient-to-b from-gold/15 to-gold/5 shadow-md hover:border-gold"
                        : "border-border/40 bg-card/30 hover:border-border",
                      isSelectedDate && "ring-2 ring-gold border-gold",
                      isToday && "border-gold"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-bold text-xs h-6 w-6 rounded-full flex items-center justify-center",
                        isToday ? "bg-gold text-background" : "text-foreground"
                      )}>
                        {dayNum}
                      </span>
                      {hasEvents && (
                        <span className="rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-extrabold text-background shadow">
                          {dayEvents.length} Event{dayEvents.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Event Pill Cards inside Calendar Cell */}
                    <div className="space-y-1 mt-1">
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="rounded-lg bg-background/90 border border-gold/40 p-1.5 text-[10px] shadow-sm flex flex-col gap-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveQuoteEvent(evt);
                          }}
                        >
                          <span className="font-bold text-foreground truncate block">{evt.eventName}</span>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>{evt.clientName}</span>
                            <span className="font-bold text-gold">{formatCurrency(evt.calculation?.advisedPackagePrice || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DETAILED EVENTS LIST VIEW */}
      <div className="space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Utensils className="h-4 w-4 text-gold" /> Geplande Klussen & Offertes ({filteredEvents.length})
        </h3>

        {filteredEvents.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            Geen events gevonden met de huidige filters. Bereken een event in de Event Calculator en klik op &quot;Event Opslaan&quot;.
          </Card>
        ) : (
          filteredEvents.map((evt) => {
            const statusConfig = STATUS_CONFIG[evt.status] || STATUS_CONFIG.concept;

            return (
              <Card key={evt.id} className="transition hover:border-gold/50 bg-card/60">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-base text-foreground">{evt.eventName}</h3>
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", statusConfig.colorClass)}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Users className="h-3.5 w-3.5 text-gold" /> {evt.clientName}
                        </span>
                        {evt.contactPerson && (
                          <span className="flex items-center gap-1">
                            👤 {evt.contactPerson}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5 text-gold" /> {formatDate(evt.eventDate)}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-gold" /> {evt.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Utensils className="h-3.5 w-3.5 text-gold" /> {evt.params.peopleCount} gasten
                        </span>
                        {evt.quoteNumber && (
                          <span className="flex items-center gap-1 border px-1.5 py-0.5 rounded text-[10px] text-gold font-mono">
                            🧾 {evt.quoteNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-right text-xs">
                        <span className="block text-muted-foreground">Offerte Totaal:</span>
                        <span className="font-bold text-sm text-foreground">
                          {formatCurrency(evt.calculation?.advisedPackagePrice || 0)}
                        </span>
                        <span className="block text-[10px] text-gold font-medium">
                          {formatCurrency(evt.calculation?.hourlyEarningsPerPartner || 0)}/u per vennoot
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs font-semibold text-foreground hover:bg-muted border"
                          onClick={() => {
                            setEditingEvent(evt);
                            setEditModalOpen(true);
                          }}
                        >
                          <Edit2 className="mr-1 h-3.5 w-3.5 text-gold" /> Bewerken
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs font-semibold text-gold hover:bg-gold/10 border border-gold/30"
                          onClick={() => setActiveQuoteEvent(evt)}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" /> Offerte PDF
                        </Button>

                        <select
                          value={evt.status}
                          onChange={(e) => handleStatusChange(evt.id, e.target.value as SavedEventStatus)}
                          className="h-8 rounded border border-input bg-background px-2 text-xs font-medium focus:ring-1 focus:ring-gold"
                        >
                          <option value="concept">Concept</option>
                          <option value="offerte_verzonden">Offerte Verzonden</option>
                          <option value="bevestigd">Bevestigd</option>
                          <option value="inkoop_gedaan">Inkoop Gedaan</option>
                          <option value="afgerond">Afgerond</option>
                          <option value="gefactureerd">Gefactureerd</option>
                        </select>

                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(evt.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Printable A4 PDF Offerte Modal for Saved Events */}
      {activeQuoteEvent && (
        <PrintableQuoteModal
          open={Boolean(activeQuoteEvent)}
          onClose={() => setActiveQuoteEvent(null)}
          params={activeQuoteEvent.params}
          result={activeQuoteEvent.calculation}
          products={products}
          defaultClientName={activeQuoteEvent.clientName}
          defaultContactPerson={activeQuoteEvent.contactPerson}
          defaultClientAddress={activeQuoteEvent.clientAddress}
          defaultClientCity={activeQuoteEvent.clientCity || activeQuoteEvent.location}
          defaultEventDate={activeQuoteEvent.eventDate}
          defaultEventTime={activeQuoteEvent.eventTime}
          defaultQuoteNumber={activeQuoteEvent.quoteNumber}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingEvent(null);
          }}
          onEventUpdated={loadEvents}
        />
      )}
    </div>
  );
}
