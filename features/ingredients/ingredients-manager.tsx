"use client";

import { Edit3, Filter, Plus, RefreshCw, Scale, Search, Sparkles, Trash2, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { calculateUnitPrice, formatCurrency, formatDate } from "@/lib/utils";
import { deleteIngredientFromDb, hasDuplicateIngredientName, saveIngredientToDb, syncIngredientPricesByArticleCode } from "@/services/ingredients.service";
import type { Ingredient, IngredientCategory, Supplier, BaseUnit } from "@/types/core";

const baseUnits: BaseUnit[] = ["stuk", "gram", "kg", "ml", "liter", "portie"];

type IngredientForm = Omit<Ingredient, "pricePerBaseUnit" | "createdAt" | "updatedAt" | "deletedAt" | "lastPriceUpdate">;

export function IngredientsManager({ initialIngredients, categories, suppliers }: { initialIngredients: Ingredient[]; categories: IngredientCategory[]; suppliers: Supplier[] }) {
  const [items, setItems] = useState(initialIngredients);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { notify } = useToast();

  const filtered = useMemo(() => {
    return items
      .filter((item) => item.deletedAt === null)
      .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) || (item.supplierArticleCode || "").toLowerCase().includes(query.toLowerCase()))
      .filter((item) => categoryFilter === "all" || item.categoryId === categoryFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, query, categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setError("");
    setFormOpen(true);
  };

  const handlePriceSync = async () => {
    setSyncing(true);
    try {
      const { updatedItems, syncLogs } = await syncIngredientPricesByArticleCode(items);
      setItems(updatedItems);
      notify({
        title: "Live Prijs-Sync Voltooid!",
        description: `Prijzen via artikelcodes gecontroleerd bij groothandel. ${syncLogs.length} artikelen gesynct.`
      });
    } catch {
      notify({ title: "Fout bij prijs-sync" });
    } finally {
      setSyncing(false);
    }
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
  };

  const removeIngredient = async (ingredient: Ingredient) => {
    if (!window.confirm(`Ingrediënt "${ingredient.name}" verwijderen?`)) return;
    await deleteIngredientFromDb(ingredient.id);
    setItems((current) => current.map((item) => item.id === ingredient.id ? { ...item, deletedAt: new Date().toISOString(), isActive: false } : item));
    notify({ title: "Ingrediënt verwijderd uit Database" });
  };

  return (
    <>
      {/* Search & Action Header */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek ingrediënt of artikelcode..." />
          </div>
          <div className="relative md:w-64">
            <Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Select className="pl-9" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">Alle categorieën</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePriceSync} disabled={syncing} className="font-medium text-xs">
            <RefreshCw className={`mr-1.5 h-4 w-4 text-gold ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Prijzen Syncen..." : "Live Prijs-Sync (Artikelcode)"}
          </Button>

          <Button onClick={openCreate} className="bg-gold text-background font-semibold hover:bg-gold/90">
            <Plus className="h-4 w-4 mr-1" /> Ingrediënt Toevoegen
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Artikelcode</th>
                  <th className="px-4 py-3 font-medium">Ingrediënt</th>
                  <th className="px-4 py-3 font-medium">Categorie</th>
                  <th className="px-4 py-3 font-medium">Primaire Leverancier</th>
                  <th className="px-4 py-3 font-medium">Verpakking & Prijs</th>
                  <th className="px-4 py-3 font-medium">Prijs per basis</th>
                  <th className="px-4 py-3 font-medium">Laatste Sync</th>
                  <th className="px-4 py-3 text-right font-medium">Acties</th>
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
                      <td className="px-4 py-3 text-muted-foreground">{suppliers.find((supplier) => supplier.id === ingredient.primarySupplierId)?.name ?? "-"}</td>
                      
                      <td className="px-4 py-3 text-xs">
                        {ingredient.packageContent} {ingredient.baseUnit} / {ingredient.purchaseUnit} ({formatCurrency(ingredient.purchasePrice)})
                      </td>

                      <td className="px-4 py-3 font-bold text-foreground">
                        {formatCurrency(ingredient.pricePerBaseUnit)}
                        {cheapestOpt && !isCheapestPrimary && (
                          <span className="block text-[10px] text-emerald-400 font-medium">
                            Bespaar €{(ingredient.pricePerBaseUnit - cheapestOpt.pricePerBaseUnit).toFixed(2)} bij {cheapestOpt.supplierName}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(ingredient.lastPriceUpdate)}</td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(ingredient); setError(""); setFormOpen(true); }} aria-label="Bewerken">
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

      <Dialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Ingrediënt bewerken" : "Nieuw ingrediënt"} description="Prijs per basiseenheid wordt automatisch berekend.">
        <IngredientForm
          ingredient={editing}
          categories={categories}
          suppliers={suppliers}
          error={error}
          onSubmit={saveIngredient}
        />
      </Dialog>
    </>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
