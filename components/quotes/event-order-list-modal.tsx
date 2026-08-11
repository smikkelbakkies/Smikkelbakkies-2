"use client";

import { useEffect, useState } from "react";
import { X, ShoppingCart, Check, Copy, Printer, ArrowLeft, Building2, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SavedEvent, SupplierOrderGroup } from "@/types/core";
import { generateEventOrderList } from "@/services/events.service";
import { useToast } from "@/components/ui/toast";

interface EventOrderListModalProps {
  event: SavedEvent | null;
  open: boolean;
  onClose: () => void;
}

export function EventOrderListModal({ event, open, onClose }: EventOrderListModalProps) {
  const { notify } = useToast();
  const [orderGroups, setOrderGroups] = useState<SupplierOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSupplierId, setCopiedSupplierId] = useState<string | null>(null);

  const [useCheapestSuppliers, setUseCheapestSuppliers] = useState(true);

  useEffect(() => {
    if (open && event) {
      setLoading(true);
      generateEventOrderList(event.params.peopleCount, event.params.selectedProducts, useCheapestSuppliers)
        .then((groups) => {
          setOrderGroups(groups);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Order list error:", err);
          setLoading(false);
        });
    }
  }, [open, event, useCheapestSuppliers]);

  if (!open || !event) return null;

  const totalBurgersToBake = Math.round(
    event.params.peopleCount * event.params.selectedProducts.reduce((acc, p) => acc + (p.quantityPerPerson || 0), 0)
  );

  const grandTotalCost = orderGroups.reduce((acc, g) => acc + g.totalGroupCost, 0);

  const handleCopyGroup = (group: SupplierOrderGroup) => {
    let text = `📋 BESTELLIJSK - ${group.supplierName.toUpperCase()}\n`;
    text += `Event: ${event.eventName} (${event.clientName})\n`;
    text += `Datum: ${formatDate(event.eventDate)} ${event.eventTime ? `- ${event.eventTime}` : ""}\n`;
    text += `Aantal personen: ${event.params.peopleCount} (${totalBurgersToBake} burgers)\n`;
    text += `-----------------------------------\n`;

    group.items.forEach((item) => {
      let line = `• ${item.ingredientName}: ${item.packagesToOrder}x ${item.purchaseUnit} (${item.totalBaseUnitsNeeded.toFixed(0)} ${item.baseUnit} nodig)`;
      if (item.productUrl) line += ` - ${item.productUrl}`;
      text += line + "\n";
    });

    text += `-----------------------------------\n`;
    text += `Geschatte kosten: ${formatCurrency(group.totalGroupCost)}\n`;

    navigator.clipboard.writeText(text);
    setCopiedSupplierId(group.supplierId);
    notify({ title: `Bestellijst voor ${group.supplierName} gekopieerd!` });

    setTimeout(() => setCopiedSupplierId(null), 3000);
  };

  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }

    let groupsHtml = "";
    orderGroups.forEach((group) => {
      let itemsHtml = "";
      group.items.forEach((item) => {
        itemsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 4px; font-weight: 600;">${item.ingredientName}</td>
            <td style="padding: 8px 4px; text-align: center;">${item.totalBaseUnitsNeeded.toFixed(0)} ${item.baseUnit}</td>
            <td style="padding: 8px 4px; text-align: center; font-weight: 700; color: #b45309;">${item.packagesToOrder}x ${item.purchaseUnit}</td>
            <td style="padding: 8px 4px; text-align: right;">${formatCurrency(item.totalEstimatedCost)}</td>
          </tr>
        `;
      });

      groupsHtml += `
        <div style="margin-bottom: 24px; border: 1px solid #ddd; border-radius: 8px; padding: 16px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px;">
            <div>
              <h3 style="margin: 0; font-size: 16px;">${group.supplierName}</h3>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #666;">${group.contactEmail} • ${group.contactPhone}</p>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: 700; font-size: 14px;">Totaal: ${formatCurrency(group.totalGroupCost)}</span>
            </div>
          </div>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #999; text-align: left; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 4px;">Ingrediënt</th>
                <th style="padding: 4px; text-align: center;">Nodig</th>
                <th style="padding: 4px; text-align: center;">Bestellen</th>
                <th style="padding: 4px; text-align: right;">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="nl">
        <head>
          <meta charset="utf-8">
          <title>Bestellijst Inkoop - ${event.eventName}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: system-ui, sans-serif; background: #fff; color: #000; margin: 0; padding: 0; font-size: 12px; }
            h1 { font-size: 20px; margin: 0 0 4px 0; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px;">
            <div>
              <h1>INKOOP & BESTELLIJST LEVERANCIERS</h1>
              <p style="margin: 0; font-size: 12px; color: #444;">Event: <strong>${event.eventName}</strong> (${event.clientName})</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #666;">Datum: ${formatDate(event.eventDate)} ${event.eventTime ? `- ${event.eventTime}` : ""} | ${event.params.peopleCount} personen (${totalBurgersToBake} burgers)</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-weight: 700; font-size: 16px;">Totaal Inkoop: ${formatCurrency(grandTotalCost)}</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #666;">Smikkelbakkies VOF</p>
            </div>
          </div>
          ${groupsHtml}
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
      <div className="relative w-full max-w-4xl rounded-xl border bg-card shadow-2xl space-y-4 p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={onClose} className="font-semibold text-xs border-gold/40 text-gold hover:bg-gold/10">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Terug naar Kalender
            </Button>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-gold" /> Bestellijst & Inkoop
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Event: <strong className="text-foreground">{event.eventName}</strong> • {event.params.peopleCount} gasten ({totalBurgersToBake} burgers)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={useCheapestSuppliers ? "default" : "secondary"}
              onClick={() => setUseCheapestSuppliers(!useCheapestSuppliers)}
              className={`h-9 text-xs font-bold ${
                useCheapestSuppliers
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                  : "border-gold/40 text-gold hover:bg-gold/10"
              }`}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {useCheapestSuppliers ? "🌟 Voordeligste Opties Actief" : "👑 Gebruik Voordeligste Opties"}
            </Button>

            <Button size="sm" onClick={handlePrintAll} className="h-9 bg-gold text-background font-bold text-xs hover:bg-gold/90">
              <Printer className="mr-1.5 h-4 w-4" /> Bestellijsten Afdrukken
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Total Cost Highlight Banner */}
        <div className="rounded-lg border border-gold/40 bg-gold/5 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="block text-muted-foreground font-medium">Totale Geschatte Inkoopwaarde:</span>
            <span className="text-xl font-extrabold text-gold">{formatCurrency(grandTotalCost)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success" className="text-xs">{orderGroups.length} Leverancier(s)</Badge>
            <Badge tone="neutral" className="text-xs">{orderGroups.reduce((a, g) => a + g.items.length, 0)} Ingrediënt(en)</Badge>
          </div>
        </div>

        {/* Loading / Groups Content */}
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Inkooplijst berekenen voor {event.params.peopleCount} gasten...
          </div>
        ) : orderGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Geen ingrediënten gevonden voor dit event.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 text-xs">
            {orderGroups.map((group) => (
              <div key={group.supplierId} className="rounded-xl border bg-card/80 p-4 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b pb-2">
                    <div>
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-gold" /> {group.supplierName}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        {group.contactEmail} • {group.contactPhone}
                      </p>
                    </div>
                    <Badge tone="neutral" className="text-[10px]">
                      {group.items.length} artikel(en)
                    </Badge>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.ingredientId} className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{item.ingredientName}</span>
                            {item.productUrl && (
                              <a
                                href={item.productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-gold hover:underline font-bold"
                              >
                                <ExternalLink className="h-3 w-3 text-gold" /> Webshop Link
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            Nodig: {item.totalBaseUnitsNeeded.toFixed(0)} {item.baseUnit} ({item.packageContent} {item.baseUnit}/pkg)
                            {item.supplierArticleCode && ` • SKU: ${item.supplierArticleCode}`}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-gold block">
                            {item.packagesToOrder}x {item.purchaseUnit}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatCurrency(item.totalEstimatedCost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer action per supplier */}
                <div className="pt-3 border-t flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-muted-foreground">Subtotaal inkoop:</span>
                    <span className="font-bold text-sm text-foreground">{formatCurrency(group.totalGroupCost)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={copiedSupplierId === group.supplierId ? "default" : "secondary"}
                    className="h-8 text-xs font-semibold"
                    onClick={() => handleCopyGroup(group)}
                  >
                    {copiedSupplierId === group.supplierId ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Gekopieerd!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3.5 w-3.5 text-gold" /> Kopiëren voor Leverancier
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
