"use client";

import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventCalculationResult, EventPackageParams, ProductWithCost } from "@/types/core";

interface PrintableQuoteModalProps {
  open: boolean;
  onClose: () => void;
  params: EventPackageParams;
  result: EventCalculationResult;
  products: ProductWithCost[];
  clientName?: string;
  eventName?: string;
  quoteDate?: string;
}

export function PrintableQuoteModal({
  open,
  onClose,
  params,
  result,
  products,
  clientName = "Gewaardeerde Klant",
  eventName = "Catering Event",
  quoteDate = new Date().toISOString().split("T")[0]
}: PrintableQuoteModalProps) {
  if (!open) return null;

  const productMap = new Map(products.map((p) => [p.id, p]));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-3xl rounded-xl border bg-background p-8 shadow-2xl space-y-6 print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:bg-white print:text-black">
        
        {/* Action Header (Hidden when printing) */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">📄 Offerte PDF Preview</span>
            <span className="text-xs text-muted-foreground">(Klaar om direct af te drukken of als PDF op te slaan)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="bg-gold text-background font-semibold hover:bg-gold/90">
              <Printer className="mr-1.5 h-4 w-4" /> Afdrukken / Opslaan als PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Sheet (A4 Styling) */}
        <div className="space-y-6 text-foreground print:text-black font-sans">
          
          {/* Briefpapier Header */}
          <div className="flex justify-between items-start border-b-2 border-gold/40 pb-6 print:border-black">
            <div>
              <h1 className="text-3xl font-extrabold tracking-wider text-gold print:text-black">SMIKKELBAKKIES</h1>
              <p className="text-xs text-muted-foreground print:text-gray-600 mt-0.5">Vers Gebakken Burgers & Quality Catering VOF</p>
            </div>
            <div className="text-right text-xs space-y-1">
              <p className="font-semibold text-sm text-foreground print:text-black">OFFERTE</p>
              <p className="text-muted-foreground print:text-gray-600">Offertekenmerk: <strong className="text-foreground print:text-black">OFF-{new Date().getFullYear()}-{(Math.floor(Math.random() * 8999) + 1000)}</strong></p>
              <p className="text-muted-foreground print:text-gray-600">Datum: <strong className="text-foreground print:text-black">{formatDate(quoteDate)}</strong></p>
            </div>
          </div>

          {/* Client & Event Info Box */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4 text-xs print:border-gray-300 print:bg-gray-50">
            <div>
              <span className="font-bold text-muted-foreground print:text-gray-700 block mb-1">OPDRACHTGEVER</span>
              <p className="font-semibold text-sm text-foreground print:text-black">{clientName}</p>
              <p className="text-muted-foreground print:text-gray-600">Betreft: {eventName}</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-muted-foreground print:text-gray-700 block mb-1">CATERING LOCATIE & DUUR</span>
              <p className="font-semibold text-foreground print:text-black">{params.peopleCount} Personen / Gasten</p>
              <p className="text-muted-foreground print:text-gray-600">{params.serviceHours} uur verse bereiding op locatie vanuit de foodtruck</p>
            </div>
          </div>

          {/* Burger Specification Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground print:text-gray-700">Arrangement & Burger Samenstelling</h3>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-muted bg-muted/40 print:border-gray-300 print:bg-gray-100">
                  <th className="p-2.5 font-bold">Omschrijving</th>
                  <th className="p-2.5 font-bold text-center">Gasten</th>
                  <th className="p-2.5 font-bold text-center">Burger p.p.</th>
                  <th className="p-2.5 font-bold text-right">Totaal Burgers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/40 print:divide-gray-200">
                {params.selectedProducts.map((row, idx) => {
                  const prod = productMap.get(row.productId);
                  const count = Math.round(row.quantityPerPerson * params.peopleCount);
                  return (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-foreground print:text-black">
                        {prod ? prod.name : "Smikkelburger"}
                        <span className="block text-[10px] text-muted-foreground print:text-gray-600 font-normal">
                          {prod?.description || "Ambachtelijke verse burger gebakken op locatie."}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">{params.peopleCount} personen</td>
                      <td className="p-2.5 text-center">{row.quantityPerPerson} p.p.</td>
                      <td className="p-2.5 text-right font-bold">{count}x stuks</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* What's Included Bullet Points */}
          <div className="rounded-lg border bg-muted/10 p-3 text-xs space-y-1 text-muted-foreground print:border-gray-300 print:bg-gray-50 print:text-gray-700">
            <span className="font-bold text-foreground print:text-black block mb-1">Bij de prijs inbegrepen:</span>
            <p>• Vers bereide burgers vanuit onze professionele foodtruck op locatie.</p>
            <p>• Reiskosten ({params.distanceKm} km), op- en afbouw van de stand.</p>
            <p>• Servies, disposables, servetten en gastvrije bediening.</p>
          </div>

          {/* Pricing Total Summary */}
          <div className="border-t-2 border-gold/40 pt-4 flex justify-between items-end print:border-black">
            <div className="text-[11px] text-muted-foreground print:text-gray-600 space-y-0.5">
              <p>Prijzen zijn exclusief geldende btw en 30 dagen geldig.</p>
              <p>Smikkelbakkies VOF • KvK: 81234567 • btw: NL001234567B01</p>
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs text-muted-foreground print:text-gray-700">
                Prijs per persoon: <strong className="text-foreground print:text-black">{formatCurrency(result.pricePerPerson)} p.p.</strong>
              </div>
              <div className="text-xl font-extrabold text-gold print:text-black">
                Totaalbedrag: {formatCurrency(result.advisedPackagePrice)} <span className="text-xs font-normal text-muted-foreground print:text-gray-600">(excl. btw)</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
