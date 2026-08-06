"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Clock, DollarSign, FileText, MapPin, Plus, Trash2, Users, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ProductWithCost, SavedEvent, SavedEventStatus } from "@/types/core";
import { deleteSavedEvent, listSavedEvents, updateEventStatus } from "@/services/events.service";
import { listProducts } from "@/services/recipes.service";
import { PrintableQuoteModal } from "@/components/quotes/printable-quote-modal";

const STATUS_LABELS: Record<SavedEventStatus, { label: string; tone: "neutral" | "warning" | "success" }> = {
  concept: { label: "Concept", tone: "neutral" },
  offerte_verzonden: { label: "Offerte Verzonden", tone: "warning" },
  bevestigd: { label: "Bevestigd", tone: "success" },
  inkoop_gedaan: { label: "Inkoop Gedaan", tone: "success" },
  afgerond: { label: "Afgerond", tone: "neutral" },
  gefactureerd: { label: "Gefactureerd", tone: "success" }
};

export function EventPlanner() {
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuoteEvent, setActiveQuoteEvent] = useState<SavedEvent | null>(null);
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
      notify({ title: `Status bijgewerkt naar ${STATUS_LABELS[newStatus].label}` });
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

  const confirmedEvents = events.filter((e) => e.status === "bevestigd" || e.status === "inkoop_gedaan" || e.status === "afgerond");
  const totalProjectedVofProfit = confirmedEvents.reduce((sum, e) => sum + e.calculation.totalVofProfit, 0);
  const totalProjectedPartnerProfit = totalProjectedVofProfit / 2;

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Planningskalender laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* VOF Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground">Geplande Events</span>
            <div className="mt-2 text-3xl font-bold tracking-tight">{events.length} Events</div>
            <p className="mt-1 text-xs text-muted-foreground">{confirmedEvents.length} Bevestigd / Afgerond</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground">Geprojecteerde VOF Winst</span>
            <div className="mt-2 text-3xl font-bold tracking-tight text-emerald-400">
              {formatCurrency(totalProjectedVofProfit)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Over alle bevestigde klussen</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground">Winst per Vennoot (50/50)</span>
            <div className="mt-2 text-3xl font-bold tracking-tight text-gold">
              {formatCurrency(totalProjectedPartnerProfit)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Netto verdienste per vennoot</p>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            Nog geen geplande events opgeslagen. Reken een event uit in de Event Calculator en klik op &quot;Event Opslaan&quot;.
          </Card>
        ) : (
          events.map((evt) => {
            const statusInfo = STATUS_LABELS[evt.status];

            return (
              <Card key={evt.id} className="transition hover:border-gold/50">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-base text-foreground">{evt.eventName}</h3>
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Users className="h-3.5 w-3.5 text-gold" /> {evt.clientName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gold" /> {formatDate(evt.eventDate)}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-gold" /> {evt.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Utensils className="h-3.5 w-3.5 text-gold" /> {evt.params.peopleCount} gasten
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-right text-xs">
                        <span className="block text-muted-foreground">Offerte Totaal:</span>
                        <span className="font-bold text-sm text-foreground">
                          {formatCurrency(evt.calculation.advisedPackagePrice)}
                        </span>
                        <span className="block text-[10px] text-gold font-medium">
                          {formatCurrency(evt.calculation.hourlyEarningsPerPartner)}/u per vennoot
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
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
          defaultQuoteNumber={activeQuoteEvent.quoteNumber}
        />
      )}
    </div>
  );
}
