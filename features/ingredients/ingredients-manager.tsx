"use client";

import { CheckCircle2, Edit3, Filter, Plus, RefreshCw, Scale, Search, Sparkles, Trash2, Tag, ArrowRight, Building2, Check, ExternalLink, X } from "lucide-react";
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
                        {ingredient.supplierArticleCode && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {ingredient.supplierArticleCode}
                          </span>
                        )}
                        {ingredient.productUrl && (
                          <a
                            href={ingredient.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-gold hover:underline font-semibold mt-0.5"
                          >
                            <ExternalLink className="h-3 w-3 text-gold" /> Webshop Link
                          </a>
                        )}
                        {!ingredient.supplierArticleCode && !ingredient.productUrl && (
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
    productUrl: ingredient?.productUrl ?? "",
    baseUnit: ingredient?.baseUnit ?? "stuk",
    purchaseUnit: ingredient?.purchaseUnit ?? "doos",
    packageContent: ingredient?.packageContent ?? 1,
    portionWeight: ingredient?.portionWeight ?? undefined,
    purchasePrice: ingredient?.purchasePrice ?? 0,
    supplierOptions: ingredient?.supplierOptions ?? [],
    isActive: ingredient?.isActive ?? true
  }));

  // New Supplier Option Form State
  const [newSupId, setNewSupId] = useState<string>(suppliers[0]?.id || "");
  const [newSku, setNewSku] = useState<string>("");
  const [newUrl, setNewUrl] = useState<string>("");
  const [newUnit, setNewUnit] = useState<string>("doos");
  const [newContent, setNewContent] = useState<number>(1);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [showAddOption, setShowAddOption] = useState<boolean>(false);

  const unitPrice = calculateUnitPrice(form.purchasePrice, form.packageContent);

  let portionPriceInfo = "";
  if (form.portionWeight && form.baseUnit !== "stuk" && form.baseUnit !== "portie") {
    let multiplier = form.portionWeight;
    if (form.baseUnit === "kg" || form.baseUnit === "liter") multiplier = form.portionWeight / 1000;
    const pPrice = unitPrice * multiplier;
    portionPriceInfo = `(€ ${pPrice.toFixed(2)} / portie)`;
  }

  const handleAddSupplierOption = () => {
    if (!newSupId || newPrice <= 0 || newContent <= 0) return;
    const supObj = suppliers.find((s) => s.id === newSupId);
    const calculatedPerUnit = calculateUnitPrice(newPrice, newContent);

    const newOption: SupplierPriceOption = {
      supplierId: newSupId,
      supplierName: supObj?.name || "Onbekend",
      supplierArticleCode: newSku.trim() || undefined,
      productUrl: newUrl.trim() || undefined,
      purchaseUnit: newUnit.trim() || "doos",
      packageContent: newContent,
      purchasePrice: newPrice,
      pricePerBaseUnit: calculatedPerUnit,
      isPrimary: false,
      lastUpdated: new Date().toISOString()
    };

    const updatedOptions = [...(form.supplierOptions || []).filter((o) => o.supplierId !== newSupId), newOption];
    setForm({ ...form, supplierOptions: updatedOptions });

    // Reset add form
    setNewSku("");
    setNewUrl("");
    setNewPrice(0);
    setShowAddOption(false);
  };

  const handleMakePrimaryOption = (opt: SupplierPriceOption) => {
    const calculatedPerUnit = calculateUnitPrice(opt.purchasePrice, opt.packageContent);
    setForm({
      ...form,
      primarySupplierId: opt.supplierId,
      supplierArticleCode: opt.supplierArticleCode || "",
      productUrl: opt.productUrl || "",
      purchaseUnit: opt.purchaseUnit,
      packageContent: opt.packageContent,
      purchasePrice: opt.purchasePrice
    });
  };

  const handleRemoveOption = (supplierId: string) => {
    const updatedOptions = (form.supplierOptions || []).filter((o) => o.supplierId !== supplierId);
    setForm({ ...form, supplierOptions: updatedOptions });
  };

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();

        // Build composite supplierOptions including the primary supplier
        const primarySupObj = suppliers.find((s) => s.id === form.primarySupplierId);
        const primaryOpt: SupplierPriceOption = {
          supplierId: form.primarySupplierId || "unassigned",
          supplierName: primarySupObj?.name || "Primaire Leverancier",
          supplierArticleCode: form.supplierArticleCode,
          productUrl: form.productUrl,
          purchaseUnit: form.purchaseUnit,
          packageContent: form.packageContent,
          purchasePrice: form.purchasePrice,
          pricePerBaseUnit: unitPrice,
          isPrimary: true,
          lastUpdated: new Date().toISOString()
        };

        const otherOptions = (form.supplierOptions || [])
          .filter((o) => o.supplierId !== form.primarySupplierId)
          .map((o) => ({ ...o, isPrimary: false }));

        const finalForm: IngredientForm = {
          ...form,
          supplierOptions: [primaryOpt, ...otherOptions]
        };

        onSubmit(finalForm);
      }}
    >
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      
      {/* Primary Supplier Section */}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <h4 className="font-bold text-xs text-gold flex items-center gap-1.5 uppercase tracking-wider">
          <Building2 className="h-4 w-4" /> Primaire Leverancier & Inkoopprijs
        </h4>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Naam Ingrediënt"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Primaire Leverancier">
            <Select value={form.primarySupplierId ?? ""} onChange={(event) => setForm({ ...form, primarySupplierId: event.target.value || null })}>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </Select>
          </Field>
          <Field label="Artikelcode Groothandel (SKU)"><Input placeholder="bijv. HGZ-BR-60" value={form.supplierArticleCode} onChange={(event) => setForm({ ...form, supplierArticleCode: event.target.value })} /></Field>
          <Field label="Directe Webshop Link (Product URL)">
            <Input
              type="url"
              placeholder="https://www.makro.nl/shop/pv/..."
              value={form.productUrl || ""}
              onChange={(event) => setForm({ ...form, productUrl: event.target.value })}
            />
          </Field>
          <Field label="Categorie">
            <Select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </Field>
          <Field label="Basiseenheid">
            <Select value={form.baseUnit} onChange={(event) => setForm({ ...form, baseUnit: event.target.value as BaseUnit })}>
              {baseUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </Select>
          </Field>
          {form.baseUnit !== "stuk" && (
            <Field label={form.baseUnit === "portie" ? "Gewicht per portie (gram/ml)" : "Optioneel: Portiegrootte (gram/ml)"}>
              <Input type="number" min="0" step="0.1" placeholder="bijv. 50" value={form.portionWeight || ""} onChange={(event) => setForm({ ...form, portionWeight: event.target.value ? Number(event.target.value) : undefined })} />
            </Field>
          )}
          <Field label="Inkoopeenheid"><Input value={form.purchaseUnit} onChange={(event) => setForm({ ...form, purchaseUnit: event.target.value })} /></Field>
          <Field label="Inhoud verpakking"><Input type="number" min="0.001" step="0.001" value={form.packageContent} onChange={(event) => setForm({ ...form, packageContent: Number(event.target.value) })} /></Field>
          <Field label="Inkoopprijs (€)"><Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: Number(event.target.value) })} /></Field>
          <Field label="Prijs per basiseenheid"><Input readOnly className="font-bold text-gold" value={`${formatCurrency(unitPrice)} ${portionPriceInfo}`.trim()} /></Field>
        </div>
      </div>

      {/* Multi-Supplier Price Comparison Section */}
      <div className="space-y-3 rounded-lg border border-gold/30 bg-gold/5 p-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-gold" /> Extra Leveranciers & Prijzen Vergelijken (Makro, Hanos, Sligro, etc.)
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Voeg hetzelfde ingrediënt toe bij andere groothandels om automatisch de voordeligste optie te vinden.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs font-semibold border-gold/40 text-gold hover:bg-gold/10"
            onClick={() => setShowAddOption(!showAddOption)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {showAddOption ? "Sluit Invoer" : "Leverancier Optie Toevoegen"}
          </Button>
        </div>

        {/* Add New Supplier Option Box */}
        {showAddOption && (
          <div className="rounded-lg border bg-card p-3 space-y-3 shadow-sm border-gold/40">
            <span className="font-bold text-xs text-gold block">Nieuwe Groothandel Optie Invoeren:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium mb-1">Leverancier</label>
                <Select value={newSupId} onChange={(e) => setNewSupId(e.target.value)}>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Artikelcode (SKU)</label>
                <Input placeholder="bijv. HNS-9912" value={newSku} onChange={(e) => setNewSku(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Webshop Link (URL)</label>
                <Input placeholder="https://..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Inkoopeenheid</label>
                <Input placeholder="emmer, doos, zak" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Inhoud ({form.baseUnit})</label>
                <Input type="number" step="0.001" value={newContent} onChange={(e) => setNewContent(parseFloat(e.target.value) || 1)} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Inkoopprijs (€)</label>
                <Input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button type="button" size="sm" onClick={handleAddSupplierOption} className="h-8 bg-gold text-background font-bold text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" /> Bewaar Leverancier Optie
              </Button>
            </div>
          </div>
        )}

        {/* Existing Options List */}
        {(form.supplierOptions || []).length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic py-1">
            Nog geen extra leveranciers toegevoegd voor dit ingrediënt. Voeg er een toe om prijzen te vergelijken!
          </p>
        ) : (
          <div className="space-y-2 pt-1">
            {(form.supplierOptions || []).map((opt) => {
              const isCurrentPrimary = opt.supplierId === form.primarySupplierId;
              const isCheapest = (form.supplierOptions || []).every((o) => o.pricePerBaseUnit >= opt.pricePerBaseUnit);

              return (
                <div
                  key={opt.supplierId}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 transition ${
                    isCurrentPrimary
                      ? "border-gold bg-gold/10 font-medium"
                      : isCheapest
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "bg-card/50"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-gold" /> {opt.supplierName}
                      </span>
                      {isCurrentPrimary && (
                        <Badge tone="success" className="text-[10px]">👑 Primaire Leverancier</Badge>
                      )}
                      {isCheapest && !isCurrentPrimary && (
                        <Badge tone="success" className="text-[10px] bg-emerald-500/20 text-emerald-400">🌟 Voordeligste Optie!</Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      {formatCurrency(opt.purchasePrice)} per {opt.packageContent} {form.baseUnit} ({opt.purchaseUnit})
                      {opt.supplierArticleCode && ` • SKU: ${opt.supplierArticleCode}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-extrabold text-gold block text-xs">
                        {formatCurrency(opt.pricePerBaseUnit)} / {form.baseUnit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isCurrentPrimary && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[10px] font-bold text-gold border border-gold/40 hover:bg-gold/10"
                          onClick={() => handleMakePrimaryOption(opt)}
                        >
                          👑 Kies als Primair
                        </Button>
                      )}
                      {!isCurrentPrimary && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveOption(opt.supplierId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="submit" className="bg-gold text-background font-bold text-xs hover:bg-gold/90">
          <Plus className="mr-1.5 h-4 w-4" /> Ingrediënt & Prijzen Opslaan
        </Button>
      </div>
    </form>
  );
}
