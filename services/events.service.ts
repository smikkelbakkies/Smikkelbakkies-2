import type { EventCalculationResult, EventPackageParams, SavedEvent, SavedEventStatus, SupplierOrderGroup, SupplierOrderItem } from "@/types/core";
import { formatCurrency } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { listIngredients } from "@/services/ingredients.service";
import { listProducts } from "@/services/recipes.service";
import { listSuppliers } from "@/services/suppliers.service";

const now = "2026-08-05T10:00:00.000Z";

// Mock store for saved events
let savedEvents: SavedEvent[] = [
  {
    id: "event-01",
    eventName: "Bedrijfsfeest TechNL",
    eventDate: "2026-08-20",
    clientName: "TechNL BV",
    clientEmail: "events@technl.example",
    clientPhone: "+31 6 12345678",
    location: "High Tech Campus, Eindhoven",
    status: "bevestigd",
    params: {
      peopleCount: 80,
      selectedProducts: [{ productId: "prod-smikkel-classic", quantityPerPerson: 1.5 }],
      travelHours: 1.0,
      setupHours: 1.5,
      serviceHours: 3.0,
      distanceKm: 50,
      costPerKm: 0.35,
      fixedCosts: 75,
      staffCosts: 0,
      targetEventMargin: 35,
      partnersCount: 2
    },
    calculation: {
      peopleCount: 80,
      totalEventHoursElapsed: 5.5,
      totalPartnerHoursCombined: 11.0,
      totalFoodCost: 312.0,
      totalKmCost: 17.5,
      totalDirectCosts: 404.5,
      advisedPackagePrice: 622.3,
      pricePerPerson: 7.78,
      totalVofProfit: 217.8,
      profitPerPartner: 108.9,
      hourlyEarningsPerPartner: 39.6,
      isFeasibleForVof: true,
      feasibilityReason: "Uitstekend VOF-rendement (> €35/uur per vennoot)."
    },
    createdAt: now,
    updatedAt: now
  }
];

export async function calculateEventPackage(params: EventPackageParams): Promise<EventCalculationResult> {
  const products = await listProducts();
  const productMap = new Map(products.map((p) => [p.id, p]));

  let foodCostPerPerson = 0;
  for (const selection of params.selectedProducts) {
    const prod = productMap.get(selection.productId);
    if (prod) {
      foodCostPerPerson += prod.costPrice * selection.quantityPerPerson;
    }
  }

  const peopleCount = Math.max(params.peopleCount, 1);
  const totalFoodCost = foodCostPerPerson * peopleCount;
  const totalKmCost = params.distanceKm * params.costPerKm;
  const totalDirectCosts = totalFoodCost + totalKmCost + params.fixedCosts + params.staffCosts;

  const marginFraction = Math.min(Math.max(params.targetEventMargin, 5), 80) / 100;
  const advisedPackagePrice = totalDirectCosts / (1 - marginFraction);
  const pricePerPerson = advisedPackagePrice / peopleCount;

  const totalVofProfit = advisedPackagePrice - totalDirectCosts;
  const partnersCount = Math.max(params.partnersCount || 2, 1);
  
  const totalEventHoursElapsed = params.travelHours + params.setupHours + params.serviceHours;
  const totalPartnerHoursCombined = totalEventHoursElapsed * partnersCount;

  const profitPerPartner = totalVofProfit / partnersCount;
  const hourlyEarningsPerPartner = totalPartnerHoursCombined > 0 
    ? totalVofProfit / totalPartnerHoursCombined 
    : 0;

  let isFeasibleForVof = true;
  let feasibilityReason = "Uitstekend VOF-rendement (> €35/uur per vennoot).";

  if (hourlyEarningsPerPartner < 25) {
    isFeasibleForVof = false;
    feasibilityReason = "Lage uurvergoeding (< €25/uur per vennoot). Overweeg de eventmarge of pakketprijs te verhogen.";
  } else if (hourlyEarningsPerPartner < 35) {
    isFeasibleForVof = true;
    feasibilityReason = "Voldoende VOF-rendement (€25 - €35/uur per vennoot).";
  }

  return {
    peopleCount,
    totalEventHoursElapsed,
    totalPartnerHoursCombined,
    totalFoodCost,
    totalKmCost,
    totalDirectCosts,
    advisedPackagePrice,
    pricePerPerson,
    totalVofProfit,
    profitPerPartner,
    hourlyEarningsPerPartner,
    isFeasibleForVof,
    feasibilityReason
  };
}

