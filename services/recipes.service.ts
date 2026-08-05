import { calculateGrossMargin, calculateUnitPrice } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { Ingredient, Product, ProductIngredientItem, ProductWithCost } from "@/types/core";
import { listIngredients } from "@/services/ingredients.service";

const now = "2026-08-04T12:00:00.000Z";

// Default seed products
let initialProducts: Product[] = [
  {
    id: "prod-smikkel-classic",
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
    id: "prod-smikkel-double",
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

export async function listProducts(): Promise<ProductWithCost[]> {
  const allIngredients = await listIngredients();
  const ingredientMap = new Map<string, Ingredient>(allIngredients.map((item) => [item.id, item]));

  let rawProducts = initialProducts;

  if (isSupabaseConfigured && supabase) {
    const { data: dbProducts, error } = await supabase
      .from("products")
      .select("*, product_ingredients(*)")
      .is("deleted_at", null)
      .order("name");

    if (!error && dbProducts && dbProducts.length > 0) {
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
      const existing = effectiveIngredients.find((ei) => ei.ingredientId === ing.id && !ei.isInherited);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalCost = existing.pricePerBaseUnit * existing.quantity;
      } else {
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
  }

  const costPrice = effectiveIngredients.reduce((sum, item) => sum + item.totalCost, 0);
  const marginFraction = Math.min(Math.max(product.targetGrossMargin, 10), 95) / 100;
  const advisedSellingPrice = costPrice / (1 - marginFraction);
  const actualGrossMargin = calculateGrossMargin(costPrice, product.actualSellingPrice);

  return {
    ...product,
    costPrice,
    advisedSellingPrice,
    actualGrossMargin,
    effectiveIngredients
  };
}

export async function createProduct(data: {
  name: string;
  sku: string;
  description?: string;
  targetGrossMargin: number;
  actualSellingPrice: number;
  ingredients: ProductIngredientItem[];
}): Promise<ProductWithCost> {
  const newProduct: Product = {
    id: `prod-${crypto.randomUUID()}`,
    name: data.name,
    sku: data.sku || `SMK-${data.name.slice(0, 4).toUpperCase()}`,
    description: data.description || "",
    parentProductId: null,
    targetGrossMargin: data.targetGrossMargin || 70,
    actualSellingPrice: data.actualSellingPrice || 0,
    ingredients: data.ingredients || [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null
  };

  initialProducts.push(newProduct);

  if (isSupabaseConfigured && supabase) {
    await supabase.from("products").upsert({
      id: newProduct.id,
      name: newProduct.name,
      sku: newProduct.sku,
      target_gross_margin: newProduct.targetGrossMargin,
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
  const index = initialProducts.findIndex((p) => p.id === productId);
  if (index !== -1) {
    initialProducts[index] = {
      ...initialProducts[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
  }

  if (isSupabaseConfigured && supabase) {
    const payload: any = { id: productId, updated_at: new Date().toISOString() };
    if (data.name) payload.name = data.name;
    if (data.actualSellingPrice !== undefined) payload.actual_selling_price = data.actualSellingPrice;
    if (data.targetGrossMargin !== undefined) payload.target_gross_margin = data.targetGrossMargin;

    await supabase.from("products").upsert(payload);
  }

  const products = await listProducts();
  return products.find((p) => p.id === productId) || products[0];
}

export async function deleteProduct(productId: string): Promise<void> {
  const index = initialProducts.findIndex((p) => p.id === productId);
  if (index !== -1) {
    initialProducts[index] = {
      ...initialProducts[index],
      isActive: false,
      deletedAt: new Date().toISOString()
    };
  }

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", productId);
  }
}

export async function updateProductSellingPrice(productId: string, newSellingPrice: number): Promise<ProductWithCost> {
  return updateProduct(productId, { actualSellingPrice: newSellingPrice });
}

export async function updateProductTargetMargin(productId: string, newMargin: number): Promise<ProductWithCost> {
  return updateProduct(productId, { targetGrossMargin: newMargin });
}
