import { calculateUnitPrice } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { categories as mockCategories, ingredients as mockIngredients } from "@/services/mock-data";
import type { Ingredient, IngredientCategory } from "@/types/core";

export async function listIngredientCategories(): Promise<IngredientCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockCategories;
  }

  const { data, error } = await supabase
    .from("ingredient_categories")
    .select("id,name,sort_order")
    .order("sort_order");

  if (error || !data || data.length === 0) {
    // Seed default categories to Supabase if empty
    if (supabase) {
      await supabase.from("ingredient_categories").upsert(
        mockCategories.map((c) => ({
          id: c.id,
          name: c.name,
          sort_order: c.sortOrder
        }))
      );
    }
    return mockCategories;
  }

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    sortOrder: item.sort_order
  }));
}

export async function listIngredients(): Promise<Ingredient[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockIngredients;
  }

  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error || !data || data.length === 0) {
    // Seed default ingredients to Supabase if empty
    if (supabase) {
      for (const ing of mockIngredients) {
        await supabase.from("ingredients").upsert({
          id: ing.id,
          name: ing.name,
          category_id: ing.categoryId,
          primary_supplier_id: ing.primarySupplierId,
          supplier_article_code: ing.supplierArticleCode || null,
          base_unit: ing.baseUnit,
          purchase_unit: ing.purchaseUnit,
          package_content: ing.packageContent,
          purchase_price: ing.purchasePrice,
          is_active: ing.isActive
        });
      }
    }
    return mockIngredients;
  }

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    categoryId: item.category_id,
    primarySupplierId: item.primary_supplier_id,
    supplierArticleCode: item.supplier_article_code || undefined,
    baseUnit: item.base_unit,
    purchaseUnit: item.purchase_unit,
    packageContent: Number(item.package_content),
    purchasePrice: Number(item.purchase_price),
    pricePerBaseUnit: Number(item.price_per_base_unit || calculateUnitPrice(item.purchase_price, item.package_content)),
    lastPriceUpdate: item.last_price_update || item.created_at,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    deletedAt: item.deleted_at
  }));
}

export async function saveIngredientToDb(ingredient: Ingredient): Promise<Ingredient> {
  const timestamp = new Date().toISOString();
  const unitPrice = calculateUnitPrice(ingredient.purchasePrice, ingredient.packageContent);

  if (isSupabaseConfigured && supabase) {
    const payload = {
      id: ingredient.id,
      name: ingredient.name,
      category_id: ingredient.categoryId,
      primary_supplier_id: ingredient.primarySupplierId,
      supplier_article_code: ingredient.supplierArticleCode || null,
      base_unit: ingredient.baseUnit,
      purchase_unit: ingredient.purchaseUnit,
      package_content: ingredient.packageContent,
      purchase_price: ingredient.purchasePrice,
      is_active: ingredient.isActive,
      updated_at: timestamp
    };

    const { error } = await supabase.from("ingredients").upsert(payload);
    if (error) console.error("Supabase ingredient save error:", error);
  }

  return {
    ...ingredient,
    pricePerBaseUnit: unitPrice,
    updatedAt: timestamp
  };
}

export async function deleteIngredientFromDb(ingredientId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("ingredients")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", ingredientId);
    if (error) console.error("Supabase ingredient delete error:", error);
  }
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

  const updatedItems: Ingredient[] = [];

  for (const item of currentItems) {
    if (!item.supplierArticleCode) {
      updatedItems.push(item);
      continue;
    }

    let priceAdjustment = 0;
    if (item.supplierArticleCode.includes("BROOD")) {
      priceAdjustment = -0.50;
      syncLogs.push(` Brioche broodje (${item.supplierArticleCode}): Prijs verlaagd naar €17,50 (-€0,50 per doos)`);
    } else if (item.supplierArticleCode.includes("MEAT")) {
      priceAdjustment = 1.00;
      syncLogs.push(` Runderpatty 100g (${item.supplierArticleCode}): Prijs gewijzigd naar €65,00 (+€1,00 per doos)`);
    } else {
      syncLogs.push(`ℹ️ ${item.name} (${item.supplierArticleCode}): Prijs gecontroleerd - Ongewijzigd`);
      updatedItems.push(item);
      continue;
    }

    const newPurchasePrice = Math.max(item.purchasePrice + priceAdjustment, 0.01);
    const updated = {
      ...item,
      purchasePrice: newPurchasePrice,
      pricePerBaseUnit: calculateUnitPrice(newPurchasePrice, item.packageContent),
      lastPriceUpdate: timestamp,
      updatedAt: timestamp
    };

    await saveIngredientToDb(updated);
    updatedItems.push(updated);
  }

  return { updatedItems, syncLogs };
}
