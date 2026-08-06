export type BaseUnit = "stuk" | "gram" | "kg" | "ml" | "liter" | "portie";

export type Supplier = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vatNumber: string;
  chamberOfCommerceNumber: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type IngredientCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type SupplierPriceOption = {
  supplierId: string;
  supplierName: string;
  purchaseUnit: string;
  packageContent: number;
  purchasePrice: number;
  pricePerBaseUnit: number;
  isPrimary: boolean;
};

export type Ingredient = {
  id: string;
  name: string;
  categoryId: string;
  primarySupplierId: string | null;
  supplierArticleCode?: string; // Groothandel artikelcode / SKU (bijv. HGZ-BR-60)
  baseUnit: BaseUnit;
  purchaseUnit: string;
  packageContent: number;
  purchasePrice: number;
  pricePerBaseUnit: number;
  supplierOptions?: SupplierPriceOption[];
  lastPriceUpdate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type FestivalEventParams = {
  eventName: string;
  expectedBurgerSales: number;
  selectedProductId: string;
  sellingPricePerBurger: number;
  standFeeFixed: number; // e.g. €250
  standFeePercentage: number; // e.g. 15% of turnover
  travelHours: number;
  setupHours: number;
  serviceHours: number;
  distanceKm: number;
  costPerKm: number;
  otherFixedCosts: number;
  partnersCount: number; // 2 for VOF
};

export type FestivalEventResult = {
  grossTurnover: number;
  totalFoodCost: number;
  totalStandFee: number;
  totalKmCost: number;
  totalDirectCosts: number;
  totalNetVofProfit: number;
  profitPerPartner: number;
  hourlyEarningsPerPartner: number;
  breakEvenBurgers: number;
  burgersPerHourPerPartner: number;
  isFeasibleForVof: boolean;
  feasibilityReason: string;
};


export type DashboardMetric = {
  label: string;
  value: string;
  trend: string;
  tone: "neutral" | "success" | "warning";
};

export type ProductIngredientItem = {
  ingredientId: string;
  quantity: number; // in base units
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string;
  parentProductId: string | null;
  targetGrossMargin: number; // e.g. 65, 70, 72, 75
  actualSellingPrice: number;
  ingredients: ProductIngredientItem[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ProductWithCost = Product & {
  costPrice: number;
  advisedSellingPrice: number;
  actualGrossMargin: number;
  effectiveIngredients: {
    ingredientId: string;
    name: string;
    quantity: number;
    baseUnit: string;
    pricePerBaseUnit: number;
    totalCost: number;
    isInherited: boolean;
  }[];
};

export type EventProductSelection = {
  productId: string;
  quantityPerPerson: number;
};

export type EventPackageParams = {
  peopleCount: number;
  selectedProducts: EventProductSelection[];
  travelHours: number; // return trip travel hours
  setupHours: number; // setup & teardown
  serviceHours: number; // hours serving on location
  distanceKm: number;
  costPerKm: number;
  fixedCosts: number; // opstartkosten, gas, stroom, foodtruck afschrijving
  staffCosts: number; // optionele extra hulp buiten vennoten
  targetEventMargin: number; // 20, 30, 40, 45%
  partnersCount: number; // 2 for VOF
};

export type EventCalculationResult = {
  peopleCount: number;
  totalEventHoursElapsed: number;
  totalPartnerHoursCombined: number; // e.g. 2 partners * 5 hours = 10 combined hours
  totalFoodCost: number;
  totalKmCost: number;
  totalDirectCosts: number;
  advisedPackagePrice: number;
  pricePerPerson: number;
  totalVofProfit: number;
  profitPerPartner: number;
  hourlyEarningsPerPartner: number;
  isFeasibleForVof: boolean;
  feasibilityReason: string;
};

export type SupplierOrderItem = {
  ingredientId: string;
  ingredientName: string;
  totalBaseUnitsNeeded: number;
  baseUnit: string;
  purchaseUnit: string;
  packageContent: number;
  packagesToOrder: number;
  purchasePricePerPackage: number;
  totalEstimatedCost: number;
};

export type SupplierOrderGroup = {
  supplierId: string;
  supplierName: string;
  contactEmail: string;
  contactPhone: string;
  items: SupplierOrderItem[];
  totalGroupCost: number;
};

export type SavedEventStatus = "concept" | "offerte_verzonden" | "bevestigd" | "inkoop_gedaan" | "afgerond" | "gefactureerd";

export type SavedEvent = {
  id: string;
  eventName: string;
  eventDate: string;
  clientName: string;
  contactPerson?: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress?: string;
  clientCity?: string;
  quoteNumber?: string;
  location: string;
  status: SavedEventStatus;
  params: EventPackageParams;
  calculation: EventCalculationResult;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};



