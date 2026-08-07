"use client";

import { useState, useEffect } from "react";
import { X, Save, Calendar as CalendarIcon, Clock, Users, Fuel, Zap, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/calendar-date-picker";
import { formatCurrency } from "@/lib/utils";
import type { SavedEvent, SavedEventStatus, EventPackageParams, EventCalculationResult } from "@/types/core";
import { calculateEventPackage, updateEvent } from "@/services/events.service";
import { useToast } from "@/components/ui/toast";

interface EditEventModalProps {
  event: SavedEvent | null;
  open: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
}

export function EditEventModal({ event, open, onClose, onEventUpdated }: EditEventModalProps) {
  const { notify } = useToast();

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [location, setLocation] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [status, setStatus] = useState<SavedEventStatus>("concept");
  const [notes, setNotes] = useState("");

  const [params, setParams] = useState<EventPackageParams | null>(null);
  const [calculation, setCalculation] = useState<EventCalculationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setEventName(event.eventName || "");
      setEventDate(event.eventDate || new Date().toISOString().split("T")[0]);
      setEventTime(event.eventTime || "");
      setClientName(event.clientName || "");
      setContactPerson(event.contactPerson || "");
      setClientEmail(event.clientEmail || "");
      setClientPhone(event.clientPhone || "");
      setClientAddress(event.clientAddress || "");
      setClientCity(event.clientCity || "");
      setLocation(event.location || "");
      setQuoteNumber(event.quoteNumber || "");
      setStatus(event.status || "concept");
      setNotes(event.notes || "");
      setParams(event.params || null);
      setCalculation(event.calculation || null);
    }
  }, [event]);

  if (!open || !event || !params || !calculation) return null;

  const handleParamChange = async (newParams: EventPackageParams) => {
    setParams(newParams);
    try {
      const newCalc = await calculateEventPackage(newParams);
      setCalculation(newCalc);
    } catch (err) {
      console.error("Recalculation error:", err);
    }
  };

  const handleSave = async () => {
    if (!eventName.trim() || !clientName.trim()) {
      notify({ title: "Vul a.u.b. een eventnaam en klantnaam in." });
      return;
    }

    setIsSaving(true);
    try {
      await updateEvent(event.id, {
        eventName,
        eventDate,
        eventTime,
        clientName,
        contactPerson,
        clientEmail,
        clientPhone,
        clientAddress,
        clientCity,
        location,
        quoteNumber,
        status,
        notes,
        params,
        calculation
      });

      notify({ title: "Event succesvol bijgewerkt!" });
      onEventUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to update event:", err);
      notify({ title: "Fout bij bijwerken event." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-xl border bg-card shadow-2xl space-y-4 p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-bold text-foreground">Event & Offerte Bewerken</h2>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Tabs / Form Sections */}
        <div className="space-y-5 text-xs">
          
          {/* Section 1: Algemene Event Gegevens */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-bold text-sm text-gold flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" /> Event Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Event Naam / Omschrijving *</label>
                <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="bijv. Zomerborrel Catering" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Status Pijplijn</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SavedEventStatus)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium focus:ring-1 focus:ring-gold"
                >
                  <option value="concept">Concept</option>
                  <option value="offerte_verzonden">Offerte Verzonden</option>
                  <option value="bevestigd">Bevestigd</option>
                  <option value="inkoop_gedaan">Inkoop Gedaan</option>
                  <option value="afgerond">Afgerond</option>
                  <option value="gefactureerd">Gefactureerd</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <DatePicker
                  label="Datum Event"
                  value={eventDate}
                  onChange={(d) => setEventDate(d)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Tijd (bijv. 18:00-20:00)</label>
                <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="18:00-20:00" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Offertenummer</label>
                <Input value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} placeholder="OFF-2026-1001" />
              </div>
            </div>
          </div>

          {/* Section 2: Klant Gegevens */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-bold text-sm text-gold flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Opdrachtgever / Klant Gegevens
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Bedrijfsnaam / Klantnaam *</label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="bijv. Rabobank Eindhoven" />
              </div>
              <div>
                <label className="block font-semibold mb-1">T.a.v. Contactpersoon</label>
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="bijv. Dhr. J. Jansen" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Straat + Huisnummer</label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="bijv. Markt 12" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Postcode + Plaats</label>
                <Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="bijv. 5611 AA Eindhoven" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Locatie Event</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="bijv. Bedrijfsterrein Terheijden" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">E-mailadres</label>
                <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="klant@bedrijf.nl" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Telefoonnummer</label>
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="06 12345678" />
              </div>
            </div>
          </div>

          {/* Section 3: Event Parameters & Berekening */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-bold text-sm text-gold flex items-center gap-1.5">
              <Zap className="h-4 w-4" /> Parameters & Totaalprijs Herberekenen
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Aantal Gasten</label>
                <Input
                  type="number"
                  value={params.peopleCount}
                  onChange={(e) => handleParamChange({ ...params, peopleCount: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Kilometers (Totaal)</label>
                <Input
                  type="number"
                  value={params.distanceKm}
                  onChange={(e) => handleParamChange({ ...params, distanceKm: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Fixed / Gas & Stroom (€)</label>
                <Input
                  type="number"
                  value={params.fixedCosts}
                  onChange={(e) => handleParamChange({ ...params, fixedCosts: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Winstmarge (%)</label>
                <Input
                  type="number"
                  value={params.targetEventMargin}
                  onChange={(e) => handleParamChange({ ...params, targetEventMargin: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Reistijd (Uur)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={params.travelHours}
                  onChange={(e) => handleParamChange({ ...params, travelHours: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Opbouw + Afbouw (Uur)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={params.setupHours}
                  onChange={(e) => handleParamChange({ ...params, setupHours: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Bakken & Serveren (Uur)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={params.serviceHours}
                  onChange={(e) => handleParamChange({ ...params, serviceHours: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Recalculated Summary Card */}
            <div className="rounded-md border border-gold/30 bg-background/80 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="block text-muted-foreground">Herberekende Pakketprijs (excl. btw):</span>
                <span className="text-base font-extrabold text-gold">{formatCurrency(calculation.advisedPackagePrice)}</span>
                <span className="text-[10px] text-muted-foreground block">({formatCurrency(calculation.pricePerPerson)} p.p.)</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Verdiend per Vennoot (50/50):</span>
                <span className="text-sm font-bold text-foreground">{formatCurrency(calculation.hourlyEarningsPerPartner)}/uur</span>
              </div>
            </div>
          </div>

          {/* Section 4: Opmerkingen */}
          <div>
            <label className="block font-semibold mb-1">Notities / Bijzonderheden</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="bijv. Allergenen, stroomvoorziening op locatie, contactpersoon op de dag zelf..."
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-gold text-background font-bold hover:bg-gold/90">
            <Save className="mr-1.5 h-4 w-4" />
            {isSaving ? "Opslaan..." : "Wijzigingen Opslaan"}
          </Button>
        </div>

      </div>
    </div>
  );
}
