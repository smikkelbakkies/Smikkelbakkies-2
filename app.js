const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const pct = new Intl.NumberFormat("nl-NL", { style: "percent", maximumFractionDigits: 1 });

const productMarginPresets = [
  { label: "Scherp - 65% marge", value: 65 },
  { label: "Gezond - 70% marge", value: 70 },
  { label: "Sterk - 72% marge", value: 72 },
  { label: "Premium - 75% marge", value: 75 }
];

const eventMarginPresets = [
  { label: "Minimum - 20% eventmarge", value: 20 },
  { label: "Gezond - 30% eventmarge", value: 30 },
  { label: "Sterk - 40% eventmarge", value: 40 },
  { label: "Top-event - 45% eventmarge", value: 45 }
];

const defaultData = {
  ingredients: [
    { id: crypto.randomUUID(), name: "Brioche broodje", packagePrice: 18, packageQuantity: 60, unit: "stuk" },
    { id: crypto.randomUUID(), name: "Runderpatty", packagePrice: 64, packageQuantity: 40, unit: "stuk" },
    { id: crypto.randomUUID(), name: "Cheddar", packagePrice: 14.5, packageQuantity: 80, unit: "plak" },
    { id: crypto.randomUUID(), name: "Saus", packagePrice: 9, packageQuantity: 120, unit: "portie" },
    { id: crypto.randomUUID(), name: "Verpakking", packagePrice: 22, packageQuantity: 100, unit: "stuk" }
  ],
  burgers: [],
  packages: []
};

const saved = JSON.parse(localStorage.getItem("smikkelbakkies-calculator") || "null");
const state = normalizeState(saved || seedData());

function seedData() {
  const data = structuredClone(defaultData);
  data.burgers = [
    {
      id: crypto.randomUUID(),
      name: "Classic Smash",
      laborCost: 1.1,
      overheadCost: 0.65,
      targetMargin: 68,
      salePrice: 8.95,
      recipe: [
        { ingredientId: data.ingredients[0].id, quantity: 1 },
        { ingredientId: data.ingredients[1].id, quantity: 1 },
        { ingredientId: data.ingredients[2].id, quantity: 1 },
        { ingredientId: data.ingredients[3].id, quantity: 1 },
        { ingredientId: data.ingredients[4].id, quantity: 1 }
      ]
    }
  ];
  data.packages = [
    {
      id: crypto.randomUUID(),
      name: "Eventpakket 50 personen",
      people: 50,
      fixedTruckCost: 450,
      staffCost: 220,
      targetMargin: 30,
      quotePrice: 0,
      travelToHours: 0.75,
      travelBackHours: 0.75,
      setupHours: 1,
      onSiteHours: 3,
      breakdownHours: 0.75,
      distanceKm: 70,
      costPerKm: 0.35,
      ownerHourlyTarget: 55,
      items: [{ burgerId: data.burgers[0].id, quantityPerPerson: 1, included: 50 }]
    }
  ];
  return data;
}

function normalizeState(data) {
  data.ingredients ||= [];
  data.burgers ||= [];
  data.packages ||= [];

  data.burgers.forEach(burger => {
    burger.laborCost = numberValue(burger.laborCost);
    burger.overheadCost = numberValue(burger.overheadCost);
    burger.targetMargin = numberValue(burger.targetMargin, 70);
    burger.salePrice = numberValue(burger.salePrice);
    burger.recipe ||= [];
  });

  data.packages.forEach(pack => {
    pack.people = numberValue(pack.people, 1);
    pack.fixedTruckCost = numberValue(pack.fixedTruckCost);
    pack.staffCost = numberValue(pack.staffCost);
    pack.targetMargin = numberValue(pack.targetMargin, 30);
    if (pack.targetMargin > 50) pack.targetMargin = 30;
    pack.quotePrice = numberValue(pack.quotePrice);
    pack.travelToHours = numberValue(pack.travelToHours, 0.5);
    pack.travelBackHours = numberValue(pack.travelBackHours, 0.5);
    pack.setupHours = numberValue(pack.setupHours, 1);
    pack.onSiteHours = numberValue(pack.onSiteHours, 3);
    pack.breakdownHours = numberValue(pack.breakdownHours, 0.75);
    pack.distanceKm = numberValue(pack.distanceKm);
    pack.costPerKm = numberValue(pack.costPerKm, 0.35);
    pack.ownerHourlyTarget = numberValue(pack.ownerHourlyTarget, 55);
    pack.items ||= [];
  });

  return data;
}

