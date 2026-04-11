const TOKEN_KEY = "sf_slg_token";
const USERNAME_KEY = "sf_slg_username";
const ADMIN_TOKEN_KEY = "sf_slg_admin_token";

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
const MAP_WIDTH = 12000;
const MAP_HEIGHT = 8000;
let mapZoom = 0.7;
let shipyardOptions = { hulls: [], components: [] };
let shipDesigns = [];
let zoneSearchOpen = false;
let activeRouteTimer = null;
let activeMissions = [];
let missionPoller = null;
let productionQueueState = [];
let productionTickTimer = null;
let productionSyncTimer = null;
let resourceTickTimer = null;
let alertPoller = null;
let currentResourcesState = { metal: 0, fuel: 0 };
let currentRatesState = { metalPerSecond: 0, fuelPerSecond: 0, base: { metal: 0, fuel: 0 }, zones: { metal: 0, fuel: 0 }, multiplier: 1 };
let selectedProductionQueueId = null;
let latestDebug = {};
let devOpen = false;
let adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
let incomingAlerts = [];
let showBaseOverlay = false;
let detailPanelVisible = true;
let alertPanelVisible = true;

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
  floatingHud: document.getElementById("floatingHud"),
  hudResources: document.getElementById("hudResources"),
  hudPower: document.getElementById("hudPower"),
  hudCommander: document.getElementById("hudCommander"),
  missionHud: document.getElementById("missionHud"),
  missionHudText: document.getElementById("missionHudText"),
  missionSpeedupResource: document.getElementById("missionSpeedupResource"),
  missionSpeedupAmount: document.getElementById("missionSpeedupAmount"),
  cancelMissionButton: document.getElementById("cancelMissionButton"),
  speedupMissionButton: document.getElementById("speedupMissionButton"),
  incomingAlertHud: document.getElementById("incomingAlertHud"),
  incomingAlertList: document.getElementById("incomingAlertList"),
  closeAlertHudButton: document.getElementById("closeAlertHudButton"),
  zoomInButton: document.getElementById("zoomInButton"),
  zoomOutButton: document.getElementById("zoomOutButton"),
  mapZoomLabel: document.getElementById("mapZoomLabel"),
  toggleDetailButton: document.getElementById("toggleDetailButton"),
  toggleAlertButton: document.getElementById("toggleAlertButton"),
  closeBaseOverlayButton: document.getElementById("closeBaseOverlayButton"),
  tradeLogView: document.getElementById("tradeLogView"),
  toggleDevButton: document.getElementById("toggleDevButton"),
  devPanel: document.getElementById("devPanel"),
  devView: document.getElementById("devView"),
  devPasscodeInput: document.getElementById("devPasscodeInput"),
  devLoginButton: document.getElementById("devLoginButton"),
  devManager: document.getElementById("devManager"),
  refreshDevUsersButton: document.getElementById("refreshDevUsersButton"),
  devUsersView: document.getElementById("devUsersView"),
  toggleZoneSearchButton: document.getElementById("toggleZoneSearchButton"),
  zoneSearchPanel: document.getElementById("zoneSearchPanel"),
  zoneSearchInput: document.getElementById("zoneSearchInput"),
  zoneLevelFilter: document.getElementById("zoneLevelFilter"),
  zoneOwnerFilter: document.getElementById("zoneOwnerFilter"),
  drawAdmiralButton: document.getElementById("drawAdmiralButton"),
  moveBaseButton: document.getElementById("moveBaseButton"),
  saveDesignButton: document.getElementById("saveDesignButton"),
  deleteDesignButton: document.getElementById("deleteDesignButton"),
  resetDesignButton: document.getElementById("resetDesignButton"),
  startProductionButton: document.getElementById("startProductionButton"),
  speedupProductionButton: document.getElementById("speedupProductionButton"),
  cancelProductionButton: document.getElementById("cancelProductionButton"),
  productionSpeedupResource: document.getElementById("productionSpeedupResource"),
  productionSpeedupAmount: document.getElementById("productionSpeedupAmount"),
  resetBattleRecordsButton: document.getElementById("resetBattleRecordsButton"),
  saveAdmiralPolicyButton: document.getElementById("saveAdmiralPolicyButton"),
  admiralPolicySelect: document.getElementById("admiralPolicySelect"),
  designSubtabButton: document.getElementById("designSubtabButton"),
  buildSubtabButton: document.getElementById("buildSubtabButton"),
  designSection: document.getElementById("designSection"),
  buildSection: document.getElementById("buildSection"),
  editingDesignId: document.getElementById("editingDesignId"),
  designListView: document.getElementById("designListView"),
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
  productionDesignDetail: document.getElementById("productionDesignDetail"),
  productionQuantityInput: document.getElementById("productionQuantityInput"),
  productionQueueView: document.getElementById("productionQueueView"),
  ownedShipsView: document.getElementById("ownedShipsView"),
  baseView: document.getElementById("baseView"),
  mapBaseOverlay: document.getElementById("mapBaseOverlay"),
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
    elements.deleteDesignButton,
    elements.resetDesignButton,
    elements.startProductionButton,
    elements.speedupProductionButton,
    elements.cancelProductionButton,
    elements.cancelMissionButton,
    elements.speedupMissionButton,
    elements.designSubtabButton,
    elements.buildSubtabButton,
    elements.toggleDevButton,
    elements.devLoginButton,
    elements.refreshDevUsersButton,
    elements.resetBattleRecordsButton,
    elements.saveAdmiralPolicyButton,
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
  if (path.startsWith("/admin/") && adminToken) {
    headers["X-Admin-Token"] = adminToken;
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
  adminToken = "";
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
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
  const spec = data.myBaseSpec
    ? `<br>\uc804\ud22c\ub825 ${Number(data.myBaseSpec.fleetPower || 0).toLocaleString()} / \ubcf4\uc720 \ud568\uc120 ${Number(data.myBaseSpec.shipCount || 0)} / \uc0ac\ub839\uad00 Lv.${Number(data.myBaseSpec.commanderLevel || 1)}`
    : "";
  elements.baseView.innerHTML = `X ${currentBase.x}, Y ${currentBase.y}<br>\uc774\ub3d9 \ube44\uc6a9: \uac70\ub9ac 1\ub2f9 \uc5f0\ub8cc ${moveFuelPerDistance}${spec}`;
  elements.baseMoveX.value = currentBase.x;
  elements.baseMoveY.value = currentBase.y;
  renderMoveCost();
  setBaseOverlayVisible(showBaseOverlay);
  updateDebug({ base: currentBase, moveFuelPerDistance });
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

function ownerColor(ownerId) {
  if (!ownerId) return "#9de7d9";
  const hue = (Number(ownerId) * 47) % 360;
  return `hsl(${hue} 70% 62%)`;
}

function mapCoordX(percent) {
  return (Number(percent || 50) / 100) * MAP_WIDTH;
}

function mapCoordY(percent) {
  return (Number(percent || 50) / 100) * MAP_HEIGHT;
}

function applyMapZoom(zoom, originClientX = null, originClientY = null) {
  const map = elements.zoneMapView;
  const content = map?.querySelector(".map-content");
  if (!map || !content) return;
  const nextZoom = Math.max(0.25, Math.min(2.5, Number(zoom || 1)));
  const prevZoom = mapZoom;
  if (Math.abs(nextZoom - prevZoom) < 0.001) {
    content.style.transform = `scale(${mapZoom})`;
    if (elements.mapZoomLabel) {
      elements.mapZoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
    }
    return;
  }

  const rect = map.getBoundingClientRect();
  const ox = originClientX == null ? rect.left + rect.width / 2 : originClientX;
  const oy = originClientY == null ? rect.top + rect.height / 2 : originClientY;
  const worldX = (map.scrollLeft + (ox - rect.left)) / prevZoom;
  const worldY = (map.scrollTop + (oy - rect.top)) / prevZoom;

  mapZoom = nextZoom;
  content.style.transform = `scale(${mapZoom})`;
  map.scrollLeft = worldX * mapZoom - (ox - rect.left);
  map.scrollTop = worldY * mapZoom - (oy - rect.top);
  if (elements.mapZoomLabel) {
    elements.mapZoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
  }
}

function setDetailPanelVisible(visible) {
  detailPanelVisible = Boolean(visible);
  elements.zoneDetailView?.classList.toggle("hidden", !detailPanelVisible);
}

function setAlertPanelVisible(visible) {
  alertPanelVisible = Boolean(visible);
  if (!alertPanelVisible) {
    elements.incomingAlertHud?.classList.add("hidden");
    return;
  }
  renderIncomingAlerts(incomingAlerts);
}

function showProductionSubtab(name) {
  const isDesign = name !== "build";
  elements.designSubtabButton.classList.toggle("active", isDesign);
  elements.buildSubtabButton.classList.toggle("active", !isDesign);
  elements.designSection.classList.toggle("active", isDesign);
  elements.buildSection.classList.toggle("active", !isDesign);
}

function renderDev() {
  if (!elements.devView) return;
  elements.devView.textContent = JSON.stringify(latestDebug, null, 2);
}

function updateDebug(patch) {
  latestDebug = {
    ...latestDebug,
    ...patch,
    updatedAt: new Date().toLocaleTimeString()
  };
  if (devOpen) renderDev();
}

function toggleDevPanel() {
  devOpen = !devOpen;
  elements.devPanel.classList.toggle("hidden", !devOpen);
  if (devOpen) {
    elements.devManager.classList.toggle("hidden", !adminToken);
    if (adminToken) refreshDevUsers().catch(() => {});
    renderDev();
  }
}

function setupMapDragging() {
  const map = elements.zoneMapView;

  map.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" && event.button !== 0) return;
    const hitButton = event.target.closest(".map-node, .player-base-node, .base-node, [data-select-zone], [data-select-player], [data-capture-zone], [data-pvp-target]");
    if (hitButton) return;
    setBaseOverlayVisible(false);

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

  map.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -0.08 : 0.08;
      applyMapZoom(mapZoom + direction, event.clientX, event.clientY);
    }
  }, { passive: false });
}

