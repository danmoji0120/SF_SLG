const TOKEN_KEY = "sf_slg_token";
const USERNAME_KEY = "sf_slg_username";

let authToken = localStorage.getItem(TOKEN_KEY) || "";
let captureButtons = [];
let researchButtons = [];
let admiralButtons = [];
let pvpButtons = [];
let currentZones = [];
let currentPlayers = [];
let selectedZoneId = null;
let selectedPlayerId = null;
let currentBase = null;
let moveFuelPerDistance = 120;
let mapDragState = null;
let activeTab = "map";
let shipyardOptions = { hulls: [], components: [] };
let shipDesigns = [];
let zoneSearchOpen = false;
let activeRouteTimer = null;
let activeMissions = [];
let missionPoller = null;
let productionQueueState = [];
let productionTickTimer = null;
let productionSyncTimer = null;

const elements = {
  authPanel: document.getElementById("authPanel"),
  gamePanel: document.getElementById("gamePanel"),
  usernameInput: document.getElementById("usernameInput"),
  passwordInput: document.getElementById("passwordInput"),
  signupButton: document.getElementById("signupButton"),
  loginButton: document.getElementById("loginButton"),
  logoutButton: document.getElementById("logoutButton"),
  refreshResourcesButton: document.getElementById("refreshResourcesButton"),
  refreshFleetButton: document.getElementById("refreshFleetButton"),
  refreshZonesButton: document.getElementById("refreshZonesButton"),
  refreshPlayersButton: document.getElementById("refreshPlayersButton"),
  battleButton: document.getElementById("battleButton"),
  toggleZoneSearchButton: document.getElementById("toggleZoneSearchButton"),
  zoneSearchPanel: document.getElementById("zoneSearchPanel"),
  zoneSearchInput: document.getElementById("zoneSearchInput"),
  zoneLevelFilter: document.getElementById("zoneLevelFilter"),
  zoneOwnerFilter: document.getElementById("zoneOwnerFilter"),
  drawAdmiralButton: document.getElementById("drawAdmiralButton"),
  moveBaseButton: document.getElementById("moveBaseButton"),
  saveDesignButton: document.getElementById("saveDesignButton"),
  startProductionButton: document.getElementById("startProductionButton"),
  baseMoveX: document.getElementById("baseMoveX"),
  baseMoveY: document.getElementById("baseMoveY"),
  designNameInput: document.getElementById("designNameInput"),
  hullSelect: document.getElementById("hullSelect"),
  engineSlots: document.getElementById("engineSlots"),
  weaponSlots: document.getElementById("weaponSlots"),
  defenseSlots: document.getElementById("defenseSlots"),
  utilitySlots: document.getElementById("utilitySlots"),
  designPreview: document.getElementById("designPreview"),
  productionDesignSelect: document.getElementById("productionDesignSelect"),
  productionQuantityInput: document.getElementById("productionQuantityInput"),
  productionQueueView: document.getElementById("productionQueueView"),
  ownedShipsView: document.getElementById("ownedShipsView"),
  baseView: document.getElementById("baseView"),
  baseMoveCostView: document.getElementById("baseMoveCostView"),
  commanderName: document.getElementById("commanderName"),
  resourcesView: document.getElementById("resourcesView"),
  productionView: document.getElementById("productionView"),
  fleetView: document.getElementById("fleetView"),
  shipCostView: document.getElementById("shipCostView"),
  researchView: document.getElementById("researchView"),
  admiralView: document.getElementById("admiralView"),
  playerTargetView: document.getElementById("playerTargetView"),
  zoneMapView: document.getElementById("zoneMapView"),
  zoneDetailView: document.getElementById("zoneDetailView"),
  zoneView: document.getElementById("zoneView"),
  empireView: document.getElementById("empireView"),
  battleLog: document.getElementById("battleLog"),
  statusMessage: document.getElementById("statusMessage"),
  errorMessage: document.getElementById("errorMessage")
};

const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));

function setStatus(message) {
  elements.statusMessage.textContent = message || "";
}

function setError(message) {
  elements.errorMessage.textContent = message || "";
}

function clearMessages() {
  setStatus("");
  setError("");
}

function setBusy(isBusy) {
  [
    elements.signupButton,
    elements.loginButton,
    elements.logoutButton,
    elements.refreshResourcesButton,
    elements.refreshFleetButton,
    elements.refreshZonesButton,
    elements.refreshPlayersButton,
    elements.battleButton,
    elements.drawAdmiralButton,
    elements.moveBaseButton,
    elements.saveDesignButton,
    elements.startProductionButton,
    elements.toggleZoneSearchButton,
    ...captureButtons,
    ...researchButtons,
    ...admiralButtons,
    ...pvpButtons
  ].filter(Boolean).forEach((button) => {
    button.disabled = isBusy;
  });
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(data.error || data.message || "\uc694\uccad \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.");
  }

  return data;
}

function getCredentials() {
  return {
    username: elements.usernameInput.value.trim(),
    password: elements.passwordInput.value
  };
}

function showAuth() {
  elements.authPanel.classList.remove("hidden");
  elements.gamePanel.classList.add("hidden");
}

function showGame(username) {
  elements.authPanel.classList.add("hidden");
  elements.gamePanel.classList.remove("hidden");
  elements.commanderName.textContent = `${username || "\uc0ac\ub839\uad00"} \uae30\uc9c0`;
}

