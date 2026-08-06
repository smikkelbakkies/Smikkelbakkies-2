import { calculateUnitPrice, ensureValidUuid, isValidUuid } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { categories as mockCategories, ingredients as mockIngredients } from "@/services/mock-data";
import type { Ingredient, IngredientCategory } from "@/types/core";

function getLocalStorageIngredients(): Ingredient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("smikkel_ingredients");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalStorageIngredients(items: Ingredient[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("smikkel_ingredients", JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function listIngredientCategories(): Promise<IngredientCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockCategories;
  }

  const { data, error } = await supabase
    .from("ingredient_categories")
    .select("id,name,sort_order")
    .order("sort_order");

  if (error || !data || data.length === 0) {
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
  const localItems = getLocalStorageIngredients();
  const localItemsMap = new Map<string, Ingredient>();
  localItems.forEach((i) => localItemsMap.set(i.id, i));

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .is("deleted_at", null)
      .order("name");

    if (!error && data) {
      const parsed: Ingredient[] = data.map((item) => {
        const local = localItemsMap.get(item.id);
        const articleCode = item.supplier_article_code || local?.supplierArticleCode || undefined;

        return {
          id: item.id,
          name: item.name,
          categoryId: item.category_id,
          primarySupplierId: item.primary_supplier_id,
          supplierArticleCode: articleCode,
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
        };
      });

      setLocalStorageIngredients(parsed);
      return parsed;
    }
  }

  if (localItems.length > 0) {
    return localItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  return mockIngredients;
}

export async function saveIngredientToDb(ingredient: Ingredient): Promise<Ingredient> {
  const timestamp = new Date().toISOString();
  const unitPrice = calculateUnitPrice(ingredient.purchasePrice, ingredient.packageContent);

  const sanitizedId = ensureValidUuid(ingredient.id);
  const sanitizedCategoryId = ensureValidUuid(ingredient.categoryId);
  const sanitizedSupplierId = ingredient.primarySupplierId && isValidUuid(ingredient.primarySupplierId)
    ? ingredient.primarySupplierId
    : null;

  const sanitizedIngredient: Ingredient = {
    ...ingredient,
    id: sanitizedId,
    categoryId: sanitizedCategoryId,
    primarySupplierId: sanitizedSupplierId,
    supplierArticleCode: ingredient.supplierArticleCode?.trim() || undefined,
    pricePerBaseUnit: unitPrice,
    updatedAt: timestamp
  };

  // LocalStorage persistence (always retain supplierArticleCode)
  const currentLocal = getLocalStorageIngredients();
  const index = currentLocal.findIndex((i) => i.id === sanitizedIngredient.id);
  let updatedLocal: Ingredient[];
  if (index !== -1) {
    updatedLocal = [...currentLocal];
    updatedLocal[index] = sanitizedIngredient;
  } else {
    updatedLocal = [sanitizedIngredient, ...currentLocal];
  }
  setLocalStorageIngredients(updatedLocal);

  // Supabase persistence
  if (isSupabaseConfigured && supabase) {
    const fullPayload: any = {
      id: sanitizedIngredient.id,
      name: sanitizedIngredient.name,
      category_id: sanitizedIngredient.categoryId,
      primary_supplier_id: sanitizedIngredient.primarySupplierId,
      supplier_article_code: sanitizedIngredient.supplierArticleCode || null,
      base_unit: sanitizedIngredient.baseUnit,
      purchase_unit: sanitizedIngredient.purchaseUnit,
      package_content: sanitizedIngredient.packageContent,
      purchase_price: sanitizedIngredient.purchasePrice,
      is_active: sanitizedIngredient.isActive,
      updated_at: timestamp
    };

    let { error } = await supabase.from("ingredients").upsert(fullPayload);

    if (error) {
      delete fullPayload.supplier_article_code;
      const fallbackResult = await supabase.from("ingredients").upsert(fullPayload);
      if (fallbackResult.error) {
        console.error("Supabase ingredient save fallback error:", fallbackResult.error);
      }
    }
  }

  return sanitizedIngredient;
}

export async function deleteIngredientFromDb(ingredientId: string): Promise<void> {
  // LocalStorage persistence
  const currentLocal = getLocalStorageIngredients();
  const filtered = currentLocal.filter((i) => i.id !== ingredientId);
  setLocalStorageIngredients(filtered);

  // Supabase persistence
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

  // Extract all article codes from items and supplierOptions
  const articleCodes: string[] = [];
  currentItems.forEach((item) => {
    if (item.supplierArticleCode) articleCodes.push(item.supplierArticleCode);
    if (item.supplierOptions) {
      item.supplierOptions.forEach((opt) => {
        if (opt.supplierArticleCode) articleCodes.push(opt.supplierArticleCode);
      });
    }
  });

  // Call serverless API endpoint
  let apiResults: any[] = [];
  try {
    const res = await fetch("/api/sync-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleCodes })
    });
    const json = await res.json();
    if (json.success && json.results) {
      apiResults = json.results;
    }
  } catch (e) {
    console.error("Fout bij aanroepen /api/sync-prices:", e);
  }

  const priceMap = new Map<string, number>();
  apiResults.forEach((r) => {
    if (r.status === "updated") {
      priceMap.set(r.articleCode, r.newPurchasePrice);
    }
  });

  const updatedItems: Ingredient[] = [];

  for (const item of currentItems) {
    let hasChanges = false;
    let newPrice = item.purchasePrice;

    if (item.supplierArticleCode && priceMap.has(item.supplierArticleCode)) {
      const fetchedPrice = priceMap.get(item.supplierArticleCode)!;
      if (fetchedPrice !== item.purchasePrice) {
        hasChanges = true;
        const diff = fetchedPrice - item.purchasePrice;
        syncLogs.push(` ${item.name} (${item.supplierArticleCode}): Prijs ${diff < 0 ? "verlaagd" : "gewijzigd"} van €${item.purchasePrice.toFixed(2)} naar €${fetchedPrice.toFixed(2)} / ${item.purchaseUnit}`);
        newPrice = fetchedPrice;
      } else {
        syncLogs.push(`ℹ️ ${item.name} (${item.supplierArticleCode}): Prijs gecontroleerd bij groothandel - Ongewijzigd (€${item.purchasePrice.toFixed(2)})`);
      }
    } else if (item.supplierArticleCode) {
      syncLogs.push(`ℹ️ ${item.name} (${item.supplierArticleCode}): Prijs gecontroleerd - Up-to-date (€${item.purchasePrice.toFixed(2)})`);
    }

    // Update supplierOptions array if present or build standard comparison options
    const updatedOptions = (item.supplierOptions || []).map((opt) => {
      if (opt.supplierArticleCode && priceMap.has(opt.supplierArticleCode)) {
        const p = priceMap.get(opt.supplierArticleCode)!;
        return {
          ...opt,
          purchasePrice: p,
          pricePerBaseUnit: calculateUnitPrice(p, opt.packageContent || item.packageContent),
          lastUpdated: timestamp
        };
      }
      return opt;
    });

    const updated: Ingredient = {
      ...item,
      purchasePrice: newPrice,
      pricePerBaseUnit: calculateUnitPrice(newPrice, item.packageContent),
      supplierOptions: updatedOptions.length > 0 ? updatedOptions : item.supplierOptions,
      lastPriceUpdate: hasChanges ? timestamp : item.lastPriceUpdate,
      updatedAt: hasChanges ? timestamp : item.updatedAt
    };

    if (hasChanges) {
      await saveIngredientToDb(updated);
    }
    updatedItems.push(updated);
  }

  return { updatedItems, syncLogs };
}
