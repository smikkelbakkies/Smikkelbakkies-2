import { calculateUnitPrice } from "@/lib/utils";
import type { Ingredient, IngredientCategory, Supplier } from "@/types/core";

const now = "2026-08-04T12:00:00.000Z";

export const categories: IngredientCategory[] = [
  { id: "8f67a3b5-fc31-4ec5-a729-1d0bf775f7c1", name: "Brood", sortOrder: 1 },
  { id: "61f5e2d9-5cb4-4064-9f4e-563168f075dc", name: "Vlees", sortOrder: 2 },
  { id: "3370052f-5b79-4612-beb7-c0c51eb4bb89", name: "Zuivel", sortOrder: 3 },
  { id: "8f3da1ac-c9a9-40bc-a574-f677d5b55d7e", name: "Sauzen", sortOrder: 4 },
  { id: "0c6a01cb-c6b7-4327-a8ff-e26854f1fd1d", name: "Verpakking", sortOrder: 5 }
];

export const suppliers: Supplier[] = [
  {
    id: "2c382a8c-1396-4130-a473-5ad1082b9b22",
    name: "Horeca Groothandel Zuid",
    address: "Industrieweg 14, Eindhoven",
    phone: "+31 40 123 4567",
    email: "inkoop@hg-zuid.nl",
    website: "https://hg-zuid.example",
    vatNumber: "NL001234567B01",
    chamberOfCommerceNumber: "81234567",
    notes: "Prima leverancier voor droge goederen en disposables.",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  },
  {
    id: "37a8f43d-808e-4bf5-9819-0b90c47e927e",
    name: "Butcher Select",
    address: "Slachthuislaan 9, Tilburg",
    phone: "+31 13 765 4321",
    email: "orders@butcherselect.example",
    website: "https://butcherselect.example",
    vatNumber: "NL009876543B01",
    chamberOfCommerceNumber: "87654321",
    notes: "Vaste leverancier voor patties. Prijs wekelijks controleren.",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  },
  {
    id: "supplier-bakkerij-brabant",
    name: "Bakkerij De Brabander",
    address: "Bakkerstraat 4, Breda",
    phone: "+31 76 555 1234",
    email: "bestellen@debrabander.example",
    website: "https://debrabander.example",
    vatNumber: "NL005551234B01",
    chamberOfCommerceNumber: "85551234",
    notes: "Ambachtelijke brioche broodjes tegen scherpe staffelkorting.",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }
];

export const ingredients: Ingredient[] = [
  {
    id: "0872227b-3d0b-42c3-b314-59ad774af158",
    name: "Brioche broodje",
    categoryId: categories[0].id,
    primarySupplierId: suppliers[0].id,
    supplierArticleCode: "HGZ-BROOD-60",
    baseUnit: "stuk",
    purchaseUnit: "doos",
    packageContent: 60,
    purchasePrice: 18.0,
    pricePerBaseUnit: 0.3,
    supplierOptions: [
      {
        supplierId: suppliers[0].id,
        supplierName: suppliers[0].name,
        purchaseUnit: "doos",
        packageContent: 60,
        purchasePrice: 18.0,
        pricePerBaseUnit: 0.3,
        isPrimary: true
      },
      {
        supplierId: suppliers[2].id,
        supplierName: suppliers[2].name,
        purchaseUnit: "doos",
        packageContent: 60,
        purchasePrice: 15.6,
        pricePerBaseUnit: 0.26,
        isPrimary: false
      }
    ],
    lastPriceUpdate: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  },
  {
    id: "f320d72e-bf69-421c-9129-a234d1e4c568",
    name: "Runderpatty 100g",
    categoryId: categories[1].id,
    primarySupplierId: suppliers[1].id,
    supplierArticleCode: "BS-MEAT-40",
    baseUnit: "stuk",
    purchaseUnit: "doos",
    packageContent: 40,
    purchasePrice: 64.0,
    pricePerBaseUnit: 1.6,
    supplierOptions: [
      {
        supplierId: suppliers[1].id,
        supplierName: suppliers[1].name,
        purchaseUnit: "doos",
        packageContent: 40,
        purchasePrice: 64.0,
        pricePerBaseUnit: 1.6,
        isPrimary: true
      },
      {
        supplierId: suppliers[0].id,
        supplierName: suppliers[0].name,
        purchaseUnit: "doos",
        packageContent: 40,
        purchasePrice: 60.0,
        pricePerBaseUnit: 1.5,
        isPrimary: false
      }
    ],
    lastPriceUpdate: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  },
  {
    id: "25866d8b-a0ff-4e19-b687-23a595b43f98",
    name: "Cheddar plak",
    categoryId: categories[2].id,
    primarySupplierId: suppliers[0].id,
    supplierArticleCode: "HGZ-CHEDDAR-80",
    baseUnit: "stuk",
    purchaseUnit: "pak",
    packageContent: 80,
    purchasePrice: 14.5,
    pricePerBaseUnit: calculateUnitPrice(14.5, 80),
    supplierOptions: [
      {
        supplierId: suppliers[0].id,
        supplierName: suppliers[0].name,
        purchaseUnit: "pak",
        packageContent: 80,
        purchasePrice: 14.5,
        pricePerBaseUnit: calculateUnitPrice(14.5, 80),
        isPrimary: true
      }
    ],
    lastPriceUpdate: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  },
  {
    id: "9be5d4af-80f9-4c58-8fc5-18404262760b",
    name: "Smikkel saus",
    categoryId: categories[3].id,
    primarySupplierId: suppliers[0].id,
    supplierArticleCode: "HGZ-SAUCE-120",
    baseUnit: "portie",
    purchaseUnit: "emmer",
    packageContent: 120,
    purchasePrice: 9.0,
    pricePerBaseUnit: calculateUnitPrice(9.0, 120),
    supplierOptions: [
      {
        supplierId: suppliers[0].id,
        supplierName: suppliers[0].name,
        purchaseUnit: "emmer",
        packageContent: 120,
        purchasePrice: 9.0,
        pricePerBaseUnit: calculateUnitPrice(9.0, 120),
        isPrimary: true
      }
    ],
    lastPriceUpdate: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }
];
