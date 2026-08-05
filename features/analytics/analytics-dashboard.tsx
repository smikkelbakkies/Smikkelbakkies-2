"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from "recharts";
import { Activity, BarChart3, Euro, PieChart, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { ProductWithCost } from "@/types/core";
import { listProducts } from "@/services/recipes.service";

export function AnalyticsDashboard() {
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const prods = await listProducts();
        setProducts(prods);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = products.map((p) => ({
    name: p.name,
    kostprijs: parseFloat(p.costPrice.toFixed(2)),
    marge: parseFloat((p.actualSellingPrice - p.costPrice).toFixed(2)),
    verkoopprijs: parseFloat(p.actualSellingPrice.toFixed(2)),
    grossMarginPercent: parseFloat(p.actualGrossMargin.toFixed(1))
  }));

  const simulationEvents = [
    { gasten: 50, adviesprijs: 650, vofWinst: 380, perVennootPerUur: 38 },
    { gasten: 75, adviesprijs: 940, vofWinst: 560, perVennootPerUur: 46 },
    { gasten: 100, adviesprijs: 1220, vofWinst: 740, perVennootPerUur: 52 },
    { gasten: 150, adviesprijs: 1800, vofWinst: 1100, perVennootPerUur: 68 }
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Sparkles className="h-5 w-5 animate-spin text-gold" />
        <span className="ml-2 text-sm font-medium">Analyses berekenen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top metrics summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Gemiddelde Brutomarge Burgers</span>
              <Badge tone="success">Gezond</Badge>
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">
              {formatPercentage(
                products.reduce((acc, p) => acc + p.actualGrossMargin, 0) / Math.max(products.length, 1)
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Over alle eigen burgers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Laagste Kostprijs Burger</span>
              <Badge tone="neutral">Laagste</Badge>
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">
              {formatCurrency(Math.min(...products.map((p) => p.costPrice)))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Basis ingrediëntenopbouw</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">VOF Uurverdienste Doel</span>
              <Badge tone="neutral">2 Vennoten</Badge>
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-gold">€40,00+ / uur</div>
            <p className="mt-1 text-xs text-muted-foreground">Per vennoot bij 75+ gasten events</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart 1: Cost Price vs Profit Margin breakdown per burger */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gold" /> Kostprijs & Marge Opbouw per Burger
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vergelijking van ingrediëntkosten (Food Cost) vs Brutowinst op de verkoopprijs.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                  formatter={(value: any) => [`€${Number(value).toFixed(2)}`, ""]}
                />
                <Legend />
                <Bar dataKey="kostprijs" name="Food Cost (€)" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
                <Bar dataKey="marge" name="Brutowinst (€)" stackId="a" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Table for Events */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gold" /> Event Rendement Simulatie (2 Vennoten)
          </h3>
          <p className="text-xs text-muted-foreground">
            Verwacht VOF-resultaat op basis van aantal gasten bij 6 uur totale inzet per vennoot.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Aantal Gasten</th>
                  <th className="px-4 py-3 font-medium">Advies Pakketprijs</th>
                  <th className="px-4 py-3 font-medium">Totale VOF Winst</th>
                  <th className="px-4 py-3 font-medium">Winst per Vennoot</th>
                  <th className="px-4 py-3 font-medium">Verdiend per Vennoot / Uur</th>
                </tr>
              </thead>
              <tbody>
                {simulationEvents.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.gasten} personen</td>
                    <td className="px-4 py-3">{formatCurrency(row.adviesprijs)}</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">{formatCurrency(row.vofWinst)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(row.vofWinst / 2)}</td>
                    <td className="px-4 py-3 text-gold font-bold">{formatCurrency(row.perVennootPerUur)} / uur</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
