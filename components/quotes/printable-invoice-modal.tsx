"use client";

import { useEffect, useState } from "react";
import { Printer, X, Edit2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/calendar-date-picker";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventPackageParams, EventCalculationResult, ProductWithCost, SavedEvent } from "@/types/core";
import { updateEvent } from "@/services/events.service";
import { useToast } from "@/components/ui/toast";

interface PrintableInvoiceModalProps {
  event: SavedEvent;
  open: boolean;
  onClose: () => void;
  products: ProductWithCost[];
  onEventUpdated?: () => void;
}

export function PrintableInvoiceModal({
  event,
  open,
  onClose,
  products,
  onEventUpdated
}: PrintableInvoiceModalProps) {
  const { notify } = useToast();

  const [clientName, setClientName] = useState(event.clientName || "Bedrijfsnaam / Klantnaam");
  const [contactPerson, setContactPerson] = useState(event.contactPerson || "");
  const [clientAddress, setClientAddress] = useState(event.clientAddress || "Straat en huisnummer");
  const [clientCity, setClientCity] = useState(event.clientCity || event.location || "Postcode en plaats");
  const [eventDate, setEventDate] = useState(event.eventDate || new Date().toISOString().split("T")[0]);
  const [eventTime, setEventTime] = useState(event.eventTime || "");
  const [invoiceNumber, setInvoiceNumber] = useState(event.invoiceNumber || `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 8999) + 1000}`);
  const [invoiceDate, setInvoiceDate] = useState(event.invoiceDate || new Date().toISOString().split("T")[0]);
  const [paymentTermsDays, setPaymentTermsDays] = useState(14);
  const [isEditing, setIsEditing] = useState(false);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const params = event.params;
  const result = event.calculation;

  const subtotalExclVat = result.advisedPackagePrice;
  const vatAmount = subtotalExclVat * 0.09;
  const totalInclVat = subtotalExclVat + vatAmount;

  // Calculate Due Date
  const dueDateObj = new Date(invoiceDate || Date.now());
  dueDateObj.setDate(dueDateObj.getDate() + paymentTermsDays);
  const dueDateStr = dueDateObj.toISOString().split("T")[0];

  if (!open) return null;

  const handleMarkAsInvoiced = async () => {
    try {
      await updateEvent(event.id, {
        status: "gefactureerd",
        invoiceNumber,
        invoiceDate,
        clientName,
        contactPerson,
        clientAddress,
        clientCity,
        eventDate,
        eventTime
      });
      notify({ title: "Event gemarkeerd als Gefactureerd!" });
      if (onEventUpdated) onEventUpdated();
    } catch (err) {
      console.error("Failed to mark as invoiced:", err);
    }
  };

  const handlePrint = () => {
    handleMarkAsInvoiced();

    const sheetEl = document.querySelector(".printable-invoice-sheet");
    if (!sheetEl) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="nl">
        <head>
          <meta charset="utf-8">
          <title>Factuur ${invoiceNumber} - Smikkelbakkies VOF</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0;
              padding: 0;
              font-size: 12px;
              line-height: 1.4;
            }
            .printable-invoice-sheet {
              width: 100%;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
            .text-base { font-size: 1rem; line-height: 1.5rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-\\[11px\\] { font-size: 11px; }
            .text-\\[10px\\] { font-size: 10px; }
            .font-bold { font-weight: 700; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-extrabold { font-weight: 800; }
            .uppercase { text-transform: uppercase; }
            .tracking-tight { letter-spacing: -0.025em; }
            .tracking-wider { letter-spacing: 0.05em; }
            .text-black { color: #000000; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-\\[110px_1fr\\] { grid-template-columns: 110px 1fr; }
            .gap-8 { gap: 2rem; }
            .gap-12 { gap: 3rem; }
            .gap-1 { gap: 0.25rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .space-y-1\\.5 > * + * { margin-top: 0.375rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .space-y-6 > * + * { margin-top: 1.5rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-4 { padding-top: 1rem; }
            .pt-6 { padding-top: 1.5rem; }
            .pt-8 { padding-top: 2rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
            .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .pr-2 { padding-right: 0.5rem; }
            .pl-2 { padding-left: 0.5rem; }
            .pl-4 { padding-left: 1rem; }
            .w-full { width: 100%; }
            .w-72 { width: 18rem; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-b-2 { border-bottom: 2px solid #000000; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border-black { border-color: #000000; }
            .border-collapse { border-collapse: collapse; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .block { display: block; }
            .bg-gray-50\\/50 { background-color: rgba(249, 250, 251, 0.6); }
            .bg-gray-100 { background-color: #f3f4f6; }
            .rounded-lg { border-radius: 0.5rem; }
            .p-4 { padding: 1rem; }
            .divide-y > * + * { border-top: 1px solid #e5e7eb; }
            .divide-gray-300 > * + * { border-color: #d1d5db; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .leading-relaxed { line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          ${sheetEl.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl rounded-xl border bg-card shadow-2xl space-y-4 p-4 sm:p-6 my-auto">
        
        {/* Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={onClose} className="font-semibold text-xs border-gold/40 text-gold hover:bg-gold/10">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Terug naar Kalender
            </Button>
            <span className="font-bold text-base flex items-center gap-2">
              🧾 Factuur PDF Preview
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
              {isEditing ? "Sluit Gegevens" : "Factuur Bewerken"}
            </Button>

            <Button size="sm" onClick={handlePrint} className="h-9 bg-gold text-background font-bold text-xs hover:bg-gold/90">
              <Printer className="mr-1.5 h-4 w-4" /> Factuur PDF Afdrukken
            </Button>

            <Button size="icon" variant="ghost" onClick={onClose} className="h-9 w-9 text-muted-foreground hover:text-foreground">
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
              <label className="block font-medium mb-1">Factuurnummer</label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <DatePicker
                label="Factuurdatum"
                value={invoiceDate}
                onChange={(d) => setInvoiceDate(d)}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Betaaltermijn (Dagen)</label>
              <Input
                type="number"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || 14)}
              />
            </div>
          </div>
        )}

        {/* Live A4 Printable Sheet Container */}
        <div className="overflow-x-auto rounded-lg">
          <div className="printable-invoice-sheet w-full min-w-0 sm:min-w-[650px] bg-white text-black font-sans text-xs p-6 sm:p-8 rounded-lg shadow-md border space-y-6">
            
            {/* Header Row */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-black">FACTUUR</h1>
              </div>

              <div className="text-right text-[11px] leading-relaxed text-black font-medium">
                <p className="font-bold text-sm">Smikkelbakkies VOF</p>
                <p>Copernicusstraat 34</p>
                <p>4816 CB Breda</p>
                <p className="mt-1">T: 0626685035</p>
                <p>M: smikkelbakkies@gmail.com</p>
                <p className="mt-1">KvK: 42131023</p>
                <p>BTW: NL861234567B01</p>
              </div>
            </div>

            {/* Client Box & Metadata Row */}
            <div className="grid grid-cols-2 gap-8 pt-2">
              <div className="space-y-1">
                <span className="font-bold text-black uppercase tracking-wider block">GEFACTUREERD AAN</span>
                <p className="font-bold text-sm text-black">{clientName}</p>
                {contactPerson && <p>T.a.v. {contactPerson}</p>}
                <p>{clientAddress}</p>
                <p>{clientCity}</p>
              </div>

              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <span className="font-bold">Factuurnummer:</span>
                  <span className="font-bold text-black">{invoiceNumber}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <span className="font-bold">Factuurdatum:</span>
                  <span>{formatDate(invoiceDate)}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <span className="font-bold">Vervaldatum:</span>
                  <span className="font-bold text-black">{formatDate(dueDateStr)} ({paymentTermsDays} dagen)</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <span className="font-bold">Leverdatum:</span>
                  <span>{formatDate(eventDate)} {eventTime && `- ${eventTime}`}</span>
                </div>
                {event.quoteNumber && (
                  <div className="grid grid-cols-[120px_1fr] gap-1">
                    <span className="font-bold">Offerte Ref:</span>
                    <span>{event.quoteNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="pt-4">
              <table className="w-full text-xs text-left border-collapse border-b-2 border-black">
                <thead>
                  <tr className="border-b-2 border-black font-bold uppercase text-[11px]">
                    <th className="py-2 pr-2">Product / Omschrijving</th>
                    <th className="py-2 px-2">Code</th>
                    <th className="py-2 px-2 text-center">Aantal</th>
                    <th className="py-2 px-2 text-right">Tarief (excl. btw)</th>
                    <th className="py-2 px-2 text-center">BTW</th>
                    <th className="py-2 pl-2 text-right">Bedrag (excl. btw)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  <tr>
                    <td className="py-3 pr-2 font-medium">
                      <span className="font-bold block text-sm">Foodtruck Catering Arrangement - {event.eventName}</span>
                      <span className="text-[11px] text-gray-600 block">
                        Catering op locatie voor {params.peopleCount} personen ({params.serviceHours} uur bereiding & bediening vanuit de foodtruck).
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-500 font-mono">CAT-{params.peopleCount}P</td>
                    <td className="py-3 px-2 text-center font-bold">1,00</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(subtotalExclVat)}</td>
                    <td className="py-3 px-2 text-center">9%</td>
                    <td className="py-3 pl-2 text-right font-bold">{formatCurrency(subtotalExclVat)}</td>
                  </tr>

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

            {/* Totals */}
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
                  <span>Totaal te voldoen (incl. btw):</span>
                  <span>{formatCurrency(totalInclVat)}</span>
                </div>
              </div>
            </div>

            {/* Official Payment Instructions & IBAN Block */}
            <div className="rounded-lg border border-black bg-gray-50 p-4 space-y-2 text-xs">
              <span className="font-bold text-sm block">Betaalinstructie:</span>
              <p className="leading-relaxed">
                Gelieve het totaalbedrag van <strong>{formatCurrency(totalInclVat)}</strong> binnen <strong>{paymentTermsDays} dagen</strong> (vóór {formatDate(dueDateStr)}) over te maken op onze bankrekening t.n.v. <strong>Smikkelbakkies VOF</strong> onder vermelding van factuurnummer <strong>{invoiceNumber}</strong>.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-[11px] border-t">
                <div>
                  <span className="block text-gray-500">IBAN Bankrekening:</span>
                  <span className="font-bold">NL89 INGB 0123 4567 89</span>
                </div>
                <div>
                  <span className="block text-gray-500">BIC / SWIFT:</span>
                  <span className="font-bold">INGBNL2A</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="secondary" size="sm" onClick={handleMarkAsInvoiced} className="text-xs font-semibold text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Opslaan als Gefactureerd
          </Button>

          <Button size="sm" onClick={handlePrint} className="bg-gold text-background font-bold text-xs hover:bg-gold/90">
            <Printer className="mr-1.5 h-4 w-4" /> Factuur PDF Afdrukken
          </Button>
        </div>

      </div>
    </div>
  );
}
