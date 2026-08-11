import type { EventCalculationResult, EventPackageParams, FestivalEventParams, FestivalEventResult, SavedEvent, SavedEventStatus, SupplierOrderGroup, SupplierOrderItem } from "@/types/core";
import { formatCurrency } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { listIngredients } from "@/services/ingredients.service";
import { listProducts } from "@/services/recipes.service";
import { listSuppliers } from "@/services/suppliers.service";

const now = "2026-08-05T10:00:00.000Z";

// Seed fallback events
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
      selectedProducts: [{ productId: "9972227b-3d0b-42c3-b314-59ad774af159", quantityPerPerson: 1.5 }],
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

export async function calculateFestivalEvent(params: FestivalEventParams): Promise<FestivalEventResult> {
  const products = await listProducts();
  const prod = products.find((p) => p.id === params.selectedProductId) || products[0];
  const burgerCostPrice = prod ? prod.costPrice : 3.0;

  const expectedSales = Math.max(params.expectedBurgerSales, 1);
  const grossTurnover = expectedSales * params.sellingPricePerBurger;
  const totalFoodCost = expectedSales * burgerCostPrice;

  const percentageFeeCost = (grossTurnover * params.standFeePercentage) / 100;
  const totalStandFee = params.standFeeFixed + percentageFeeCost;
  const totalKmCost = params.distanceKm * params.costPerKm;

  const totalDirectCosts = totalFoodCost + totalStandFee + totalKmCost + params.otherFixedCosts;
  const totalNetVofProfit = grossTurnover - totalDirectCosts;

  const partnersCount = Math.max(params.partnersCount || 2, 1);
  const totalEventHoursElapsed = params.travelHours + params.setupHours + params.serviceHours;
  const totalPartnerHoursCombined = totalEventHoursElapsed * partnersCount;

  const profitPerPartner = totalNetVofProfit / partnersCount;
  const hourlyEarningsPerPartner = totalPartnerHoursCombined > 0 ? totalNetVofProfit / totalPartnerHoursCombined : 0;

  const netContributionPerBurger = params.sellingPricePerBurger * (1 - params.standFeePercentage / 100) - burgerCostPrice;
  const totalFixedExpenses = params.standFeeFixed + totalKmCost + params.otherFixedCosts;
  const breakEvenBurgers = netContributionPerBurger > 0 ? Math.ceil(totalFixedExpenses / netContributionPerBurger) : 0;

  const burgersPerHourPerPartner = (params.serviceHours * partnersCount) > 0 ? expectedSales / (params.serviceHours * partnersCount) : 0;

  let isFeasibleForVof = true;
  let feasibilityReason = "Uitstekend festival-rendement.";
  if (hourlyEarningsPerPartner < 25) {
    isFeasibleForVof = false;
    feasibilityReason = "Lage uurvergoeding (< €25/uur per vennoot).";
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

export async function generateEventOrderList(
  peopleCount: number,
  selectedProducts: { productId: string; quantityPerPerson: number }[],
  useCheapestSuppliers: boolean = false
): Promise<SupplierOrderGroup[]> {
  const [products, ingredients, suppliers] = await Promise.all([
    listProducts(),
    listIngredients(),
    listSuppliers()
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  const ingredientTotals = new Map<string, number>();

  for (const item of selectedProducts) {
    const prod = productMap.get(item.productId);
    if (!prod) continue;

    const totalBurgersForThisType = peopleCount * item.quantityPerPerson;

    for (const effIng of prod.effectiveIngredients) {
      const current = ingredientTotals.get(effIng.ingredientId) || 0;
      ingredientTotals.set(effIng.ingredientId, current + effIng.quantity * totalBurgersForThisType);
    }
  }

  const supplierGroupsMap = new Map<string, SupplierOrderItem[]>();

  for (const [ingredientId, neededAmount] of ingredientTotals.entries()) {
    const ing = ingredientMap.get(ingredientId);
    if (!ing) continue;

    let supplierId = ing.primarySupplierId || "unassigned";
    let articleCode = ing.supplierArticleCode;
    let productUrl = ing.productUrl;
    let purchaseUnit = ing.purchaseUnit;
    let packageContent = ing.packageContent;
    let purchasePrice = ing.purchasePrice;

    // Pick supplier option with lowest price per base unit if useCheapestSuppliers is true
    if (useCheapestSuppliers && ing.supplierOptions && ing.supplierOptions.length > 0) {
      const cheapestOpt = [...ing.supplierOptions].sort((a, b) => a.pricePerBaseUnit - b.pricePerBaseUnit)[0];
      if (cheapestOpt) {
        supplierId = cheapestOpt.supplierId;
        articleCode = cheapestOpt.supplierArticleCode || articleCode;
        productUrl = cheapestOpt.productUrl || productUrl;
        purchaseUnit = cheapestOpt.purchaseUnit || purchaseUnit;
        packageContent = cheapestOpt.packageContent || packageContent;
        purchasePrice = cheapestOpt.purchasePrice || purchasePrice;
      }
    }

    const packagesToOrder = Math.ceil(neededAmount / packageContent);
    const totalCost = packagesToOrder * purchasePrice;

    const orderItem: SupplierOrderItem = {
      ingredientId: ing.id,
      ingredientName: ing.name,
      supplierArticleCode: articleCode,
      productUrl,
      totalBaseUnitsNeeded: neededAmount,
      baseUnit: ing.baseUnit,
      purchaseUnit,
      packageContent,
      packagesToOrder,
      purchasePricePerPackage: purchasePrice,
      totalEstimatedCost: totalCost
    };

    const existingGroup = supplierGroupsMap.get(supplierId) || [];
    existingGroup.push(orderItem);
    supplierGroupsMap.set(supplierId, existingGroup);
  }

  const result: SupplierOrderGroup[] = [];

  for (const [supplierId, items] of supplierGroupsMap.entries()) {
    const supplier = supplierMap.get(supplierId);
    const totalGroupCost = items.reduce((acc, curr) => acc + curr.totalEstimatedCost, 0);

    result.push({
      supplierId,
      supplierName: supplier?.name || "Overige / Geen Leverancier",
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

function getLocalStorageEvents(): SavedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("smikkel_saved_events");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalStorageEvents(items: SavedEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("smikkel_saved_events", JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function listSavedEvents(): Promise<SavedEvent[]> {
  const localEventsMap = new Map<string, SavedEvent>(
    getLocalStorageEvents().map((e) => [e.id, e])
  );

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const parsed: SavedEvent[] = await Promise.all(
        data.map(async (e) => {
          const localMatch = localEventsMap.get(e.id);

          const params: EventPackageParams = e.params || localMatch?.params || {
            peopleCount: e.people_count || 50,
            selectedProducts: [{ productId: "9972227b-3d0b-42c3-b314-59ad774af159", quantityPerPerson: 1.5 }],
            travelHours: Number(e.travel_hours || 0),
            setupHours: Number(e.setup_hours || 0),
            serviceHours: Number(e.service_hours || 0),
            distanceKm: 0,
            costPerKm: 0.35,
            fixedCosts: Number(e.fixed_costs || 0),
            staffCosts: 0,
            targetEventMargin: Number(e.target_event_margin || 35),
            partnersCount: 2
          };

          // Recalculate calculation live dynamically if missing or inaccurate
          const calculation: EventCalculationResult = (e.calculation && e.calculation.advisedPackagePrice)
            ? e.calculation
            : (localMatch?.calculation && localMatch.calculation.advisedPackagePrice)
            ? localMatch.calculation
            : await calculateEventPackage(params);

          let clientName = localMatch?.clientName;
          let location = localMatch?.location;

          if (!clientName && e.location) {
            if (e.location.includes(" - ")) {
              const parts = e.location.split(" - ");
              clientName = parts[0];
              location = parts.slice(1).join(" - ");
            } else {
              clientName = e.location;
              location = "";
            }
          }

          return {
            id: e.id,
            eventName: e.name || localMatch?.eventName || `Catering ${params.peopleCount}p`,
            eventDate: e.event_date || localMatch?.eventDate || new Date().toISOString().split("T")[0],
            clientName: clientName || "Opdrachtgever",
            contactPerson: localMatch?.contactPerson || "",
            clientEmail: localMatch?.clientEmail || "",
            clientPhone: localMatch?.clientPhone || "",
            clientAddress: localMatch?.clientAddress || "",
            clientCity: localMatch?.clientCity || "",
            quoteNumber: localMatch?.quoteNumber || "",
            location: location || "",
            status: (e.status as SavedEventStatus) || localMatch?.status || "concept",
            params,
            calculation,
            notes: e.notes || localMatch?.notes || "",
            createdAt: e.created_at || localMatch?.createdAt || new Date().toISOString(),
            updatedAt: e.updated_at || localMatch?.updatedAt || new Date().toISOString()
          };
        })
      );

      setLocalStorageEvents(parsed);
      return parsed;
    }
  }

  const localItems = getLocalStorageEvents();
  if (localItems.length > 0) {
    return localItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return [...savedEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveEvent(data: {
  eventName: string;
  eventDate: string;
  eventTime?: string;
  clientName: string;
  contactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  quoteNumber?: string;
  location?: string;
  notes?: string;
  params: EventPackageParams;
  calculation: EventCalculationResult;
}): Promise<SavedEvent> {
  const newEvent: SavedEvent = {
    id: crypto.randomUUID(),
    eventName: data.eventName || `Catering ${data.clientName}`,
    eventDate: data.eventDate || new Date().toISOString().split("T")[0],
    eventTime: data.eventTime || "",
    clientName: data.clientName || "Opdrachtgever",
    contactPerson: data.contactPerson || "",
    clientEmail: data.clientEmail || "",
    clientPhone: data.clientPhone || "",
    clientAddress: data.clientAddress || "",
    clientCity: data.clientCity || "",
    quoteNumber: data.quoteNumber || "",
    location: data.location || "",
    status: "concept",
    params: data.params,
    calculation: data.calculation,
    notes: data.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  savedEvents.unshift(newEvent);

  const localBefore = getLocalStorageEvents();
  setLocalStorageEvents([newEvent, ...localBefore.filter((e) => e.id !== newEvent.id)]);

  if (isSupabaseConfigured && supabase) {
    const formattedLocation = data.location ? `${newEvent.clientName} - ${data.location}` : newEvent.clientName;

    const fullPayload: any = {
      id: newEvent.id,
      name: newEvent.eventName,
      event_date: newEvent.eventDate,
      location: formattedLocation,
      people_count: newEvent.params.peopleCount,
      travel_hours: newEvent.params.travelHours,
      service_hours: newEvent.params.serviceHours,
      setup_hours: newEvent.params.setupHours,
      fixed_costs: newEvent.params.fixedCosts,
      target_event_margin: newEvent.params.targetEventMargin,
      status: newEvent.status,
      notes: newEvent.notes,
      params: newEvent.params,
      calculation: newEvent.calculation,
      created_at: newEvent.createdAt,
      updated_at: newEvent.updatedAt
    };

    let { error } = await supabase.from("events").upsert(fullPayload);

    if (error) {
      delete fullPayload.status;
      delete fullPayload.notes;
      delete fullPayload.params;
      delete fullPayload.calculation;

      const fallback = await supabase.from("events").upsert(fullPayload);
      if (fallback.error) {
        console.error("Supabase event save fallback error:", fallback.error);
      }
    }
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

  const localBefore = getLocalStorageEvents();
  const updatedLocal = localBefore.map((e) =>
    e.id === eventId ? { ...e, status: newStatus, updatedAt: new Date().toISOString() } : e
  );
  setLocalStorageEvents(updatedLocal);

  if (isSupabaseConfigured && supabase) {
    await supabase.from("events").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", eventId);
  }

  const all = await listSavedEvents();
  return all.find((e) => e.id === eventId) || all[0];
}

export async function updateEvent(eventId: string, data: Partial<SavedEvent>): Promise<SavedEvent> {
  const localBefore = getLocalStorageEvents();
  const index = localBefore.findIndex((e) => e.id === eventId);
  const existing = localBefore[index] || savedEvents.find((e) => e.id === eventId);

  if (!existing) {
    throw new Error("Event niet gevonden");
  }

  const updated: SavedEvent = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString()
  };

  if (index !== -1) {
    localBefore[index] = updated;
    setLocalStorageEvents(localBefore);
  } else {
    setLocalStorageEvents([updated, ...localBefore]);
  }

  const sIndex = savedEvents.findIndex((e) => e.id === eventId);
  if (sIndex !== -1) {
    savedEvents[sIndex] = updated;
  } else {
    savedEvents.unshift(updated);
  }

  if (isSupabaseConfigured && supabase) {
    const formattedLocation = updated.location ? `${updated.clientName} - ${updated.location}` : updated.clientName;
    const fullPayload: any = {
      id: updated.id,
      name: updated.eventName,
      event_date: updated.eventDate,
      location: formattedLocation,
      people_count: updated.params?.peopleCount,
      travel_hours: updated.params?.travelHours,
      service_hours: updated.params?.serviceHours,
      setup_hours: updated.params?.setupHours,
      fixed_costs: updated.params?.fixedCosts,
      target_event_margin: updated.params?.targetEventMargin,
      status: updated.status,
      notes: updated.notes,
      params: updated.params,
      calculation: updated.calculation,
      updated_at: updated.updatedAt
    };

    try {
      let { error } = await supabase.from("events").upsert(fullPayload);
      if (error) {
        delete fullPayload.status;
        delete fullPayload.notes;
        delete fullPayload.params;
        delete fullPayload.calculation;
        await supabase.from("events").upsert(fullPayload);
      }
    } catch (err) {
      console.warn("Supabase updateEvent error:", err);
    }
  }

  return updated;
}

export async function deleteSavedEvent(eventId: string): Promise<void> {
  savedEvents = savedEvents.filter((e) => e.id !== eventId);

  const localBefore = getLocalStorageEvents();
  setLocalStorageEvents(localBefore.filter((e) => e.id !== eventId));

  if (isSupabaseConfigured && supabase) {
    await supabase.from("events").delete().eq("id", eventId);
  }
}
