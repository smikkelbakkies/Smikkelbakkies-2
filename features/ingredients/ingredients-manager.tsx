"use client";

import { CheckCircle2, Edit3, Filter, Plus, RefreshCw, Scale, Search, Sparkles, Trash2, Tag, ArrowRight, Building2, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { calculateUnitPrice, formatCurrency, formatDate } from "@/lib/utils";
import { deleteIngredientFromDb, hasDuplicateIngredientName, listIngredients, saveIngredientToDb, syncIngredientPricesByArticleCode } from "@/services/ingredients.service";
import { listSuppliers } from "@/services/suppliers.service";
import type { Ingredient, IngredientCategory, Supplier, BaseUnit, SupplierPriceOption } from "@/types/core";

const baseUnits: BaseUnit[] = ["stuk", "gram", "kg", "ml", "liter", "portie"];

type IngredientForm = Omit<Ingredient, "pricePerBaseUnit" | "createdAt" | "updatedAt" | "deletedAt" | "lastPriceUpdate">;

export function IngredientsManager({ initialIngredients, categories, suppliers }: { initialIngredients: Ingredient[]; categories: IngredientCategory[]; suppliers: Supplier[] }) {
  const [items, setItems] = useState(initialIngredients);
  const [supplierList, setSupplierList] = useState<Supplier[]>(suppliers);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Live Sync & Supplier Comparison Modal
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  const { notify } = useToast();

  const loadData = async () => {
    try {
      const [ingData, supData] = await Promise.all([listIngredients(), listSuppliers()]);
      if (ingData && ingData.length > 0) {
        setItems(ingData);
      }
      if (supData && supData.length > 0) {
        setSupplierList(supData);
      }
    } catch (e) {
      console.error("Fout bij laden ingredienten en leveranciers op client:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((item) => item.deletedAt === null)
      .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) || (item.supplierArticleCode || "").toLowerCase().includes(query.toLowerCase()))
      .filter((item) => categoryFilter === "all" || item.categoryId === categoryFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, query, categoryFilter]);

  const openCreate = () => {
    loadData();
    setEditing(null);
    setError("");
    setFormOpen(true);
  };

  const handlePriceSync = async () => {
    setSyncing(true);
    try {
      const { updatedItems, syncLogs: logs } = await syncIngredientPricesByArticleCode(items, supplierList);
      setItems(updatedItems);
      setSyncLogs(logs);
      setSyncModalOpen(true);
      notify({
        title: "Live Prijs-Sync Voltooid!",
        description: `Prijzen via artikelcodes gecontroleerd bij groothandel.`
      });
    } catch {
      notify({ title: "Fout bij prijs-sync" });
    } finally {
      setSyncing(false);
    }
  };

  const setPrimarySupplier = async (ingredient: Ingredient, supplierId: string, purchasePrice: number) => {
    const updated: Ingredient = {
      ...ingredient,
      primarySupplierId: supplierId,
      purchasePrice,
      pricePerBaseUnit: calculateUnitPrice(purchasePrice, ingredient.packageContent),
      updatedAt: new Date().toISOString()
    };
    await saveIngredientToDb(updated);
    notify({ title: `Primaire leverancier gewijzigd naar ${supplierList.find(s => s.id === supplierId)?.name || "Geselecteerd"}` });
    await loadData();
  };

  const saveIngredient = async (form: IngredientForm) => {
    if (hasDuplicateIngredientName(items, form.name, editing?.id)) {
      setError("Er bestaat al een ingrediënt met deze naam.");
      return;
    }

    const timestamp = new Date().toISOString();
    const next: Ingredient = {
      ...form,
      pricePerBaseUnit: calculateUnitPrice(form.purchasePrice, form.packageContent),
      lastPriceUpdate: timestamp,
      createdAt: editing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      deletedAt: null
    };

    const saved = await saveIngredientToDb(next);
    setItems((current) => editing ? current.map((item) => item.id === editing.id ? saved : item) : [saved, ...current]);
    setFormOpen(false);
    notify({ title: editing ? "Ingrediënt bijgewerkt in Database" : "Ingrediënt opgeslagen in Database" });
    await loadData();
  };

  const removeIngredient = async (ingredient: Ingredient) => {
    if (!window.confirm(`Ingrediënt "${ingredient.name}" verwijderen?`)) return;
    await deleteIngredientFromDb(ingredient.id);
    setItems((current) => current.map((item) => item.id === ingredient.id ? { ...item, deletedAt: new Date().toISOString(), isActive: false } : item));
    notify({ title: "Ingrediënt verwijderd uit Database" });
    await loadData();
  };

  return (
    <>
      {/* Search & Action Header */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 text-xs"
              placeholder="Zoek op ingrediënt of groothandel artikelcode..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select className="text-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Alle Categorieën</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePriceSync} disabled={syncing} className="h-9 text-xs font-semibold border border-gold/40 text-gold hover:bg-gold/10">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 text-gold ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Prijzen ophalen..." : "Live Prijs-Sync & Vergelijken"}
          </Button>

          <Button size="sm" onClick={openCreate} className="h-9 bg-gold text-background font-bold text-xs hover:bg-gold/90">
            <Plus className="mr-1.5 h-4 w-4" /> Ingrediënt Toevoegen
          </Button>
        </div>
      </div>

      {/* Main Ingredients Table */}
      <Card className="border-gold/30 bg-card/60 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Artikelcode</th>
                  <th className="px-4 py-3">Ingrediënt</th>
                  <th className="px-4 py-3">Categorie</th>
                  <th className="px-4 py-3">Primaire Leverancier</th>
                  <th className="px-4 py-3">Inkoopprijs</th>
                  <th className="px-4 py-3">Prijs p/ eenheid</th>
                  <th className="px-4 py-3">Leveranciers Vergelijking</th>
                  <th className="px-4 py-3 text-right">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ingredient) => {
                  const options = ingredient.supplierOptions || [];
                  const cheapestOpt = options.length > 0
                    ? [...options].sort((a, b) => a.pricePerBaseUnit - b.pricePerBaseUnit)[0]
                    : null;
                  const isCheapestPrimary = cheapestOpt ? cheapestOpt.isPrimary : true;

                  return (
                    <tr key={ingredient.id} className="border-t transition hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono text-gold">
                        {ingredient.supplierArticleCode ? (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {ingredient.supplierArticleCode}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{ingredient.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{categories.find((category) => category.id === ingredient.categoryId)?.name ?? "-"}</td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gold" />
                          {supplierList.find((supplier) => supplier.id === ingredient.primarySupplierId)?.name ?? "-"}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3 text-xs font-medium">
                        {formatCurrency(ingredient.purchasePrice)} ({ingredient.packageContent} {ingredient.baseUnit} / {ingredient.purchaseUnit})
                      </td>

                      <td className="px-4 py-3 font-bold text-foreground">
                        {formatCurrency(ingredient.pricePerBaseUnit)}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {cheapestOpt && !isCheapestPrimary ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">
                            🌟 Bespaar €{(ingredient.pricePerBaseUnit - cheapestOpt.pricePerBaseUnit).toFixed(2)} bij {cheapestOpt.supplierName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Voordeligste leverancier gekozen</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { loadData(); setEditing(ingredient); setError(""); setFormOpen(true); }} aria-label="Bewerken">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeIngredient(ingredient)} aria-label="Verwijderen">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for Ingredient Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Ingrediënt Bewerken" : "Nieuw Ingrediënt Opslaan"}>
        <IngredientForm ingredient={editing} categories={categories} suppliers={supplierList} error={error} onSubmit={saveIngredient} />
      </Dialog>

      {/* Live Sync & Multi-Supplier Price Comparison Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border bg-background p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                  <RefreshCw className="h-5 w-5 text-gold" /> Live Prijs-Sync & Leverancier Vergelijking
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Overzicht van gecontroleerde groothandel inkoopprijzen op basis van artikelcodes.
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSyncModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Sync Logs Console */}
            <div className="rounded-lg border bg-black/40 p-4 space-y-1 font-mono text-[11px] max-h-48 overflow-y-auto">
              <div className="text-gold font-bold mb-2">📋 Live Sync Status Rapportage:</div>
              {syncLogs.map((log, idx) => (
                <div key={idx} className="text-zinc-300">
                  {log}
                </div>
              ))}
            </div>

            {/* Multi-Supplier Price Matrix Table */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-gold" /> Vergelijkbare Producten per Leverancier
              </h4>

              <div className="overflow-x-auto rounded-lg border border-border/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b">
                    <tr>
                      <th className="px-3 py-2">Ingrediënt</th>
                      <th className="px-3 py-2">Primaire Leverancier</th>
                      <th className="px-3 py-2">Huidige Inkoopprijs</th>
                      <th className="px-3 py-2">Voordeligste Groothandel</th>
                      <th className="px-3 py-2 text-right">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.filter(i => i.supplierArticleCode).map((ing) => {
                      const options = ing.supplierOptions || [];
                      const cheapest = options.length > 0
                        ? [...options].sort((a, b) => a.pricePerBaseUnit - b.pricePerBaseUnit)[0]
                        : null;

                      const isCheapestPrimary = cheapest ? cheapest.isPrimary : true;

                      return (
                        <tr key={ing.id} className="border-t">
                          <td className="px-3 py-2.5 font-bold text-foreground">
                            {ing.name}
                            <span className="block text-[10px] text-gold font-mono">{ing.supplierArticleCode}</span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {supplierList.find(s => s.id === ing.primarySupplierId)?.name || "Onbekend"}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-foreground">
                            {formatCurrency(ing.purchasePrice)} / {ing.purchaseUnit}
                          </td>
                          <td className="px-3 py-2.5">
                            {cheapest && !isCheapestPrimary ? (
                              <div className="text-emerald-400 font-bold text-[11px]">
                                🌟 {cheapest.supplierName}: {formatCurrency(cheapest.purchasePrice)} ({formatCurrency(cheapest.pricePerBaseUnit)}/{ing.baseUnit})
                              </div>
                            ) : (
                              <div className="text-zinc-400 text-[11px]">
                                ✓ Primaire leverancier is het voordeligst
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {cheapest && !isCheapestPrimary && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 text-[10px] font-bold text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/20"
                                onClick={() => setPrimarySupplier(ing, cheapest.supplierId, cheapest.purchasePrice)}
                              >
                                Switch naar {cheapest.supplierName}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end border-t pt-3">
              <Button className="bg-gold text-background font-bold hover:bg-gold/90 text-xs" onClick={() => setSyncModalOpen(false)}>
                Sluiten
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-xs">
      <span className="font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function IngredientForm({ ingredient, categories, suppliers, error, onSubmit }: { ingredient: Ingredient | null; categories: IngredientCategory[]; suppliers: Supplier[]; error: string; onSubmit: (form: IngredientForm) => void }) {
  const [form, setForm] = useState<IngredientForm>(() => ({
    id: ingredient?.id ?? crypto.randomUUID(),
    name: ingredient?.name ?? "",
    categoryId: ingredient?.categoryId ?? categories[0]?.id ?? "",
    primarySupplierId: ingredient?.primarySupplierId ?? suppliers[0]?.id ?? null,
    supplierArticleCode: ingredient?.supplierArticleCode ?? "",
    baseUnit: ingredient?.baseUnit ?? "stuk",
    purchaseUnit: ingredient?.purchaseUnit ?? "doos",
    packageContent: ingredient?.packageContent ?? 1,
    portionWeight: ingredient?.portionWeight ?? undefined,
    purchasePrice: ingredient?.purchasePrice ?? 0,
    isActive: ingredient?.isActive ?? true
  }));

  const unitPrice = calculateUnitPrice(form.purchasePrice, form.packageContent);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Naam Ingrediënt"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Artikelcode Groothandel (SKU)"><Input placeholder="bijv. HGZ-BR-60" value={form.supplierArticleCode} onChange={(event) => setForm({ ...form, supplierArticleCode: event.target.value })} /></Field>
        <Field label="Categorie">
          <Select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        </Field>
        <Field label="Leverancier">
          <Select value={form.primarySupplierId ?? ""} onChange={(event) => setForm({ ...form, primarySupplierId: event.target.value || null })}>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </Select>
        </Field>
        <Field label="Basiseenheid">
          <Select value={form.baseUnit} onChange={(event) => setForm({ ...form, baseUnit: event.target.value as BaseUnit })}>
            {baseUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </Select>
        </Field>
        {form.baseUnit === "portie" && (
          <Field label="Gewicht per portie (gram/ml)">
            <Input type="number" min="0" step="0.1" placeholder="bijv. 50" value={form.portionWeight || ""} onChange={(event) => setForm({ ...form, portionWeight: event.target.value ? Number(event.target.value) : undefined })} />
          </Field>
        )}
        <Field label="Inkoopeenheid"><Input value={form.purchaseUnit} onChange={(event) => setForm({ ...form, purchaseUnit: event.target.value })} /></Field>
        <Field label="Inhoud verpakking"><Input type="number" min="0.001" step="0.001" value={form.packageContent} onChange={(event) => setForm({ ...form, packageContent: Number(event.target.value) })} /></Field>
        <Field label="Inkoopprijs (€)"><Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: Number(event.target.value) })} /></Field>
        <Field label="Prijs per basiseenheid"><Input readOnly value={formatCurrency(unitPrice)} /></Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit"><Plus className="h-4 w-4" />Opslaan</Button>
      </div>
    </form>
  );
}
