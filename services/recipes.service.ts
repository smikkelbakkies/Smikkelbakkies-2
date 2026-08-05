import { calculateGrossMargin, calculateUnitPrice, ensureValidUuid } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { Ingredient, Product, ProductIngredientItem, ProductWithCost } from "@/types/core";
import { listIngredients } from "@/services/ingredients.service";

const now = "2026-08-04T12:00:00.000Z";

// Default seed products
let initialProducts: Product[] = [
  {
    id: "9972227b-3d0b-42c3-b314-59ad774af159",
    name: "Classic Smikkelburger",
    sku: "SMK-CLASSIC",
    description: "Brioche broodje, 1x runderpatty 100g, 1x cheddar en onze signature Smikkelsaus.",
    parentProductId: null,
    targetGrossMargin: 70,
    actualSellingPrice: 8.50,
    ingredients: [
      { ingredientId: "0872227b-3d0b-42c3-b314-59ad774af158", quantity: 1 },
      { ingredientId: "f320d72e-bf69-421c-9129-a234d1e4c568", quantity: 1 },
      { ingredientId: "25866d8b-a0ff-4e19-b687-23a595b43f98", quantity: 1 },
      { ingredientId: "9be5d4af-80f9-4c58-8fc5-18404262760b", quantity: 1 }
    ],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  },
  {
    id: "8872227b-3d0b-42c3-b314-59ad774af159",
    name: "Dubbele Smikkelburger",
    sku: "SMK-DOUBLE",
    description: "Brioche broodje, 2x runderpatty 100g, 2x cheddar en extra Smikkelsaus.",
    parentProductId: null,
    targetGrossMargin: 70,
    actualSellingPrice: 11.50,
    ingredients: [
      { ingredientId: "0872227b-3d0b-42c3-b314-59ad774af158", quantity: 1 },
      { ingredientId: "f320d72e-bf69-421c-9129-a234d1e4c568", quantity: 2 },
      { ingredientId: "25866d8b-a0ff-4e19-b687-23a595b43f98", quantity: 2 },
      { ingredientId: "9be5d4af-80f9-4c58-8fc5-18404262760b", quantity: 1 }
    ],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }
];

function getLocalStorageProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("smikkel_products");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalStorageProducts(items: Product[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("smikkel_products", JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function listProducts(): Promise<ProductWithCost[]> {
  const allIngredients = await listIngredients();
  const ingredientMap = new Map<string, Ingredient>(allIngredients.map((item) => [item.id, item]));

  let rawProducts: Product[] = initialProducts;

  if (isSupabaseConfigured && supabase) {
    const { data: dbProducts, error } = await supabase
      .from("products")
      .select("*, product_ingredients(*)")
      .is("deleted_at", null)
      .order("name");

    if (!error && dbProducts) {
      rawProducts = dbProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || "",
        description: p.description || "",
        parentProductId: p.parent_product_id || null,
        targetGrossMargin: Number(p.target_gross_margin || 70),
        actualSellingPrice: Number(p.actual_selling_price || 0),
        ingredients: (p.product_ingredients || []).map((pi: any) => ({
          ingredientId: pi.ingredient_id,
          quantity: Number(pi.quantity)
        })),
        isActive: p.is_active,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        deletedAt: p.deleted_at
      }));

      setLocalStorageProducts(rawProducts);
    }
  }

  if (rawProducts === initialProducts) {
    const localProducts = getLocalStorageProducts();
    if (localProducts.length > 0) {
      rawProducts = localProducts;
    }
  }

  const productMap = new Map<string, Product>(rawProducts.map((prod) => [prod.id, prod]));

  return rawProducts
    .filter((prod) => prod.isActive && !prod.deletedAt)
    .map((product) => calculateProductWithCost(product, productMap, ingredientMap));
}

