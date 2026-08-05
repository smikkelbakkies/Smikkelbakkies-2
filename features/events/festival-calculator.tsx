"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calculator, CheckCircle2, Clock, DollarSign, Fuel, Gauge, Percent, Store, TrendingUp, Users, Utensils, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { FestivalEventParams, FestivalEventResult, ProductWithCost } from "@/types/core";
import { calculateFestivalEvent } from "@/services/events.service";
import { listProducts } from "@/services/recipes.service";

export function FestivalCalculator() {
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [params, setParams] = useState<FestivalEventParams>({
    eventName: "Foodtruck Festival Eindhoven",
    expectedBurgerSales: 300,
    selectedProductId: "",
    sellingPricePerBurger: 12.50,
    standFeeFixed: 250,
    standFeePercentage: 10,
    travelHours: 1.5,
    setupHours: 2.0,
    serviceHours: 6.0,
    distanceKm: 60,
    costPerKm: 0.35,
    otherFixedCosts: 100,
    partnersCount: 2
  });

  const [result, setResult] = useState<FestivalEventResult | null>(null);

  useEffect(() => {
    async function init() {
      const prods = await listProducts();
      setProducts(prods);
      if (prods.length > 0) {
        setParams((prev) => ({ ...prev, selectedProductId: prods[0].id }));
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (params.selectedProductId) {
      calculateFestivalEvent(params).then(setResult);
    }
  }, [params]);

  const selectedProduct = products.find((p) => p.id === params.selectedProductId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      {/* Left Column: Festival Inputs */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Store className="h-5 w-5 text-gold" /> Festival & Openbare Verkoop Parameters
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bereken de winstgevendheid, break-even verkoop en baksnelheid per vennoot bij vrije verkoop.
                </p>
              </div>
              <Badge tone="neutral">2 Vennoten</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Naam Event / Festival</label>
                <Input
                  value={params.eventName}
                  onChange={(e) => setParams({ ...params, eventName: e.target.value })}
                  className="font-medium text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Utensils className="h-3.5 w-3.5 text-gold" /> Te Verkopen Burger
                </label>
                <select
                  value={params.selectedProductId}
                  onChange={(e) => setParams({ ...params, selectedProductId: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-gold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Kostprijs: {formatCurrency(p.costPrice)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sales & Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Verwachte Verkoop (Aantal Burgers)
                </label>
                <Input
                  type="number"
                  step="10"
                  value={params.expectedBurgerSales}
                  onChange={(e) => setParams({ ...params, expectedBurgerSales: parseInt(e.target.value) || 0 })}
                  className="font-bold text-base h-10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Verkoopprijs per Burger op Festival (€)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">€</span>
                  <Input
                    type="number"
                    step="0.50"
                    value={params.sellingPricePerBurger}
                    onChange={(e) => setParams({ ...params, sellingPricePerBurger: parseFloat(e.target.value) || 0 })}
                    className="pl-7 font-bold text-base h-10"
                  />
                </div>
              </div>
            </div>

            {/* Stand Fee & Afdracht */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Store className="h-3.5 w-3.5 text-gold" /> Vast Standgeld (€)
                </label>
                <Input
                  type="number"
                  value={params.standFeeFixed}
                  onChange={(e) => setParams({ ...params, standFeeFixed: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5 text-gold" /> Omzet Afdracht Percentage (%)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={params.standFeePercentage}
                  onChange={(e) => setParams({ ...params, standFeePercentage: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Hours breakdown */}
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
                    onChange={(e) => setParams({ ...params, travelHours: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Opbouw + Afbouw</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={params.setupHours}
                    onChange={(e) => setParams({ ...params, setupHours: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Bakken & Verkoop</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={params.serviceHours}
                    onChange={(e) => setParams({ ...params, serviceHours: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Fuel className="h-3.5 w-3.5 text-gold" /> Kilometers (Heen + Terug)
                </label>
                <Input
                  type="number"
                  value={params.distanceKm}
                  onChange={(e) => setParams({ ...params, distanceKm: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-gold" /> Overige Vaste Kosten (Gas/Stroom)
                </label>
                <Input
                  type="number"
                  value={params.otherFixedCosts}
                  onChange={(e) => setParams({ ...params, otherFixedCosts: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Festival Results & Break-even */}
      {result && (
        <div className="space-y-6">
          <Card className="border-gold/40 bg-gradient-to-b from-card to-gold/5 shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gold uppercase tracking-wider">Festival Rendement VOF</span>
                <Badge tone={result.isFeasibleForVof ? "success" : "warning"}>
                  {result.isFeasibleForVof ? "Winstgevend" : "Risico"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Uurverdienste Highlight */}
              <div className="rounded-xl border bg-background/80 p-4 text-center">
                <span className="block text-xs font-medium text-muted-foreground">Uurverdienste per Vennoot</span>
                <span className="text-4xl font-extrabold text-gold tracking-tight mt-1 block">
                  {formatCurrency(result.hourlyEarningsPerPartner)} / uur
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Verwachte nettowinst: <strong className="text-emerald-400 font-bold">{formatCurrency(result.totalNetVofProfit)}</strong>
                </span>
              </div>

              {/* Break Even Callout */}
              <div className="rounded-xl border bg-card p-4 space-y-2 text-center border-gold/30">
                <span className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-gold" /> Break-Even Verkooppunt
                </span>
                <div className="text-2xl font-bold text-foreground">
                  {result.breakEvenBurgers} burgers
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Vanaf {result.breakEvenBurgers} verkochte burgers zijn alle vaste kosten, kilometers & festivalafdrachten gedekt.
                </p>
              </div>

              {/* Feasibility Reason */}
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

              {/* VOF Split Grid */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border bg-card/60 p-3">
                  <span className="block text-[11px] text-muted-foreground">Winst per Vennoot (50/50)</span>
                  <span className="text-xl font-bold text-foreground">{formatCurrency(result.profitPerPartner)}</span>
                </div>
                <div className="rounded-lg border bg-card/60 p-3">
                  <span className="block text-[11px] text-muted-foreground">Baksnelheid per Vennoot</span>
                  <span className="text-xl font-bold text-gold">
                    {result.burgersPerHourPerPartner.toFixed(0)} burgers/uur
                  </span>
                </div>
              </div>

              {/* Financial Turnover & Fee Breakdown */}
              <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5 text-muted-foreground">
                <div className="font-semibold text-foreground mb-1">Financiële Festival Opbouw:</div>
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Bruto Omzet ({params.expectedBurgerSales}x @ {formatCurrency(params.sellingPricePerBurger)}):</span>
                  <span>{formatCurrency(result.grossTurnover)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Food Cost / Ingrediënten:</span>
                  <span>- {formatCurrency(result.totalFoodCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Festival Standgeld & Afdracht ({params.standFeePercentage}%):</span>
                  <span>- {formatCurrency(result.totalStandFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kilometers & Vaste Kosten:</span>
                  <span>- {formatCurrency(result.totalKmCost + params.otherFixedCosts)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-bold text-emerald-400 text-sm">
                  <span>Netto VOF Festival Winst:</span>
                  <span>{formatCurrency(result.totalNetVofProfit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