function save() {
  localStorage.setItem("smikkelbakkies-calculator", JSON.stringify(state));
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function ingredientUnitCost(ingredient) {
  return numberValue(ingredient.packagePrice) / Math.max(numberValue(ingredient.packageQuantity), 0.001);
}

function burgerCost(burger) {
  const recipeCost = burger.recipe.reduce((total, line) => {
    const ingredient = state.ingredients.find(item => item.id === line.ingredientId);
    return total + (ingredient ? ingredientUnitCost(ingredient) * numberValue(line.quantity) : 0);
  }, 0);
  return recipeCost + numberValue(burger.laborCost) + numberValue(burger.overheadCost);
}

function recommendedPrice(cost, targetMargin) {
  const margin = Math.min(numberValue(targetMargin) / 100, .95);
  return cost / Math.max(1 - margin, .05);
}

function actualMargin(price, cost) {
  if (price <= 0) return 0;
  return (price - cost) / price;
}

function packageCost(pack) {
  const itemCost = pack.items.reduce((total, item) => {
    const burger = state.burgers.find(entry => entry.id === item.burgerId);
    const count = numberValue(item.included) || numberValue(pack.people) * numberValue(item.quantityPerPerson);
    return total + (burger ? burgerCost(burger) * count : 0);
  }, 0);
  return itemCost + eventExtraCost(pack);
}

function eventExtraCost(pack) {
  return numberValue(pack.fixedTruckCost) + numberValue(pack.staffCost) + numberValue(pack.distanceKm) * numberValue(pack.costPerKm);
}

function packageHours(pack) {
  return numberValue(pack.travelToHours) + numberValue(pack.travelBackHours) + numberValue(pack.setupHours) + numberValue(pack.onSiteHours) + numberValue(pack.breakdownHours);
}

function effectivePackageRevenue(pack, recommendedTotal) {
  return numberValue(pack.quotePrice) > 0 ? numberValue(pack.quotePrice) : recommendedTotal;
}

function profitPerHour(revenue, cost, hours) {
  return (revenue - cost) / Math.max(hours, 0.1);
}

function render() {
  renderIngredients();
  renderBurgers();
  renderPackages();
  renderStats();
  save();
}

function renderStats() {
  document.querySelector("#statIngredients").textContent = state.ingredients.length;
  document.querySelector("#statBurgers").textContent = state.burgers.length;
  document.querySelector("#statPackages").textContent = state.packages.length;
  document.querySelector("#statHourly").textContent = money.format(averagePackageHourlyProfit());
  const margins = state.burgers.map(burger => actualMargin(numberValue(burger.salePrice), burgerCost(burger)));
  const avg = margins.length ? margins.reduce((sum, item) => sum + item, 0) / margins.length : 0;
  document.querySelector("#statMargin").textContent = pct.format(avg);
}

function averagePackageHourlyProfit() {
  const hourly = state.packages.map(pack => {
    const cost = packageCost(pack);
    const recommendedTotal = recommendedPrice(cost, pack.targetMargin);
    return profitPerHour(effectivePackageRevenue(pack, recommendedTotal), cost, packageHours(pack));
  });
  return hourly.length ? hourly.reduce((sum, value) => sum + value, 0) / hourly.length : 0;
}

function renderIngredients() {
  const body = document.querySelector("#ingredientsRows");
  body.replaceChildren();
  const template = document.querySelector("#ingredientRowTemplate");

  state.ingredients.forEach(ingredient => {
    const row = template.content.firstElementChild.cloneNode(true);
    row.querySelector("[data-field='name']").value = ingredient.name;
    row.querySelector("[data-field='packagePrice']").value = ingredient.packagePrice;
    row.querySelector("[data-field='packageQuantity']").value = ingredient.packageQuantity;
    row.querySelector("[data-field='unit']").value = ingredient.unit;
    row.querySelector("[data-value='unitCost']").textContent = `${money.format(ingredientUnitCost(ingredient))} / ${ingredient.unit || "eenheid"}`;

    row.querySelectorAll("[data-field]").forEach(input => {
      input.addEventListener("change", event => {
        const field = event.target.dataset.field;
        ingredient[field] = event.target.type === "number" ? numberValue(event.target.value) : event.target.value;
        render();
      });
    });

    row.querySelector("[data-action='remove']").addEventListener("click", () => {
      state.ingredients = state.ingredients.filter(item => item.id !== ingredient.id);
      state.burgers.forEach(burger => {
        burger.recipe = burger.recipe.filter(line => line.ingredientId !== ingredient.id);
      });
      render();
    });

    body.append(row);
  });
}

function renderBurgers() {
  const host = document.querySelector("#burgerCards");
  host.replaceChildren();

  state.burgers.forEach(burger => {
    const cost = burgerCost(burger);
    const target = recommendedPrice(cost, burger.targetMargin);
    const margin = actualMargin(numberValue(burger.salePrice), cost);

    const card = element("article", "card");
    card.innerHTML = `
      <div class="card__top">
        <div class="card__title">
          <input value="${escapeAttr(burger.name)}" aria-label="Burgernaam">
          <span class="card__sub">Recept, kostprijs en marge</span>
        </div>
        <button class="icon-button danger" type="button" aria-label="Verwijder burger">x</button>
      </div>
      <div class="card__body">
        <div class="grid-3">
          <label>Arbeid per burger<input data-field="laborCost" type="number" min="0" step="0.01" value="${burger.laborCost}"></label>
          <label>Overhead per burger<input data-field="overheadCost" type="number" min="0" step="0.01" value="${burger.overheadCost}"></label>
          <label>Margeprofiel<select data-preset="product">${productMarginPresets.map(preset => `<option value="${preset.value}" ${Number(preset.value) === Number(burger.targetMargin) ? "selected" : ""}>${preset.label}</option>`).join("")}</select></label>
          <label>Doelmarge %<input data-field="targetMargin" type="number" min="0" max="95" step="1" value="${burger.targetMargin}"></label>
        </div>
        <label>Huidige verkoopprijs<input data-field="salePrice" type="number" min="0" step="0.05" value="${burger.salePrice}"></label>
        <div class="recipe"></div>
        <div class="toolbar"><button class="secondary" data-action="add-line" type="button">Ingredientregel toevoegen</button></div>
        <div class="metrics">
          <div class="metric"><span>Kostprijs</span><strong>${money.format(cost)}</strong></div>
          <div class="metric good"><span>Adviesprijs</span><strong>${money.format(target)}</strong></div>
          <div class="metric"><span>Kostpercentage bij advies</span><strong>${pct.format(cost / Math.max(target, .01))}</strong></div>
          <div class="metric ${margin < numberValue(burger.targetMargin) / 100 ? "warn" : "good"}"><span>Werkelijke marge</span><strong>${pct.format(margin)}</strong></div>
        </div>
      </div>
    `;

    card.querySelector(".card__title input").addEventListener("change", event => {
      burger.name = event.target.value;
      render();
    });

    card.querySelector(".card__top .icon-button").addEventListener("click", () => {
      state.burgers = state.burgers.filter(item => item.id !== burger.id);
      state.packages.forEach(pack => {
        pack.items = pack.items.filter(item => item.burgerId !== burger.id);
      });
      render();
    });

    card.querySelectorAll("[data-field]").forEach(input => {
      input.addEventListener("change", event => {
        burger[event.target.dataset.field] = numberValue(event.target.value);
        render();
      });
    });

    card.querySelector("[data-preset='product']").addEventListener("change", event => {
      burger.targetMargin = numberValue(event.target.value);
      render();
    });

    card.querySelector("[data-action='add-line']").addEventListener("click", () => {
      burger.recipe.push({ ingredientId: state.ingredients[0]?.id || "", quantity: 1 });
      render();
    });

    const recipeHost = card.querySelector(".recipe");
    burger.recipe.forEach((line, index) => {
      recipeHost.append(recipeLine(burger, line, index));
    });

    host.append(card);
  });
}

function recipeLine(burger, line, index) {
  const row = element("div", "recipe-line");
  row.innerHTML = `
    <select aria-label="Ingredient">${state.ingredients.map(ingredient => `<option value="${ingredient.id}" ${ingredient.id === line.ingredientId ? "selected" : ""}>${escapeHtml(ingredient.name)}</option>`).join("")}</select>
    <input type="number" min="0" step="0.01" value="${line.quantity}" aria-label="Hoeveelheid">
    <button class="icon-button danger" type="button" aria-label="Verwijder regel">x</button>
  `;
  row.querySelector("select").addEventListener("change", event => {
    line.ingredientId = event.target.value;
    render();
  });
  row.querySelector("input").addEventListener("change", event => {
    line.quantity = numberValue(event.target.value);
    render();
  });
  row.querySelector("button").addEventListener("click", () => {
    burger.recipe.splice(index, 1);
    render();
  });
  return row;
}

function renderPackages() {
  const host = document.querySelector("#packageCards");
  host.replaceChildren();

  state.packages.forEach(pack => {
    const cost = packageCost(pack);
    const recommendedTotal = recommendedPrice(cost, pack.targetMargin);
    const revenue = effectivePackageRevenue(pack, recommendedTotal);
    const perPerson = revenue / Math.max(numberValue(pack.people), 1);
    const hours = packageHours(pack);
    const profit = revenue - cost;
    const hourlyProfit = profitPerHour(revenue, cost, hours);
    const hourlyClass = hourlyProfit >= numberValue(pack.ownerHourlyTarget) ? "good" : "warn";

    const card = element("article", "card");
    card.innerHTML = `
      <div class="card__top">
        <div class="card__title">
          <input value="${escapeAttr(pack.name)}" aria-label="Pakketnaam">
          <span class="card__sub">Prijs voor groepen en events</span>
        </div>
        <button class="icon-button danger" type="button" aria-label="Verwijder pakket">x</button>
      </div>
      <div class="card__body">
        <div class="grid-2">
          <label>Aantal personen<input data-field="people" type="number" min="1" step="1" value="${pack.people}"></label>
          <label>Eventmarge profiel<select data-preset="event">${eventMarginPresets.map(preset => `<option value="${preset.value}" ${Number(preset.value) === Number(pack.targetMargin) ? "selected" : ""}>${preset.label}</option>`).join("")}</select></label>
          <label>Doelmarge %<input data-field="targetMargin" type="number" min="0" max="80" step="1" value="${pack.targetMargin}"></label>
          <label>Offerteprijs optioneel<input data-field="quotePrice" type="number" min="0" step="0.01" value="${pack.quotePrice}"></label>
          <label>Foodtruck/opstartkosten<input data-field="fixedTruckCost" type="number" min="0" step="0.01" value="${pack.fixedTruckCost}"></label>
          <label>Personeel/eventkosten<input data-field="staffCost" type="number" min="0" step="0.01" value="${pack.staffCost}"></label>
          <label>Afstand totaal km<input data-field="distanceKm" type="number" min="0" step="1" value="${pack.distanceKm}"></label>
          <label>Kost per km<input data-field="costPerKm" type="number" min="0" step="0.01" value="${pack.costPerKm}"></label>
          <label>Reistijd heen<input data-field="travelToHours" type="number" min="0" step="0.25" value="${pack.travelToHours}"></label>
          <label>Reistijd terug<input data-field="travelBackHours" type="number" min="0" step="0.25" value="${pack.travelBackHours}"></label>
          <label>Opbouw uren<input data-field="setupHours" type="number" min="0" step="0.25" value="${pack.setupHours}"></label>
          <label>Uren op locatie<input data-field="onSiteHours" type="number" min="0" step="0.25" value="${pack.onSiteHours}"></label>
          <label>Afbouw uren<input data-field="breakdownHours" type="number" min="0" step="0.25" value="${pack.breakdownHours}"></label>
          <label>Doel winst per uur<input data-field="ownerHourlyTarget" type="number" min="0" step="1" value="${pack.ownerHourlyTarget}"></label>
        </div>
        <div class="package-items"></div>
        <div class="toolbar"><button class="secondary" data-action="add-item" type="button">Burger toevoegen aan pakket</button></div>
        <div class="metrics">
          <div class="metric"><span>Totale kost</span><strong>${money.format(cost)}</strong></div>
          <div class="metric good"><span>Advies pakketprijs</span><strong>${money.format(recommendedTotal)}</strong></div>
          <div class="metric"><span>Prijs per persoon</span><strong>${money.format(perPerson)}</strong></div>
          <div class="metric"><span>Totale uren</span><strong>${hours.toFixed(2)}</strong></div>
          <div class="metric ${hourlyClass}"><span>Winst per uur</span><strong>${money.format(hourlyProfit)}</strong></div>
          <div class="metric ${profit >= 0 ? "good" : "warn"}"><span>Eventwinst</span><strong>${money.format(profit)}</strong></div>
        </div>
      </div>
    `;

    card.querySelector(".card__title input").addEventListener("change", event => {
      pack.name = event.target.value;
      render();
    });

    card.querySelector(".card__top .icon-button").addEventListener("click", () => {
      state.packages = state.packages.filter(item => item.id !== pack.id);
      render();
    });

    card.querySelectorAll("[data-field]").forEach(input => {
      input.addEventListener("change", event => {
        pack[event.target.dataset.field] = numberValue(event.target.value);
        render();
      });
    });

    card.querySelector("[data-preset='event']").addEventListener("change", event => {
      pack.targetMargin = numberValue(event.target.value);
      render();
    });

    card.querySelector("[data-action='add-item']").addEventListener("click", () => {
      pack.items.push({ burgerId: state.burgers[0]?.id || "", quantityPerPerson: 1, included: numberValue(pack.people) });
      render();
    });

    const itemsHost = card.querySelector(".package-items");
    pack.items.forEach((item, index) => {
      itemsHost.append(packageLine(pack, item, index));
    });

    host.append(card);
  });
}

function packageLine(pack, item, index) {
  const row = element("div", "package-line");
  row.innerHTML = `
    <select aria-label="Burger">${state.burgers.map(burger => `<option value="${burger.id}" ${burger.id === item.burgerId ? "selected" : ""}>${escapeHtml(burger.name)}</option>`).join("")}</select>
    <input type="number" min="0" step="0.1" value="${item.quantityPerPerson}" aria-label="Aantal per persoon">
    <input type="number" min="0" step="1" value="${item.included}" aria-label="Totaal inbegrepen">
    <button class="icon-button danger" type="button" aria-label="Verwijder regel">x</button>
  `;
  row.querySelector("select").addEventListener("change", event => {
    item.burgerId = event.target.value;
    render();
  });
  row.querySelectorAll("input")[0].addEventListener("change", event => {
    item.quantityPerPerson = numberValue(event.target.value);
    render();
  });
  row.querySelectorAll("input")[1].addEventListener("change", event => {
    item.included = numberValue(event.target.value);
    render();
  });
  row.querySelector("button").addEventListener("click", () => {
    pack.items.splice(index, 1);
    render();
  });
  return row;
}

function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(item => item.classList.remove("is-active"));
    document.querySelectorAll(".panel").forEach(panel => panel.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`#${tab.dataset.tab}`).classList.add("is-active");
  });
});

document.querySelector("#addIngredient").addEventListener("click", () => {
  state.ingredients.push({ id: crypto.randomUUID(), name: "Nieuw ingredient", packagePrice: 0, packageQuantity: 1, unit: "stuk" });
  render();
});

document.querySelector("#addBurger").addEventListener("click", () => {
  state.burgers.push({
    id: crypto.randomUUID(),
    name: "Nieuwe burger",
    laborCost: 0,
    overheadCost: 0,
    targetMargin: 65,
    salePrice: 0,
    recipe: []
  });
  render();
});

document.querySelector("#addPackage").addEventListener("click", () => {
  state.packages.push({
    id: crypto.randomUUID(),
    name: "Nieuw groepspakket",
    people: 25,
    fixedTruckCost: 0,
    staffCost: 0,
    targetMargin: 30,
    quotePrice: 0,
    travelToHours: 0.5,
    travelBackHours: 0.5,
    setupHours: 1,
    onSiteHours: 3,
    breakdownHours: 0.75,
    distanceKm: 0,
    costPerKm: 0.35,
    ownerHourlyTarget: 55,
    items: []
  });
  render();
});

render();