export function calculateProductWithCost(
  product: Product,
  productMap: Map<string, Product>,
  ingredientMap: Map<string, Ingredient>
): ProductWithCost {
  const effectiveIngredients: ProductWithCost["effectiveIngredients"] = [];

  if (product.parentProductId) {
    const parent = productMap.get(product.parentProductId);
    if (parent) {
      for (const item of parent.ingredients) {
        const ing = ingredientMap.get(item.ingredientId);
        if (ing) {
          const price = ing.pricePerBaseUnit || calculateUnitPrice(ing.purchasePrice, ing.packageContent);
          effectiveIngredients.push({
            ingredientId: ing.id,
            name: `${ing.name} (Basis)`,
            quantity: item.quantity,
            baseUnit: ing.baseUnit,
            pricePerBaseUnit: price,
            totalCost: price * item.quantity,
            isInherited: true
          });
        }
      }
    }
  }

  for (const item of product.ingredients) {
    const ing = ingredientMap.get(item.ingredientId);
    if (ing) {
      const price = ing.pricePerBaseUnit || calculateUnitPrice(ing.purchasePrice, ing.packageContent);
      effectiveIngredients.push({
        ingredientId: ing.id,
        name: ing.name,
        quantity: item.quantity,
        baseUnit: ing.baseUnit,
        pricePerBaseUnit: price,
        totalCost: price * item.quantity,
        isInherited: false
      });
    }
  }

  const totalCostPrice = effectiveIngredients.reduce((acc, curr) => acc + curr.totalCost, 0);

  const calculatedSellingPrice = totalCostPrice > 0 && product.targetGrossMargin < 100
    ? totalCostPrice / (1 - product.targetGrossMargin / 100)
    : 0;

  const actualSellingPrice = product.actualSellingPrice && product.actualSellingPrice > 0
    ? product.actualSellingPrice
    : calculatedSellingPrice;

  const actualGrossMargin = calculateGrossMargin(totalCostPrice, actualSellingPrice);

  return {
    ...product,
    costPrice: totalCostPrice,
    advisedSellingPrice: calculatedSellingPrice,
    actualSellingPrice,
    actualGrossMargin,
    effectiveIngredients
  };
}

export async function createProduct(
  input: Omit<Product, "id" | "createdAt" | "updatedAt" | "deletedAt">
): Promise<ProductWithCost> {
  const timestamp = new Date().toISOString();
  const newProduct: Product = {
    ...input,
    id: ensureValidUuid(undefined),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  };

  initialProducts.unshift(newProduct);

  const local = getLocalStorageProducts();
  setLocalStorageProducts([newProduct, ...local.filter((p) => p.id !== newProduct.id)]);

  if (isSupabaseConfigured && supabase) {
    await supabase.from("products").upsert({
      id: newProduct.id,
      name: newProduct.name,
      sku: newProduct.sku,
      description: newProduct.description,
      target_gross_margin: newProduct.targetGrossMargin,
      actual_selling_price: newProduct.actualSellingPrice,
      is_active: true
    });
  }

  const products = await listProducts();
  return products.find((p) => p.id === newProduct.id) || products[0];
}

export async function updateProduct(
  productId: string,
  data: Partial<Product>
): Promise<ProductWithCost> {
  const timestamp = new Date().toISOString();
  const index = initialProducts.findIndex((p) => p.id === productId);
  if (index !== -1) {
    initialProducts[index] = {
      ...initialProducts[index],
      ...data,
      updatedAt: timestamp
    };
  }

  const local = getLocalStorageProducts();
  const updatedLocal = local.map((p) => p.id === productId ? { ...p, ...data, updatedAt: timestamp } : p);
  setLocalStorageProducts(updatedLocal);

  if (isSupabaseConfigured && supabase) {
    const payload: any = { id: productId, updated_at: timestamp };
    if (data.name) payload.name = data.name;
    if (data.sku) payload.sku = data.sku;
    if (data.description !== undefined) payload.description = data.description;
    if (data.actualSellingPrice !== undefined) payload.actual_selling_price = data.actualSellingPrice;
    if (data.targetGrossMargin !== undefined) payload.target_gross_margin = data.targetGrossMargin;

    await supabase.from("products").upsert(payload);
  }

  const products = await listProducts();
  return products.find((p) => p.id === productId) || products[0];
}

export async function deleteProduct(productId: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const index = initialProducts.findIndex((p) => p.id === productId);
  if (index !== -1) {
    initialProducts[index] = {
      ...initialProducts[index],
      isActive: false,
      deletedAt: timestamp
    };
  }

  const local = getLocalStorageProducts();
  const filteredLocal = local.filter((p) => p.id !== productId);
  setLocalStorageProducts(filteredLocal);

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from("products")
      .update({ deleted_at: timestamp, is_active: false })
      .eq("id", productId);
  }
}

export async function updateProductSellingPrice(productId: string, newSellingPrice: number): Promise<ProductWithCost> {
  return updateProduct(productId, { actualSellingPrice: newSellingPrice });
}

export async function updateProductTargetMargin(productId: string, newMargin: number): Promise<ProductWithCost> {
  return updateProduct(productId, { targetGrossMargin: newMargin });
}