function saveSession(token, username) {
  authToken = token;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

function clearSession() {
  authToken = "";
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

function estimateMoveCost(toX, toY) {
  if (!currentBase) return 0;
  const dx = Number(currentBase.x) - Number(toX);
  const dy = Number(currentBase.y) - Number(toY);
  return Math.ceil(Math.sqrt(dx * dx + dy * dy) * moveFuelPerDistance);
}

function renderBase(data) {
  if (!data?.base) return;
  currentBase = data.base;
  moveFuelPerDistance = Number(data.moveFuelPerDistance || moveFuelPerDistance);
  elements.baseView.innerHTML = `X ${currentBase.x}, Y ${currentBase.y}<br>\uc774\ub3d9 \ube44\uc6a9: \uac70\ub9ac 1\ub2f9 \uc5f0\ub8cc ${moveFuelPerDistance}`;
  elements.baseMoveX.value = currentBase.x;
  elements.baseMoveY.value = currentBase.y;
  renderMoveCost();
}

function renderMoveCost() {
  const x = Number(elements.baseMoveX.value);
  const y = Number(elements.baseMoveY.value);
  const cost = estimateMoveCost(x, y);
  elements.baseMoveCostView.textContent = `\uc608\uc0c1 \uc774\ub3d9 \ube44\uc6a9: \uc5f0\ub8cc ${cost.toLocaleString()}`;
}

function showTab(tabName) {
  activeTab = tabName;
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  });
}

function setupMapDragging() {
  const map = elements.zoneMapView;

  map.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" && event.button !== 0) return;
    const hitButton = event.target.closest(".map-node, .player-base-node, .base-node, [data-select-zone], [data-select-player], [data-capture-zone], [data-pvp-target]");
    if (hitButton) return;

    mapDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: map.scrollLeft,
      scrollTop: map.scrollTop,
      moved: false
    };
    map.classList.add("dragging");
    try {
      map.setPointerCapture(event.pointerId);
    } catch (err) {
      // pointer capture can fail on some mobile browsers
    }
  });

  map.addEventListener("pointermove", (event) => {
    if (!mapDragState || mapDragState.pointerId !== event.pointerId) return;

    const dx = event.clientX - mapDragState.startX;
    const dy = event.clientY - mapDragState.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      mapDragState.moved = true;
    }

    map.scrollLeft = mapDragState.scrollLeft - dx;
    map.scrollTop = mapDragState.scrollTop - dy;
  });

  function endDrag(event) {
    if (!mapDragState || mapDragState.pointerId !== event.pointerId) return;

    if (mapDragState.moved) {
      event.preventDefault();
      const suppressClick = (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        map.removeEventListener("click", suppressClick, true);
      };
      map.addEventListener("click", suppressClick, true);
    }

    map.classList.remove("dragging");
    mapDragState = null;
  }

  map.addEventListener("pointerup", endDrag);
  map.addEventListener("pointercancel", endDrag);
  map.addEventListener("lostpointercapture", () => {
    map.classList.remove("dragging");
    mapDragState = null;
  });
}

function renderResources(resources) {
  const safeResources = resources || {};
  const production = safeResources.production || {};
  const base = production.base || { metal: 2, fuel: 1 };
  const zones = production.zones || { metal: 0, fuel: 0 };

  elements.resourcesView.innerHTML = `
    \uae08\uc18d ${Number(safeResources.metal || 0).toLocaleString()}<br>
    \uc5f0\ub8cc ${Number(safeResources.fuel || 0).toLocaleString()}
  `;

  elements.productionView.textContent =
    `\ucd08\ub2f9 \uc0dd\uc0b0: \uae08\uc18d ${Number(production.metalPerSecond || base.metal)}, \uc5f0\ub8cc ${Number(production.fuelPerSecond || base.fuel)} ` +
    `(\uae30\uc9c0 ${base.metal}/${base.fuel}, \uc810\ub839\uc9c0 ${zones.metal}/${zones.fuel}, \ubc30\uc728 x${Number(production.multiplier || 1).toFixed(2)})`;
}

function renderFleet(fleet) {
  const ships = Array.isArray(fleet) ? fleet : [];

  elements.fleetView.innerHTML = ships.length
    ? ships
        .map((ship) => {
          return `
            <div class="fleet-line">
              <strong>${ship.name} ${Number(ship.quantity || 0).toLocaleString()}\ucc99</strong>
              <span>HP ${ship.finalHp}, \uacf5\uaca9 ${ship.finalAttack}, \ubc29\uc5b4 ${ship.finalDefense}, \uc18d\ub3c4 ${ship.finalSpeed}</span>
            </div>
          `;
        })
        .join("")
    : "\ubcf4\uc720\ud55c \uc124\uacc4 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.";
}

function renderShipCosts() {
  if (elements.shipCostView) elements.shipCostView.textContent = "";
}

function optionLabel(component) {
  return `${component.name} / \uc804\ub825 ${component.powerCost}, \uae08\uc18d ${component.metalCost}, \uc5f0\ub8cc ${component.fuelCost}`;
}

function fillSelect(select, items, labelFn) {
  select.innerHTML = items
    .map((item) => `<option value="${item.id}">${labelFn(item)}</option>`)
    .join("");
}

function getSelectedHull() {
  return shipyardOptions.hulls.find((item) => Number(item.id) === Number(elements.hullSelect.value));
}

function getCategoryOptions(category) {
  return shipyardOptions.components.filter((item) => item.category === category);
}

function createSlotSelects() {
  const hull = getSelectedHull();
  if (!hull) return;

  const slotMap = {
    engine: elements.engineSlots,
    weapon: elements.weaponSlots,
    defense: elements.defenseSlots,
    utility: elements.utilitySlots
  };

  for (const [category, container] of Object.entries(slotMap)) {
    const count = Number(hull.slots?.[category] || 1);
    const options = getCategoryOptions(category);
    container.innerHTML = Array.from({ length: count }, (_, idx) => {
      const optionsHtml = options.map((item) => `<option value="${item.id}">${optionLabel(item)}</option>`).join("");
      return `<select data-slot-category="${category}" data-slot-index="${idx}">${optionsHtml}</select>`;
    }).join("");
  }
}

function getSelectedComponents(category) {
  const container = elements[`${category}Slots`];
  const options = getCategoryOptions(category);
  return Array.from(container.querySelectorAll("select"))
    .map((select) => options.find((item) => Number(item.id) === Number(select.value)))
    .filter(Boolean);
}