export async function generateEventOrderList(
  peopleCount: number,
  selectedProducts: { productId: string; quantityPerPerson: number }[]
): Promise<SupplierOrderGroup[]> {
  const [products, ingredients, suppliers] = await Promise.all([
    listProducts(),
    listIngredients(),
    listSuppliers()
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  const requiredIngredients = new Map<string, number>();

  for (const selection of selectedProducts) {
    const product = productMap.get(selection.productId);
    if (!product) continue;

    const burgerMultiplier = selection.quantityPerPerson * Math.max(peopleCount, 1);

    for (const effIng of product.effectiveIngredients) {
      const current = requiredIngredients.get(effIng.ingredientId) || 0;
      requiredIngredients.set(effIng.ingredientId, current + effIng.quantity * burgerMultiplier);
    }
  }

  const groupsBySupplier = new Map<string, SupplierOrderItem[]>();

  for (const [ingredientId, totalBaseUnitsNeeded] of requiredIngredients.entries()) {
    const ing = ingredientMap.get(ingredientId);
    if (!ing) continue;

    const supplierId = ing.primarySupplierId || "unknown-supplier";
    const packageContent = Math.max(ing.packageContent, 1);
    const packagesToOrder = Math.ceil(totalBaseUnitsNeeded / packageContent);
    const totalEstimatedCost = packagesToOrder * ing.purchasePrice;

    const item: SupplierOrderItem = {
      ingredientId: ing.id,
      ingredientName: ing.name,
      totalBaseUnitsNeeded,
      baseUnit: ing.baseUnit,
      purchaseUnit: ing.purchaseUnit,
      packageContent: ing.packageContent,
      packagesToOrder,
      purchasePricePerPackage: ing.purchasePrice,
      totalEstimatedCost
    };

    const existingGroup = groupsBySupplier.get(supplierId) || [];
    existingGroup.push(item);
    groupsBySupplier.set(supplierId, existingGroup);
  }

  const result: SupplierOrderGroup[] = [];

  for (const [supplierId, items] of groupsBySupplier.entries()) {
    const supplier = supplierMap.get(supplierId);
    const totalGroupCost = items.reduce((sum, i) => sum + i.totalEstimatedCost, 0);

    result.push({
      supplierId,
      supplierName: supplier?.name || "Directe Inkoop / Overige",
      contactEmail: supplier?.email || "-",
      contactPhone: supplier?.phone || "-",
      items,
      totalGroupCost
    });
  }

  return result;
}

export async function generateCustomerQuoteText(
  params: EventPackageParams,
  result: EventCalculationResult,
  customClientName?: string
): Promise<string> {
  const products = await listProducts();
  const productMap = new Map(products.map((p) => [p.id, p]));

  let burgerSummary = "";
  for (const sel of params.selectedProducts) {
    const prod = productMap.get(sel.productId);
    if (prod) {
      const count = Math.round(sel.quantityPerPerson * params.peopleCount);
      burgerSummary += `• ${count}x ${prod.name} (${sel.quantityPerPerson} p.p.)\n`;
    }
  }

  const clientHeader = customClientName ? `Beste ${customClientName},\n\n` : `Beste klant,\n\n`;

  let text = `${clientHeader}`;
  text += `Hierbij de catering offerte namens Smikkelbakkies voor uw event:\n\n`;
  text += `📋 CATERING ARRANGEGEMENT\n`;
  text += `• Aantal gasten: ${params.peopleCount} personen\n`;
  text += `• Duur op locatie: ${params.serviceHours} uur verse bereiding vanuit de foodtruck\n\n`;
  text += `🍔 INBEGREPEN BURGERS:\n${burgerSummary}\n`;
  text += `💰 FINANCIEEL OVERZICHT:\n`;
  text += `• Totaalprijs arrangement: ${formatCurrency(result.advisedPackagePrice)} (excl. btw)\n`;
  text += `• Prijs per persoon: ${formatCurrency(result.pricePerPerson)} p.p.\n\n`;
  text += `Inclusief reiskosten, op- en afbouw, vers gebakken burgers en servies/disposables.\n\n`;
  text += `Met smakelijke groet,\nTeam Smikkelbakkies VOF`;

  return text;
}

export async function listSavedEvents(): Promise<SavedEvent[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((e) => ({
        id: e.id,
        eventName: e.name,
        eventDate: e.event_date || new Date().toISOString().split("T")[0],
        clientName: e.location || "Opdrachtgever",
        clientEmail: "",
        clientPhone: "",
        location: e.location || "",
        status: (e.status as SavedEventStatus) || "concept",
        params: e.params || {
          peopleCount: e.people_count || 50,
          selectedProducts: [],
          travelHours: Number(e.travel_hours || 0),
          setupHours: Number(e.setup_hours || 0),
          serviceHours: Number(e.service_hours || 0),
          distanceKm: 0,
          costPerKm: 0.35,
          fixedCosts: Number(e.fixed_costs || 0),
          staffCosts: 0,
          targetEventMargin: Number(e.target_event_margin || 30),
          partnersCount: 2
        },
        calculation: e.calculation || {
          peopleCount: e.people_count || 50,
          totalEventHoursElapsed: 5,
          totalPartnerHoursCombined: 10,
          totalFoodCost: 200,
          totalKmCost: 0,
          totalDirectCosts: 200,
          advisedPackagePrice: 300,
          pricePerPerson: 6,
          totalVofProfit: 100,
          profitPerPartner: 50,
          hourlyEarningsPerPartner: 10,
          isFeasibleForVof: true,
          feasibilityReason: "Opgehaald uit Supabase"
        },
        notes: e.notes || "",
        createdAt: e.created_at,
        updatedAt: e.updated_at
      }));
    }
  }

  return [...savedEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveEvent(data: {
  eventName: string;
  eventDate: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  location?: string;
  notes?: string;
  params: EventPackageParams;
  calculation: EventCalculationResult;
}): Promise<SavedEvent> {
  const newEvent: SavedEvent = {
    id: `event-${crypto.randomUUID()}`,
    eventName: data.eventName || `Catering ${data.clientName}`,
    eventDate: data.eventDate || new Date().toISOString().split("T")[0],
    clientName: data.clientName || "Opdrachtgever",
    clientEmail: data.clientEmail || "",
    clientPhone: data.clientPhone || "",
    location: data.location || "",
    status: "concept",
    params: data.params,
    calculation: data.calculation,
    notes: data.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  savedEvents.push(newEvent);

  if (isSupabaseConfigured && supabase) {
    await supabase.from("events").upsert({
      id: newEvent.id,
      name: newEvent.eventName,
      event_date: newEvent.eventDate,
      location: newEvent.clientName,
      people_count: newEvent.params.peopleCount,
      travel_hours: newEvent.params.travelHours,
      service_hours: newEvent.params.serviceHours,
      setup_hours: newEvent.params.setupHours,
      fixed_costs: newEvent.params.fixedCosts,
      target_event_margin: newEvent.params.targetEventMargin,
      params: newEvent.params,
      calculation: newEvent.calculation,
      status: newEvent.status,
      created_at: newEvent.createdAt,
      updated_at: newEvent.updatedAt
    });
  }

  return newEvent;
}

export async function updateEventStatus(eventId: string, newStatus: SavedEventStatus): Promise<SavedEvent> {
  const index = savedEvents.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    savedEvents[index] = {
      ...savedEvents[index],
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
  }

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from("events")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", eventId);
  }

  return savedEvents[index] || savedEvents[0];
}

export async function deleteSavedEvent(eventId: string): Promise<void> {
  savedEvents = savedEvents.filter((e) => e.id !== eventId);
  if (isSupabaseConfigured && supabase) {
    await supabase.from("events").delete().eq("id", eventId);
  }
}

export async function calculateFestivalEvent(params: import("@/types/core").FestivalEventParams): Promise<import("@/types/core").FestivalEventResult> {
  const products = await listProducts();
  const product = products.find((p) => p.id === params.selectedProductId) || products[0];

  const sales = Math.max(params.expectedBurgerSales, 1);
  const grossTurnover = sales * params.sellingPricePerBurger;
  const totalFoodCost = sales * (product ? product.costPrice : 3.0);
  const totalStandFee = params.standFeeFixed + (grossTurnover * (params.standFeePercentage / 100));
  const totalKmCost = params.distanceKm * params.costPerKm;

  const totalDirectCosts = totalFoodCost + totalStandFee + totalKmCost + params.otherFixedCosts;
  const totalNetVofProfit = grossTurnover - totalDirectCosts;

  const partnersCount = Math.max(params.partnersCount || 2, 1);
  const profitPerPartner = totalNetVofProfit / partnersCount;

  const totalEventHoursElapsed = params.travelHours + params.setupHours + params.serviceHours;
  const totalPartnerHoursCombined = totalEventHoursElapsed * partnersCount;

  const hourlyEarningsPerPartner = totalPartnerHoursCombined > 0 ? totalNetVofProfit / totalPartnerHoursCombined : 0;

  // Net revenue per burger after percentage fee: sellingPrice * (1 - feePct/100) - costPrice
  const netRevenuePerBurger = params.sellingPricePerBurger * (1 - params.standFeePercentage / 100) - (product ? product.costPrice : 3.0);
  const fixedBurden = params.standFeeFixed + totalKmCost + params.otherFixedCosts;
  const breakEvenBurgers = netRevenuePerBurger > 0 ? Math.ceil(fixedBurden / netRevenuePerBurger) : sales;

  const serviceHours = Math.max(params.serviceHours, 0.5);
  const burgersPerHourPerPartner = sales / (serviceHours * partnersCount);

  let isFeasibleForVof = true;
  let feasibilityReason = "Goede festivalprognose (> €35/uur per vennoot).";

  if (hourlyEarningsPerPartner < 25) {
    isFeasibleForVof = false;
    feasibilityReason = "Risicovol festival (< €25/uur per vennoot). Controleer standgeld en verkoopprijs.";
  } else if (hourlyEarningsPerPartner < 35) {
    isFeasibleForVof = true;
    feasibilityReason = "Voldoende festivalprognose (€25 - €35/uur per vennoot).";
  }

  return {
    grossTurnover,
    totalFoodCost,
    totalStandFee,
    totalKmCost,
    totalDirectCosts,
    totalNetVofProfit,
    profitPerPartner,
    hourlyEarningsPerPartner,
    breakEvenBurgers,
    burgersPerHourPerPartner,
    isFeasibleForVof,
    feasibilityReason
  };
}

