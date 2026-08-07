"use client";

import { useEffect, useState } from "react";
import { Printer, X, Edit2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/calendar-date-picker";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventCalculationResult, EventPackageParams, ProductWithCost } from "@/types/core";

interface PrintableQuoteModalProps {
  open: boolean;
  onClose: () => void;
  params: EventPackageParams;
  result: EventCalculationResult;
  products: ProductWithCost[];
  defaultClientName?: string;
  defaultContactPerson?: string;
  defaultClientAddress?: string;
  defaultClientCity?: string;
  defaultEventDate?: string;
  defaultEventTime?: string;
  defaultQuoteNumber?: string;
}

export function PrintableQuoteModal({
  open,
  onClose,
  params,
  result,
  products,
  defaultClientName = "",
  defaultContactPerson = "",
  defaultClientAddress = "",
  defaultClientCity = "",
  defaultEventDate = "",
  defaultEventTime = "",
  defaultQuoteNumber = ""
}: PrintableQuoteModalProps) {
  const [clientName, setClientName] = useState(defaultClientName || "Bedrijfsnaam / Klantnaam");
  const [contactPerson, setContactPerson] = useState(defaultContactPerson || "T.a.v. Afdeling / Contactpersoon");
  const [clientAddress, setClientAddress] = useState(defaultClientAddress || "Straat en huisnummer");
  const [clientCity, setClientCity] = useState(defaultClientCity || "Postcode en plaats");
  const [eventDate, setEventDate] = useState(defaultEventDate || new Date().toISOString().split("T")[0]);
  const [eventTime, setEventTime] = useState(defaultEventTime || "");
  const [quoteNumber, setQuoteNumber] = useState(defaultQuoteNumber || `OFF-${new Date().getFullYear()}-${Math.floor(Math.random() * 8999) + 1000}`);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open) {
      if (defaultClientName) setClientName(defaultClientName);
      if (defaultContactPerson) setContactPerson(defaultContactPerson);
      if (defaultClientAddress) setClientAddress(defaultClientAddress);
      if (defaultClientCity) setClientCity(defaultClientCity);
      if (defaultEventDate) setEventDate(defaultEventDate);
      if (defaultEventTime) setEventTime(defaultEventTime);
      if (defaultQuoteNumber) setQuoteNumber(defaultQuoteNumber);
    }
  }, [open, defaultClientName, defaultContactPerson, defaultClientAddress, defaultClientCity, defaultEventDate, defaultEventTime, defaultQuoteNumber]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const productMap = new Map(products.map((p) => [p.id, p]));

  const totalBurgersToBake = Math.round(
    params.peopleCount * params.selectedProducts.reduce((acc, p) => acc + (p.quantityPerPerson || 0), 0)
  );

  // Calculations for 9% BTW catering rate
  const subtotalExclVat = result.advisedPackagePrice;
  const vatRate = 0.09; // 9% laag tarief op catering/voeding in NL
  const vatAmount = subtotalExclVat * vatRate;
  const totalInclVat = subtotalExclVat + vatAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto"
    >
      <div className="relative w-full max-w-4xl rounded-xl border bg-card shadow-2xl space-y-4 no-print p-6 my-auto print:hidden">
        
        {/* Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={onClose} className="font-semibold text-xs border-gold/40 text-gold hover:bg-gold/10">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Terug naar Calculator
            </Button>

            <span className="font-bold text-base flex items-center gap-2">
              📄 Offerte PDF Preview
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(!isEditing)}
              className="h-9 text-xs"
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5 text-gold" />
              {isEditing ? "Sluit Gegevens" : "Klant Bewerken"}
            </Button>

            <Button size="sm" onClick={handlePrint} className="h-9 bg-gold text-background font-bold text-xs hover:bg-gold/90">
              <Printer className="mr-1.5 h-4 w-4" /> Offerte PDF Afdrukken
            </Button>

            <Button size="icon" variant="ghost" onClick={onClose} className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Sluiten">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Editable fields drawer */}
        {isEditing && (
          <div className="rounded-lg border bg-muted/40 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-medium mb-1">Klant / Bedrijfsnaam</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <label className="block font-medium mb-1">T.a.v. Contactpersoon</label>
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div>
              <label className="block font-medium mb-1">Straat + Huisnummer</label>
              <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
            </div>
            <div>
              <label className="block font-medium mb-1">Postcode + Plaats</label>
              <Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} />
            </div>
            <div>
              <DatePicker
                label="Event Datum"
                value={eventDate}
                onChange={(d) => setEventDate(d)}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Tijd (bijv. 18:00-20:00)</label>
              <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="Tijd" />
            </div>
            <div>
              <label className="block font-medium mb-1">Offertenummer</label>
              <Input value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} />
            </div>
          </div>
        )}

        {/* Live A4 Print Sheet Container */}
        <div className="overflow-x-auto rounded-lg">
          <div className="printable-quote-sheet min-w-[650px] bg-white text-black font-sans text-xs p-6 sm:p-8 rounded-lg shadow-md border print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:min-w-0 space-y-6">
          
          {/* Header Row */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-black">OFFERTE</h1>
            </div>

            <div className="text-right text-[11px] leading-relaxed text-black font-medium">
              <p className="font-bold text-sm">Smikkelbakkies VOF</p>
              <p>Copernicusstraat 34</p>
              <p>4816 CB Breda</p>
              <p className="mt-1">T: 0626685035</p>
              <p>M: smikkelbakkies@gmail.com</p>
              <p className="mt-1">KvK: 42131023</p>
            </div>
          </div>

          {/* Client Box & Metadata Row */}
          <div className="grid grid-cols-2 gap-8 pt-2">
            <div className="space-y-1">
              <span className="font-bold text-black uppercase tracking-wider block">AAN</span>
              <p className="font-bold text-sm text-black">{clientName}</p>
              <p>{contactPerson}</p>
              <p>{clientAddress}</p>
              <p>{clientCity}</p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <span className="font-bold">Datum:</span>
                <span>{formatDate(new Date().toISOString())}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <span className="font-bold">Offertenummer:</span>
                <span>{quoteNumber}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <span className="font-bold">Geldigheid:</span>
                <span>30 dagen</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <span className="font-bold">Leverdatum:</span>
                <span>{formatDate(eventDate)} {eventTime && `- ${eventTime}`}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <span className="font-bold">Uw referentie:</span>
                <span>Foodtruck Catering ({params.peopleCount} gasten)</span>
              </div>
            </div>
          </div>

          {/* Quotation Table */}
          <div className="pt-4">
            <table className="w-full text-xs text-left border-collapse border-b-2 border-black">
              <thead>
                <tr className="border-b-2 border-black font-bold uppercase text-[11px]">
                  <th className="py-2 pr-2">Product / Omschrijving</th>
                  <th className="py-2 px-2">Artikelnummer</th>
                  <th className="py-2 px-2 text-center">Aantal</th>
                  <th className="py-2 px-2 text-right">Tarief (excl. btw)</th>
                  <th className="py-2 px-2 text-center">BTW</th>
                  <th className="py-2 pl-2 text-right">Bedrag (excl. btw)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {/* Main Catering Package Row */}
                <tr>
                  <td className="py-3 pr-2 font-medium">
                    <span className="font-bold block text-sm">Foodtruck Catering Arrangement</span>
                    <span className="text-[11px] text-gray-600 block">
                      Catering op locatie voor {params.peopleCount} personen ({params.serviceHours} uur bereiding vanuit de foodtruck).
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 font-mono">CAT-{params.peopleCount}P</td>
                  <td className="py-3 px-2 text-center font-bold">1,00</td>
                  <td className="py-3 px-2 text-right">{formatCurrency(subtotalExclVat)}</td>
                  <td className="py-3 px-2 text-center">9%</td>
                  <td className="py-3 pl-2 text-right font-bold">{formatCurrency(subtotalExclVat)}</td>
                </tr>

                {/* Burger Specifications */}
                {params.selectedProducts.map((row, idx) => {
                  const prod = productMap.get(row.productId);
                  const count = Math.round(row.quantityPerPerson * params.peopleCount);
                  return (
                    <tr key={idx} className="bg-gray-50/50">
                      <td className="py-2.5 pr-2 pl-4">
                        <span className="font-bold block">• {prod ? prod.name : "Smikkelburger"} ({row.quantityPerPerson} p.p.)</span>
                        <span className="text-[10px] text-gray-500">
                          {prod?.description || "Vers gebakken ambachtelijke burger op locatie."}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-gray-500 font-mono">{prod?.sku || "SMK-01"}</td>
                      <td className="py-2.5 px-2 text-center">{count},00 stuks</td>
                      <td className="py-2.5 px-2 text-right text-gray-500">Inbegrepen</td>
                      <td className="py-2.5 px-2 text-center text-gray-500">9%</td>
                      <td className="py-2.5 pl-2 text-right text-gray-500">Inbegrepen</td>
                    </tr>
                  );
                })}


              </tbody>
            </table>
          </div>

          {/* Totals Block */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span>Subtotaal (excl. btw):</span>
                <span className="font-bold">{formatCurrency(subtotalExclVat)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>BTW (9%):</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b-2 border-black font-extrabold text-sm">
                <span>Totaal EURO (incl. btw):</span>
                <span>{formatCurrency(totalInclVat)}</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] text-gray-600">
                <span>Prijs per persoon:</span>
                <span className="font-bold">{formatCurrency(result.pricePerPerson)} p.p.</span>
              </div>
            </div>
          </div>

          {/* Acceptance Signatures Block */}
          <div className="grid grid-cols-2 gap-12 pt-8 text-xs border-t">
            <div className="space-y-4">
              <span className="font-bold block">Voor akkoord opdrachtgever</span>
              <div className="space-y-2 text-[11px]">
                <p>Datum, Plaats: ___________________________</p>
                <p className="pt-6">Handtekening: ________________________</p>
              </div>
            </div>

            <div className="space-y-4">
              <span className="font-bold block">Voor akkoord opdrachtnemer</span>
              <div className="space-y-2 text-[11px]">
                <p>Datum, Plaats: Breda, {formatDate(new Date().toISOString())}</p>
                <p className="pt-6 font-bold">Smikkelbakkies VOF</p>
              </div>
            </div>
          </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Terug naar Calculator
          </Button>

          <Button size="sm" onClick={handlePrint} className="bg-gold text-background font-bold text-xs hover:bg-gold/90">
            <Printer className="mr-1.5 h-4 w-4" /> Offerte PDF Afdrukken
          </Button>
        </div>

      </div>
    </div>
  );
}