function renderResources(resources) {
  const safeResources = resources || {};
  const production = safeResources.production || {};
  const base = production.base || { metal: 2, fuel: 1 };
  const zones = production.zones || { metal: 0, fuel: 0 };

  currentResourcesState = {
    metal: Number(safeResources.metal || 0),
    fuel: Number(safeResources.fuel || 0)
  };
  currentRatesState = {
    metalPerSecond: Number(production.metalPerSecond || base.metal),
    fuelPerSecond: Number(production.fuelPerSecond || base.fuel),
    base,
    zones,
    multiplier: Number(production.multiplier || 1),
    commander: safeResources.commander || null
  };

  elements.resourcesView.innerHTML = `
    \uae08\uc18d ${Number(safeResources.metal || 0).toLocaleString()}<br>
    \uc5f0\ub8cc ${Number(safeResources.fuel || 0).toLocaleString()}
  `;

  elements.productionView.textContent =
    `\ucd08\ub2f9 \uc0dd\uc0b0: \uae08\uc18d ${Number(production.metalPerSecond || base.metal)}, \uc5f0\ub8cc ${Number(production.fuelPerSecond || base.fuel)} ` +
    `(\uae30\uc9c0 ${base.metal}/${base.fuel}, \uc810\ub839\uc9c0 ${zones.metal}/${zones.fuel}, \ubc30\uc728 x${Number(production.multiplier || 1).toFixed(2)})`;
  renderHud();
  startResourceRealtimeTick();
  renderIncomingAlerts(safeResources.incomingAlerts);
  if (safeResources.settings?.admiralPolicy && elements.admiralPolicySelect) {
    elements.admiralPolicySelect.value = safeResources.settings.admiralPolicy;
  }
  updateDebug({
    resources: {
      metal: Math.floor(currentResourcesState.metal),
      fuel: Math.floor(currentResourcesState.fuel),
      metalPerSecond: currentRatesState.metalPerSecond,
      fuelPerSecond: currentRatesState.fuelPerSecond
    }
  });
}

