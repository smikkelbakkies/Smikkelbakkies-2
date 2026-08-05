import Link from "next/link";
import { Activity, Building2, Calculator, ChefHat, PackageSearch, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { listIngredients } from "@/services/ingredients.service";
import { listProducts } from "@/services/recipes.service";
import { listSuppliers } from "@/services/suppliers.service";

export default async function DashboardPage() {
  const [ingredients, suppliers, products] = await Promise.all([
    listIngredients(),
    listSuppliers(),
    listProducts()
  ]);

  const activeIngredients = ingredients.filter((item) => item.isActive);
  const averageBurgerCost = products.reduce((sum, p) => sum + p.costPrice, 0) / Math.max(products.length, 1);
  const averageMargin = products.reduce((sum, p) => sum + p.actualGrossMargin, 0) / Math.max(products.length, 1);

  return (
    <AppShell>
      <PageHeader
        eyebrow="VOF Smikkelbakkies OS"
        title="Management Dashboard"
        description="Centraal overzicht van de inkoop, burgermarges, event-uurverdienste en leveranciers voor de 2 vennoten."
      />

      {/* Top VOF Metrics */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ChefHat} label="Burgers & Recepten" value={`${products.length} Recepten`} sub="Eigen Smikkelburgers" />
        <MetricCard icon={TrendingUp} label="Gem. Burgermarge" value={`${averageMargin.toFixed(1)}%`} sub="Food cost onder controle" />
        <MetricCard icon={Calculator} label="Event Doelverdienste" value="€40,00+" sub="Per vennoot per uur op klussen" />
        <MetricCard icon={PackageSearch} label="Actieve Ingrediënten" value={String(activeIngredients.length)} sub={`${suppliers.length} Leveranciers actief`} />
      </section>

      {/* Main Grid Section */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        {/* Products & Recipes Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-gold" /> Receptuur & Burger Kostprijzen
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Live doorrekening op basis van inkoopprijzen ingrediënten.</p>
              </div>
              <Link href="/recipes">
                <Button size="sm" variant="ghost" className="text-xs text-gold">
                  Beheren <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-3.5 py-2.5 font-medium">Burger</th>
                    <th className="px-3.5 py-2.5 font-medium">Kostprijs</th>
                    <th className="px-3.5 py-2.5 font-medium">Verkoop</th>
                    <th className="px-3.5 py-2.5 font-medium">Brutomarge</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t hover:bg-muted/30">
                      <td className="px-3.5 py-2.5 font-semibold text-foreground">{product.name}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{formatCurrency(product.costPrice)}</td>
                      <td className="px-3.5 py-2.5 font-medium text-foreground">{formatCurrency(product.actualSellingPrice)}</td>
                      <td className="px-3.5 py-2.5">
                        <Badge tone={product.actualGrossMargin >= 70 ? "success" : "neutral"}>
                          {product.actualGrossMargin.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links & VOF Focus */}
        <Card className="border-gold/30 bg-card/70">
          <CardHeader>
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-gold" /> VOF Event Calculator Highlights
            </h3>
            <p className="text-xs text-muted-foreground">Direct inzicht wat een event oplevert voor 2 vennoten.</p>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="rounded-lg border bg-background/50 p-3 space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Reistijd, Opbouw & Afbouw inbegrepen</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Bereken automatisch de km-vergoeding, gas/stroom fixed costs en netto uurverdienste per vennoot.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link href="/events" className="w-full">
                <Button size="sm" className="w-full bg-gold text-background font-semibold hover:bg-gold/90 text-xs">
                  <Calculator className="mr-1.5 h-3.5 w-3.5" /> Event Berekenen
                </Button>
              </Link>
              <Link href="/analytics" className="w-full">
                <Button size="sm" variant="secondary" className="w-full text-xs">
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Analyses Bekijken
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <Icon className="h-5 w-5" />
          </span>
          <Badge tone="neutral">Live</Badge>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
