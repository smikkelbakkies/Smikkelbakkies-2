"use client";

import { useEffect, useState } from "react";
import { ChefHat, Check, Edit2, Plus, RefreshCw, Trash2, X, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { Ingredient, ProductIngredientItem, ProductWithCost } from "@/types/core";
import { listIngredients } from "@/services/ingredients.service";
import { createProduct, deleteProduct, listProducts, updateProduct, updateProductSellingPrice, updateProductTargetMargin } from "@/services/recipes.service";

const MARGIN_PRESETS = [65, 70, 72, 75];

export function RecipesManager() {
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMargin, setFormMargin] = useState<number>(70);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(9.50);
  const [formIngredients, setFormIngredients] = useState<ProductIngredientItem[]>([]);

  const { notify } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, ingData] = await Promise.all([listProducts(), listIngredients()]);
      setProducts(prodData);
      setAllIngredients(ingData);
      const initialPrices: Record<string, string> = {};
      prodData.forEach((p) => {
        initialPrices[p.id] = p.actualSellingPrice.toFixed(2);
      });
      setEditingPrice(initialPrices);
    } catch {
      notify({ title: "Fout bij laden recepten" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewModal = () => {
    setEditingProductId(null);
    setFormName("");
    setFormSku("");
    setFormDescription("");
    setFormMargin(70);
    setFormSellingPrice(9.50);
    setFormIngredients(
      allIngredients.slice(0, 3).map((ing) => ({ ingredientId: ing.id, quantity: 1 }))
    );
    setModalOpen(true);
  };

  const openEditModal = (product: ProductWithCost) => {
    setEditingProductId(product.id);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormDescription(product.description || "");
    setFormMargin(product.targetGrossMargin);
    setFormSellingPrice(product.actualSellingPrice);
    setFormIngredients(product.ingredients.length > 0 ? product.ingredients : []);
    setModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    if (allIngredients.length === 0) return;
    setFormIngredients([...formIngredients, { ingredientId: allIngredients[0].id, quantity: 1 }]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: "ingredientId" | "quantity", value: any) => {
    const updated = [...formIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setFormIngredients(updated);
  };

  const handleSaveModal = async () => {
    if (!formName.trim()) {
      notify({ title: "Vul een naam in voor de burger" });
      return;
    }
    if (formIngredients.length === 0) {
      notify({ title: "Voeg minimaal 1 ingrediënt toe" });
      return;
    }

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, {
          name: formName,
          sku: formSku,
          description: formDescription,
          targetGrossMargin: formMargin,
          actualSellingPrice: formSellingPrice,
          ingredients: formIngredients
        });
        notify({ title: "Burger bijgewerkt!" });
      } else {
        await createProduct({
          name: formName,
          sku: formSku,
          description: formDescription,
          targetGrossMargin: formMargin,
          actualSellingPrice: formSellingPrice,
          ingredients: formIngredients
        });
        notify({ title: "Nieuwe burger toegevoegd!" });
      }
      setModalOpen(false);
      loadData();
    } catch {
      notify({ title: "Fout bij opslaan burger" });
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Weet je zeker dat je deze burger wilt verwijderen?")) return;
    try {
      await deleteProduct(productId);
      notify({ title: "Burger verwijderd" });
      loadData();
    } catch {
      notify({ title: "Fout bij verwijderen" });
    }
  };

  const handleMarginPreset = async (productId: string, margin: number) => {
    try {
      const updated = await updateProductTargetMargin(productId, margin);
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      setEditingPrice((prev) => ({ ...prev, [productId]: updated.advisedSellingPrice.toFixed(2) }));
      notify({ title: `Doelmarge ingesteld op ${margin}%` });
    } catch {
      notify({ title: "Fout bij opslaan marge" });
    }
  };

  const handleSavePrice = async (productId: string) => {
    const val = parseFloat(editingPrice[productId]);
    if (isNaN(val) || val <= 0) {
      notify({ title: "Voer een geldige prijs in" });
      return;
    }
    try {
      const updated = await updateProductSellingPrice(productId, val);
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      notify({ title: "Verkoopprijs bijgewerkt" });
    } catch {
      notify({ title: "Fout bij bijwerken verkoopprijs" });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin text-gold" />
        <span className="ml-2 text-sm font-medium">Recepten laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Burger Recepturen ({products.length})</h2>
          <p className="text-xs text-muted-foreground">Stel je eigen burgers samen en beheer de kostprijzen en doelmarges.</p>
        </div>
        <Button onClick={openNewModal} className="bg-gold text-background font-semibold hover:bg-gold/90 text-xs">
          <Plus className="mr-1.5 h-4 w-4" /> Nieuwe Burger Bouwen
        </Button>
      </div>

      {/* Grid of Burger Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const isGoodMargin = product.actualGrossMargin >= product.targetGrossMargin;

          return (
            <Card key={product.id} className="relative overflow-hidden transition-all hover:border-gold/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{product.description || "Geen omschrijving"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEditModal(product)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Cost Price & Actual Gross Margin */}
                <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-3 text-center">
                  <div>
                    <span className="block text-[11px] font-medium text-muted-foreground">Kostprijs (Food Cost)</span>
                    <span className="text-lg font-bold text-foreground">{formatCurrency(product.costPrice)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-muted-foreground">Werkelijke Brutomarge</span>
                    <span className={`text-lg font-bold ${isGoodMargin ? "text-emerald-400" : "text-amber-400"}`}>
                      {formatPercentage(product.actualGrossMargin)}
                    </span>
                  </div>
                </div>

                {/* Target Margin Presets */}
                <div>
                  <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Doelmarge Preset
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MARGIN_PRESETS.map((m) => (
                      <Button
                        key={m}
                        size="sm"
                        variant={product.targetGrossMargin === m ? "default" : "secondary"}
                        className={`h-8 text-xs ${product.targetGrossMargin === m ? "bg-gold text-background font-semibold" : ""}`}
                        onClick={() => handleMarginPreset(product.id, m)}
                      >
                        {m}%
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Advised vs Actual Selling Price */}
                <div className="space-y-2 rounded-lg border bg-background/50 p-3 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Adviesprijs ({product.targetGrossMargin}% marge):</span>
                    <span className="font-semibold text-foreground">{formatCurrency(product.advisedSellingPrice)}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1">
                      <label className="block text-[10px] text-muted-foreground mb-1">Werkelijke Verkoopprijs</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-muted-foreground">€</span>
                        <Input
                          type="number"
                          step="0.10"
                          value={editingPrice[product.id] ?? ""}
                          onChange={(e) => setEditingPrice({ ...editingPrice, [product.id]: e.target.value })}
                          className="h-8 pl-6 pr-2 text-xs font-medium"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-4 h-8"
                      onClick={() => handleSavePrice(product.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Ingredients & Quantities List */}
                <div>
                  <span className="block text-xs font-medium text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Ingrediënten & Receptuur</span>
                    <span className="text-[10px] text-gold">{product.effectiveIngredients.length} ingrediënten</span>
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {product.effectiveIngredients.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-md p-2 text-xs border bg-card"
                      >
                        <div className="flex items-center gap-2">
                          <ChefHat className="h-3.5 w-3.5 text-gold" />
                          <span className="font-medium text-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>
                            {item.quantity} {item.baseUnit}
                          </span>
                          <span className="font-semibold text-foreground">{formatCurrency(item.totalCost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal for Creating / Editing a Custom Burger */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-gold" />
                  {editingProductId ? "Burger Bewerken" : "Nieuwe Eigen Burger Bouwen"}
                </h3>
                <p className="text-xs text-muted-foreground">Stel de ingrediënten en de verkoopprijs naar wens in.</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Naam Burger</label>
                  <Input
                    placeholder="bijv. Smashburger Deluxe"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">SKU / Code</label>
                  <Input
                    placeholder="bijv. SMK-SMASH-01"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Omschrijving</label>
                <Input
                  placeholder="Korte toelichting van de burger"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Doelmarge (%)</label>
                  <Input
                    type="number"
                    value={formMargin}
                    onChange={(e) => setFormMargin(parseFloat(e.target.value) || 70)}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Verkoopprijs (€)</label>
                  <Input
                    type="number"
                    step="0.10"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Dynamic Ingredients Picker */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Ingrediënten Samenstellen</span>
                  <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={handleAddIngredientRow}>
                    <Plus className="mr-1 h-3 w-3 text-gold" /> Ingrediënt Toevoegen
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formIngredients.map((row, idx) => {
                    const selectedIng = allIngredients.find((i) => i.id === row.ingredientId);
                    return (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                        <select
                          value={row.ingredientId}
                          onChange={(e) => handleIngredientChange(idx, "ingredientId", e.target.value)}
                          className="flex-1 h-8 rounded border border-input bg-background px-2 text-xs font-medium"
                        >
                          {allIngredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({formatCurrency(ing.pricePerBaseUnit)} / {ing.baseUnit})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 w-24">
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={row.quantity}
                            onChange={(e) => handleIngredientChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center"
                          />
                          <span className="text-[10px] text-muted-foreground">{selectedIng?.baseUnit || ""}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveIngredientRow(idx)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Annuleren
              </Button>
              <Button className="bg-gold text-background font-semibold hover:bg-gold/90" onClick={handleSaveModal}>
                Opslaan & Berekenen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