function renderHud() {
  const commanderLevel = Number(currentRatesState?.commander?.level || 1);
  const commanderXp = Number(currentRatesState?.commander?.xp || 0);
  const nextXp = Number(currentRatesState?.commander?.nextXp || 0);
  elements.hudResources.textContent = `\uae08\uc18d ${Math.floor(currentResourcesState.metal).toLocaleString()} / \uc5f0\ub8cc ${Math.floor(currentResourcesState.fuel).toLocaleString()}`;
  elements.hudCommander.textContent = `\uc0ac\ub839\uad00 Lv.${commanderLevel} (${commanderXp}/${nextXp})`;
}

function renderIncomingAlerts(alerts) {
  incomingAlerts = Array.isArray(alerts) ? alerts : [];
  if (!elements.incomingAlertHud || !elements.incomingAlertList) return;
  if (!incomingAlerts.length || !alertPanelVisible) {
    elements.incomingAlertHud.classList.add("hidden");
    elements.incomingAlertList.innerHTML = "";
    return;
  }
  elements.incomingAlertHud.classList.remove("hidden");
  elements.incomingAlertList.innerHTML = incomingAlerts
    .map((alert) => {
      return `
        <div class="alert-item">
          <strong>${alert.attackerUsername}</strong>
          <span>\uc804\ud22c\ub825 ${Number(alert.attackPower || 0).toLocaleString()} / \ud568\uc120 ${Number(alert.shipCount || 0)}\ucc99</span>
          <span>\ub3c4\ucc29 \uc608\uc815 ${formatSeconds(Math.max(0, Number(alert.remainingSeconds || 0)))}</span>
        </div>
      `;
    })
    .join("");
}

function setBaseOverlayVisible(visible) {
  showBaseOverlay = Boolean(visible);
  elements.mapBaseOverlay?.classList.toggle("hidden", !showBaseOverlay);
}

function startResourceRealtimeTick() {
  if (resourceTickTimer) return;
  resourceTickTimer = setInterval(() => {
    currentResourcesState.metal += Number(currentRatesState.metalPerSecond || 0);
    currentResourcesState.fuel += Number(currentRatesState.fuelPerSecond || 0);
    renderHud();
    if (incomingAlerts.length) {
      incomingAlerts = incomingAlerts
        .map((item) => ({ ...item, remainingSeconds: Math.max(0, Number(item.remainingSeconds || 0) - 1) }))
        .filter((item) => Number(item.remainingSeconds || 0) > 0);
      renderIncomingAlerts(incomingAlerts);
    }
  }, 1000);
}

function renderFleet(fleet) {
  const ships = Array.isArray(fleet) ? fleet : [];
  const power = Math.floor(ships.reduce((sum, ship) => {
    return sum + Number(ship.quantity || 0) * (Number(ship.finalAttack || 0) + Number(ship.finalDefense || 0) * 0.45 + Number(ship.finalHp || 0) * 0.12);
  }, 0));
  elements.hudPower.textContent = `\ubcf8\uc778 \uc804\ud22c\ub825 ${power.toLocaleString()}`;

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
  updateDebug({ fleetCount: ships.length, fleetPower: power });
}

function renderShipCosts() {
  if (elements.shipCostView) elements.shipCostView.textContent = "";
}

