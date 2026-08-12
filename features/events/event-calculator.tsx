"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BookmarkPlus, Calculator, Check, CheckCircle2, Clock, Copy, DollarSign, ExternalLink, FileText, Fuel, MessageSquare, Plus, Printer, ShoppingCart, Sparkles, Trash2, Users, Utensils, Zap, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { DatePicker } from "@/components/ui/calendar-date-picker";
import { PrintableQuoteModal } from "@/components/quotes/printable-quote-modal";
import { formatCurrency } from "@/lib/utils";
import type { EventCalculationResult, EventPackageParams, ProductWithCost, SupplierOrderGroup } from "@/types/core";
import { calculateEventPackage, generateCustomerQuoteText, generateEventOrderList, saveEvent } from "@/services/events.service";
import { listProducts } from "@/services/recipes.service";

const EVENT_MARGIN_PRESETS = [20, 30, 40, 45];
const BURGER_QTY_PRESETS = [1.0, 1.25, 1.5, 2.0];

export function EventCalculator() {
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [params, setParams] = useState<EventPackageParams>({
    peopleCount: 75,
    selectedProducts: [],
    travelHours: 1.5,
    setupHours: 1.5,
    serviceHours: 3.0,
    distanceKm: 80,
    costPerKm: 0.35,
    fixedCosts: 75,
    staffCosts: 0,
    targetEventMargin: 30,
    calculationMode: "margin",
    targetPricePerPerson: 15,
    partnersCount: 2
  });

  const [result, setResult] = useState<EventCalculationResult | null>(null);
  const [orderGroups, setOrderGroups] = useState<SupplierOrderGroup[]>([]);
  const [copiedSupplierId, setCopiedSupplierId] = useState<string | null>(null);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [useCheapestSuppliers, setUseCheapestSuppliers] = useState(true);

  // Save Event Modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveEventName, setSaveEventName] = useState("");
  const [saveClientName, setSaveClientName] = useState("");
  const [saveContactPerson, setSaveContactPerson] = useState("");
  const [saveClientAddress, setSaveClientAddress] = useState("");
  const [saveClientCity, setSaveClientCity] = useState("");
  const [saveQuoteNumber, setSaveQuoteNumber] = useState("");
  const [saveEventDate, setSaveEventDate] = useState("");
  const [saveEventTime, setSaveEventTime] = useState("");
  const [saveLocation, setSaveLocation] = useState("");
  const [targetHourlyRateInput, setTargetHourlyRateInput] = useState<string>("");

  const { notify } = useToast();

  useEffect(() => {
    async function init() {
      const prods = await listProducts();
      setProducts(prods);
      if (prods.length > 0) {
        setParams((prev) => ({
          ...prev,
          selectedProducts: [{ productId: prods[0].id, quantityPerPerson: 1.5 }]
        }));
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (params.selectedProducts.length > 0) {
      calculateEventPackage(params).then(setResult);
      generateEventOrderList(params.peopleCount, params.selectedProducts, useCheapestSuppliers).then(setOrderGroups);
    }
  }, [params, useCheapestSuppliers]);

  const handleAddProductRow = () => {
    if (products.length === 0) return;
    setParams((prev) => ({
      ...prev,
      selectedProducts: [...prev.selectedProducts, { productId: products[0].id, quantityPerPerson: 1.0 }]
    }));
  };

  const handleRemoveProductRow = (index: number) => {
    setParams((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.filter((_, i) => i !== index)
    }));
  };

  const handleProductRowChange = (index: number, field: "productId" | "quantityPerPerson", value: any) => {
    setParams((prev) => {
      const updated = [...prev.selectedProducts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, selectedProducts: updated };
    });
  };

  const totalBurgersToBake = Math.round(
    params.peopleCount * params.selectedProducts.reduce((acc, p) => acc + (p.quantityPerPerson || 0), 0)
  );

  const handleCopyOrderList = (group: SupplierOrderGroup) => {
    let text = `📋 BESTELLIJST SMIKKELBAKKIES\n`;
    text += `Leverancier: ${group.supplierName}\n`;
    text += `Event: ${params.peopleCount} gasten (${totalBurgersToBake} burgers totaal)\n`;
    text += `----------------------------------------\n`;
    group.items.forEach((item) => {
      text += `• ${item.packagesToOrder}x ${item.purchaseUnit} ${item.ingredientName} (${item.packageContent} ${item.baseUnit}/unit)\n`;
    });
    text += `----------------------------------------\n`;
    text += `Totale schatting inkoop: ${formatCurrency(group.totalGroupCost)}\n`;

    navigator.clipboard.writeText(text);
    setCopiedSupplierId(group.supplierId);
    notify({ title: `Bestellijst voor ${group.supplierName} gekopieerd!` });
    setTimeout(() => setCopiedSupplierId(null), 2500);
  };

  const handleCopyCustomerQuote = async () => {
    if (!result) return;
    const text = await generateCustomerQuoteText(params, result);
    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    notify({ title: "Klantofferte gekopieerd! (klaar voor WhatsApp/E-mail)" });
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  const handleOpenSaveModal = () => {
    const generatedQuoteNumber = `OFF-${new Date().getFullYear()}-${Math.floor(Math.random() * 8999) + 1000}`;
    setSaveEventName(`Catering ${params.peopleCount}p`);
    setSaveClientName("");
    setSaveContactPerson("");
    setSaveClientAddress("");
    setSaveClientCity("");
    setSaveQuoteNumber(generatedQuoteNumber);
    setSaveEventDate(new Date().toISOString().split("T")[0]);
    setSaveEventTime("");
    setSaveLocation("");
    setSaveModalOpen(true);
  };

  const handleConfirmSaveEvent = async (andOpenPdf = false) => {
    if (!result) return;
    if (!saveClientName.trim()) {
      notify({ title: "Vul een klantnaam in" });
      return;
    }

    try {
      await saveEvent({
        eventName: saveEventName,
        eventDate: saveEventDate,
        eventTime: saveEventTime,
        clientName: saveClientName,
        contactPerson: saveContactPerson,
        clientAddress: saveClientAddress,
        clientCity: saveClientCity,
        quoteNumber: saveQuoteNumber,
        location: saveLocation || saveClientCity,
        params,
        calculation: result
      });

      notify({ title: "Event & Offerte opgeslagen in Planningskalender!" });
      setSaveModalOpen(false);

      if (andOpenPdf) {
        setPdfModalOpen(true);
      }
    } catch {
      notify({ title: "Fout bij opslaan event" });
    }
  };

  const handleTargetHourlyRateChange = (rateVal: number) => {
    if (!rateVal || rateVal <= 0 || !result) return;
    const totalPartnerHours = (params.travelHours + params.setupHours + params.serviceHours) * (params.partnersCount || 2);
    if (totalPartnerHours <= 0) return;

    const neededProfit = rateVal * totalPartnerHours;
    const requiredPrice = result.totalDirectCosts + neededProfit;
    if (requiredPrice <= 0) return;

    const marginPercent = (neededProfit / requiredPrice) * 100;
    setParams({
      ...params,
      targetEventMargin: Math.round(marginPercent * 10) / 10
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        {/* Left Column: Calculator Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-gold" /> Event Parameters (VOF 2 Vennoten)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bereken adviesprijzen, pakketkosten en jullie uurverdienste voor catering en events.
                  </p>
                </div>
                <Badge tone="neutral">2 Vennoten</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Guest Count */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gold" /> Aantal Gasten / Personen op Event
                </label>
                <Input
                  type="number"
                  min="1"
                  value={params.peopleCount}
                  onChange={(e) => setParams({ ...params, peopleCount: parseInt(e.target.value) || 0 })}
                  className="font-semibold h-10 text-base"
                />
              </div>

              {/* Dynamic Burgers & Quantities Per Person */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-gold" /> Menusamenstelling & Aantal Burgers p.p.
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Totaal te bakken: <strong className="text-gold font-bold">{totalBurgersToBake} burgers</strong> voor {params.peopleCount} gasten.
                    </span>
                  </div>
                  <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handleAddProductRow}>
                    <Plus className="mr-1 h-3.5 w-3.5 text-gold" /> Burger Toevoegen
                  </Button>
                </div>

                <div className="space-y-2.5 pt-1">
                  {params.selectedProducts.map((row, idx) => {
                    const selectedProd = products.find((p) => p.id === row.productId);
                    return (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border bg-background p-3 text-xs">
                        <div className="flex-1 space-y-1">
                          <label className="block text-[10px] text-muted-foreground">Selecteer Burger</label>
                          <select
                            value={row.productId}
                            onChange={(e) => handleProductRowChange(idx, "productId", e.target.value)}
                            className="w-full h-8 rounded border border-input bg-background px-2 text-xs font-medium focus:ring-1 focus:ring-gold"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Kostprijs: {formatCurrency(p.costPrice)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-32 space-y-1">
                          <label className="block text-[10px] text-muted-foreground">Aantal p.p.</label>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={row.quantityPerPerson}
                              onChange={(e) => handleProductRowChange(idx, "quantityPerPerson", parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs text-center font-bold"
                            />
                            <span className="text-[10px] text-muted-foreground">p.p.</span>
                          </div>
                        </div>

                        {params.selectedProducts.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 mt-4 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveProductRow(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick Preset Buttons for Burgers Per Person */}
                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">Quick Preset Burgers p.p.:</span>
                  <div className="flex gap-1.5">
                    {BURGER_QTY_PRESETS.map((qty) => (
                      <Button
                        key={qty}
                        size="sm"
                        variant="secondary"
                        className="h-6 text-[10px] px-2"
                        onClick={() => {
                          if (params.selectedProducts.length > 0) {
                            handleProductRowChange(0, "quantityPerPerson", qty);
                          }
                        }}
                      >
                        {qty} p.p.
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Breakdown: Travel, Setup, Service */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <span className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold" /> Urenopbouw (per Vennoot op locatie)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Reistijd (Heen/Terug)</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={params.travelHours}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, '');
                        setParams({ ...params, travelHours: parseFloat(val) || 0 });
                      }}
                      onBlur={(e) => e.target.value = parseFloat(e.target.value || "0").toString()}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Opbouw + Afbouw</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={params.setupHours}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, '');
                        setParams({ ...params, setupHours: parseFloat(val) || 0 });
                      }}
                      onBlur={(e) => e.target.value = parseFloat(e.target.value || "0").toString()}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Bakken & Serveren</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={params.serviceHours}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, '');
                        setParams({ ...params, serviceHours: parseFloat(val) || 0 });
                      }}
                      onBlur={(e) => e.target.value = parseFloat(e.target.value || "0").toString()}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Logistics & Fixed Costs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Fuel className="h-3.5 w-3.5 text-gold" /> Kilometers (Totaal)
                  </label>
                  <Input
                    type="number"
                    value={params.distanceKm}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setParams({ ...params, distanceKm: parseFloat(val) || 0 });
                    }}
                    onBlur={(e) => e.target.value = parseFloat(e.target.value || "0").toString()}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Km-vergoeding (€/km)</label>
                  <Input
                    type="number"
                    step="0.05"
                    value={params.costPerKm}
                    onChange={(e) => setParams({ ...params, costPerKm: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-gold" /> Fixed / Gas & Stroom
                  </label>
                  <Input
                    type="number"
                    value={params.fixedCosts}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setParams({ ...params, fixedCosts: parseFloat(val) || 0 });
                    }}
                    onBlur={(e) => e.target.value = parseFloat(e.target.value || "0").toString()}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Target Event Margin & Hourly Rate Calculation Block */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-gold" /> Prijsbepaling & Rendement
                  </label>
                  <div className="flex bg-muted/50 p-1 rounded-md">
                    <button
                      type="button"
                      className={`px-3 py-1 text-[10px] font-bold rounded ${params.calculationMode !== "price" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setParams({ ...params, calculationMode: "margin" })}
                    >
                      Via Marge/Uurloon
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-[10px] font-bold rounded ${params.calculationMode === "price" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setParams({ ...params, calculationMode: "price" })}
                    >
                      Via Vaste Prijs p.p.
                    </button>
                  </div>
                </div>

                {params.calculationMode === "price" ? (
                  <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-400">Doel: Vaste Prijs per Persoon</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">€</span>
                      <Input
                        type="number"
                        className="h-10 text-base font-bold max-w-[120px]"
                        value={params.targetPricePerPerson || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+(?=\d)/, '');
                          setParams({ ...params, targetPricePerPerson: parseFloat(val) || 0 });
                        }}
                      />
                      <span className="text-xs text-muted-foreground">per persoon (excl. BTW)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      De calculator toont aan de rechterkant welke VOF-winst en winstmarge er bij deze vaste prijs overblijven.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Option 1: Reverse Calculation by Desired Hourly Wage */}
                <div className="rounded-lg border border-gold/40 bg-gold/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Optie 1: Gewenst Uurloon (€/uur per vennoot)
                    </span>
                    <span className="text-[10px] text-muted-foreground">Omgekeerd berekenen</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {[30, 40, 50, 60, 75].map((rate) => {
                      const isActive = result && Math.abs(result.hourlyEarningsPerPartner - rate) < 1.2;
                      return (
                        <Button
                          key={rate}
                          type="button"
                          size="sm"
                          variant={isActive ? "default" : "secondary"}
                          className={`h-8 text-xs ${isActive ? "bg-gold text-background font-bold" : ""}`}
                          onClick={() => {
                            setTargetHourlyRateInput(rate.toString());
                            handleTargetHourlyRateChange(rate);
                          }}
                        >
                          € {rate}/uur
                        </Button>
                      );
                    })}

                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder="Vrij €/u"
                        className="h-8 text-xs w-20 px-2 border-gold/40 focus-visible:ring-gold"
                        value={targetHourlyRateInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+(?=\d)/, '');
                          setTargetHourlyRateInput(val);
                          handleTargetHourlyRateChange(parseFloat(val) || 0);
                        }}
                      />
                      <span className="text-[10px] font-bold text-gold">€/u</span>
                    </div>
                  </div>
                </div>

                {/* Option 2: Target Event Margin Presets */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Optie 2: Winstmarge Preset (% op pakketprijs)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {EVENT_MARGIN_PRESETS.map((margin) => (
                      <Button
                        key={margin}
                        type="button"
                        size="sm"
                        variant={params.targetEventMargin === margin ? "default" : "secondary"}
                        className={`h-8 text-xs ${params.targetEventMargin === margin ? "bg-gold text-background font-bold" : ""}`}
                        onClick={() => {
                          setTargetHourlyRateInput("");
                          setParams({ ...params, targetEventMargin: margin });
                        }}
                      >
                        {margin}% Marge
                      </Button>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="h-8 text-xs w-16 px-2 border-gold/30 focus-visible:ring-gold"
                        value={params.targetEventMargin === 0 ? "" : params.targetEventMargin}
                        onChange={(e) => {
                          setTargetHourlyRateInput("");
                          const val = e.target.value.replace(/^0+(?=\d)/, '');
                          setParams({ ...params, targetEventMargin: parseFloat(val) || 0 });
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
                </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: VOF Profit & Price Breakdown */}
        {result && (
          <div className="space-y-6">
            {/* Prominent VOF Hourly Earnings Highlight */}
            <Card className="border-gold/40 bg-gradient-to-b from-card to-gold/5 shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gold uppercase tracking-wider">VOF Vennoten Resultaat</span>
                  <Badge tone={result.isFeasibleForVof ? "success" : "warning"}>
                    {result.isFeasibleForVof ? "Rendabel" : "Let Op"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border bg-background/80 p-4 text-center">
                  <span className="block text-xs font-medium text-muted-foreground">Uurverdienste per Vennoot</span>
                  <span className="text-4xl font-extrabold text-gold tracking-tight mt-1 block">
                    {formatCurrency(result.hourlyEarningsPerPartner)} / uur
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Gebaseerd op {result.totalEventHoursElapsed} uur inzet per vennoot (totaal {result.totalPartnerHoursCombined} man-uren)
                  </span>
                </div>

                {/* Feasibility Reason Banner */}
                <div
                  className={`flex items-start gap-3 rounded-lg border p-3 text-xs ${
                    result.isFeasibleForVof
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : "bg-amber-950/20 border-amber-500/30 text-amber-300"
                  }`}
                >
                  {result.isFeasibleForVof ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  )}
                  <p>{result.feasibilityReason}</p>
                </div>

                {/* VOF Profit Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg border bg-card/60 p-3">
                    <span className="block text-[11px] text-muted-foreground">Winst per Vennoot (50/50)</span>
                    <span className="text-xl font-bold text-foreground">{formatCurrency(result.profitPerPartner)}</span>
                  </div>
                  <div className="rounded-lg border bg-card/60 p-3">
                    <span className="block text-[11px] text-muted-foreground">Totale VOF Event Winst</span>
                    <span className="text-xl font-bold text-emerald-400">{formatCurrency(result.totalVofProfit)}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Advies Offerteprijzen:</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Totale Pakketprijs Offerte:</span>
                    <span className="text-base font-bold text-foreground">{formatCurrency(result.advisedPackagePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Prijs per Persoon / Gast:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(result.pricePerPerson)}</span>
                  </div>
                </div>

                {/* Action Buttons for Customer Quote & Saving Event */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant={copiedQuote ? "default" : "secondary"}
                    className="h-9 text-[11px] font-semibold px-2"
                    onClick={handleCopyCustomerQuote}
                  >
                    {copiedQuote ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" /> Gekopieerd
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-1 h-3.5 w-3.5 text-gold" /> WhatsApp
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 text-[11px] font-semibold px-2"
                    onClick={() => setPdfModalOpen(true)}
                  >
                    <Printer className="mr-1 h-3.5 w-3.5 text-gold" /> Offerte PDF
                  </Button>

                  <Button
                    size="sm"
                    className="h-9 text-[11px] font-semibold bg-gold text-background hover:bg-gold/90 px-2"
                    onClick={handleOpenSaveModal}
                  >
                    <BookmarkPlus className="mr-1 h-3.5 w-3.5" /> Event Opslaan
                  </Button>
                </div>

                {/* Direct Costs Breakdown */}
                <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5 text-muted-foreground">
                  <div className="font-semibold text-foreground mb-1">Directe Kostprijs Opbouw:</div>
                  <div className="flex justify-between">
                    <span>Ingrediënten ({totalBurgersToBake} burgers voor {result.peopleCount} gasten):</span>
                    <span>{formatCurrency(result.totalFoodCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kilometers ({params.distanceKm} km @ €{params.costPerKm}):</span>
                    <span>{formatCurrency(result.totalKmCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vaste Kosten (Gas/Stroom/Afschrijving):</span>
                    <span>{formatCurrency(params.fixedCosts)}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-semibold text-foreground">
                    <span>Totale Directe Kosten:</span>
                    <span>{formatCurrency(result.totalDirectCosts)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Supplier Procurement & Order List Section */}
      <Card className="border-gold/30">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-gold" /> 📋 Inkoop & Bestellijst voor Leveranciers
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatisch berekend op basis van {params.peopleCount} gasten en {totalBurgersToBake} te bakken burgers (afgerond naar hele verpakkingen).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={useCheapestSuppliers ? "default" : "secondary"}
                onClick={() => setUseCheapestSuppliers(!useCheapestSuppliers)}
                className={`h-8 text-xs font-bold ${
                  useCheapestSuppliers
                    ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                    : "border-gold/40 text-gold hover:bg-gold/10"
                }`}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {useCheapestSuppliers ? "🌟 Voordeligste Opties Actief" : "👑 Gebruik Voordeligste Opties"}
              </Button>
              <Badge tone="success">{orderGroups.length} Leverancier(s)</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {orderGroups.map((group) => (
              <div key={group.supplierId} className="rounded-xl border bg-card/80 p-4 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b pb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{group.supplierName}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {group.contactEmail} • {group.contactPhone}
                      </p>
                    </div>
                    <Badge tone="neutral" className="text-[11px]">
                      {group.items.length} artikel(en)
                    </Badge>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2 text-xs">
                    {group.items.map((item) => (
                      <div key={item.ingredientId} className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{item.ingredientName}</span>
                            {item.productUrl && (
                              <a
                                href={item.productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-gold hover:underline font-bold"
                              >
                                <ExternalLink className="h-3 w-3 text-gold" /> Webshop
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            Nodig: {item.totalBaseUnitsNeeded.toFixed(0)} {item.baseUnit} (Verpakking: {item.packageContent} {item.baseUnit})
                            {item.supplierArticleCode && ` • SKU: ${item.supplierArticleCode}`}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gold block">
                            {item.packagesToOrder}x {item.purchaseUnit}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatCurrency(item.totalEstimatedCost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-muted-foreground">Geschatte inkoop:</span>
                    <span className="font-bold text-sm text-foreground">{formatCurrency(group.totalGroupCost)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={copiedSupplierId === group.supplierId ? "default" : "secondary"}
                    className="h-8 text-xs font-medium"
                    onClick={() => handleCopyOrderList(group)}
                  >
                    {copiedSupplierId === group.supplierId ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Gekopieerd!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3.5 w-3.5 text-gold" /> Bestellijst Kopiëren
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Event & Offerte Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                  <BookmarkPlus className="h-5 w-5 text-gold" /> Event & Offerte Gegevens Opslaan
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vul de klant- en offertegegevens in. Hiermee worden het event én de A4 PDF-offerte in één keer gereed gemaakt!
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSaveModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Klant / Bedrijfsnaam *</label>
                  <Input
                    placeholder="bijv. Rabobank Eindhoven"
                    value={saveClientName}
                    onChange={(e) => setSaveClientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-foreground">T.a.v. Contactpersoon</label>
                  <Input
                    placeholder="bijv. Dhr. J. Jansen"
                    value={saveContactPerson}
                    onChange={(e) => setSaveContactPerson(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Straat + Huisnummer</label>
                  <Input
                    placeholder="bijv. Markt 12"
                    value={saveClientAddress}
                    onChange={(e) => setSaveClientAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Postcode + Plaats / Locatie</label>
                  <Input
                    placeholder="bijv. 5611 AA Eindhoven"
                    value={saveClientCity}
                    onChange={(e) => setSaveClientCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Offertenummer</label>
                  <Input
                    placeholder="OFF-2026-1001"
                    value={saveQuoteNumber}
                    onChange={(e) => setSaveQuoteNumber(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <DatePicker
                      label="Datum Event"
                      value={saveEventDate}
                      onChange={(d) => setSaveEventDate(d)}
                      align="right"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold mb-1 text-foreground">Tijd (bijv. 18:00-20:00)</label>
                    <Input
                      value={saveEventTime}
                      onChange={(e) => setSaveEventTime(e.target.value)}
                      placeholder="18:00-20:00"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Event Omschrijving op Kalender</label>
                <Input
                  placeholder="bijv. Zomerborrel Catering"
                  value={saveEventName}
                  onChange={(e) => setSaveEventName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 border-t pt-4">
              <Button variant="secondary" onClick={() => setSaveModalOpen(false)}>
                Annuleren
              </Button>
              <Button variant="secondary" className="border border-gold/50 text-gold hover:bg-gold/10 font-semibold" onClick={() => handleConfirmSaveEvent(false)}>
                <BookmarkPlus className="mr-1.5 h-4 w-4" /> Event Opslaan
              </Button>
              <Button className="bg-gold text-background font-bold hover:bg-gold/90" onClick={() => handleConfirmSaveEvent(true)}>
                <FileText className="mr-1.5 h-4 w-4" /> Opslaan & Offerte Direct Bekijken
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Printable A4 PDF Offerte Modal */}
      {result && (
        <PrintableQuoteModal
          open={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          params={params}
          result={result}
          products={products}
          defaultClientName={saveClientName}
          defaultContactPerson={saveContactPerson}
          defaultClientAddress={saveClientAddress}
          defaultClientCity={saveClientCity}
          defaultEventDate={saveEventDate}
          defaultQuoteNumber={saveQuoteNumber}
        />
      )}
    </div>
  );
}