function calculateDesignPreview() {
  const hull = getSelectedHull();
  if (!hull) return null;

  const byCategory = {
    engines: getSelectedComponents("engine"),
    weapons: getSelectedComponents("weapon"),
    defenses: getSelectedComponents("defense"),
    utilities: getSelectedComponents("utility")
  };
  const components = [
    ...byCategory.engines,
    ...byCategory.weapons,
    ...byCategory.defenses,
    ...byCategory.utilities
  ];
  const expectedCount = Number(hull.slots.engine || 1) + Number(hull.slots.weapon || 1) + Number(hull.slots.defense || 1) + Number(hull.slots.utility || 1);
  if (components.length !== expectedCount) return null;

  const totalPower = components.reduce((sum, item) => sum + item.powerCost, 0);
  const totalMetalCost = hull.metalCost + components.reduce((sum, item) => sum + item.metalCost, 0);
  const totalFuelCost = hull.fuelCost + components.reduce((sum, item) => sum + item.fuelCost, 0);
  const finalHp = hull.baseHp + components.reduce((sum, item) => sum + item.hpBonus, 0);
  const finalAttack = components.reduce((sum, item) => sum + item.attackBonus, 0);
  const finalDefense = components.reduce((sum, item) => sum + item.defenseBonus, 0);
  const finalSpeed = Math.max(1, hull.baseSpeed + components.reduce((sum, item) => sum + item.speedBonus, 0));
  const complexity = Math.pow(1 + totalPower / 110, 1.45);
  const slotWeight = hull.slots.engine * 0.6 + hull.slots.weapon * 1.2 + hull.slots.defense + hull.slots.utility * 0.7;
  const totalBuildTime = Math.max(20, Math.floor(hull.baseBuildTime * complexity + slotWeight * 25));

  return { hull, byCategory, components, totalPower, totalMetalCost, totalFuelCost, finalHp, finalAttack, finalDefense, finalSpeed, totalBuildTime };
}

function renderDesignPreview() {
  const preview = calculateDesignPreview();
  if (!preview) {
    elements.designPreview.textContent = "\uc124\uacc4 \uc635\uc158\uc744 \ubd88\ub7ec\uc624\ub294 \uc911\uc785\ub2c8\ub2e4.";
    return;
  }

  const overPower = preview.totalPower > preview.hull.powerLimit;
  elements.designPreview.innerHTML = `
    <div class="stat-grid">
      <span>HP ${preview.finalHp}</span>
      <span>\uacf5\uaca9 ${preview.finalAttack}</span>
      <span>\ubc29\uc5b4 ${preview.finalDefense}</span>
      <span>\uc18d\ub3c4 ${preview.finalSpeed}</span>
      <span class="${overPower ? "danger-text" : ""}">\uc804\ub825 ${preview.totalPower}/${preview.hull.powerLimit}</span>
      <span>\ube44\uc6a9 \uae08\uc18d ${preview.totalMetalCost}, \uc5f0\ub8cc ${preview.totalFuelCost}</span>
      <span>\uc0dd\uc0b0 \uc2dc\uac04 ${formatSeconds(preview.totalBuildTime)}</span>
    </div>
  `;
}

function renderShipyardOptions() {
  fillSelect(elements.hullSelect, shipyardOptions.hulls, (hull) => `${hull.name} / \uc804\ub825 ${hull.powerLimit}`);
  createSlotSelects();
  renderDesignPreview();
}

function renderDesigns(data) {
  shipDesigns = Array.isArray(data?.designs) ? data.designs : [];
  elements.productionDesignSelect.innerHTML = shipDesigns.length
    ? shipDesigns.map((design) => `<option value="${design.id}">${design.name} / ${design.hullName}</option>`).join("")
    : `<option value="">\uc800\uc7a5\ub41c \uc124\uacc4\uc548 \uc5c6\uc74c</option>`;
}

function formatSeconds(seconds) {
  const value = Number(seconds || 0);
  if (value < 60) return `${value}\ucd08`;
  return `${Math.floor(value / 60)}\ubd84 ${value % 60}\ucd08`;
}