function optionLabel(component) {
  return `${component.name} / +\uacf5 ${component.attackBonus}, +\ubc29 ${component.defenseBonus}, +HP ${component.hpBonus}, +\uc18d ${component.speedBonus} / \uc804\ub825 ${component.powerCost}, \uae08\uc18d ${component.metalCost}, \uc5f0\ub8cc ${component.fuelCost}`;
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
      <span>\uc120\uccb4 \uae30\ubcf8 \uc804\ud22c\ub825 ${Math.floor((preview.hull.baseHp * 0.12) + (preview.hull.baseSpeed * 4))}</span>
      <span>HP ${preview.finalHp}</span>
      <span>\uacf5\uaca9 ${preview.finalAttack}</span>
      <span>\ubc29\uc5b4 ${preview.finalDefense}</span>
      <span>\uc18d\ub3c4 ${preview.finalSpeed}</span>
      <span class="${overPower ? "danger-text" : ""}">\uc804\ub825 ${preview.totalPower}/${preview.hull.powerLimit}</span>
      <span>\ube44\uc6a9 \uae08\uc18d ${preview.totalMetalCost}, \uc5f0\ub8cc ${preview.totalFuelCost}</span>
      <span>\uc0dd\uc0b0 \uc2dc\uac04 ${formatBuildHours(preview.totalBuildTime)}</span>
      <span>\uacf5\uaca9 \ubaa8\ub4c8 \ud569 +${preview.byCategory.weapons.reduce((sum, w) => sum + Number(w.attackBonus || 0), 0)}</span>
      <span>\ubc29\uc5b4 \ubaa8\ub4c8 \ud569 +${preview.byCategory.defenses.reduce((sum, w) => sum + Number(w.defenseBonus || 0), 0)}</span>
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
  const currentSelection = Number(elements.productionDesignSelect.value || 0);
  elements.productionDesignSelect.innerHTML = shipDesigns.length
    ? shipDesigns.map((design) => `<option value="${design.id}">${design.name} / ${design.hullName}</option>`).join("")
    : `<option value="">\uc800\uc7a5\ub41c \uc124\uacc4\uc548 \uc5c6\uc74c</option>`;
  if (shipDesigns.some((design) => Number(design.id) === currentSelection)) {
    elements.productionDesignSelect.value = String(currentSelection);
  }

  elements.designListView.innerHTML = shipDesigns.length
    ? shipDesigns.map((design) => `
      <div class="growth-item">
        <div>
          <strong>${design.name}</strong>
          <span>${design.hullName} / \uc804\ub825 ${design.totalPower} / \uc0dd\uc0b0 ${formatBuildHours(design.totalBuildTime)}</span>
        </div>
        <button type="button" data-edit-design="${design.id}">\uc218\uc815</button>
      </div>
    `).join("")
    : `<div class="growth-item"><div>\uc800\uc7a5\ub41c \uc124\uacc4\uc548\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;

  Array.from(elements.designListView.querySelectorAll("[data-edit-design]")).forEach((button) => {
    button.addEventListener("click", () => loadDesignForEdit(button.dataset.editDesign));
  });

  renderSelectedProductionDesign();
  updateDebug({ designCount: shipDesigns.length });
}

function getDesignById(id) {
  return shipDesigns.find((design) => Number(design.id) === Number(id));
}

function renderSelectedProductionDesign() {
  const design = getDesignById(elements.productionDesignSelect.value);
  if (!design) {
    elements.productionDesignDetail.textContent = "\uc124\uacc4\uc548\uc744 \uc120\ud0dd\ud558\uc138\uc694.";
    elements.startProductionButton.disabled = true;
    return;
  }
  elements.startProductionButton.disabled = false;
  elements.productionDesignDetail.innerHTML = `
    <div class="stat-grid">
      <span>\uc120\uccb4 ${design.hullName}</span>
      <span>HP ${design.finalHp}</span>
      <span>\uacf5\uaca9 ${design.finalAttack}</span>
      <span>\ubc29\uc5b4 ${design.finalDefense}</span>
      <span>\uc18d\ub3c4 ${design.finalSpeed}</span>
      <span>\uc804\ub825 ${design.totalPower}/${design.powerLimit}</span>
      <span>\uae08\uc18d ${design.totalMetalCost}</span>
      <span>\uc5f0\ub8cc ${design.totalFuelCost}</span>
      <span>\uc0dd\uc0b0\uc2dc\uac04 ${formatBuildHours(design.totalBuildTime)}</span>
    </div>
  `;
}

function formatSeconds(seconds) {
  const value = Number(seconds || 0);
  if (value < 60) return `${value}\ucd08`;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  if (hours > 0) return `${hours}\uc2dc\uac04 ${minutes}\ubd84 ${secs}\ucd08`;
  return `${minutes}\ubd84 ${secs}\ucd08`;
}

function formatBuildHours(seconds) {
  const hours = Number(seconds || 0) / 3600;
  if (hours >= 24) return `${hours.toFixed(1)}\uc2dc\uac04`;
  if (hours >= 1) return `${hours.toFixed(2)}\uc2dc\uac04`;
  return `${(hours * 60).toFixed(1)}\ubd84`;
}

function renderProduction(data) {
  const queue = Array.isArray(data?.queue) ? data.queue : [];
  const owned = Array.isArray(data?.ownedShips) ? data.ownedShips : [];
  productionQueueState = queue;
  if (queue.length && !queue.some((item) => Number(item.id) === Number(selectedProductionQueueId))) {
    selectedProductionQueueId = queue[0].id;
  } else if (!queue.length) {
    selectedProductionQueueId = null;
  }
  if (!selectedProductionQueueId && queue.length) {
    selectedProductionQueueId = queue[0].id;
  }

  renderProductionQueueRealtime();
  setupProductionRealtimeSync();
  renderSelectedProductionDesign();

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
  updateDebug({ productionQueueCount: queue.length, ownedDesignFleetCount: owned.length });
}

function renderProductionQueueRealtime() {
  const queue = productionQueueState;
  if (!queue.length) {
    elements.productionQueueView.innerHTML = `<div class="growth-item"><div>\uc0dd\uc0b0 \ud050\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.</div></div>`;
    elements.cancelProductionButton.disabled = true;
    elements.speedupProductionButton.disabled = true;
    return;
  }
  elements.cancelProductionButton.disabled = false;
  elements.speedupProductionButton.disabled = false;

  const now = Date.now();
  elements.productionQueueView.innerHTML = queue
    .map((item) => {
      const remainingSeconds = item.status === "building"
        ? Math.max(0, Math.ceil((Number(item.endTime || 0) - now) / 1000))
        : 0;
      const text = item.status === "building" ? `\uc644\ub8cc\uae4c\uc9c0 ${formatSeconds(remainingSeconds)}` : "\uc644\ub8cc\ub428";
      return `
        <div class="growth-item ${Number(item.id) === Number(selectedProductionQueueId) ? "assigned" : ""}">
          <div>
            <strong>${item.designName} ${item.quantity}\ucc99</strong>
            <span>${text}</span>
          </div>
          <button type="button" data-select-queue="${item.id}">\uc120\ud0dd</button>
        </div>
      `;
    })
    .join("");

  Array.from(elements.productionQueueView.querySelectorAll("[data-select-queue]")).forEach((button) => {
    button.addEventListener("click", () => {
      selectedProductionQueueId = Number(button.dataset.selectQueue);
      renderProductionQueueRealtime();
    });
  });
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

function clearRealtimeTimers() {
  clearProductionTimers();
  if (resourceTickTimer) {
    clearInterval(resourceTickTimer);
    resourceTickTimer = null;
  }
  if (missionPoller) {
    clearInterval(missionPoller);
    missionPoller = null;
  }
  if (alertPoller) {
    clearInterval(alertPoller);
    alertPoller = null;
  }
  clearRoute();
}

function ensureAlertPolling() {
  if (alertPoller || !authToken) return;
  alertPoller = setInterval(async () => {
    try {
      const data = await api("/alerts/incoming");
      renderIncomingAlerts(data?.alerts);
    } catch (err) {
      // ignore transient alert polling failures
    }
  }, 5000);
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
  return `+${Number(value || 0).toFixed(2)}`;
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
  if (data?.settings?.admiralPolicy && elements.admiralPolicySelect) {
    elements.admiralPolicySelect.value = data.settings.admiralPolicy;
  }

  if (!admirals.length) {
    elements.admiralView.textContent = "\ubcf4\uc720 \uc81c\ub3c5\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.";
    admiralButtons = [];
    return;
  }

  elements.admiralView.innerHTML = admirals
    .map((admiral) => {
      const assigned = Number(admiral.assigned) === 1;
      const isDead = String(admiral.status || "active") === "dead";
      return `
        <div class="growth-item ${assigned ? "assigned" : ""}">
          <div>
            <strong>[${admiral.rarity}] ${admiral.name}${assigned ? " / \ubc30\uce58 \uc911" : ""}${isDead ? " / \uc0ac\ub9dd" : ""}</strong>
            <span>\uc804\ud22c ${percent(admiral.combatBonus)}, \uc0dd\uc0b0 ${percent(admiral.resourceBonus)}, \ube44\uc6a9 -${Number(admiral.costBonus || 0).toFixed(2)}</span>
          </div>
          <div class="button-row">
            <button type="button" data-assign-admiral="${admiral.id}" ${assigned || isDead ? "disabled" : ""}>\ubc30\uce58</button>
            <button type="button" data-revive-admiral="${admiral.id}" ${isDead ? "" : "disabled"}>\ubd80\ud65c</button>
          </div>
        </div>
      `;
    })
    .join("");

  admiralButtons = Array.from(document.querySelectorAll("[data-assign-admiral]"));
  admiralButtons.forEach((button) => {
    button.addEventListener("click", () => assignAdmiral(button.dataset.assignAdmiral));
  });
  Array.from(document.querySelectorAll("[data-revive-admiral]")).forEach((button) => {
    button.addEventListener("click", () => reviveAdmiral(button.dataset.reviveAdmiral));
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
  renderBase({ base: data?.base, moveFuelPerDistance, myBaseSpec: data?.myBaseSpec });
  currentPlayers = Array.isArray(data?.players) ? data.players : [];
  activeMissions = Array.isArray(data?.activeMissions) ? data.activeMissions : [];
  renderIncomingAlerts(data?.incomingAlerts);
  renderZones(data?.zones);
  renderMissionRoute();
  updateDebug({
    map: {
      zoneCount: Array.isArray(data?.zones) ? data.zones.length : 0,
      playerCount: currentPlayers.length,
      missionCount: activeMissions.length
    }
  });
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
    elements.missionHud.classList.add("hidden");
    if (missionPoller) {
      clearInterval(missionPoller);
      missionPoller = null;
    }
    return;
  }
  const mission = activeMissions[0];
  showRouteTo(mission.to, mission.remainingSeconds);
  elements.missionHud.classList.remove("hidden");
  elements.missionHudText.textContent = `${mission.targetName} / \ub0a8\uc740 \uc774\ub3d9 ${formatSeconds(mission.remainingSeconds)}`;
  ensureMissionPolling();
}

function ensureMissionPolling() {
  if (!activeMissions.length || missionPoller) return;
  missionPoller = setInterval(async () => {
    try {
      const [missions, records, alerts] = await Promise.all([api("/missions"), api("/battle-records"), api("/alerts/incoming")]);
      activeMissions = Array.isArray(missions?.activeMissions) ? missions.activeMissions : [];
      renderMissionRoute();
      renderBattleRecords(records?.records);
      renderIncomingAlerts(alerts?.alerts);
      if (!activeMissions.length) {
        await Promise.all([loadZones(), loadFleet()]);
      }
    } catch (err) {
      // ignore intermittent polling errors
    }
  }, 2000);
}

async function refreshMissionsAndRecords() {
  const [missionData, recordData, alertData] = await Promise.all([api("/missions"), api("/battle-records"), api("/alerts/incoming")]);
  activeMissions = Array.isArray(missionData?.activeMissions) ? missionData.activeMissions : [];
  renderMissionRoute();
  renderBattleRecords(recordData?.records);
  renderIncomingAlerts(alertData?.alerts);
  ensureMissionPolling();
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
            <button type="button" class="zone-row ${Number(zone.id) === Number(selectedZoneId) ? "selected" : ""}" data-select-zone="${zone.id}" style="${zone.occupied ? `border-left: 6px solid ${zone.ownerColor || ownerColor(zone.ownerId)};` : ""}">
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
  const startX = mapCoordX(currentBase.x || 50);
  const startY = mapCoordY(currentBase.y || 50);
  const endX = mapCoordX(target.x || 50);
  const endY = mapCoordY(target.y || 50);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "route-layer");
  svg.setAttribute("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
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
      const garrisonTotal = Object.values(zone.garrison || {}).reduce((sum, value) => sum + Number(value || 0), 0);
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
          style="--x: ${Number(zone.x || 50) / 100}; --y: ${Number(zone.y || 50) / 100}; --owner-color: ${zone.ownerColor || ownerColor(zone.ownerId)};"
          title="${zone.name} / \uc794\uc874\ubcd1\ub825 ${garrisonTotal}"
        >
          <span>${zone.level}</span>
          <small>${garrisonTotal}</small>
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
          style="--x: ${Number(player.base?.x || 50) / 100}; --y: ${Number(player.base?.y || 50) / 100}; --owner-color: ${player.playerColor || ownerColor(player.id)};"
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
  elements.zoneMapView.innerHTML = `<div class="map-content" style="width:${MAP_WIDTH}px;height:${MAP_HEIGHT}px;">${mapContent}</div>`;
  applyMapZoom(mapZoom);
  if (!elements.zoneMapView.dataset.centered) {
    const centerX = Math.max(0, mapCoordX(currentBase?.x || 50) * mapZoom - (elements.zoneMapView.clientWidth / 2));
    const centerY = Math.max(0, mapCoordY(currentBase?.y || 50) * mapZoom - (elements.zoneMapView.clientHeight / 2));
    elements.zoneMapView.scrollLeft = centerX;
    elements.zoneMapView.scrollTop = centerY;
    elements.zoneMapView.dataset.centered = "1";
  }

  if (currentBase) {
    const baseNode = elements.zoneMapView.querySelector(".base-node");
    baseNode?.addEventListener("click", () => {
      elements.baseMoveX.value = currentBase.x;
      elements.baseMoveY.value = currentBase.y;
      renderMoveCost();
      setBaseOverlayVisible(true);
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
  setDetailPanelVisible(true);
  setBaseOverlayVisible(false);
  renderZones(currentZones);
}

function selectPlayer(playerId) {
  selectedPlayerId = Number(playerId);
  selectedZoneId = null;
  setDetailPanelVisible(true);
  setBaseOverlayVisible(false);
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
    <div class="panel-head"><p class="eyebrow">Level ${zone.level}</p><button type="button" data-close-detail="1">X</button></div>
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
  elements.zoneDetailView.querySelector("[data-close-detail]")?.addEventListener("click", () => setDetailPanelVisible(false));
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
    <div class="panel-head"><p class="eyebrow">Player Base</p><button type="button" data-close-detail="1">X</button></div>
    <h4>${player.username}</h4>
    <div class="detail-stats">
      <span>\uae30\uc9c0 \uc88c\ud45c: X ${player.base?.x}, Y ${player.base?.y}</span>
      <span>\ud568\ub300 \uc804\ud22c\ub825: ${Number(player.fleetPower || 0).toLocaleString()}</span>
      <span>\uc810\ub839\uc9c0: ${player.occupiedZones}</span>
      <span>\ucd94\uc815 \uc790\uc6d0: \uae08\uc18d ${Number(player.estimatedMetal || 0).toLocaleString()}, \uc5f0\ub8cc ${Number(player.estimatedFuel || 0).toLocaleString()}</span>
      <span>\ubc30\uce58 \uc81c\ub3c5: ${admiral}</span>
    </div>
    <div class="trade-box">
      <label for="tradeMetalInput">거래 금속</label>
      <input id="tradeMetalInput" type="number" min="0" value="0">
      <label for="tradeFuelInput">거래 연료</label>
      <input id="tradeFuelInput" type="number" min="0" value="0">
      <button type="button" data-trade-target="${player.id}">자원 보내기</button>
    </div>
    <button type="button" data-pvp-target="${player.id}" class="primary">\uc0c1\ub300 \uae30\uc9c0 \uae30\uc2b5</button>
  `;

  pvpButtons = Array.from(document.querySelectorAll("[data-pvp-target]"));
  pvpButtons.forEach((button) => {
    button.addEventListener("click", () => attackPlayer(button.dataset.pvpTarget));
  });
  elements.zoneDetailView.querySelector("[data-trade-target]")?.addEventListener("click", () => sendTrade(player.id));
  elements.zoneDetailView.querySelector("[data-close-detail]")?.addEventListener("click", () => setDetailPanelVisible(false));
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
    ensureAlertPolling();
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
    const editingId = Number(elements.editingDesignId.value || 0);
    const data = await api(editingId ? `/designs/${editingId}` : "/designs", {
      method: editingId ? "PUT" : "POST",
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
    resetDesignForm();
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

function resetDesignForm() {
  elements.editingDesignId.value = "";
  elements.designNameInput.value = "";
  createSlotSelects();
  renderDesignPreview();
}

function loadDesignForEdit(designId) {
  const design = getDesignById(designId);
  if (!design) return;
  elements.editingDesignId.value = String(design.id);
  elements.designNameInput.value = design.name;
  elements.hullSelect.value = String(design.hullId);
  createSlotSelects();
  const setValues = (container, values) => {
    const selects = Array.from(container.querySelectorAll("select"));
    selects.forEach((select, idx) => {
      if (values[idx]) select.value = String(values[idx]);
    });
  };
  setValues(elements.engineSlots, design.components.engines || []);
  setValues(elements.weaponSlots, design.components.weapons || []);
  setValues(elements.defenseSlots, design.components.defenses || []);
  setValues(elements.utilitySlots, design.components.utilities || []);
  renderDesignPreview();
  setStatus(`${design.name} \uc124\uacc4\uc548 \uc218\uc815 \ubaa8\ub4dc`);
}

async function deleteDesign() {
  const id = Number(elements.editingDesignId.value || 0);
  if (!id) {
    setError("\uc0ad\uc81c\ud560 \uc124\uacc4\uc548\uc744 \uba3c\uc800 \uc120\ud0dd\ud558\uc138\uc694.");
    return;
  }
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/designs/${id}`, { method: "DELETE" });
    renderDesigns(data);
    resetDesignForm();
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

async function cancelProduction() {
  clearMessages();
  if (!selectedProductionQueueId) {
    setError("\ucde8\uc18c\ud560 \uc0dd\uc0b0 \ud050\ub97c \uc120\ud0dd\ud558\uc138\uc694.");
    return;
  }
  setBusy(true);
  try {
    const data = await api(`/production/${selectedProductionQueueId}/cancel`, { method: "POST" });
    renderProduction(data);
    renderResources(data.resources);
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function speedupProduction() {
  clearMessages();
  if (!selectedProductionQueueId) {
    setError("\uac00\uc18d\ud560 \uc0dd\uc0b0 \ud050\ub97c \uc120\ud0dd\ud558\uc138\uc694.");
    return;
  }
  setBusy(true);
  try {
    const resourceType = elements.productionSpeedupResource.value || "fuel";
    const amount = Number(elements.productionSpeedupAmount.value || 0);
    const data = await api(`/production/${selectedProductionQueueId}/speedup`, {
      method: "POST",
      body: JSON.stringify({ resourceType, amount })
    });
    renderProduction(data);
    if (data.resources) {
      renderResources({
        ...data.resources,
        production: {
          metalPerSecond: currentRatesState.metalPerSecond,
          fuelPerSecond: currentRatesState.fuelPerSecond,
          base: currentRatesState.base,
          zones: currentRatesState.zones,
          multiplier: currentRatesState.multiplier
        },
        incomingAlerts
      });
    }
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function cancelMission() {
  clearMessages();
  if (!activeMissions.length) return;
  setBusy(true);
  try {
    const mission = activeMissions[0];
    const data = await api(`/missions/${mission.id}/cancel`, { method: "POST" });
    activeMissions = data.activeMissions || [];
    renderMissionRoute();
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function speedupMission() {
  clearMessages();
  if (!activeMissions.length) return;
  setBusy(true);
  try {
    const mission = activeMissions[0];
    const resourceType = elements.missionSpeedupResource.value || "fuel";
    const amount = Number(elements.missionSpeedupAmount.value || 0);
    const data = await api(`/missions/${mission.id}/speedup`, {
      method: "POST",
      body: JSON.stringify({ resourceType, amount })
    });
    activeMissions = data.activeMissions || [];
    if (data.resources) {
      renderResources({
        ...data.resources,
        production: {
          metalPerSecond: currentRatesState.metalPerSecond,
          fuelPerSecond: currentRatesState.fuelPerSecond,
          base: currentRatesState.base,
          zones: currentRatesState.zones,
          multiplier: currentRatesState.multiplier
        },
        incomingAlerts
      });
    }
    renderMissionRoute();
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
  await loadTradeLogs();
}

async function loadTradeLogs() {
  if (!elements.tradeLogView) return;
  const data = await api("/trade/logs");
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  elements.tradeLogView.innerHTML = logs.length
    ? logs.map((item) => {
      const time = new Date(item.createdAt).toLocaleString();
      return `
        <div class="growth-item">
          <div>
            <strong>${item.fromName} -> ${item.toName}</strong>
            <span>금속 ${item.metal.toLocaleString()} / 연료 ${item.fuel.toLocaleString()}</span>
            <span>${time}</span>
          </div>
        </div>
      `;
    }).join("")
    : `<div class="growth-item"><div>거래 기록이 없습니다.</div></div>`;
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
    await loadShipyard();
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

async function reviveAdmiral(id) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/admirals/${id}/revive`, { method: "POST" });
    renderAdmirals(data);
    await loadResources();
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function saveAdmiralPolicy() {
  clearMessages();
  setBusy(true);
  try {
    const policy = elements.admiralPolicySelect.value;
    const data = await api("/admiral-policy", {
      method: "POST",
      body: JSON.stringify({ policy })
    });
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function resetBattleRecords() {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/battle-records", { method: "DELETE" });
    renderBattleRecords(data.records);
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function devLogin() {
  clearMessages();
  const passcode = String(elements.devPasscodeInput.value || "");
  if (!passcode) {
    setError("개발자 비밀번호를 입력하세요.");
    return;
  }
  setBusy(true);
  try {
    const data = await api("/admin/login", {
      method: "POST",
      body: JSON.stringify({ passcode })
    });
    adminToken = data.adminToken;
    localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    elements.devManager.classList.remove("hidden");
    await refreshDevUsers();
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function refreshDevUsers() {
  if (!adminToken) return;
  const data = await api("/admin/users");
  const users = Array.isArray(data?.users) ? data.users : [];
  elements.devUsersView.innerHTML = users.length
    ? users.map((user) => `
      <div class="growth-item">
        <div>
          <strong>#${user.id} ${user.username}</strong>
          <span>\uc790\uc6d0: \uae08\uc18d ${Number(user.resources?.metal || 0).toLocaleString()}, \uc5f0\ub8cc ${Number(user.resources?.fuel || 0).toLocaleString()}</span>
          <span>\uae30\uc9c0: X ${user.base?.x}, Y ${user.base?.y} / \uc0ac\ub839\uad00 Lv.${user.commanderLevel} / \uc804\ud22c\ub825 ${Number(user.fleetPower || 0).toLocaleString()}</span>
        </div>
        <div class="button-row">
          <button type="button" data-dev-reset="${user.id}">\ucd08\uae30\ud654</button>
          <button type="button" data-dev-delete="${user.id}">\uc0ad\uc81c</button>
        </div>
      </div>
    `).join("")
    : `<div class="growth-item"><div>\uacc4\uc815 \uc815\ubcf4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;

  Array.from(elements.devUsersView.querySelectorAll("[data-dev-reset]")).forEach((button) => {
    button.addEventListener("click", () => devResetUser(button.dataset.devReset));
  });
  Array.from(elements.devUsersView.querySelectorAll("[data-dev-delete]")).forEach((button) => {
    button.addEventListener("click", () => devDeleteUser(button.dataset.devDelete));
  });
}

async function devResetUser(userId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/admin/users/${Number(userId)}/reset`, { method: "POST" });
    setStatus(data.message);
    await refreshDevUsers();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function devDeleteUser(userId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/admin/users/${Number(userId)}`, { method: "DELETE" });
    setStatus(data.message);
    await refreshDevUsers();
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

async function sendTrade(targetUserId) {
  clearMessages();
  setBusy(true);
  try {
    const metal = Number(elements.zoneDetailView.querySelector("#tradeMetalInput")?.value || 0);
    const fuel = Number(elements.zoneDetailView.querySelector("#tradeFuelInput")?.value || 0);
    const data = await api("/trade/transfer", {
      method: "POST",
      body: JSON.stringify({ toUserId: Number(targetUserId), metal, fuel })
    });
    if (data?.resources?.resources) {
      const state = data.resources;
      renderResources({
        metal: state.resources.metal,
        fuel: state.resources.fuel,
        production: {
          metalPerSecond: state.rates.metal,
          fuelPerSecond: state.rates.fuel,
          base: state.rates.base,
          zones: state.rates.zones,
          multiplier: state.rates.multiplier
        },
        incomingAlerts
      });
    } else {
      await loadResources();
    }
    await loadTradeLogs();
    setStatus(data.message);
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
  const [resources, fleet, map, empire, research, admirals, players, options, designs, production, missions, records, trades] = await Promise.all([
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
    api("/battle-records"),
    api("/trade/logs")
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
  if (elements.tradeLogView) {
    const logs = Array.isArray(trades?.logs) ? trades.logs : [];
    elements.tradeLogView.innerHTML = logs.length
      ? logs.map((item) => `<div class="growth-item"><div><strong>${item.fromName} -> ${item.toName}</strong><span>금속 ${Number(item.metal || 0).toLocaleString()} / 연료 ${Number(item.fuel || 0).toLocaleString()}</span></div></div>`).join("")
      : `<div class="growth-item"><div>거래 기록이 없습니다.</div></div>`;
  }
  updateDebug({
    session: {
      username: localStorage.getItem(USERNAME_KEY) || "",
      activeTab
    }
  });
}

function handleAuthError(err) {
  const isDeveloperAuth = err.message.includes("\uac1c\ubc1c\uc790");
  if (isDeveloperAuth) {
    adminToken = "";
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    elements.devManager?.classList.add("hidden");
  } else if (err.message.includes("\ud1a0\ud070") || err.message.includes("\uc778\uc99d")) {
    clearRealtimeTimers();
    clearSession();
    showAuth();
  }
  setError(err.message);
}

function logout() {
  clearRealtimeTimers();
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
  elements.deleteDesignButton.addEventListener("click", deleteDesign);
  elements.resetDesignButton.addEventListener("click", resetDesignForm);
  elements.startProductionButton.addEventListener("click", startDesignProduction);
  elements.speedupProductionButton.addEventListener("click", speedupProduction);
  elements.cancelProductionButton.addEventListener("click", cancelProduction);
  elements.cancelMissionButton.addEventListener("click", cancelMission);
  elements.speedupMissionButton.addEventListener("click", speedupMission);
  elements.toggleDevButton.addEventListener("click", toggleDevPanel);
  elements.devLoginButton.addEventListener("click", devLogin);
  elements.refreshDevUsersButton.addEventListener("click", () => refreshDevUsers().catch(handleAuthError));
  elements.zoomInButton?.addEventListener("click", () => applyMapZoom(mapZoom + 0.1));
  elements.zoomOutButton?.addEventListener("click", () => applyMapZoom(mapZoom - 0.1));
  elements.toggleDetailButton?.addEventListener("click", () => setDetailPanelVisible(!detailPanelVisible));
  elements.toggleAlertButton?.addEventListener("click", () => setAlertPanelVisible(!alertPanelVisible));
  elements.closeAlertHudButton?.addEventListener("click", () => setAlertPanelVisible(false));
  elements.closeBaseOverlayButton?.addEventListener("click", () => setBaseOverlayVisible(false));
  elements.designSubtabButton.addEventListener("click", () => showProductionSubtab("design"));
  elements.buildSubtabButton.addEventListener("click", () => showProductionSubtab("build"));
  elements.productionDesignSelect.addEventListener("change", renderSelectedProductionDesign);
  elements.resetBattleRecordsButton.addEventListener("click", resetBattleRecords);
  elements.saveAdmiralPolicyButton.addEventListener("click", saveAdmiralPolicy);
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
  if (elements.mapZoomLabel) {
    elements.mapZoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
  }

  elements.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  elements.devPasscodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") devLogin();
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
    showProductionSubtab("design");
    ensureAlertPolling();
    setStatus("\uc800\uc7a5\ub41c \ud1a0\ud070\uc73c\ub85c \uc811\uc18d\uc744 \ubcf5\uad6c\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    clearRealtimeTimers();
    clearSession();
    showAuth();
    setError("\uc800\uc7a5\ub41c \ub85c\uadf8\uc778 \uc815\ubcf4\uac00 \ub9cc\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub85c\uadf8\uc778\ud558\uc138\uc694.");
  }
}

bindEvents();
restoreSession();
