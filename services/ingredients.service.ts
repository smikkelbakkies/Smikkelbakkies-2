import { calculateUnitPrice } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { categories, ingredients } from "@/services/mock-data";
import type { Ingredient } from "@/types/core";

export async function listIngredientCategories() {
  if (!isSupabaseConfigured || !supabase) {
    return categories;
  }

  const { data, error } = await supabase
    .from("ingredient_categories")
    .select("id,name,sort_order")
    .order("sort_order");

  if (error) throw error;

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    sortOrder: item.sort_order
  }));
}

export async function listIngredients(): Promise<Ingredient[]> {
  if (!isSupabaseConfigured || !supabase) {
    return ingredients;
  }

  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) throw error;

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    categoryId: item.category_id,
    primarySupplierId: item.primary_supplier_id,
    baseUnit: item.base_unit,
    purchaseUnit: item.purchase_unit,
    packageContent: Number(item.package_content),
    purchasePrice: Number(item.purchase_price),
    pricePerBaseUnit: Number(item.price_per_base_unit),
    lastPriceUpdate: item.last_price_update,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    deletedAt: item.deleted_at
  }));
}

export function createIngredientDraft(input: Omit<Ingredient, "id" | "pricePerBaseUnit" | "createdAt" | "updatedAt" | "deletedAt" | "lastPriceUpdate">): Ingredient {
  const timestamp = new Date().toISOString();

  return {
    ...input,
    id: crypto.randomUUID(),
    pricePerBaseUnit: calculateUnitPrice(input.purchasePrice, input.packageContent),
    lastPriceUpdate: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  };
}

export function hasDuplicateIngredientName(items: Ingredient[], name: string, ignoreId?: string) {
  const normalized = name.trim().toLowerCase();
  return items.some((item) => item.id !== ignoreId && item.name.trim().toLowerCase() === normalized);
}

export async function syncIngredientPricesByArticleCode(currentItems: Ingredient[]): Promise<{ updatedItems: Ingredient[]; syncLogs: string[] }> {
  const timestamp = new Date().toISOString();
  const syncLogs: string[] = [];

  const updatedItems = currentItems.map((item) => {
    if (!item.supplierArticleCode) return item;

    // Simulate price check against wholesaler catalog by article code SKU
    let priceAdjustment = 0;
    if (item.supplierArticleCode.includes("BROOD")) {
      priceAdjustment = -0.50; // Discounted from €18.00 to €17.50
      syncLogs.push(` Brioche broodje (${item.supplierArticleCode}): Prijs verlaagd naar €17,50 (-€0,50 per doos)`);
    } else if (item.supplierArticleCode.includes("MEAT")) {
      priceAdjustment = 1.00; // Increased by €1.00 from €64.00 to €65.00
      syncLogs.push(` Runderpatty 100g (${item.supplierArticleCode}): Prijs gewijzigd naar €65,00 (+€1,00 per doos)`);
    } else {
      syncLogs.push(`ℹ️ ${item.name} (${item.supplierArticleCode}): Prijs gecontroleerd - Ongewijzigd`);
      return item;
    }

    const newPurchasePrice = Math.max(item.purchasePrice + priceAdjustment, 0.01);
    const newPricePerBaseUnit = calculateUnitPrice(newPurchasePrice, item.packageContent);

    return {
      ...item,
      purchasePrice: newPurchasePrice,
      pricePerBaseUnit: newPricePerBaseUnit,
      lastPriceUpdate: timestamp,
      updatedAt: timestamp
    };
  });

  return { updatedItems, syncLogs };
}