function renderProduction(data) {
  const queue = Array.isArray(data?.queue) ? data.queue : [];
  const owned = Array.isArray(data?.ownedShips) ? data.ownedShips : [];
  productionQueueState = queue;

  renderProductionQueueRealtime();
  setupProductionRealtimeSync();

  elements.ownedShipsView.innerHTML = owned.length
    ? owned.map((item) => `
      <div class="growth-item">
        <div>
          <strong>${item.name} ${item.quantity}\ucc99</strong>
          <span>HP ${item.finalHp}, \uacf5\uaca9 ${item.finalAttack}, \ubc29\uc5b4 ${item.finalDefense}, \uc18d\ub3c4 ${item.finalSpeed}</span>
        </div>
      </div>
    `).join("")
    : `<div class="growth-item"><div>\ubcf4\uc720\ud55c \uc124\uacc4\ubcc4 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
}

function renderProductionQueueRealtime() {
  const queue = productionQueueState;
  if (!queue.length) {
    elements.productionQueueView.innerHTML = `<div class="growth-item"><div>\uc0dd\uc0b0 \ud050\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.</div></div>`;
    return;
  }

  const now = Date.now();
  elements.productionQueueView.innerHTML = queue
    .map((item) => {
      const remainingSeconds = item.status === "building"
        ? Math.max(0, Math.ceil((Number(item.endTime || 0) - now) / 1000))
        : 0;
      const text = item.status === "building" ? `\uc644\ub8cc\uae4c\uc9c0 ${formatSeconds(remainingSeconds)}` : "\uc644\ub8cc\ub428";
      return `
        <div class="growth-item">
          <div>
            <strong>${item.designName} ${item.quantity}\ucc99</strong>
            <span>${text}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function clearProductionTimers() {
  if (productionTickTimer) {
    clearInterval(productionTickTimer);
    productionTickTimer = null;
  }
  if (productionSyncTimer) {
    clearInterval(productionSyncTimer);
    productionSyncTimer = null;
  }
}

function setupProductionRealtimeSync() {
  clearProductionTimers();
  if (!productionQueueState.some((item) => item.status === "building")) return;

  productionTickTimer = setInterval(() => {
    renderProductionQueueRealtime();
  }, 1000);

  productionSyncTimer = setInterval(async () => {
    try {
      const data = await api("/production");
      productionQueueState = Array.isArray(data?.queue) ? data.queue : [];
      renderProductionQueueRealtime();
      if (Array.isArray(data?.ownedShips)) {
        elements.ownedShipsView.innerHTML = data.ownedShips.length
          ? data.ownedShips.map((item) => `
            <div class="growth-item">
              <div>
                <strong>${item.name} ${item.quantity}\ucc99</strong>
                <span>HP ${item.finalHp}, \uacf5\uaca9 ${item.finalAttack}, \ubc29\uc5b4 ${item.finalDefense}, \uc18d\ub3c4 ${item.finalSpeed}</span>
              </div>
            </div>
          `).join("")
          : `<div class="growth-item"><div>\ubcf4\uc720\ud55c \uc124\uacc4\ubcc4 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
      }
      if (!productionQueueState.some((item) => item.status === "building")) {
        clearProductionTimers();
        await loadFleet();
      }
    } catch (err) {
      // keep local countdown running even if sync fails temporarily
    }
  }, 4000);
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function renderResearch(data) {
  const items = Array.isArray(data?.research) ? data.research : [];

  if (!items.length) {
    elements.researchView.textContent = "\uc5f0\uad6c \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.";
    researchButtons = [];
    return;
  }

  elements.researchView.innerHTML = `
    <div class="tech-tree">
      ${items
    .map((item) => {
      return `
        <div class="tech-node level-${Math.min(5, Number(item.level || 0) + 1)}">
          <div>
            <strong>${item.name} Lv.${item.level}</strong>
            <p>${item.description}</p>
            <span>\ub808\ubca8\ub2f9 \ud6a8\uacfc ${percent(item.effectPerLevel)}</span>
            <span>\ub2e4\uc74c \ube44\uc6a9: \uae08\uc18d ${item.nextCost.metal.toLocaleString()}, \uc5f0\ub8cc ${item.nextCost.fuel.toLocaleString()}</span>
          </div>
          <button type="button" data-research-type="${item.type}">\uc5f0\uad6c</button>
        </div>
      `;
    })
    .join("")}
    </div>
  `;

  researchButtons = Array.from(document.querySelectorAll("[data-research-type]"));
  researchButtons.forEach((button) => {
    button.addEventListener("click", () => upgradeResearch(button.dataset.researchType));
  });
}

function renderAdmirals(data) {
  const admirals = Array.isArray(data?.admirals) ? data.admirals : [];

  if (!admirals.length) {
    elements.admiralView.textContent = "\ubcf4\uc720 \uc81c\ub3c5\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.";
    admiralButtons = [];
    return;
  }

  elements.admiralView.innerHTML = admirals
    .map((admiral) => {
      const assigned = Number(admiral.assigned) === 1;
      return `
        <div class="growth-item ${assigned ? "assigned" : ""}">
          <div>
            <strong>[${admiral.rarity}] ${admiral.name}${assigned ? " / \ubc30\uce58 \uc911" : ""}</strong>
            <span>\uc804\ud22c +${percent(admiral.combatBonus)}, \uc0dd\uc0b0 +${percent(admiral.resourceBonus)}, \ube44\uc6a9 -${percent(admiral.costBonus)}</span>
          </div>
          <button type="button" data-assign-admiral="${admiral.id}" ${assigned ? "disabled" : ""}>\ubc30\uce58</button>
        </div>
      `;
    })
    .join("");

  admiralButtons = Array.from(document.querySelectorAll("[data-assign-admiral]"));
  admiralButtons.forEach((button) => {
    button.addEventListener("click", () => assignAdmiral(button.dataset.assignAdmiral));
  });
}

function renderPlayers(data) {
  const players = Array.isArray(data?.players) ? data.players : [];
  if (!elements.playerTargetView) {
    pvpButtons = [];
    return;
  }

  if (!players.length) {
    elements.playerTargetView.textContent = "\uacf5\uaca9\ud560 \ub2e4\ub978 \uc720\uc800\uac00 \uc5c6\uc2b5\ub2c8\ub2e4. \ud14c\uc2a4\ud2b8\ub97c \uc704\ud574 \uacc4\uc815\uc744 \ud558\ub098 \ub354 \ub9cc\ub4e4\uc5b4\uc8fc\uc138\uc694.";
    pvpButtons = [];
    return;
  }

  elements.playerTargetView.innerHTML = players
    .map((player) => {
      const admiral = player.assignedAdmiral ? player.assignedAdmiral.name : "\uc5c6\uc74c";
      return `
        <div class="growth-item">
          <div>
            <strong>${player.username}</strong>
            <span>\ud568\ub300 \uc804\ud22c\ub825 ${player.fleetPower.toLocaleString()} / \uc810\ub839\uc9c0 ${player.occupiedZones}</span>
            <span>\ucd94\uc815 \uc790\uc6d0: \uae08\uc18d ${player.estimatedMetal.toLocaleString()}, \uc5f0\ub8cc ${player.estimatedFuel.toLocaleString()}</span>
            <span>\ubc30\uce58 \uc81c\ub3c5: ${admiral}</span>
          </div>
          <button type="button" data-pvp-target="${player.id}" class="primary">\uae30\uc9c0 \uae30\uc2b5</button>
        </div>
      `;
    })
    .join("");

  pvpButtons = Array.from(document.querySelectorAll("[data-pvp-target]"));
  pvpButtons.forEach((button) => {
    button.addEventListener("click", () => attackPlayer(button.dataset.pvpTarget));
  });
}

function fleetText(fleet) {
  const names = {
    corvette: "\ucd08\uacc4\ud568",
    destroyer: "\uad6c\ucd95\ud568",
    cruiser: "\uc21c\uc591\ud568",
    battleship: "\uc804\ud568",
    carrier: "\ud56d\uacf5\ubaa8\ud568"
  };
  const safeFleet = fleet || {};

  return Object.keys(names)
    .filter((type) => Number(safeFleet[type] || 0) > 0)
    .map((type) => `${names[type]} ${Number(safeFleet[type] || 0)}\ucc99`)
    .join(", ") || "\uc815\ubcf4 \uc5c6\uc74c";
}

function renderMap(data) {
  renderBase({ base: data?.base, moveFuelPerDistance });
  currentPlayers = Array.isArray(data?.players) ? data.players : [];
  activeMissions = Array.isArray(data?.activeMissions) ? data.activeMissions : [];
  renderZones(data?.zones);
  renderMissionRoute();
}

function renderBattleRecords(records) {
  const list = Array.isArray(records) ? records : [];
  if (!list.length) {
    elements.battleLog.textContent = "\uc544\uc9c1 \uc804\ud22c \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.";
    return;
  }
  elements.battleLog.textContent = list
    .map((item) => {
      const time = new Date(item.createdAt).toLocaleString();
      const lines = Array.isArray(item.log) ? item.log.join("\n") : "";
      return `[${time}] ${item.title} / ${item.result}\n${lines}`;
    })
    .join("\n\n----------------\n\n");
}

function renderMissionRoute() {
  if (!activeMissions.length) {
    clearRoute();
    return;
  }
  const mission = activeMissions[0];
  showRouteTo(mission.to, mission.remainingSeconds);
}

async function refreshMissionsAndRecords() {
  const [missionData, recordData] = await Promise.all([api("/missions"), api("/battle-records")]);
  activeMissions = Array.isArray(missionData?.activeMissions) ? missionData.activeMissions : [];
  renderMissionRoute();
  renderBattleRecords(recordData?.records);
  if (activeMissions.length) {
    if (!missionPoller) {
      missionPoller = setInterval(async () => {
        try {
          const [missions, records] = await Promise.all([api("/missions"), api("/battle-records")]);
          activeMissions = Array.isArray(missions?.activeMissions) ? missions.activeMissions : [];
          renderMissionRoute();
          renderBattleRecords(records?.records);
          if (!activeMissions.length && missionPoller) {
            clearInterval(missionPoller);
            missionPoller = null;
            await Promise.all([loadZones(), loadFleet()]);
          }
        } catch (err) {
          // ignore intermittent polling errors
        }
      }, 2000);
    }
  } else if (missionPoller) {
    clearInterval(missionPoller);
    missionPoller = null;
  }
}

function filteredZones() {
  const query = (elements.zoneSearchInput?.value || "").trim().toLowerCase();
  const level = elements.zoneLevelFilter?.value || "";
  const owner = elements.zoneOwnerFilter?.value || "";

  return currentZones.filter((zone) => {
    const text = `${zone.name || ""} ${zone.ownerUsername || ""}`.toLowerCase();
    const matchesText = !query || text.includes(query);
    const matchesLevel = !level || String(zone.level) === level;
    const matchesOwner =
      !owner ||
      (owner === "neutral" && !zone.occupied) ||
      (owner === "mine" && zone.ownedByMe) ||
      (owner === "enemy" && zone.occupied && !zone.ownedByMe);

    return matchesText && matchesLevel && matchesOwner;
  });
}

function renderZoneSearchList() {
  if (!elements.zoneSearchPanel || !elements.zoneView) return;
  elements.zoneSearchPanel.classList.toggle("hidden", !zoneSearchOpen);
  if (!zoneSearchOpen) return;

  const zones = filteredZones();
  elements.zoneView.innerHTML = zones.length
    ? zones
        .map((zone) => {
          return `
            <button type="button" class="zone-row ${Number(zone.id) === Number(selectedZoneId) ? "selected" : ""}" data-select-zone="${zone.id}">
              <div>
                <strong>Lv.${zone.level} ${zone.name}</strong>
                <span>${zone.ownerUsername ? `\uc18c\uc720: ${zone.ownerUsername}` : "\uc911\ub9bd"} / \uae08\uc18d +${zone.metalRate}/s, \uc5f0\ub8cc +${zone.fuelRate}/s</span>
              </div>
              <span>${zone.ownedByMe ? "\ub0b4 \uc810\ub839\uc9c0" : zone.occupied ? "\ud0c8\ucde8 \uac00\ub2a5" : `\uad8c\uc7a5 ${zone.recommendedPower}`}</span>
            </button>
          `;
        })
        .join("")
    : `<div class="zone-row">\uac80\uc0c9 \uc870\uac74\uc5d0 \ub9de\ub294 \uac70\uc810\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>`;

  Array.from(elements.zoneView.querySelectorAll("[data-select-zone]")).forEach((button) => {
    button.addEventListener("click", () => selectZone(button.dataset.selectZone));
  });
}

function toggleZoneSearch() {
  zoneSearchOpen = !zoneSearchOpen;
  renderZoneSearchList();
}

function clearRoute() {
  if (activeRouteTimer) {
    clearInterval(activeRouteTimer);
    activeRouteTimer = null;
  }
  document.querySelector(".route-layer")?.remove();
  document.querySelector(".travel-countdown")?.remove();
}

function showRouteTo(target, seconds) {
  if (!currentBase || !target) return;
  const content = elements.zoneMapView.querySelector(".map-content");
  if (!content) return;

  clearRoute();
  const startX = Number(currentBase.x || 50) * 18;
  const startY = Number(currentBase.y || 50) * 11;
  const endX = Number(target.x || 50) * 18;
  const endY = Number(target.y || 50) * 11;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "route-layer");
  svg.setAttribute("viewBox", "0 0 1800 1100");
  svg.innerHTML = `
    <defs>
      <marker id="routeArrow" markerWidth="12" markerHeight="12" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z"></path>
      </marker>
    </defs>
    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}"></line>
  `;
  content.appendChild(svg);

  const timer = document.createElement("div");
  timer.className = "travel-countdown";
  content.appendChild(timer);

  let remaining = Math.max(0, Number(seconds || 0));
  const update = () => {
    timer.textContent = `\ub0a8\uc740 \uc774\ub3d9: ${formatSeconds(remaining)}`;
    remaining -= 1;
    if (remaining < 0) clearRoute();
  };
  update();
  activeRouteTimer = setInterval(update, 1000);
}

function renderZones(zones) {
  const safeZones = Array.isArray(zones) ? zones : [];
  currentZones = safeZones;

  if (!safeZones.length) {
    elements.zoneMapView.textContent = "\uc911\ub9bd \uad6c\uc5ed\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.";
    if (elements.zoneView) elements.zoneView.textContent = "\uc911\ub9bd \uad6c\uc5ed\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.";
    elements.zoneDetailView.textContent = "\uac80\uc0c9\ub41c \uac70\uc810\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.";
    captureButtons = [];
    return;
  }

  if (!selectedZoneId || !safeZones.some((zone) => Number(zone.id) === Number(selectedZoneId))) {
    selectedZoneId = safeZones[0].id;
  }

  const mapContent = safeZones
    .map((zone) => {
      const classes = [
        "map-node",
        `level-${zone.level}`,
        zone.occupied ? "occupied" : "",
        Number(zone.id) === Number(selectedZoneId) ? "selected" : ""
      ].filter(Boolean).join(" ");

      return `
        <button
          type="button"
          class="${classes}"
          data-select-zone="${zone.id}"
          style="--x: ${Number(zone.x || 50) / 100}; --y: ${Number(zone.y || 50) / 100};"
          title="${zone.name}"
        >
          <span>${zone.level}</span>
        </button>
      `;
    })
    .join("") + currentPlayers
    .map((player) => {
      return `
        <button
          type="button"
          class="player-base-node ${Number(player.id) === Number(selectedPlayerId) ? "selected" : ""}"
          data-select-player="${player.id}"
          style="--x: ${Number(player.base?.x || 50) / 100}; --y: ${Number(player.base?.y || 50) / 100};"
          title="${player.username}"
        >
          P
        </button>
      `;
    })
    .join("") + (currentBase ? `
      <button
        type="button"
        class="base-node"
        style="--x: ${Number(currentBase.x || 50) / 100}; --y: ${Number(currentBase.y || 50) / 100};"
        title="\ub0b4 \uae30\uc9c0"
      >
        B
      </button>
    ` : "");
  elements.zoneMapView.innerHTML = `<div class="map-content">${mapContent}</div>`;

  if (currentBase) {
    const baseNode = elements.zoneMapView.querySelector(".base-node");
    baseNode?.addEventListener("click", () => {
      elements.baseMoveX.value = currentBase.x;
      elements.baseMoveY.value = currentBase.y;
      renderMoveCost();
    });
  }

  Array.from(document.querySelectorAll("[data-select-zone]")).forEach((button) => {
    button.addEventListener("click", () => selectZone(button.dataset.selectZone));
  });
  Array.from(document.querySelectorAll("[data-select-player]")).forEach((button) => {
    button.addEventListener("click", () => selectPlayer(button.dataset.selectPlayer));
  });

  if (selectedPlayerId) renderSelectedPlayer();
  else renderSelectedZone();
  renderZoneSearchList();
}

function selectZone(zoneId) {
  selectedZoneId = Number(zoneId);
  selectedPlayerId = null;
  renderZones(currentZones);
}

function selectPlayer(playerId) {
  selectedPlayerId = Number(playerId);
  selectedZoneId = null;
  renderZones(currentZones);
}

function renderSelectedZone() {
  const zone = currentZones.find((item) => Number(item.id) === Number(selectedZoneId));

  if (!zone) {
    elements.zoneDetailView.textContent = "\uac70\uc810\uc744 \uc120\ud0dd\ud558\uc138\uc694.";
    captureButtons = [];
    return;
  }

  const action = zone.occupied
    ? zone.ownedByMe
      ? `<button type="button" disabled>\uc774\ubbf8 \uc810\ub839\ud55c \uac70\uc810</button>`
      : `<button type="button" data-capture-zone="${zone.id}" class="primary">\uc810\ub839\uc9c0 \ud0c8\ucde8</button>`
    : `<button type="button" data-capture-zone="${zone.id}" class="primary">\uc810\ub839 \ucd9c\uaca9</button>`;

  elements.zoneDetailView.innerHTML = `
    <p class="eyebrow">Level ${zone.level}</p>
    <h4>${zone.name}</h4>
    <p>${zone.description}</p>
    <div class="detail-stats">
      <span>\uc0dd\uc0b0: \uae08\uc18d +${zone.metalRate}/s, \uc5f0\ub8cc +${zone.fuelRate}/s</span>
      <span>\uc18c\uc720\uc790: ${zone.ownerUsername || "\uc911\ub9bd"}</span>
      <span>\uad8c\uc7a5 \uc804\ud22c\ub825: ${zone.recommendedPower}</span>
      <span>\uc8fc\ub454\uad70 \uc804\ud22c\ub825: ${zone.actualPower}</span>
      <span>\uc8fc\ub454\uad70: ${fleetText(zone.garrison)}</span>
    </div>
    ${action}
  `;

  captureButtons = Array.from(document.querySelectorAll("[data-capture-zone]"));
  captureButtons.forEach((button) => {
    button.addEventListener("click", () => captureZone(button.dataset.captureZone));
  });
}

function renderSelectedPlayer() {
  const player = currentPlayers.find((item) => Number(item.id) === Number(selectedPlayerId));

  if (!player) {
    elements.zoneDetailView.textContent = "\uc0c1\ub300 \uae30\uc9c0\ub97c \uc120\ud0dd\ud558\uc138\uc694.";
    pvpButtons = [];
    return;
  }

  const admiral = player.assignedAdmiral ? `[${player.assignedAdmiral.rarity}] ${player.assignedAdmiral.name}` : "\uc5c6\uc74c";
  elements.zoneDetailView.innerHTML = `
    <p class="eyebrow">Player Base</p>
    <h4>${player.username}</h4>
    <div class="detail-stats">
      <span>\uae30\uc9c0 \uc88c\ud45c: X ${player.base?.x}, Y ${player.base?.y}</span>
      <span>\ud568\ub300 \uc804\ud22c\ub825: ${Number(player.fleetPower || 0).toLocaleString()}</span>
      <span>\uc810\ub839\uc9c0: ${player.occupiedZones}</span>
      <span>\ucd94\uc815 \uc790\uc6d0: \uae08\uc18d ${Number(player.estimatedMetal || 0).toLocaleString()}, \uc5f0\ub8cc ${Number(player.estimatedFuel || 0).toLocaleString()}</span>
      <span>\ubc30\uce58 \uc81c\ub3c5: ${admiral}</span>
    </div>
    <button type="button" data-pvp-target="${player.id}" class="primary">\uc0c1\ub300 \uae30\uc9c0 \uae30\uc2b5</button>
  `;

  pvpButtons = Array.from(document.querySelectorAll("[data-pvp-target]"));
  pvpButtons.forEach((button) => {
    button.addEventListener("click", () => attackPlayer(button.dataset.pvpTarget));
  });
}

function renderEmpire(data) {
  const zones = Array.isArray(data?.occupiedZones) ? data.occupiedZones : [];
  if (!zones.length) {
    elements.empireView.textContent = "\uc544\uc9c1 \uc810\ub839\uc9c0\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.";
    return;
  }

  elements.empireView.innerHTML = zones
    .map((zone) => {
      return `
        <div class="zone-item compact">
          <div>
            <strong>${zone.name}</strong>
            <span>\uae08\uc18d +${zone.metalRate}/s, \uc5f0\ub8cc +${zone.fuelRate}/s</span>
          </div>
        </div>
      `;
    })
    .join("");
}

async function signup() {
  clearMessages();
  const credentials = getCredentials();

  if (!credentials.username || !credentials.password) {
    setError("\ud68c\uc6d0\uac00\uc785\ud560 \uc544\uc774\ub514\uc640 \ube44\ubc00\ubc88\ud638\ub97c \uc785\ub825\ud558\uc138\uc694.");
    return;
  }

  setBusy(true);
  try {
    const data = await api("/signup", { method: "POST", body: JSON.stringify(credentials) });
    setStatus(data.message);
  } catch (err) {
    setError(err.message);
  } finally {
    setBusy(false);
  }
}

async function login() {
  clearMessages();
  const credentials = getCredentials();

  if (!credentials.username || !credentials.password) {
    setError("\ub85c\uadf8\uc778\ud560 \uc544\uc774\ub514\uc640 \ube44\ubc00\ubc88\ud638\ub97c \uc785\ub825\ud558\uc138\uc694.");
    return;
  }

  setBusy(true);
  try {
    const data = await api("/login", { method: "POST", body: JSON.stringify(credentials) });
    saveSession(data.token, data.username);
    showGame(data.username);
    setStatus("\ub85c\uadf8\uc778\ud588\uc2b5\ub2c8\ub2e4.");
    await refreshAll();
  } catch (err) {
    setError(err.message);
  } finally {
    setBusy(false);
  }
}

async function loadResources() {
  clearMessages();
  setBusy(true);
  try {
    renderResources(await api("/resources"));
    setStatus("\uc790\uc6d0 \uc815\ubcf4\ub97c \uac31\uc2e0\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function loadFleet() {
  clearMessages();
  setBusy(true);
  try {
    renderFleet(await api("/fleet"));
    setStatus("\ud568\ub300 \uc815\ubcf4\ub97c \uac31\uc2e0\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function loadZones() {
  clearMessages();
  setBusy(true);
  try {
    const [map, empire] = await Promise.all([api("/map"), api("/empire")]);
    renderMap(map);
    renderEmpire(empire);
    setStatus("\uc911\ub9bd \uad6c\uc5ed \uc815\ubcf4\ub97c \uac31\uc2e0\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function moveBase() {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/base/move", {
      method: "POST",
      body: JSON.stringify({
        x: Number(elements.baseMoveX.value),
        y: Number(elements.baseMoveY.value)
      })
    });

    renderBase({ base: data.base, moveFuelPerDistance });
    renderResources(data.resources);
    await loadZones();
    showTab("map");
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function loadShipInfo() {
  renderShipCosts();
}

async function loadShipyard() {
  const [options, designs, production] = await Promise.all([
    api("/shipyard/options"),
    api("/designs"),
    api("/production")
  ]);

  shipyardOptions = options;
  renderShipyardOptions();
  renderDesigns(designs);
  renderProduction(production);
}

async function saveDesign() {
  clearMessages();
  const preview = calculateDesignPreview();
  if (!preview) {
    setError("\uc124\uacc4 \uc635\uc158\uc744 \uba3c\uc800 \uc120\ud0dd\ud558\uc138\uc694.");
    return;
  }

  setBusy(true);
  try {
    const data = await api("/designs", {
      method: "POST",
      body: JSON.stringify({
        name: elements.designNameInput.value,
        hullId: Number(elements.hullSelect.value),
        engines: preview.byCategory.engines.map((item) => item.id),
        weapons: preview.byCategory.weapons.map((item) => item.id),
        defenses: preview.byCategory.defenses.map((item) => item.id),
        utilities: preview.byCategory.utilities.map((item) => item.id)
      })
    });
    renderDesigns(data);
    await loadShipyard();
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function startDesignProduction() {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/production", {
      method: "POST",
      body: JSON.stringify({
        designId: Number(elements.productionDesignSelect.value),
        quantity: Number(elements.productionQuantityInput.value)
      })
    });
    renderProduction(data);
    renderResources(data.resources);
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function loadBattleRecords() {
  const data = await api("/battle-records");
  renderBattleRecords(data?.records);
}

async function loadGrowth() {
  const [research, admirals] = await Promise.all([
    api("/research"),
    api("/admirals")
  ]);
  renderResearch(research);
  renderAdmirals(admirals);
}

async function loadPlayers() {
  clearMessages();
  setBusy(true);
  try {
    renderPlayers(await api("/players"));
    setStatus("\uc9c0\ub3c4\uc758 \uc0c1\ub300 \uae30\uc9c0 \uc815\ubcf4\ub97c \uac31\uc2e0\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function upgradeResearch(type) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/research/${type}/upgrade`, { method: "POST" });
    renderResearch(data);
    renderResources(data.resources);
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function drawAdmiral() {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/admirals/draw", { method: "POST" });
    renderAdmirals(data);
    renderResources(data.resources);
    await loadGrowth();
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function assignAdmiral(id) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/admirals/${id}/assign`, { method: "POST" });
    renderAdmirals(data);
    await Promise.all([loadResources(), loadGrowth()]);
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function attackPlayer(targetUserId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/pvp/attack", {
      method: "POST",
      body: JSON.stringify({ targetUserId: Number(targetUserId) })
    });
    if (data?.to) showRouteTo(data.to, data.travelTimeSeconds);
    await Promise.all([loadPlayers(), loadZones(), refreshMissionsAndRecords()]);
    showTab("battle");
    setStatus(`${data.message} \uc774\ub3d9 \uc2dc\uac04: ${data.travelTimeText || "-"}`);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function startBattle() {
  clearMessages();
  loadBattleRecords().catch(() => {});
  showTab("battle");
  setStatus("\uc804\ud22c\uae30\ub85d\uc744 \uc5f4\uc5c8\uc2b5\ub2c8\ub2e4.");
}

async function captureZone(zoneId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/zones/${zoneId}/capture`, { method: "POST" });
    if (data?.to) showRouteTo(data.to, data.travelTimeSeconds);
    await Promise.all([loadZones(), refreshMissionsAndRecords()]);
    showTab("battle");
    setStatus(`${data.message} \uc774\ub3d9 \uc2dc\uac04: ${data.travelTimeText || "-"}`);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function refreshAll() {
  const [resources, fleet, map, empire, research, admirals, players, options, designs, production, missions, records] = await Promise.all([
    api("/resources"),
    api("/fleet"),
    api("/map"),
    api("/empire"),
    api("/research"),
    api("/admirals"),
    api("/players"),
    api("/shipyard/options"),
    api("/designs"),
    api("/production"),
    api("/missions"),
    api("/battle-records")
  ]);

  renderResources(resources);
  renderFleet(fleet);
  renderMap(map);
  renderEmpire(empire);
  renderResearch(research);
  renderAdmirals(admirals);
  renderPlayers(players);
  shipyardOptions = options;
  renderShipyardOptions();
  renderDesigns(designs);
  renderProduction(production);
  activeMissions = Array.isArray(missions?.activeMissions) ? missions.activeMissions : [];
  renderMissionRoute();
  renderBattleRecords(records?.records);
}

function handleAuthError(err) {
  if (err.message.includes("\ud1a0\ud070") || err.message.includes("\uc778\uc99d")) {
    clearSession();
    showAuth();
  }
  setError(err.message);
}

function logout() {
  clearProductionTimers();
  clearSession();
  showAuth();
  setStatus("\ub85c\uadf8\uc544\uc6c3\ud588\uc2b5\ub2c8\ub2e4.");
}

function bindEvents() {
  elements.signupButton.addEventListener("click", signup);
  elements.loginButton.addEventListener("click", login);
  elements.logoutButton.addEventListener("click", logout);
  elements.refreshResourcesButton.addEventListener("click", loadResources);
  elements.refreshFleetButton.addEventListener("click", loadFleet);
  elements.refreshZonesButton.addEventListener("click", loadZones);
  elements.refreshPlayersButton?.addEventListener("click", loadPlayers);
  elements.battleButton.addEventListener("click", startBattle);
  elements.toggleZoneSearchButton.addEventListener("click", toggleZoneSearch);
  elements.zoneSearchInput.addEventListener("input", renderZoneSearchList);
  elements.zoneLevelFilter.addEventListener("change", renderZoneSearchList);
  elements.zoneOwnerFilter.addEventListener("change", renderZoneSearchList);
  elements.drawAdmiralButton.addEventListener("click", drawAdmiral);
  elements.moveBaseButton.addEventListener("click", moveBase);
  elements.saveDesignButton.addEventListener("click", saveDesign);
  elements.startProductionButton.addEventListener("click", startDesignProduction);
  elements.baseMoveX.addEventListener("input", renderMoveCost);
  elements.baseMoveY.addEventListener("input", renderMoveCost);

  elements.hullSelect.addEventListener("change", () => {
    createSlotSelects();
    renderDesignPreview();
  });
  [elements.engineSlots, elements.weaponSlots, elements.defenseSlots, elements.utilitySlots].forEach((container) => {
    container.addEventListener("change", renderDesignPreview);
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  });

  setupMapDragging();

  elements.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
}

async function restoreSession() {
  await loadShipInfo();

  if (!authToken) {
    showAuth();
    return;
  }

  const username = localStorage.getItem(USERNAME_KEY) || "\uc0ac\ub839\uad00";
  showGame(username);

  try {
    await refreshAll();
    showTab(activeTab);
    setStatus("\uc800\uc7a5\ub41c \ud1a0\ud070\uc73c\ub85c \uc811\uc18d\uc744 \ubcf5\uad6c\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    clearSession();
    showAuth();
    setError("\uc800\uc7a5\ub41c \ub85c\uadf8\uc778 \uc815\ubcf4\uac00 \ub9cc\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub85c\uadf8\uc778\ud558\uc138\uc694.");
  }
}

bindEvents();
restoreSession();
