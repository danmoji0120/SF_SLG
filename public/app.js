const TOKEN_KEY = "sf_slg_token";
const USERNAME_KEY = "sf_slg_username";
const ADMIN_TOKEN_KEY = "sf_slg_admin_token";
const UI_SCALE_KEY = "sf_slg_ui_scale";

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
const MAP_WIDTH = 8000;
const MAP_HEIGHT = 5333;
let mapZoom = 0.7;
let mapConfig = { maxX: 2000, maxY: 2000, distanceUnit: 20 };
let gameFlowState = { elapsedSeconds: 0, coreUnlockAfterSeconds: 10800, targetEndSeconds: 18000, coreUnlocked: false };
let shipyardOptions = { hulls: [], components: [] };
let shipDesigns = [];
let zoneSearchOpen = false;
let activeRouteTimer = null;
let activeMissions = [];
let missionPoller = null;
let battleSessionPoller = null;
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
let uiScale = Number(localStorage.getItem(UI_SCALE_KEY) || 1);
let fleetGroupsState = [];
let cityState = null;
let garrisonOverviewState = null;
let garrisonZoneFilterId = null;
let policyState = null;
let researchCategoryFilter = "all";
let researchExpandedKeys = new Set();
let researchHubState = null;
let researchTickTimer = null;
let techGraphView = { scale: 1, x: 40, y: 40 };
let filteredUnlocked = [];
let filteredLocked = [];
let lobbyState = { profile: null, rooms: [], joinedRoom: null, currentSession: null };
let lobbyAdmiralState = { admirals: [], recruitTypes: [], logs: [] };

function syncPublicState() {
  window.elements = elements;
  window.captureButtons = captureButtons;
  window.researchButtons = researchButtons;
  window.admiralButtons = admiralButtons;
  window.pvpButtons = pvpButtons;
  window.currentZones = currentZones;
  window.currentPlayers = currentPlayers;
  window.activeMissions = activeMissions;
  window.battleSessionPoller = battleSessionPoller;
  window.lobbyState = lobbyState;
  window.lobbyAdmiralState = lobbyAdmiralState;
}

// Groups research unlock rows by hull/module family.
function groupUnlockItems(items, includeRequirement) {
  const source = Array.isArray(items) ? items : [];
  const categoryLabel = { hull: "\ud568\uae09", engine: "\uc5d4\uc9c4", weapon: "\ubb34\uae30", defense: "\ubc29\uc5b4", utility: "\ubcf4\uc870", other: "\uae30\ud0c0" };
  const map = new Map();
  for (const item of source) {
    const type = String(item?.type || item?.category || "other").toLowerCase();
    const label = type === "hull" ? "\ud568\uae09" : String(item?.familyName || categoryLabel[type] || categoryLabel.other).trim();
    const key = type === "hull" ? `hull:${String(item?.name || "")}` : `${type}:${label}`;
    if (!map.has(key)) map.set(key, { label, items: [] });
    map.get(key).items.push(item);
  }
  const groups = Array.from(map.values())
    .map((group) => ({ label: group.label, items: group.items.slice().sort((a, b) => Number(a?.mk ?? 0) - Number(b?.mk ?? 0)) }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
  if (!groups.length) return "<div>\uc5c6\uc74c</div>";
  return groups.map((group) => `
    <div class="unlock-family-group">
      <div class="unlock-family-title">${group.label}</div>
      ${group.items.map((item) => `
        <div class="unlock-family-item">${item.name}${includeRequirement ? ` - ${item.requirement || ""}` : ""}</div>
      `).join("")}
    </div>
  `).join("");
}


const elements = {
  admiralView: document.getElementById("admiralView"),
  authPanel: document.getElementById("authPanel"),
  baseMoveCostView: document.getElementById("baseMoveCostView"),
  baseMoveX: document.getElementById("baseMoveX"),
  baseMoveY: document.getElementById("baseMoveY"),
  baseView: document.getElementById("baseView"),
  battleButton: document.getElementById("battleButton"),
  battleLog: document.getElementById("battleLog"),
  battleSessionsView: document.getElementById("battleSessionsView"),
  buildSection: document.getElementById("buildSection"),
  buildSubtabButton: document.getElementById("buildSubtabButton"),
  cancelMissionButton: document.getElementById("cancelMissionButton"),
  cancelProductionButton: document.getElementById("cancelProductionButton"),
  centerBaseButton: document.getElementById("centerBaseButton"),
  cityView: document.getElementById("cityView"),
  closeAlertHudButton: document.getElementById("closeAlertHudButton"),
  closeBaseOverlayButton: document.getElementById("closeBaseOverlayButton"),
  commanderName: document.getElementById("commanderName"),
  defenseSlots: document.getElementById("defenseSlots"),
  deleteDesignButton: document.getElementById("deleteDesignButton"),
  designListView: document.getElementById("designListView"),
  designNameInput: document.getElementById("designNameInput"),
  designPreview: document.getElementById("designPreview"),
  designSection: document.getElementById("designSection"),
  designSubtabButton: document.getElementById("designSubtabButton"),
  devLoginButton: document.getElementById("devLoginButton"),
  devManager: document.getElementById("devManager"),
  devPanel: document.getElementById("devPanel"),
  devPasscodeInput: document.getElementById("devPasscodeInput"),
  devUsersView: document.getElementById("devUsersView"),
  devView: document.getElementById("devView"),
  drawAdmiralButton: document.getElementById("drawAdmiralButton"),
  economyPolicySelect: document.getElementById("economyPolicySelect"),
  editingDesignId: document.getElementById("editingDesignId"),
  empireView: document.getElementById("empireView"),
  endSessionButton: document.getElementById("endSessionButton"),
  engineSlots: document.getElementById("engineSlots"),
  errorMessage: document.getElementById("errorMessage"),
  fleetGroupView: document.getElementById("fleetGroupView"),
  fleetView: document.getElementById("fleetView"),
  gamePanel: document.getElementById("gamePanel"),
  garrisonBattleView: document.getElementById("garrisonBattleView"),
  hudCityBonus: document.getElementById("hudCityBonus"),
  hudCommander: document.getElementById("hudCommander"),
  hudPower: document.getElementById("hudPower"),
  hudResources: document.getElementById("hudResources"),
  hullSelect: document.getElementById("hullSelect"),
  incomingAlertHud: document.getElementById("incomingAlertHud"),
  incomingAlertList: document.getElementById("incomingAlertList"),
  industryPolicySelect: document.getElementById("industryPolicySelect"),
  inviteCodeInput: document.getElementById("inviteCodeInput"),
  invitePasswordInput: document.getElementById("invitePasswordInput"),
  joinInviteButton: document.getElementById("joinInviteButton"),
  loginButton: document.getElementById("loginButton"),
  lobbyCommanderName: document.getElementById("lobbyCommanderName"),
  lobbyCreditView: document.getElementById("lobbyCreditView"),
  lobbyPanel: document.getElementById("lobbyPanel"),
  lobbyAdmiralView: document.getElementById("lobbyAdmiralView"),
  lobbyProfileView: document.getElementById("lobbyProfileView"),
  lobbyRecruitInfoView: document.getElementById("lobbyRecruitInfoView"),
  lobbyRecruitLogView: document.getElementById("lobbyRecruitLogView"),
  lobbyRecruitNormalButton: document.getElementById("lobbyRecruitNormalButton"),
  lobbyRecruitPremiumButton: document.getElementById("lobbyRecruitPremiumButton"),
  lobbyRewardLogView: document.getElementById("lobbyRewardLogView"),
  lobbySessionView: document.getElementById("lobbySessionView"),
  logoutButton: document.getElementById("logoutButton"),
  mapBaseOverlay: document.getElementById("mapBaseOverlay"),
  mapZoomLabel: document.getElementById("mapZoomLabel"),
  militaryPolicySelect: document.getElementById("militaryPolicySelect"),
  missionHud: document.getElementById("missionHud"),
  missionHudText: document.getElementById("missionHudText"),
  missionSpeedupAmount: document.getElementById("missionSpeedupAmount"),
  missionSpeedupResource: document.getElementById("missionSpeedupResource"),
  moveBaseButton: document.getElementById("moveBaseButton"),
  ownedShipsView: document.getElementById("ownedShipsView"),
  passwordInput: document.getElementById("passwordInput"),
  playerSearchInput: document.getElementById("playerSearchInput"),
  playerSearchView: document.getElementById("playerSearchView"),
  playerTargetView: document.getElementById("playerTargetView"),
  policyEffectInfo: document.getElementById("policyEffectInfo"),
  policyLockInfo: document.getElementById("policyLockInfo"),
  productionDesignDetail: document.getElementById("productionDesignDetail"),
  productionDesignSelect: document.getElementById("productionDesignSelect"),
  productionQuantityInput: document.getElementById("productionQuantityInput"),
  productionQueueView: document.getElementById("productionQueueView"),
  productionSpeedupAmount: document.getElementById("productionSpeedupAmount"),
  productionSpeedupResource: document.getElementById("productionSpeedupResource"),
  productionView: document.getElementById("productionView"),
  currentRoomView: document.getElementById("currentRoomView"),
  createRoomButton: document.getElementById("createRoomButton"),
  enterCurrentSessionButton: document.getElementById("enterCurrentSessionButton"),
  quickStartButton: document.getElementById("quickStartButton"),
  refreshDevUsersButton: document.getElementById("refreshDevUsersButton"),
  refreshFleetButton: document.getElementById("refreshFleetButton"),
  refreshLobbyButton: document.getElementById("refreshLobbyButton"),
  refreshPlayersButton: document.getElementById("refreshPlayersButton"),
  refreshResourcesButton: document.getElementById("refreshResourcesButton"),
  refreshZonesButton: document.getElementById("refreshZonesButton"),
  repairView: document.getElementById("repairView"),
  researchView: document.getElementById("researchView"),
  resetBattleRecordsButton: document.getElementById("resetBattleRecordsButton"),
  resetDesignButton: document.getElementById("resetDesignButton"),
  resetProductionLogsButton: document.getElementById("resetProductionLogsButton"),
  resourcesView: document.getElementById("resourcesView"),
  roomListView: document.getElementById("roomListView"),
  roomMaxPlayersInput: document.getElementById("roomMaxPlayersInput"),
  roomModeSelect: document.getElementById("roomModeSelect"),
  roomNameInput: document.getElementById("roomNameInput"),
  roomPasswordInput: document.getElementById("roomPasswordInput"),
  roomPrivateInput: document.getElementById("roomPrivateInput"),
  saveDesignButton: document.getElementById("saveDesignButton"),
  savePolicyButton: document.getElementById("savePolicyButton"),
  sessionSummaryView: document.getElementById("sessionSummaryView"),
  shipCostView: document.getElementById("shipCostView"),
  shipTradeLogView: document.getElementById("shipTradeLogView"),
  signupButton: document.getElementById("signupButton"),
  speedupMissionButton: document.getElementById("speedupMissionButton"),
  speedupProductionButton: document.getElementById("speedupProductionButton"),
  startProductionButton: document.getElementById("startProductionButton"),
  statusMessage: document.getElementById("statusMessage"),
  toggleAlertButton: document.getElementById("toggleAlertButton"),
  toggleDetailButton: document.getElementById("toggleDetailButton"),
  toggleDevButton: document.getElementById("toggleDevButton"),
  toggleZoneSearchButton: document.getElementById("toggleZoneSearchButton"),
  tradeFuelAmountInput: document.getElementById("tradeFuelAmountInput"),
  tradeLogView: document.getElementById("tradeLogView"),
  tradeMetalAmountInput: document.getElementById("tradeMetalAmountInput"),
  tradeResourceButton: document.getElementById("tradeResourceButton"),
  tradeShipButton: document.getElementById("tradeShipButton"),
  tradeShipDesignSelect: document.getElementById("tradeShipDesignSelect"),
  tradeShipQtyInput: document.getElementById("tradeShipQtyInput"),
  tradeTargetUserIdInput: document.getElementById("tradeTargetUserIdInput"),
  uiScaleLabel: document.getElementById("uiScaleLabel"),
  uiScaleRange: document.getElementById("uiScaleRange"),
  usernameInput: document.getElementById("usernameInput"),
  utilitySlots: document.getElementById("utilitySlots"),
  weaponSlots: document.getElementById("weaponSlots"),
  zoneDetailView: document.getElementById("zoneDetailView"),
  zoneLayerFilter: document.getElementById("zoneLayerFilter"),
  zoneLevelFilter: document.getElementById("zoneLevelFilter"),
  zoneMapView: document.getElementById("zoneMapView"),
  zoneOwnerFilter: document.getElementById("zoneOwnerFilter"),
  zoneSearchInput: document.getElementById("zoneSearchInput"),
  zoneSearchPanel: document.getElementById("zoneSearchPanel"),
  zoneView: document.getElementById("zoneView"),
  zoomInButton: document.getElementById("zoomInButton"),
  zoomOutButton: document.getElementById("zoomOutButton")
};

const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));

// Shared status/error helpers used by API actions.
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
    elements.resetProductionLogsButton,
    elements.cancelMissionButton,
    elements.speedupMissionButton,
    elements.designSubtabButton,
    elements.buildSubtabButton,
    elements.toggleDevButton,
    elements.devLoginButton,
    elements.refreshDevUsersButton,
    elements.resetBattleRecordsButton,
    elements.savePolicyButton,
    elements.toggleZoneSearchButton,
    elements.tradeResourceButton,
    elements.tradeShipButton,
    elements.centerBaseButton,
    elements.endSessionButton,
    elements.quickStartButton,
    elements.enterCurrentSessionButton,
    elements.createRoomButton,
    elements.joinInviteButton,
    elements.refreshLobbyButton,
    elements.lobbyRecruitNormalButton,
    elements.lobbyRecruitPremiumButton,
    ...captureButtons,
    ...researchButtons,
    ...admiralButtons,
    ...pvpButtons
  ].filter(Boolean).forEach((button) => {
    button.disabled = isBusy;
  });
}

// Fetch wrapper that attaches JWT/admin headers and normalizes errors.
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

function roomStatusLabel(status) {
  const labels = { waiting: "대기", starting: "시작 중", in_game: "진행 중", ended: "종료" };
  return labels[String(status || "waiting")] || "대기";
}

function renderLobby(data) {
  lobbyState = {
    profile: data?.profile || null,
    rooms: Array.isArray(data?.rooms) ? data.rooms : [],
    joinedRoom: data?.joinedRoom || null,
    currentSession: data?.currentSession || null
  };
  syncPublicState();
  const profile = lobbyState.profile || {};
  if (elements.lobbyCreditView) elements.lobbyCreditView.textContent = Number(profile.credit || 0).toLocaleString();
  if (elements.lobbyProfileView) {
    const recent = Array.isArray(profile.recentRewards) && profile.recentRewards.length
      ? profile.recentRewards.map((item) => `<span>세션 #${item.sessionId || "-"}: +${Number(item.creditReward || 0).toLocaleString()} 크레딧</span>`).join("")
      : "<span>최근 정산 기록 없음</span>";
    elements.lobbyProfileView.innerHTML = `
      <div class="growth-item">
        <div>
          <strong>${profile.featuredAdmiralName || "대표 제독 미지정"}</strong>
          <span>다음 세션 제독: ${profile.selectedSessionAdmiralName || "미선택"}</span>
          ${recent}
        </div>
      </div>
    `;
  }
  if (elements.lobbySessionView) {
    elements.lobbySessionView.textContent = lobbyState.currentSession
      ? `진행 중: ${lobbyState.currentSession.roomName} / ${lobbyState.currentSession.mode}`
      : "진행 중인 세션 없음";
  }
  elements.enterCurrentSessionButton?.classList.toggle("hidden", !lobbyState.currentSession);
  renderCurrentRoom(lobbyState.joinedRoom);
  renderRoomList(lobbyState.rooms);
  renderRewardLogs(lobbyState.profile?.recentRewards || []);
}

function renderSessionSummary(summary) {
  if (!elements.sessionSummaryView) return;
  if (!summary) {
    elements.sessionSummaryView.innerHTML = `<div class="growth-item"><div>No settled session yet.</div></div>`;
    return;
  }
  const meName = localStorage.getItem(USERNAME_KEY) || "";
  const me = (summary.players || []).find((player) => player.username === meName) || (summary.players || [])[0] || {};
  const score = me.detail?.score || {};
  const reward = me.detail?.reward || {};
  elements.sessionSummaryView.innerHTML = `
    <div class="growth-item assigned">
      <div>
        <strong>${summary.roomName || "Session"} / Rank ${me.rank || "-"}</strong>
        <span>Total Score ${Number(me.finalScore || score.totalScore || 0).toLocaleString()}</span>
        <span>Credits +${Number(me.creditReward || reward.creditTotal || 0).toLocaleString()}</span>
        <span>Outposts ${Number(score.occupiedZones || 0)} / Battles Won ${Number(score.battleWins || 0)}</span>
      </div>
    </div>
  `;
}

function renderRewardLogs(logs) {
  if (!elements.lobbyRewardLogView) return;
  const list = Array.isArray(logs) ? logs : [];
  elements.lobbyRewardLogView.innerHTML = list.length
    ? list.map((item) => {
      const detail = item.detail || {};
      const rank = detail.rank ? `Rank ${detail.rank}` : "Settlement";
      return `<div class="growth-item"><div><strong>${rank}</strong><span>Session #${item.sessionId || "-"} / +${Number(item.creditReward || 0).toLocaleString()} credits</span></div></div>`;
    }).join("")
    : `<div class="growth-item"><div>No reward logs yet.</div></div>`;
}

function renderLobbyAdmirals(data, recruitLogsData = null) {
  const state = data || lobbyAdmiralState;
  lobbyAdmiralState = {
    profile: state.profile || lobbyState.profile || null,
    recruitTypes: Array.isArray(state.recruitTypes) ? state.recruitTypes : [],
    admirals: Array.isArray(state.admirals) ? state.admirals : [],
    logs: Array.isArray(recruitLogsData?.logs) ? recruitLogsData.logs : lobbyAdmiralState.logs
  };
  syncPublicState();
  if (elements.lobbyRecruitInfoView) {
    elements.lobbyRecruitInfoView.innerHTML = lobbyAdmiralState.recruitTypes.length
      ? lobbyAdmiralState.recruitTypes.map((type) => `
        <div class="growth-item">
          <div>
            <strong>${type.name}</strong>
            <span>Cost ${Number(type.costCredit || 0).toLocaleString()} credits</span>
            <span>R ${Math.round(Number(type.chances?.R || 0) * 100)}% / SR ${Math.round(Number(type.chances?.SR || 0) * 100)}% / SSR ${Math.round(Number(type.chances?.SSR || 0) * 100)}%</span>
          </div>
        </div>
      `).join("")
      : `<div class="growth-item"><div>Recruit options unavailable.</div></div>`;
  }
  if (elements.lobbyAdmiralView) {
    elements.lobbyAdmiralView.innerHTML = lobbyAdmiralState.admirals.length
      ? lobbyAdmiralState.admirals.map((admiral) => `
        <div class="growth-item ${admiral.isFeatured || admiral.isSessionSelected ? "assigned" : ""}">
          <div>
            <strong>[${admiral.rarity}] ${admiral.name}</strong>
            <span>Combat ${percent(admiral.combatBonus)}, Resource ${percent(admiral.resourceBonus)}, Cost -${Number(admiral.costBonus || 0).toFixed(2)}</span>
            <span>${admiral.isFeatured ? "Featured / " : ""}${admiral.isSessionSelected ? "Next Session" : ""}</span>
          </div>
          <div class="button-row">
            <button type="button" data-featured-admiral="${admiral.id}" ${admiral.isFeatured ? "disabled" : ""}>Featured</button>
            <button type="button" data-session-admiral="${admiral.id}" ${admiral.isSessionSelected ? "disabled" : ""}>Use Next</button>
          </div>
        </div>
      `).join("")
      : `<div class="growth-item"><div>No lobby admirals yet.</div></div>`;
    Array.from(elements.lobbyAdmiralView.querySelectorAll("[data-featured-admiral]")).forEach((button) => {
      button.addEventListener("click", () => selectLobbyAdmiral("featured", Number(button.dataset.featuredAdmiral)));
    });
    Array.from(elements.lobbyAdmiralView.querySelectorAll("[data-session-admiral]")).forEach((button) => {
      button.addEventListener("click", () => selectLobbyAdmiral("session", Number(button.dataset.sessionAdmiral)));
    });
  }
  if (elements.lobbyRecruitLogView) {
    elements.lobbyRecruitLogView.innerHTML = lobbyAdmiralState.logs.length
      ? lobbyAdmiralState.logs.map((log) => `<div class="growth-item"><div><strong>${log.recruitType}</strong><span>[${log.admiral?.rarity || "-"}] ${log.admiral?.name || "-"} / -${Number(log.costCredit || 0).toLocaleString()} credits</span></div></div>`).join("")
      : `<div class="growth-item"><div>No recruit logs yet.</div></div>`;
  }
}

async function loadLobbyAdmirals() {
  const [admirals, logs] = await Promise.all([
    api("/lobby/admirals"),
    api("/lobby/recruit-logs")
  ]);
  (window.renderLobbyAdmirals || renderLobbyAdmirals)(admirals, logs);
  return admirals;
}

function renderCurrentRoom(room) {
  if (!elements.currentRoomView) return;
  if (!room) {
    elements.currentRoomView.innerHTML = `<div class="growth-item"><div>참가 중인 방이 없습니다.</div></div>`;
    return;
  }
  const players = (room.players || []).map((player) => `
    <span>${player.isHost ? "방장 " : ""}${player.username}${player.isMe ? " (나)" : ""} - ${player.isReady ? "준비" : "대기"}</span>
  `).join("");
  const startButton = room.isHost && room.status === "waiting"
    ? `<button type="button" class="primary" data-start-room="${room.id}">세션 시작</button>`
    : "";
  const readyButton = room.status === "waiting"
    ? `<button type="button" data-ready-room="${room.id}">준비 전환</button>`
    : "";
  const enterButton = room.status === "in_game"
    ? `<button type="button" class="primary" data-enter-session="1">게임 입장</button>`
    : "";
  const leaveButton = room.status === "waiting"
    ? `<button type="button" data-leave-room="${room.id}">나가기</button>`
    : "";
  elements.currentRoomView.innerHTML = `
    <div class="growth-item assigned">
      <div>
        <strong>${room.roomName} (${roomStatusLabel(room.status)})</strong>
        <span>초대 코드: ${room.inviteCode} / ${room.currentPlayers}/${room.maxPlayers} / ${room.mode}</span>
        ${players}
      </div>
      <div class="button-row">${readyButton}${startButton}${enterButton}${leaveButton}</div>
    </div>
  `;
  elements.currentRoomView.querySelector("[data-ready-room]")?.addEventListener("click", () => toggleRoomReady(room.id));
  elements.currentRoomView.querySelector("[data-start-room]")?.addEventListener("click", () => startRoom(room.id));
  elements.currentRoomView.querySelector("[data-leave-room]")?.addEventListener("click", () => leaveRoom(room.id));
  elements.currentRoomView.querySelector("[data-enter-session]")?.addEventListener("click", enterCurrentSession);
}

function renderRoomList(rooms) {
  if (!elements.roomListView) return;
  const list = (Array.isArray(rooms) ? rooms : []).filter((room) => !room.isJoined);
  elements.roomListView.innerHTML = list.length
    ? list.map((room) => `
      <div class="growth-item">
        <div>
          <strong>${room.roomName}</strong>
          <span>방장 ${room.hostUsername || "-"} / ${room.currentPlayers}/${room.maxPlayers} / ${room.mode} / ${roomStatusLabel(room.status)}</span>
          <span>${room.isPrivate ? "비공개" : "공개"} / 코드 ${room.inviteCode}</span>
        </div>
        <button type="button" ${room.status === "waiting" ? "" : "disabled"} data-join-room="${room.id}">참가</button>
      </div>
    `).join("")
    : `<div class="growth-item"><div>참가 가능한 방이 없습니다.</div></div>`;
  Array.from(elements.roomListView.querySelectorAll("[data-join-room]")).forEach((button) => {
    button.addEventListener("click", () => joinRoom(Number(button.dataset.joinRoom)));
  });
}

async function loadLobby() {
  const data = await api("/lobby");
  (window.renderLobby || renderLobby)(data);
  await loadLobbyAdmirals();
  return data;
}

async function recruitLobbyAdmiral(type) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/lobby/recruit-admiral", {
      method: "POST",
      body: JSON.stringify({ type })
    });
    setStatus(data.message || "Admiral recruited.");
    (window.renderLobbyAdmirals || renderLobbyAdmirals)(data, await api("/lobby/recruit-logs"));
    await loadLobby();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function selectLobbyAdmiral(kind, admiralId) {
  clearMessages();
  setBusy(true);
  try {
    const path = kind === "featured" ? "/lobby/select-featured-admiral" : "/lobby/select-session-admiral";
    const data = await api(path, {
      method: "POST",
      body: JSON.stringify({ admiralId })
    });
    setStatus(data.message || "Admiral selected.");
    (window.renderLobbyAdmirals || renderLobbyAdmirals)(data, await api("/lobby/recruit-logs"));
    await loadLobby();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function quickStart() {
  clearMessages();
  setBusy(true);
  try {
    const created = await api("/rooms", {
      method: "POST",
      body: JSON.stringify({ mode: "solo", roomName: "Solo Run", maxPlayers: 1 })
    });
    const started = await api(`/rooms/${created.room.id}/start`, { method: "POST" });
    lobbyState.currentSession = started.session;
    setStatus(started.message || "세션을 시작했습니다.");
    await enterCurrentSession();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function createRoom() {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/rooms", {
      method: "POST",
      body: JSON.stringify({
        roomName: elements.roomNameInput?.value || "",
        mode: elements.roomModeSelect?.value || "solo",
        maxPlayers: Number(elements.roomMaxPlayersInput?.value || 4),
        isPrivate: Boolean(elements.roomPrivateInput?.checked),
        password: elements.roomPasswordInput?.value || ""
      })
    });
    setStatus(data.message || "방을 만들었습니다.");
    await loadLobby();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function joinRoom(roomId) {
  clearMessages();
  const password = window.prompt("비공개 방이면 비밀번호를 입력하세요. 공개 방이면 비워두세요.") || "";
  setBusy(true);
  try {
    const data = await api(`/rooms/${roomId}/join`, { method: "POST", body: JSON.stringify({ password }) });
    setStatus(data.message || "방에 참가했습니다.");
    await loadLobby();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function joinInviteRoom() {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/rooms/join-code", {
      method: "POST",
      body: JSON.stringify({
        inviteCode: elements.inviteCodeInput?.value || "",
        password: elements.invitePasswordInput?.value || ""
      })
    });
    setStatus(data.message || "방에 참가했습니다.");
    await loadLobby();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function toggleRoomReady(roomId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/rooms/${roomId}/ready`, { method: "POST", body: JSON.stringify({}) });
    setStatus(data.message || "준비 상태를 변경했습니다.");
    await loadLobby();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function leaveRoom(roomId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/rooms/${roomId}/leave`, { method: "POST", body: JSON.stringify({}) });
    setStatus(data.message || "방을 나갔습니다.");
    await loadLobby();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function startRoom(roomId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/rooms/${roomId}/start`, { method: "POST", body: JSON.stringify({}) });
    setStatus(data.message || "세션을 시작했습니다.");
    lobbyState.currentSession = data.session;
    await enterCurrentSession();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function enterCurrentSession() {
  if (!lobbyState.currentSession) {
    const current = await api("/sessions/current");
    lobbyState.currentSession = current.session || null;
  }
  const username = localStorage.getItem(USERNAME_KEY) || "사령관";
  showGame(username);
  await refreshAll();
  showTab(activeTab);
  showProductionSubtab("design");
  ensureAlertPolling();
}

async function endCurrentSession() {
  clearMessages();
  setBusy(true);
  try {
    const current = lobbyState.currentSession || (await api("/sessions/current")).session;
    if (!current?.id) {
      setError("종료할 진행 중 세션이 없습니다.");
      return;
    }
    const data = await api(`/sessions/${current.id}/end`, { method: "POST", body: JSON.stringify({}) });
    clearRealtimeTimers();
    lobbyState.currentSession = null;
    showLobby(localStorage.getItem(USERNAME_KEY) || "사령관");
    renderSessionSummary(data.summary);
    const lobby = await loadLobby();
    renderSessionSummary(data.summary);
    setStatus(data.message || "세션 정산을 완료했습니다.");
    updateDebug({ sessionSummary: data.summary, lobby });
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

function showAuth() {
  elements.authPanel.classList.remove("hidden");
  elements.lobbyPanel?.classList.add("hidden");
  elements.gamePanel.classList.add("hidden");
}

function showLobby(username) {
  clearRealtimeTimers();
  elements.authPanel.classList.add("hidden");
  elements.lobbyPanel?.classList.remove("hidden");
  elements.gamePanel.classList.add("hidden");
  if (elements.lobbyCommanderName) {
    elements.lobbyCommanderName.textContent = `${username || "사령관"} 로비`;
  }
}

function showGame(username) {
  elements.authPanel.classList.add("hidden");
  elements.lobbyPanel?.classList.add("hidden");
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
  if (data?.mapConfig) {
    mapConfig = {
      maxX: Number(data.mapConfig.maxX || mapConfig.maxX),
      maxY: Number(data.mapConfig.maxY || mapConfig.maxY),
      distanceUnit: Number(data.mapConfig.distanceUnit || mapConfig.distanceUnit)
    };
  }
  currentBase = data.base;
  moveFuelPerDistance = Number(data.moveFuelPerDistance || moveFuelPerDistance);
  const spec = data.myBaseSpec
    ? `<br>\uc804\ud22c\ub825 ${Number(data.myBaseSpec.fleetPower || 0).toLocaleString()} / \ubcf4\uc720 \ud568\uc120 ${Number(data.myBaseSpec.shipCount || 0)} / \uc0ac\ub839\uad00 Lv.${Number(data.myBaseSpec.commanderLevel || 1)}`
    : "";
  elements.baseView.innerHTML = `X ${currentBase.x}, Y ${currentBase.y}<br>\uc774\ub3d9 \ube44\uc6a9: \uac70\ub9ac 1\ub2f9 \uc5f0\ub8cc ${moveFuelPerDistance}${spec}`;
  elements.baseMoveX.max = String(mapConfig.maxX);
  elements.baseMoveY.max = String(mapConfig.maxY);
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

// Lazy-load tab data only when a tab becomes active.
function showTab(tabName) {
  activeTab = tabName;
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  });

  if (tabName === "city" && authToken) {
    loadCity().catch(() => {});
  } else if (tabName === "research" && authToken) {
    loadResearchHub().catch(() => {});
  } else if (tabName === "growth" && authToken) {
    loadGrowth().catch(() => {});
  } else if (tabName === "trade" && authToken) {
    Promise.all([loadTradeLogs(), loadShipTradeLogs()]).catch(() => {});
  } else if (tabName === "main" && authToken) {
    loadFleetGroups().catch(() => {});
  } else if (tabName === "garrison" && authToken) {
    loadGarrisonOverview().catch(() => {});
  }
}

function ownerColor(ownerId) {
  if (!ownerId) return "#9de7d9";
  const hue = (Number(ownerId) * 47) % 360;
  return `hsl(${hue} 70% 62%)`;
}

function mapCoordX(percent) {
  return (Number(percent || 0) / Math.max(1, Number(mapConfig.maxX || 2000))) * MAP_WIDTH;
}

function mapCoordY(percent) {
  return (Number(percent || 0) / Math.max(1, Number(mapConfig.maxY || 2000))) * MAP_HEIGHT;
}

function fleetSlotOptionsHtml() {
  const limit = Math.min(5, Math.max(1, Number(cityState?.bonuses?.fleetSlotLimit || 3)));
  return Array.from({ length: limit }, (_, idx) => idx + 1)
    .map((slot) => `<option value="${slot}">\ud568\ub300 ${slot}</option>`)
    .join("");
}

function applyUiScale(nextScale) {
  uiScale = Math.max(0.5, Math.min(1.5, Number(nextScale || 1)));
  document.documentElement.style.setProperty("--ui-scale", uiScale.toFixed(2));
  localStorage.setItem(UI_SCALE_KEY, String(uiScale));
  if (elements.uiScaleRange) elements.uiScaleRange.value = String(uiScale);
  if (elements.uiScaleLabel) elements.uiScaleLabel.textContent = `${Math.round(uiScale * 100)}%`;
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

function makeWindowDraggable(element) {
  if (!element || element.dataset.draggableBound) return;
  const storageKey = element.id ? `sf_slg_win_${element.id}` : "";
  if (storageKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        element.style.left = `${saved.left}px`;
        element.style.top = `${saved.top}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
      }
    } catch (err) {
      // ignore invalid persisted position
    }
  }

  let dragState = null;
  element.addEventListener("pointerdown", (event) => {
    const interactive = event.target.closest("button, input, select, textarea, a, label");
    if (interactive) return;
    if (event.button !== 0) return;

    const rect = element.getBoundingClientRect();
    const logicalX = event.clientX / Math.max(0.5, uiScale);
    const logicalY = event.clientY / Math.max(0.5, uiScale);
    const logicalLeft = rect.left / Math.max(0.5, uiScale);
    const logicalTop = rect.top / Math.max(0.5, uiScale);
    dragState = {
      pointerId: event.pointerId,
      offsetX: logicalX - logicalLeft,
      offsetY: logicalY - logicalTop
    };
    element.classList.add("dragging-window");
    element.style.right = "auto";
    element.style.bottom = "auto";
    try {
      element.setPointerCapture(event.pointerId);
    } catch (err) {
      // ignore
    }
  });

  element.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const logicalClientX = event.clientX / Math.max(0.5, uiScale);
    const logicalClientY = event.clientY / Math.max(0.5, uiScale);
    const maxLeft = Math.max(0, (window.innerWidth / Math.max(0.5, uiScale)) - element.offsetWidth);
    const maxTop = Math.max(0, (window.innerHeight / Math.max(0.5, uiScale)) - element.offsetHeight);
    const left = Math.min(maxLeft, Math.max(0, logicalClientX - dragState.offsetX));
    const top = Math.min(maxTop, Math.max(0, logicalClientY - dragState.offsetY));
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  });

  const endDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    element.classList.remove("dragging-window");
    if (storageKey) {
      const rect = element.getBoundingClientRect();
      localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));
    }
    dragState = null;
  };
  element.addEventListener("pointerup", endDrag);
  element.addEventListener("pointercancel", endDrag);
  element.dataset.draggableBound = "1";
}

function setupDraggableWindows() {
  Array.from(document.querySelectorAll(".draggable-window")).forEach((item) => makeWindowDraggable(item));
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
    commander: safeResources.commander || null,
    city: safeResources.city || null
  };

  elements.resourcesView.innerHTML = `
    \uae08\uc18d ${Number(safeResources.metal || 0).toLocaleString()}<br>
    \uc5f0\ub8cc ${Number(safeResources.fuel || 0).toLocaleString()}
  `;

  elements.productionView.textContent =
    `\ucd08\ub2f9 \uc0dd\uc0b0: \uae08\uc18d ${Number(production.metalPerSecond || base.metal)}, \uc5f0\ub8cc ${Number(production.fuelPerSecond || base.fuel)} ` +
    `(\uae30\uc9c0 ${base.metal}/${base.fuel}, \uc810\ub839\uc9c0 ${zones.metal}/${zones.fuel}, \ubc30\uc728 x${Number(production.multiplier || 1).toFixed(2)}, \uc0dd\uc0b0\ub77c\uc778 ${Number(currentRatesState?.city?.bonuses?.buildLines || 1)})`;
  renderHud();
  startResourceRealtimeTick();
  renderIncomingAlerts(safeResources.incomingAlerts);
  updateDebug({
    resources: {
      metal: Math.floor(currentResourcesState.metal),
      fuel: Math.floor(currentResourcesState.fuel),
      metalPerSecond: currentRatesState.metalPerSecond,
      fuelPerSecond: currentRatesState.fuelPerSecond
    }
  });
}

// Keeps floating resource and city summary HUD in sync with local ticks.
function renderHud() {
  elements.hudResources.textContent = `\uae08\uc18d ${Math.floor(currentResourcesState.metal).toLocaleString()} / \uc5f0\ub8cc ${Math.floor(currentResourcesState.fuel).toLocaleString()}`;
  if (elements.hudCommander) elements.hudCommander.textContent = `\uc0ac\ub839\uad00 Lv.${Number(currentRatesState?.commanderLevel || 1)}`;
  const cityBonuses = currentRatesState?.city?.bonuses || cityState?.bonuses || {};
  if (elements.hudCityBonus) {
    const colonyCurrent = Number(currentRatesState?.city?.colonyCount || 0);
    elements.hudCityBonus.textContent = `\ub3c4\uc2dc: \uc0dd\uc0b0\ub77c\uc778 ${Number(cityBonuses.buildLines || 1)}, \uc2dd\ubbfc\uc9c0 ${colonyCurrent}/${Number(cityBonuses.colonyCap || 0)}, \ud568\ub300\uc2ac\ub86f ${Number(cityBonuses.fleetSlotLimit || 3)}`;
  }
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
  elements.incomingAlertList.innerHTML = incomingAlerts.map((alert) => `
    <div class="alert-item">
      <strong>${alert.attackerUsername}</strong>
      <span>${alert.targetKind === "outpost" ? `\ubaa9\ud45c: \uc804\ucd08\uae30\uc9c0 ${alert.targetName || ""}` : "\ubaa9\ud45c: \ubcf8\uc9c4"}</span>
      <span>\uc804\ud22c\ub825 ${Number(alert.attackPower || 0).toLocaleString()} / \ud568\uc120 ${Number(alert.shipCount || 0)}\ucc99</span>
      <span>\ub3c4\ucc29 \uc608\uc815 ${formatSeconds(Math.max(0, Number(alert.remainingSeconds || 0)))}</span>
    </div>
  `).join("");
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

function getSelectedHull() {
  return shipyardOptions.hulls.find((item) => Number(item.id) === Number(elements.hullSelect.value));
}

function getCategoryOptions(category) {
  return shipyardOptions.components.filter((item) => item.category === category && item.unlocked !== false);
}

// Rebuilds module slot selects whenever the selected hull changes.
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
    if (!container) continue;
    const count = Number(hull.slots?.[category] ?? 0);
    const options = getCategoryOptions(category);
    container.innerHTML = Array.from({ length: count }, (_, idx) => {
      const emptyOption = `<option value="">(\ube48 \uc2ac\ub86f)</option>`;
      const optionsHtml = options.map((item) => `<option value="${item.id}">${optionLabel(item)}</option>`).join("");
      return `<select data-slot-category="${category}" data-slot-index="${idx}">${emptyOption}${optionsHtml}</select>`;
    }).join("");
  }
}

function getSelectedComponents(category) {
  const container = elements[`${category}Slots`];
  if (!container) return [];
  const options = getCategoryOptions(category);
  return Array.from(container.querySelectorAll("select"))
    .map((select) => options.find((item) => Number(item.id) === Number(select.value)))
    .filter(Boolean);
}

// Client-side ship design preview before the server validates and saves it.
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

  const totalPower = components.reduce((sum, item) => sum + item.powerCost, 0);
  const bonusPowerLimit = components.reduce((sum, item) => sum + Number(item.powerBonus || 0), 0);
  const effectivePowerLimit = Number(hull.powerLimit || 0) + bonusPowerLimit;
  const totalMetalCost = hull.metalCost + components.reduce((sum, item) => sum + item.metalCost, 0);
  const totalFuelCost = hull.fuelCost + components.reduce((sum, item) => sum + item.fuelCost, 0);
  const finalHp = hull.baseHp + components.reduce((sum, item) => sum + item.hpBonus, 0);
  const finalAttack = components.reduce((sum, item) => sum + item.attackBonus, 0);
  const finalDefense = components.reduce((sum, item) => sum + item.defenseBonus, 0);
  const finalSpeed = Math.max(1, hull.baseSpeed + components.reduce((sum, item) => sum + item.speedBonus, 0));
  const complexity = Math.pow(1 + totalPower / 110, 1.45);
  const slotWeight =
    (Number(hull.slots?.engine || 0) * 0.6) +
    (Number(hull.slots?.weapon || 0) * 1.2) +
    Number(hull.slots?.defense || 0) +
    (Number(hull.slots?.utility || 0) * 0.7);
  const totalBuildTime = Math.max(20, Math.floor(hull.baseBuildTime * complexity + slotWeight * 25));
  const monitorDefenseNeeded = Math.min(Number(hull.slots.defense || 0), 4);
  const monitorRuleFailed = hull.key === "monitor" && (
    byCategory.defenses.length < monitorDefenseNeeded || byCategory.weapons.length > 1
  );

  return {
    hull,
    byCategory,
    components,
    totalPower,
    bonusPowerLimit,
    effectivePowerLimit,
    totalMetalCost,
    totalFuelCost,
    finalHp,
    finalAttack,
    finalDefense,
    finalSpeed,
    totalBuildTime,
    monitorRuleFailed
  };
}

function renderDesignPreview() {
  const preview = calculateDesignPreview();
  if (!preview) {
    elements.designPreview.textContent = "\uc124\uacc4 \uc635\uc158\uc744 \ubd88\ub7ec\uc624\ub294 \uc911\uc785\ub2c8\ub2e4.";
    return;
  }

  const overPower = preview.totalPower > preview.effectivePowerLimit || preview.monitorRuleFailed;
  elements.designPreview.innerHTML = `
    <div class="stat-grid">
      <span>\uc120\uccb4 \uae30\ubcf8 \uc804\ud22c\ub825 ${Math.floor((preview.hull.baseHp * 0.12) + (preview.hull.baseSpeed * 4))}</span>
      <span>HP ${preview.finalHp}</span>
      <span>\uacf5\uaca9 ${preview.finalAttack}</span>
      <span>\ubc29\uc5b4 ${preview.finalDefense}</span>
      <span>\uc18d\ub3c4 ${preview.finalSpeed}</span>
      <span class="${overPower ? "danger-text" : ""}">\uc804\ub825 ${preview.totalPower}/${preview.effectivePowerLimit}</span>
      <span>\uc804\ub825\ud55c\uacc4 \ubcf4\ub108\uc2a4 +${preview.bonusPowerLimit}</span>
      <span>\ube44\uc6a9 \uae08\uc18d ${preview.totalMetalCost}, \uc5f0\ub8cc ${preview.totalFuelCost}</span>
      <span>\uc0dd\uc0b0 \uc2dc\uac04 ${formatBuildHours(preview.totalBuildTime)}</span>
      <span>\uacf5\uaca9 \ubaa8\ub4c8 \ud569 +${preview.byCategory.weapons.reduce((sum, w) => sum + Number(w.attackBonus || 0), 0)}</span>
      <span>\ubc29\uc5b4 \ubaa8\ub4c8 \ud569 +${preview.byCategory.defenses.reduce((sum, w) => sum + Number(w.defenseBonus || 0), 0)}</span>
      ${preview.hull.key === "monitor" ? `<span class="${preview.monitorRuleFailed ? "danger-text" : ""}">\ubaa8\ub2c8\ud130 \uc870\uac74: \ubc29\uc5b4 4\uce78 \uc774\uc0c1, \ubb34\uae30 1\uce78 \uc774\ud558</span>` : ""}
    </div>
  `;
}

// Renders hull/component options using server-side unlock state.
function renderShipyardOptions() {
  fillSelect(elements.hullSelect, shipyardOptions.hulls, (hull) => `${hull.name} / \uc804\ub825 ${hull.powerLimit}`);
  const firstUnlockedHull = shipyardOptions.hulls.find((hull) => hull.unlocked !== false);
  if (firstUnlockedHull && getSelectedHull()?.unlocked === false) {
    elements.hullSelect.value = String(firstUnlockedHull.id);
  }
  if (shipyardOptions.unlockSummary) {
    const summary = shipyardOptions.unlockSummary;
    elements.designPreview.innerHTML = `
      <div class="stat-grid">
        <span>\uc120\uccb4 \ud574\uae08 ${summary.hulls.unlocked}/${summary.hulls.total}</span>
        <span>\ub2e4\uc74c \uc120\uccb4 ${summary.hulls.next}</span>
        <span>\ubaa8\ub4c8 \ud574\uae08 ${summary.components.unlocked}/${summary.components.total}</span>
        <span>\ub2e4\uc74c \ubaa8\ub4c8 ${summary.components.next}</span>
      </div>
    `;
  }
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

function fillSelect(select, items, labelFn) {
  select.innerHTML = items
    .map((item) => {
      const lockedText = item.unlocked === false
        ? ` (\uc7a0\uae08: ${item.unlockRequirementText || ""})`
        : "";
      const disabled = item.unlocked === false ? "disabled" : "";
      return `<option value="${item.id}" ${disabled}>${labelFn(item)}${lockedText}</option>`;
    })
    .join("");
}

function renderSelectedProductionDesign() {
  const design = getDesignById(elements.productionDesignSelect.value);
  if (!design) {
    elements.productionDesignDetail.textContent = `\uc0dd\uc0b0\ud560 \uc124\uacc4\uc548\uc744 \uc120\ud0dd\ud558\uc138\uc694. (\ud65c\uc131 \uc0dd\uc0b0\ub77c\uc778 ${Number(cityState?.bonuses?.buildLines || 1)})`;
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
      <span>\ud65c\uc131 \uc0dd\uc0b0\ub77c\uc778 ${Number(cityState?.bonuses?.buildLines || 1)}</span>
      <span>\uc5d4\uc9c4: ${(design.components?.engines || []).map((id) => componentNameById(id)).join(", ") || "\uc5c6\uc74c"}</span>
      <span>\ubb34\uae30: ${(design.components?.weapons || []).map((id) => componentNameById(id)).join(", ") || "\uc5c6\uc74c"}</span>
      <span>\ubc29\uc5b4: ${(design.components?.defenses || []).map((id) => componentNameById(id)).join(", ") || "\uc5c6\uc74c"}</span>
      <span>\ubcf4\uc870: ${(design.components?.utilities || []).map((id) => componentNameById(id)).join(", ") || "\uc5c6\uc74c"}</span>
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

// Renders production queue, owned ships, and selected design summary.
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
          <span>\ub300\uae30 ${Number(item.reserveQuantity || 0)} / \ud568\ub300 ${Number(item.fleetQuantity || 0)} / \ucd9c\uaca9 ${Number(item.missionQuantity || 0)} / \uc8fc\ub454 ${Number(item.garrisonQuantity || 0)} / \uc218\ub9ac ${Number(item.repairingQuantity || 0)}</span>
          <span>\ud3c9\uade0 HP ${Math.round(Number(item.avgHpRatio || 0) * 100)}% / \uc190\uc0c1 \uc911파 ${Number(item.damageSummary?.heavy || 0)}, \ub300파 ${Number(item.damageSummary?.critical || 0)}</span>
        </div>
      </div>
    `).join("")
    : `<div class="growth-item"><div>\ubcf4\uc720\ud55c \uc124\uacc4\ubcc4 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
  if (elements.tradeShipDesignSelect) {
    elements.tradeShipDesignSelect.innerHTML = owned.length
      ? owned.map((item) => `<option value="${item.designId}">${item.designName || item.name} (${item.quantity}\ucc99)</option>`).join("")
      : `<option value="">\uc124\uacc4\uc548 \uc5c6\uc74c</option>`;
  }
  updateDebug({ productionQueueCount: queue.length, ownedDesignFleetCount: owned.length });
}

function renderRepairs(data) {
  if (!elements.repairView) return;
  const ships = Array.isArray(data?.ships) ? data.ships : [];
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  const damaged = ships.filter((ship) => Number(ship.currentHp || 0) < Number(ship.maxHp || 0) && ship.status !== "destroyed");
  elements.repairView.innerHTML = `
    <div class="growth-item"><div><strong>함선 상태 / 수리</strong><span>개별 함선 HP가 전투 후 유지됩니다.</span></div></div>
    <div class="growth-item">
      <div>
        <strong>진행 중인 수리</strong>
        <span>자원은 수리 틱마다 차감되며, 부족하면 일시정지됩니다.</span>
      </div>
    </div>
    ${jobs.length ? jobs.map((job) => {
      const progress = Number(job.maxHp || 0) > 0 ? Math.min(100, Math.round(Number(job.currentHp || 0) / Number(job.maxHp || 1) * 100)) : 0;
      const canCancel = ["repairing", "paused"].includes(String(job.status || ""));
      return `
        <div class="growth-item">
          <div>
            <strong>#${job.shipId} ${job.designName}</strong>
            <span>${job.damageStateLabel || job.damageState} / HP ${Number(job.currentHp || 0)} / ${Number(job.maxHp || 0)} (${progress}%)</span>
            <span>상태 ${job.status}</span>
          </div>
          ${canCancel ? `<button type="button" data-cancel-repair="${job.id}">수리 취소</button>` : ""}
        </div>
      `;
    }).join("") : `<div class="growth-item"><div>진행 중인 수리 작업이 없습니다.</div></div>`}
    ${damaged.length ? damaged.map((ship) => `
      <div class="growth-item">
        <div>
          <strong>#${ship.id} ${ship.designName}</strong>
          <span>${ship.damageStateLabel || ship.damageState} / HP ${Number(ship.currentHp || 0)} / ${Number(ship.maxHp || 0)} / 상태 ${ship.status}</span>
          <span>수리 예상: 금속 ${Number(ship.repairCost?.metal || 0).toLocaleString()} / 연료 ${Number(ship.repairCost?.fuel || 0).toLocaleString()}</span>
        </div>
        ${ship.status === "repairing" ? `<span>수리 중</span>` : `<button type="button" data-repair-ship="${ship.id}">수리</button>`}
      </div>
    `).join("") : `<div class="growth-item"><div>수리할 손상 함선이 없습니다.</div></div>`}
  `;
  Array.from(elements.repairView.querySelectorAll("[data-repair-ship]")).forEach((button) => {
    button.addEventListener("click", () => startRepair(Number(button.dataset.repairShip)));
  });
  Array.from(elements.repairView.querySelectorAll("[data-cancel-repair]")).forEach((button) => {
    button.addEventListener("click", () => cancelRepair(Number(button.dataset.cancelRepair)));
  });
}

async function loadRepairs() {
  const data = await api("/repairs");
  renderRepairs(data);
}

async function startRepair(shipId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/repairs", {
      method: "POST",
      body: JSON.stringify({ shipId })
    });
    setStatus(data.message || "수리를 시작했습니다.");
    const production = await api("/production");
    renderProduction(production);
    await Promise.all([loadRepairs(), loadFleetGroups()]);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function cancelRepair(jobId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/repairs/${jobId}/cancel`, { method: "POST" });
    setStatus(data.message || "수리를 취소했습니다.");
    await Promise.all([loadRepairs(), loadFleetGroups()]);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

// Updates production queue countdowns once per second.
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
  if (battleSessionPoller) {
    clearInterval(battleSessionPoller);
    battleSessionPoller = null;
  }
  if (alertPoller) {
    clearInterval(alertPoller);
    alertPoller = null;
  }
  if (researchTickTimer) {
    clearInterval(researchTickTimer);
    researchTickTimer = null;
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

// Growth-tab policy renderer; policies are separate from research and time-locked.
function renderPolicyPanel(data) {
  const payload = data || {};
  policyState = payload;
  const options = payload.options || {};
  const selection = payload.policies || {};
  const effects = payload.effects || {};
  const lock = payload.lock || {};
  const fillPolicySelect = (select, category) => {
    if (!select) return;
    const items = Array.isArray(options[category]) ? options[category] : [];
    const selected = String(selection?.[category] || "");
    select.innerHTML = items
      .map((item) => {
        const chosen = String(item.key) === selected ? "selected" : "";
        return `<option value="${item.key}" ${chosen}>${item.name} - ${item.description || ""}</option>`;
      })
      .join("");
  };
  fillPolicySelect(elements.economyPolicySelect, "economy");
  fillPolicySelect(elements.industryPolicySelect, "industry");
  fillPolicySelect(elements.militaryPolicySelect, "military");
  const remain = Math.max(0, Number(lock.remainingSeconds || 0));
  if (elements.policyLockInfo) {
    elements.policyLockInfo.textContent = remain > 0
      ? `\uc815\ucc45 \ubcc0\uacbd \uc7a0\uae08: ${formatSeconds(remain)}`
      : `\uc815\ucc45 \ubcc0\uacbd \uac00\ub2a5 (\ubcc0\uacbd \uc2dc ${Number(lock.lockMinutes || 30)}\ubd84 \uace0\uc815)`;
  }
  if (elements.savePolicyButton) elements.savePolicyButton.disabled = remain > 0;
  if (elements.policyEffectInfo) {
    elements.policyEffectInfo.textContent =
      `\uc815\ucc45 \ud6a8\uacfc: \uc790\uc6d0 ${percent(effects.resourcePct)}, \uc0dd\uc0b0\ube44 -${Number(effects.buildCostPct || 0).toFixed(2)}, \uc804\ud22c ${percent(effects.combatPct)}, \uc774\ub3d9 ${percent(effects.movementPct)}`;
  }
}

// Growth-tab admiral renderer with assign, revive, and exile actions.
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
            <span>\uc804\ud22c ${percent(admiral.combatBonus)}, \uc0dd\uc0b0 ${percent(admiral.resourceBonus)}, \ube44\uc6a9 -${Number(admiral.costBonus || 0).toFixed(2)}</span>
          </div>
          <div class="button-row">
            <button type="button" data-assign-admiral="${admiral.id}" ${assigned ? "disabled" : ""}>\ubc30\uce58</button>
            <button type="button" data-exile-admiral="${admiral.id}" ${assigned ? "disabled" : ""}>\ucd94\ubc29</button>
          </div>
        </div>
      `;
    })
    .join("");

  admiralButtons = Array.from(document.querySelectorAll("[data-assign-admiral]"));
  admiralButtons.forEach((button) => {
    button.addEventListener("click", () => assignAdmiral(button.dataset.assignAdmiral));
  });
  Array.from(document.querySelectorAll("[data-exile-admiral]")).forEach((button) => {
    button.addEventListener("click", () => exileAdmiral(button.dataset.exileAdmiral));
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

// Renders the shared sector map, base, players, zones, and route overlay.
function renderMap(data) {
  if (data?.gameFlow) {
    gameFlowState = {
      elapsedSeconds: Number(data.gameFlow.elapsedSeconds || 0),
      coreUnlockAfterSeconds: Number(data.gameFlow.coreUnlockAfterSeconds || 10800),
      targetEndSeconds: Number(data.gameFlow.targetEndSeconds || 18000),
      coreUnlocked: Boolean(data.gameFlow.coreUnlocked)
    };
  }
  if (data?.mapConfig) {
    mapConfig = {
      maxX: Number(data.mapConfig.maxX || mapConfig.maxX),
      maxY: Number(data.mapConfig.maxY || mapConfig.maxY),
      distanceUnit: Number(data.mapConfig.distanceUnit || mapConfig.distanceUnit)
    };
  }
  renderBase({ base: data?.base, moveFuelPerDistance, myBaseSpec: data?.myBaseSpec, mapConfig: data?.mapConfig });
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

function renderBattleSessions(sessions) {
  if (!elements.battleSessionsView) return;
  const list = Array.isArray(sessions) ? sessions : [];
  const hasActive = list.some((session) => ["active", "retreating"].includes(String(session.state || "")));
  elements.battleSessionsView.innerHTML = list.length
    ? list.map((session) => {
      const latest = Array.isArray(session.log) && session.log.length ? session.log[session.log.length - 1] : "";
      const retreatButton = session.state === "active" || session.state === "retreating"
        ? `<button type="button" data-retreat-session="${session.id}">후퇴</button>`
        : "";
      return `
        <div class="growth-item">
          <div>
            <strong>${session.targetType} #${session.targetId || "-"} / ${session.state} / ${session.result || "진행"}</strong>
            <span>틱 ${Number(session.tick || 0)} / ${latest}</span>
          </div>
          ${retreatButton}
        </div>
      `;
    }).join("")
    : `<div class="growth-item"><div>전투 세션 기록이 없습니다.</div></div>`;
  Array.from(elements.battleSessionsView.querySelectorAll("[data-retreat-session]")).forEach((button) => {
    button.addEventListener("click", () => retreatBattleSession(Number(button.dataset.retreatSession)));
  });
  if (hasActive) ensureBattleSessionPolling();
  if (!hasActive && battleSessionPoller) {
    clearInterval(battleSessionPoller);
    battleSessionPoller = null;
  }
}

async function loadBattleSessions() {
  const data = await api("/battle-sessions");
  renderBattleSessions(data?.sessions);
}

function renderBattleSessions(sessions) {
  if (!elements.battleSessionsView) return;
  const list = Array.isArray(sessions) ? sessions : [];
  const hasActive = list.some((session) => ["active", "retreating"].includes(String(session.state || "")));
  const stateLabel = { active: "전투 중", retreating: "후퇴 중", ended: "종료" };
  const resultLabel = { victory: "승리", defeat: "패배", retreat: "후퇴", combat: "교전" };
  elements.battleSessionsView.innerHTML = list.length
    ? list.map((session) => {
      const logs = Array.isArray(session.log) ? session.log : [];
      const latest = logs.length ? logs[logs.length - 1] : "";
      const retreatButton = session.state === "active" || session.state === "retreating"
        ? `<button type="button" data-retreat-session="${session.id}">후퇴</button>`
        : "";
      return `
        <div class="growth-item">
          <div>
            <strong>${session.targetName || `${session.targetType} #${session.targetId || "-"}`} / ${stateLabel[session.state] || session.state} / ${resultLabel[session.result] || session.result || "진행"}</strong>
            <span>틱 ${Number(session.tick || 0)} / ${latest}</span>
            <details>
              <summary>전체 로그</summary>
              <pre>${logs.join("\n") || "기록 없음"}</pre>
            </details>
          </div>
          ${retreatButton}
        </div>
      `;
    }).join("")
    : `<div class="growth-item"><div>전투 세션 기록이 없습니다.</div></div>`;
  Array.from(elements.battleSessionsView.querySelectorAll("[data-retreat-session]")).forEach((button) => {
    button.addEventListener("click", () => retreatBattleSession(Number(button.dataset.retreatSession)));
  });
  if (hasActive) ensureBattleSessionPolling();
  if (!hasActive && battleSessionPoller) {
    clearInterval(battleSessionPoller);
    battleSessionPoller = null;
  }
}

function ensureBattleSessionPolling() {
  if (battleSessionPoller || !authToken) return;
  battleSessionPoller = setInterval(async () => {
    try {
      const [sessions, records, repairs, fleetGroups, zones, resources] = await Promise.all([
        api("/battle-sessions"),
        api("/battle-records"),
        api("/repairs"),
        api("/fleet-groups"),
        api("/map"),
        api("/resources")
      ]);
      renderBattleSessions(sessions?.sessions);
      renderBattleRecords(records?.records);
      renderRepairs(repairs);
      renderFleetGroupsV2(fleetGroups);
      renderMap(zones);
      renderResources(resources);
    } catch (err) {
      // ignore transient battle polling failures
    }
  }, 2000);
}

async function retreatBattleSession(sessionId) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/battle-sessions/${sessionId}/retreat`, { method: "POST" });
    setStatus(data.message || "후퇴 명령을 내렸습니다.");
    renderBattleSessions(data?.sessions);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
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
  elements.missionHudText.textContent = activeMissions
    .map((item) => {
      const slot = Number(item.fleetSlot || 1);
      return `\ud568\ub300 ${slot}: ${item.targetName} / ${formatSeconds(Number(item.remainingSeconds || 0))}`;
    })
    .join(" | ");
  ensureMissionPolling();
}

function ensureMissionPolling() {
  if (!activeMissions.length || missionPoller) return;
  missionPoller = setInterval(async () => {
    try {
      const [missions, records, sessions, alerts] = await Promise.all([api("/missions"), api("/battle-records"), api("/battle-sessions"), api("/alerts/incoming")]);
      activeMissions = Array.isArray(missions?.activeMissions) ? missions.activeMissions : [];
      renderMissionRoute();
      renderBattleRecords(records?.records);
      renderBattleSessions(sessions?.sessions);
      renderIncomingAlerts(alerts?.alerts);
      if (!activeMissions.length) {
        await Promise.all([loadZones(), loadFleet(), loadBattleSessions()]);
      }
    } catch (err) {
      // ignore intermittent polling errors
    }
  }, 2000);
}

async function refreshMissionsAndRecords() {
  const [missionData, recordData, sessionData, alertData] = await Promise.all([api("/missions"), api("/battle-records"), api("/battle-sessions"), api("/alerts/incoming")]);
  activeMissions = Array.isArray(missionData?.activeMissions) ? missionData.activeMissions : [];
  renderMissionRoute();
  renderBattleRecords(recordData?.records);
  renderBattleSessions(sessionData?.sessions);
  renderIncomingAlerts(alertData?.alerts);
  ensureMissionPolling();
}

function filteredZones() {
  const query = (elements.zoneSearchInput?.value || "").trim().toLowerCase();
  const level = elements.zoneLevelFilter?.value || "";
  const layer = elements.zoneLayerFilter?.value || "";
  const owner = elements.zoneOwnerFilter?.value || "";

  return currentZones.filter((zone) => {
    const text = `${zone.name || ""} ${zone.ownerUsername || ""}`.toLowerCase();
    const matchesText = !query || text.includes(query);
    const matchesLevel = !level || String(zone.level) === level;
    const matchesLayer = !layer || String(zone.layer || "") === layer;
    const matchesOwner =
      !owner ||
      (owner === "neutral" && !zone.occupied) ||
      (owner === "mine" && zone.ownedByMe) ||
      (owner === "enemy" && zone.occupied && !zone.ownedByMe);

    return matchesText && matchesLevel && matchesLayer && matchesOwner;
  });
}

function filteredPlayers() {
  const query = (elements.playerSearchInput?.value || "").trim().toLowerCase();
  const baseX = Number(currentBase?.x || 0);
  const baseY = Number(currentBase?.y || 0);
  return currentPlayers
    .filter((player) => !query || String(player.username || "").toLowerCase().includes(query))
    .map((player) => {
      const dx = Number(player.base?.x || 0) - baseX;
      const dy = Number(player.base?.y || 0) - baseY;
      return {
        ...player,
        distance: Math.round(Math.sqrt(dx * dx + dy * dy))
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

function focusPlayerOnMap(playerId) {
  const player = currentPlayers.find((item) => Number(item.id) === Number(playerId));
  if (!player || !elements.zoneMapView) return;
  const targetX = mapCoordX(player.base?.x || 0) * mapZoom;
  const targetY = mapCoordY(player.base?.y || 0) * mapZoom;
  elements.zoneMapView.scrollLeft = Math.max(0, targetX - elements.zoneMapView.clientWidth / 2);
  elements.zoneMapView.scrollTop = Math.max(0, targetY - elements.zoneMapView.clientHeight / 2);
  selectPlayer(playerId);
}

function centerOnBase() {
  if (!currentBase || !elements.zoneMapView) return;
  const targetX = mapCoordX(currentBase.x || 0) * mapZoom;
  const targetY = mapCoordY(currentBase.y || 0) * mapZoom;
  elements.zoneMapView.scrollLeft = Math.max(0, targetX - elements.zoneMapView.clientWidth / 2);
  elements.zoneMapView.scrollTop = Math.max(0, targetY - elements.zoneMapView.clientHeight / 2);
}

function renderPlayerSearchList(){
  if (!elements.playerSearchView) return;
  const players = filteredPlayers();
  elements.playerSearchView.innerHTML = players.length
    ? players.map((player) => `<div class="zone-item compact"><div><strong>${player.username}</strong><span>X ${player.base?.x}, Y ${player.base?.y} / \uac70\ub9ac ${player.distance}</span></div><button type="button" data-focus-player="${player.id}">\ucc3e\uae30</button></div>`).join("")
    : `<div class="zone-item compact"><div>\uc870\uac74\uc5d0 \ub9de\ub294 \ud50c\ub808\uc774\uc5b4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
  Array.from(elements.playerSearchView.querySelectorAll("[data-focus-player]")).forEach((button) => button.addEventListener("click", () => focusPlayerOnMap(button.dataset.focusPlayer)));
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
                <strong>Lv.${zone.level} [${zone.layerLabel || ""}] ${zone.name}</strong>
                <span>${zone.roleLabel || "\uac70\uc810"} / ${zone.roleEffect || ""} / ${zone.ownerUsername ? `\uc18c\uc720: ${zone.ownerUsername}` : "\uc911\ub9bd"} / ${zone.controlState === "capturing" ? `점령중 ${Math.round(Number(zone.captureProgress || 0) * 100)}%` : ""}</span>
              </div>
              <span>${zone.locked ? `\uc7a0\uae08 ${formatSeconds(Number(zone.remainingUnlockSeconds || 0))}` : zone.ownedByMe ? "\ub0b4 \uc810\ub839\uc9c0" : zone.occupied ? "\ud0c8\ucde8 \uac00\ub2a5" : "\uc911\ub9bd \uac70\uc810"}</span>
            </button>
          `;
        })
        .join("")
    : `<div class="zone-row">\uac80\uc0c9 \uc870\uac74\uc5d0 \ub9de\ub294 \uac70\uc810\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>`;

  Array.from(elements.zoneView.querySelectorAll("[data-select-zone]")).forEach((button) => {
    button.addEventListener("click", () => selectZone(button.dataset.selectZone));
  });
  renderPlayerSearchList();
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
        `layer-${zone.layer || "mid"}`,
        `role-${zone.role || "metal"}`,
        zone.occupied ? "occupied" : "",
        zone.locked ? "locked" : "",
        Number(zone.id) === Number(selectedZoneId) ? "selected" : ""
      ].filter(Boolean).join(" ");
      const nodeLabel = zone.locked ? "\u25c7" : (zone.roleIcon || zone.level);

      return `
        <button
          type="button"
          class="${classes}"
          data-select-zone="${zone.id}"
          style="--x: ${Number(zone.x || 0) / Math.max(1, Number(mapConfig.maxX || 2000))}; --y: ${Number(zone.y || 0) / Math.max(1, Number(mapConfig.maxY || 2000))}; --owner-color: ${zone.ownerColor || ownerColor(zone.ownerId)};"
          title="${zone.name} / ${zone.layerLabel || ""} / ${zone.roleLabel || ""} / \uc794\uc874\ubcd1\ub825 ${garrisonTotal}"
        >
          <span>${nodeLabel}</span>
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
          style="--x: ${Number(player.base?.x || 0) / Math.max(1, Number(mapConfig.maxX || 2000))}; --y: ${Number(player.base?.y || 0) / Math.max(1, Number(mapConfig.maxY || 2000))}; --owner-color: ${player.playerColor || ownerColor(player.id)};"
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
        style="--x: ${Number(currentBase.x || 0) / Math.max(1, Number(mapConfig.maxX || 2000))}; --y: ${Number(currentBase.y || 0) / Math.max(1, Number(mapConfig.maxY || 2000))};"
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
  renderPlayerSearchList();
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

// Detail panel for a selected zone: capture or assign garrison.
function renderSelectedZone(){
  const zone = currentZones.find((item) => Number(item.id) === Number(selectedZoneId));
  if (!zone) { elements.zoneDetailView.textContent = "\uac70\uc810\uc744 \uc120\ud0dd\ud558\uc138\uc694."; captureButtons = []; return; }
  const lockedText = zone.locked ? `<span>\uc911\uc559 \uad6c\uc5ed \uac1c\ubc29\uae4c\uc9c0 ${formatSeconds(Number(zone.remainingUnlockSeconds || 0))}</span>` : "";
  const outerProtected = zone.occupied && !zone.ownedByMe && zone.layer === "outer";
  const action = zone.locked
    ? `<button type="button" class="primary" disabled>\uc544\uc9c1 \uc7a0\uae08</button>`
    : outerProtected
      ? `<button type="button" class="primary" disabled>\uc678\uacfd \ubcf4\ud638 \uad6c\uc5ed</button>`
      : zone.occupied
        ? (zone.ownedByMe ? `<div class="speedup-controls"><label for="zoneGarrisonFleetSlot">\uc8fc\ub454 \ud568\ub300</label><select id="zoneGarrisonFleetSlot">${fleetSlotOptionsHtml()}</select><button type="button" data-garrison-zone="${zone.id}">\uc8fc\ub454\uad70 \ubc30\uce58</button></div>` : `<button type="button" data-capture-zone="${zone.id}" class="primary">\uc810\ub839\uc9c0 \ud0c8\ucde8</button>`)
        : `<button type="button" data-capture-zone="${zone.id}" class="primary">\uc810\ub839 \ucd9c\uaca9</button>`;
  elements.zoneDetailView.innerHTML = `<div class="panel-head"><p class="eyebrow">${zone.layerLabel || ""} / Level ${zone.level}</p><button type="button" data-close-detail="1">X</button></div><h4>${zone.name}</h4><p>${zone.description}</p><div class="detail-stats"><span>\uc5ed\ud560: ${zone.roleLabel || "\uac70\uc810"} - ${zone.roleEffect || ""}</span><span>\uc0dd\uc0b0: \uae08\uc18d +${zone.metalRate}/s, \uc5f0\ub8cc +${zone.fuelRate}/s</span><span>\uc18c\uc720\uc790: ${zone.ownerUsername || "\uc911\ub9bd"}</span><span>점령 상태: ${zone.controlState || (zone.occupied ? "occupied" : "neutral")} ${zone.controlState === "capturing" ? `(${Math.round(Number(zone.captureProgress || 0) * 100)}%)` : ""}</span>${lockedText}<span>\uc8fc\ub454\uad70 \uc804\ud22c\ub825: ${Number(zone.actualPower || 0).toLocaleString()}</span><span>\uc8fc\ub454\uad70: ${fleetText(zone.garrison)}</span></div><div class="speedup-controls"><label for="zoneFleetSlotSelect">\ucd9c\uaca9 \ud568\ub300</label><select id="zoneFleetSlotSelect">${fleetSlotOptionsHtml()}</select></div>${action}`;
  captureButtons = Array.from(document.querySelectorAll("[data-capture-zone]"));
  captureButtons.forEach((button) => button.addEventListener("click", () => captureZone(button.dataset.captureZone, Number(elements.zoneDetailView.querySelector("#zoneFleetSlotSelect")?.value || 1))));
  elements.zoneDetailView.querySelector("[data-garrison-zone]")?.addEventListener("click", () => assignZoneGarrison(zone.id, Number(elements.zoneDetailView.querySelector("#zoneGarrisonFleetSlot")?.value || 1)));
  elements.zoneDetailView.querySelector("[data-close-detail]")?.addEventListener("click", () => setDetailPanelVisible(false));
}

// Detail panel for a selected player base: attack or trade.
function renderSelectedPlayer(){
  const player = currentPlayers.find((item) => Number(item.id) === Number(selectedPlayerId));
  if (!player) { elements.zoneDetailView.textContent = "\uc0c1\ub300 \uae30\uc9c0\ub97c \uc120\ud0dd\ud558\uc138\uc694."; pvpButtons = []; return; }
  const admiral = player.assignedAdmiral ? `[${player.assignedAdmiral.rarity}] ${player.assignedAdmiral.name}` : "\uc5c6\uc74c";
  elements.zoneDetailView.innerHTML = `<div class="panel-head"><p class="eyebrow">Player Base</p><button type="button" data-close-detail="1">X</button></div><h4>${player.username}</h4><div class="detail-stats"><span>\uae30\uc9c0 \uc88c\ud45c: X ${player.base?.x}, Y ${player.base?.y}</span><span>\ud568\ub300 \uc804\ud22c\ub825: ${Number(player.fleetPower || 0).toLocaleString()}</span><span>\uc810\ub839\uc9c0: ${player.occupiedZones}</span><span>\ucd94\uc815 \uc790\uc6d0: \uae08\uc18d ${Number(player.estimatedMetal || 0).toLocaleString()}, \uc5f0\ub8cc ${Number(player.estimatedFuel || 0).toLocaleString()}</span><span>\ubc30\uce58 \uc81c\ub3c5: ${admiral}</span></div><div class="speedup-controls"><label for="pvpFleetSlotSelect">\ucd9c\uaca9 \ud568\ub300</label><select id="pvpFleetSlotSelect">${fleetSlotOptionsHtml()}</select></div><div class="trade-box"><label for="tradeMetalInput">\uac70\ub798 \uae08\uc18d</label><input id="tradeMetalInput" type="number" min="0" value="0"><label for="tradeFuelInput">\uac70\ub798 \uc5f0\ub8cc</label><input id="tradeFuelInput" type="number" min="0" value="0"><button type="button" data-trade-target="${player.id}">\uc790\uc6d0 \uac70\ub798</button></div><button type="button" data-pvp-target="${player.id}" class="primary">\uc0c1\ub300 \uae30\uc9c0 \uae30\uc2b5</button>`;
  pvpButtons = Array.from(document.querySelectorAll("[data-pvp-target]"));
  pvpButtons.forEach((button) => button.addEventListener("click", () => attackPlayer(button.dataset.pvpTarget, Number(elements.zoneDetailView.querySelector("#pvpFleetSlotSelect")?.value || 1))));
  elements.zoneDetailView.querySelector("[data-trade-target]")?.addEventListener("click", () => { sendTrade(player.id); if (elements.tradeTargetUserIdInput) elements.tradeTargetUserIdInput.value = String(player.id); });
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
    showLobby(data.username);
    setStatus("\ub85c\uadf8\uc778\ud588\uc2b5\ub2c8\ub2e4.");
    await loadLobby();
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
    const [fleet, groups] = await Promise.all([api("/fleet"), api("/fleet-groups")]);
    renderFleet(fleet);
    renderFleetGroupsV2(groups);
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

    renderBase({ base: data.base, moveFuelPerDistance, mapConfig: data.mapConfig });
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
  if (elements.utilitySlots) {
    setValues(elements.utilitySlots, design.components.utilities || []);
  }
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
  const [data, sessions] = await Promise.all([api("/battle-records"), api("/battle-sessions")]);
  renderBattleRecords(data?.records);
  renderBattleSessions(sessions?.sessions);
  await loadTradeLogs();
}

// Loads and renders resource trade history.
async function loadTradeLogs(){
  const data = await api("/trade/logs");
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  elements.tradeLogView.innerHTML = logs.length
    ? logs.map((item) => `<div class="growth-item"><div><strong>${item.fromName} -> ${item.toName}</strong><span>\uae08\uc18d ${Number(item.metal || 0).toLocaleString()} / \uc5f0\ub8cc ${Number(item.fuel || 0).toLocaleString()}</span><span>${new Date(item.createdAt).toLocaleString()}</span></div></div>`).join("")
    : `<div class="growth-item"><div>\uac70\ub798 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
}

// Renders ship trade history.
function renderShipTradeLogs(logs){
  if (!elements.shipTradeLogView) return;
  const items = Array.isArray(logs) ? logs : [];
  elements.shipTradeLogView.innerHTML = items.length ? items.map((item) => `<div class="growth-item"><div><strong>${item.fromName} -> ${item.toName}</strong><span>${item.designName} ${Number(item.quantity || 0).toLocaleString()}\ucc99</span><span>${new Date(item.createdAt).toLocaleString()}</span></div></div>`).join("") : `<div class="growth-item"><div>\ud568\uc120 \uac70\ub798 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
}

// Shows fleet power preview including assigned admiral bonus.
function updateFleetPowerPreview(slot, availableShips, admirals){
  const container = elements.fleetGroupView?.querySelector(`[data-fleet-power="${slot}"]`); if (!container) return;
  const selected = Array.from(elements.fleetGroupView.querySelectorAll(`[data-fleet-check="${slot}"]:checked`));
  let basePower = 0;
  selected.forEach((item) => {
    const shipId = Number(item.dataset.shipId);
    const ship = availableShips.find((entry) => Number(entry.shipId) === shipId);
    if (ship) basePower += Number(ship.combatPower || 0);
  });
  const selectedAdmiral = admirals.find((item) => String(item.id) === String(elements.fleetGroupView.querySelector(`[data-fleet-admiral="${slot}"]`)?.value || ""));
  const admiralBonus = Number(selectedAdmiral?.combatBonus || 0);
  const finalPower = Math.floor(basePower * (1 + admiralBonus * 0.9));
  container.textContent = `\uc608\uc0c1 \uc804\ud22c\ub825 ${finalPower.toLocaleString()} (\uae30\ubcf8 ${Math.floor(basePower).toLocaleString()} / \uc81c\ub3c5 \ubcf4\ub108\uc2a4 ${percent(admiralBonus)})`;
}

// Current fleet builder: individual ship checkbox assignment plus front/mid/back line selection.
function renderFleetGroupsV2(data){
  fleetGroupsState = Array.isArray(data?.groups) ? data.groups : []; if (!elements.fleetGroupView) return;
  const globalAvailableShips = Array.isArray(data?.availableShips) ? data.availableShips : [];
  const admirals = (Array.isArray(data?.admirals) ? data.admirals : []).filter((item) => String(item.status || "active") === "active");
  const slotLimit = Math.min(5, Math.max(1, Number(data?.fleetSlotLimit || 3)));
  const bySlot = new Map(fleetGroupsState.map((item) => [Number(item.slot), item]));
  const admiralOptions = [`<option value="">\uc5c6\uc74c</option>`].concat(admirals.map((item) => `<option value="${item.id}">[${item.rarity}] ${item.name}</option>`)).join("");
  elements.fleetGroupView.innerHTML = Array.from({ length: slotLimit }, (_, idx) => {
    const slot = idx + 1;
    const group = bySlot.get(slot) || { slot, name: `\ud568\ub300 ${slot}`, assignedShips: [], availableShips: [], admiralId: null };
    const assigned = Array.isArray(group.assignedShips) ? group.assignedShips : [];
    const available = Array.isArray(group.availableShips) && group.availableShips.length ? group.availableShips : globalAvailableShips.concat(assigned);
    const assignedMap = new Map(assigned.map((ship) => [Number(ship.shipId), ship]));
    const rows = available.length ? available.map((ship) => {
      const checked = assignedMap.has(Number(ship.shipId));
      const line = assignedMap.get(Number(ship.shipId))?.line || ship.line || "front";
      return `
        <label class="fleet-check-row">
          <input type="checkbox" data-fleet-check="${slot}" data-ship-id="${ship.shipId}" ${checked ? "checked" : ""}>
          <span>#${ship.shipId} ${ship.designName} / ${ship.hullName} / HP ${Math.round(Number(ship.hpRatio || 0) * 100)}% / ${ship.damageStateLabel || ship.damageState}</span>
          <select data-fleet-line="${slot}" data-ship-id="${ship.shipId}">
            <option value="front" ${line === "front" ? "selected" : ""}>\uc804\uc5f4</option>
            <option value="mid" ${line === "mid" ? "selected" : ""}>\uc911\uc5f4</option>
            <option value="back" ${line === "back" ? "selected" : ""}>\ud6c4\uc5f4</option>
          </select>
        </label>`;
    }).join("") : `<div class="hint">\ub300\uae30 \uc0c1\ud0dc\uc758 \uac1c\ubcc4 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>`;
    return `<div class="growth-item fleet-builder"><div><strong>\ud568\ub300 ${slot}</strong><span>\uac1c\ubcc4 \ud568\uc120\uc744 \uccb4\ud06c\ud558\uace0 \uc804\uc5f4/\uc911\uc5f4/\ud6c4\uc5f4\uc744 \uc9c0\uc815\ud558\uc138\uc694.</span><span>\ud604\uc7ac \uc800\uc7a5: ${Number(group.totalShips || 0)}\ucc99 / \uc804\ud22c\ub825 ${Number(group.fleetCombatPower || 0).toLocaleString()}</span></div><div class="design-grid"><div><label>\ud568\ub300\uba85</label><input type="text" data-fleet-name="${slot}" value="${group.name || `\ud568\ub300 ${slot}`}"></div><div><label>\ubc30\uce58 \uc81c\ub3c5</label><select data-fleet-admiral="${slot}">${admiralOptions}</select></div></div><div class="fleet-checklist">${rows}</div><div class="hint" data-fleet-power="${slot}"></div><div class="button-row"><button type="button" data-save-fleet="${slot}" class="primary">\ud568\ub300 ${slot} \uc800\uc7a5</button></div></div>`;
  }).join("");
  for (let slot = 1; slot <= slotLimit; slot += 1) { const group = bySlot.get(slot) || {}; const admiralSelect = elements.fleetGroupView.querySelector(`[data-fleet-admiral="${slot}"]`); if (admiralSelect) admiralSelect.value = group.admiralId ? String(group.admiralId) : ""; }
  const allVisibleShips = Array.from(new Map(fleetGroupsState.flatMap((group) => (Array.isArray(group.availableShips) ? group.availableShips : []).concat(Array.isArray(group.assignedShips) ? group.assignedShips : [])).map((ship) => [Number(ship.shipId), ship])).values());
  Array.from(elements.fleetGroupView.querySelectorAll("[data-fleet-check]")).forEach((input) => input.addEventListener("change", () => updateFleetPowerPreview(Number(input.dataset.fleetCheck), allVisibleShips, admirals)));
  Array.from(elements.fleetGroupView.querySelectorAll("[data-fleet-line]")).forEach((input) => input.addEventListener("change", () => updateFleetPowerPreview(Number(input.dataset.fleetLine), allVisibleShips, admirals)));
  Array.from(elements.fleetGroupView.querySelectorAll("[data-fleet-admiral]")).forEach((input) => input.addEventListener("change", () => updateFleetPowerPreview(Number(input.dataset.fleetAdmiral), allVisibleShips, admirals)));
  for (let slot = 1; slot <= slotLimit; slot += 1) updateFleetPowerPreview(slot, allVisibleShips, admirals);
  Array.from(elements.fleetGroupView.querySelectorAll("[data-save-fleet]")).forEach((button) => { button.addEventListener("click", () => { const slot = Number(button.dataset.saveFleet); const name = String(elements.fleetGroupView.querySelector(`[data-fleet-name="${slot}"]`)?.value || `\ud568\ub300 ${slot}`).trim(); const admiralIdRaw = elements.fleetGroupView.querySelector(`[data-fleet-admiral="${slot}"]`)?.value || ""; const selected = Array.from(elements.fleetGroupView.querySelectorAll(`[data-fleet-check="${slot}"]:checked`)); const ships = selected.map((item) => { const shipId = Number(item.dataset.shipId); const line = elements.fleetGroupView.querySelector(`[data-fleet-line="${slot}"][data-ship-id="${shipId}"]`)?.value || "front"; return { shipId, line }; }).filter((item) => Number(item.shipId) > 0); saveFleetGroup(slot, name, ships, admiralIdRaw ? Number(admiralIdRaw) : null); }); });
}

async function loadFleetGroups() {
  const data = await api("/fleet-groups");
  renderFleetGroupsV2(data);
}

async function saveFleetGroup(slot, name, ships, admiralId = null) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/fleet-groups/${slot}`, {
      method: "PUT",
      body: JSON.stringify({ name, ships, admiralId })
    });
    await loadFleetGroups();
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

// Current city renderer: building effects, next costs, and city summary.
function renderCityV2(data){
  cityState = data || null;
  if (!elements.cityView) return;
  const buildings = Array.isArray(data?.buildings) ? data.buildings : [];
  const bonuses = data?.bonuses || {};
  elements.cityView.innerHTML = buildings.length
    ? buildings.map((item) => `<div class="growth-item"><div><strong>${item.name} Lv.${item.level}</strong><span>${item.description}</span><span>\ud604\uc7ac \ud6a8\uacfc: ${item.currentEffect || "-"}</span><span>\ub2e4\uc74c \ub808\ubca8 \ud6a8\uacfc: ${item.nextEffect || "-"}</span><span>\ub2e4\uc74c \uc5c5\uadf8\ub808\uc774\ub4dc \ube44\uc6a9: \uae08\uc18d ${Number(item.nextCost?.metal || 0).toLocaleString()}, \uc5f0\ub8cc ${Number(item.nextCost?.fuel || 0).toLocaleString()}</span></div><button type="button" data-upgrade-city="${item.key}">\uc5c5\uadf8\ub808\uc774\ub4dc</button></div>`).join("")
    : `<div class="growth-item"><div>\ub3c4\uc2dc \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.</div></div>`;
  elements.cityView.insertAdjacentHTML("beforeend", `<div class="growth-item"><div><strong>\ub3c4\uc2dc \uc885\ud569 \ud604\ud669</strong><span>\uae30\ucd08 \uc790\uc6d0 \ubcf4\ub108\uc2a4 +\uae08\uc18d ${Number(bonuses.baseMetalFlat || 0)} / +\uc5f0\ub8cc ${Number(bonuses.baseFuelFlat || 0)}</span><span>\uc804\ud22c \ubcf4\ub108\uc2a4 +${Math.round(Number(bonuses.combatBonus || 0) * 100)}%, \uc774\ub3d9 \ubcf4\ub108\uc2a4 +${Math.round(Number(bonuses.movementBonus || 0) * 100)}%</span><span>\uc2dd\ubbfc\uc9c0(\uc810\ub839\uc9c0): ${Number(data?.colonyCount || 0)} / ${Number(bonuses.colonyCap || 0)}</span><span>\uc5f0\uad6c \uc0c1\ud55c ${Number(bonuses.researchCap || 0)} / \ud568\uc120 \ubcf4\uc720 \uc0c1\ud55c ${Number(bonuses.populationCap || 0)}</span><span>\uc0dd\uc0b0 \ub77c\uc778 ${Number(bonuses.buildLines || 1)} / \uc0dd\uc0b0 \uc2dc\uac04 \uacc4\uc218 x${Number(bonuses.buildTimeMultiplier || 1).toFixed(2)}</span></div></div>`);
  Array.from(elements.cityView.querySelectorAll("[data-upgrade-city]")).forEach((button) => button.addEventListener("click", () => upgradeCityBuilding(button.dataset.upgradeCity)));
}

async function loadCity() {
  renderCityV2(await api("/city"));
}

async function upgradeCityBuilding(key) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/city/${key}/upgrade`, { method: "POST" });
    if (data?.resources) {
      renderResources({
        metal: data.resources.metal,
        fuel: data.resources.fuel,
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
    renderCityV2(data.city);
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function assignZoneGarrison(zoneId, fleetSlot) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/zones/${zoneId}/garrison/dispatch`, {
      method: "POST",
      body: JSON.stringify({ fleetSlot })
    });
    setStatus(data.message);
    if (Array.isArray(data.activeMissions)) {
      activeMissions = data.activeMissions;
      renderMissionRoute();
      startMissionPolling();
    }
    await loadZones();
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function resetProductionLogs() {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/production/logs", { method: "DELETE" });
    productionQueueState = Array.isArray(data?.queue) ? data.queue : [];
    renderProductionQueueRealtime();
    setStatus(data.message);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

// Current garrison battle renderer with outpost log filtering.
function renderGarrisonOverviewV2(data){
  garrisonOverviewState = data || null;
  if (!elements.garrisonBattleView) return;
  const zones = Array.isArray(data?.zones) ? data.zones : [];
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
  const records = Array.isArray(data?.records) ? data.records : [];
  if (!zones.some((zone) => Number(zone.zoneId) === Number(garrisonZoneFilterId))) garrisonZoneFilterId = null;
  const activeZone = zones.find((zone) => Number(zone.zoneId) === Number(garrisonZoneFilterId)) || null;
  const zoneFilterHtml = zones.length ? zones.map((zone) => `<button type="button" class="${Number(zone.zoneId) === Number(garrisonZoneFilterId) ? "active" : ""}" data-garrison-zone-filter="${zone.zoneId}">Lv.${zone.level} ${zone.zoneName}</button>`).join("") : `<span class="hint">\uc810\ub839\uc9c0\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.</span>`;
  const filteredRecords = activeZone ? records.filter((item) => String(item.title || "").includes(activeZone.zoneName)) : records;
  const zoneHtml = zones.length ? zones.map((zone) => `<div class="growth-item"><div><strong>Lv.${zone.level} ${zone.zoneName}</strong><span>\uc8fc\ub454 \uc804\ud22c\ub825 ${Number(zone.assignedPower || 0).toLocaleString()}</span><span>${(zone.assignedShips || []).map((ship) => `${ship.designName} ${ship.quantity}\ucc99`).join(", ") || "\uc8fc\ub454 \ud568\uc120 \uc5c6\uc74c"}</span></div></div>`).join("") : `<div class="growth-item"><div>\uc810\ub839\uc9c0\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
  const alertHtml = alerts.length ? alerts.map((item) => `<div class="growth-item"><div><strong>${item.targetKind === "outpost" ? `\uc804\ucd08\uae30\uc9c0 ${item.targetName}` : "\ubcf8\uc9c4"} \uacf5\uaca9 \uacbd\ubcf4</strong><span>${item.attackerUsername} / \uc804\ud22c\ub825 ${Number(item.attackPower || 0).toLocaleString()} / \ud568\uc120 ${Number(item.shipCount || 0)}\ucc99</span><span>\ub3c4\ucc29\uae4c\uc9c0 ${formatSeconds(Math.max(0, Number(item.remainingSeconds || 0)))}</span></div></div>`).join("") : `<div class="growth-item"><div>\ud604\uc7ac \uce68\uacf5 \uacbd\ubcf4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
  const recordHtml = filteredRecords.length ? filteredRecords.slice(0, 20).map((item) => `<div class="growth-item"><div><strong>${item.title} / ${item.result}</strong><span>${new Date(item.createdAt).toLocaleString()}</span><span>${Array.isArray(item.log) ? item.log.slice(0, 2).join(" / ") : ""}</span></div></div>`).join("") : `<div class="growth-item"><div>${activeZone ? `${activeZone.zoneName} \uad00\ub828 \uc804\ud22c \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.` : "\uc8fc\ub454 \uc804\ud22c \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}</div></div>`;
  elements.garrisonBattleView.innerHTML = `<div class="growth-item"><div><strong>\uc804\ucd08\uae30\uc9c0 \ub85c\uadf8 \ud544\ud130</strong><div class="button-row"><button type="button" ${activeZone ? "" : "class=\"active\""} data-garrison-zone-filter="all">\uc804\uccb4</button>${zoneFilterHtml}</div></div></div><div class="growth-item"><div><strong>\uce68\uacf5 \uacbd\ubcf4</strong></div></div>${alertHtml}<div class="growth-item"><div><strong>\uc810\ub839\uc9c0 \uc8fc\ub454 \ud604\ud669</strong></div></div>${zoneHtml}<div class="growth-item"><div><strong>\uc8fc\ub454 \uc804\ud22c \uae30\ub85d</strong></div></div>${recordHtml}`;
  Array.from(elements.garrisonBattleView.querySelectorAll("[data-garrison-zone-filter]")).forEach((button) => button.addEventListener("click", () => { const value = String(button.dataset.garrisonZoneFilter || ""); garrisonZoneFilterId = value === "all" ? null : Number(value); renderGarrisonOverviewV2(garrisonOverviewState); }));
}

async function loadGarrisonOverview() {
  renderGarrisonOverviewV2(await api("/garrison/overview"));
}

function shouldShowResearchNode(node) {
  if (researchCategoryFilter === "all") return true;
  const cat = String(node?.category || "");
  return cat === researchCategoryFilter;
}

// Draws SVG dependency lines between visible tech nodes.
function drawTechGraphEdges() {
  const canvas = elements.researchView?.querySelector(".tech-graph-canvas");
  const svg = elements.researchView?.querySelector(".tech-edge-layer");
  if (!canvas || !svg) return;
  const nodes = Array.from(canvas.querySelectorAll(".tech-graph-node[data-node-key]"));
  const byKey = new Map();
  nodes.forEach((node) => {
    const key = String(node.dataset.nodeKey || "");
    byKey.set(key, {
      x: Number(node.offsetLeft || 0),
      y: Number(node.offsetTop || 0),
      w: Number(node.offsetWidth || 0),
      h: Number(node.offsetHeight || 0)
    });
  });
  const width = Number(canvas.dataset.canvasWidth || 3200);
  const height = Number(canvas.dataset.canvasHeight || 2400);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`);
  svg.innerHTML = `<defs><marker id="techArrowHead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#8ff7e5"></path></marker></defs>`;
  nodes.forEach((node) => {
    const toKey = String(node.dataset.nodeKey || "");
    const to = byKey.get(toKey);
    if (!to) return;
    const requiresRaw = String(node.dataset.requires || "");
    const requires = requiresRaw ? requiresRaw.split(",").map((v) => v.trim()).filter(Boolean) : [];
    requires.forEach((reqKey) => {
      const from = byKey.get(reqKey);
      if (!from) return;
      const forward = to.x >= from.x;
      const fromX = forward ? (from.x + from.w - 6) : (from.x + 6);
      const toX = forward ? (to.x + 6) : (to.x + to.w - 6);
      const fromY = from.y + (from.h / 2);
      const toY = to.y + (to.h / 2);
      const midX = (fromX + toX) / 2;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`);
      path.setAttribute("class", "tech-edge");
      path.setAttribute("marker-end", "url(#techArrowHead)");
      svg.appendChild(path);
    });
  });
}

// Applies pan/zoom transform to the tech graph canvas.
function applyTechGraphTransform() {
  const canvas = document.getElementById("techGraphCanvas");
  const zoomLabel = document.getElementById("techGraphZoomLabel");
  if (!canvas) return;
  const scale = Number(techGraphView.scale || 1);
  const x = Number(techGraphView.x || 0);
  const y = Number(techGraphView.y || 0);
  canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
}

function setupTechGraphInteraction() {
  const viewport = document.getElementById("techGraphViewport");
  const canvas = document.getElementById("techGraphCanvas");
  if (!viewport || !canvas) return;
  let drag = null;
  const minScale = 0.4;
  const maxScale = 2.2;

  viewport.onwheel = (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const prev = Number(techGraphView.scale || 1);
    const next = Math.max(minScale, Math.min(maxScale, prev + (event.deltaY < 0 ? 0.12 : -0.12)));
    if (Math.abs(next - prev) < 0.0001) return;
    const worldX = (localX - Number(techGraphView.x || 0)) / prev;
    const worldY = (localY - Number(techGraphView.y || 0)) / prev;
    techGraphView.scale = next;
    techGraphView.x = localX - (worldX * next);
    techGraphView.y = localY - (worldY * next);
    applyTechGraphTransform();
  };

  viewport.onpointerdown = (event) => {
    if (event.target.closest(".tech-graph-node")) return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ox: Number(techGraphView.x || 0),
      oy: Number(techGraphView.y || 0)
    };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("dragging");
  };
  viewport.onpointermove = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    techGraphView.x = drag.ox + (event.clientX - drag.x);
    techGraphView.y = drag.oy + (event.clientY - drag.y);
    applyTechGraphTransform();
  };
  viewport.onpointerup = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    viewport.classList.remove("dragging");
  };
  viewport.onpointercancel = () => {
    drag = null;
    viewport.classList.remove("dragging");
  };

  document.getElementById("techGraphZoomIn")?.addEventListener("click", () => {
    techGraphView.scale = Math.min(maxScale, Number(techGraphView.scale || 1) + 0.12);
    applyTechGraphTransform();
  });
  document.getElementById("techGraphZoomOut")?.addEventListener("click", () => {
    techGraphView.scale = Math.max(minScale, Number(techGraphView.scale || 1) - 0.12);
    applyTechGraphTransform();
  });
  document.getElementById("techGraphCenter")?.addEventListener("click", () => {
    techGraphView.scale = 1;
    techGraphView.x = 40;
    techGraphView.y = 40;
    applyTechGraphTransform();
  });
  applyTechGraphTransform();
}

// Local research countdown; refreshes from server on completion.
function startResearchRealtimeTick() {
  if (researchTickTimer) {
    clearInterval(researchTickTimer);
    researchTickTimer = null;
  }
  if (!researchHubState?.activeResearch) return;
  researchTickTimer = setInterval(async () => {
    if (!researchHubState?.activeResearch) {
      clearInterval(researchTickTimer);
      researchTickTimer = null;
      return;
    }
    const remain = Math.max(0, Number(researchHubState.activeResearch.remainingSeconds || 0) - 1);
    researchHubState.activeResearch.remainingSeconds = remain;
    const remainNode = document.getElementById("researchActiveRemaining");
    if (remainNode) remainNode.textContent = formatSeconds(remain);
    if (remain <= 0) {
      clearInterval(researchTickTimer);
      researchTickTimer = null;
      try {
        await loadResearchHub();
        await loadShipyard();
      } catch (err) {
        // ignore transient polling error
      }
    }
  }, 1000);
}

// Current research UI: five level tracks plus automatic unlock summary.
function renderResearchHubV4(data) {
  researchHubState = JSON.parse(JSON.stringify(data || {}));
  const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
  const active = data?.activeResearch || null;
  const policy = data?.policies || {};
  const unlockSummary = data?.unlockSummary || {};
  if (!tracks.length) {
    elements.researchView.textContent = "\uc5f0\uad6c \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.";
    researchButtons = [];
    return;
  }
  const filterOptions = [
    { key: "all", label: "\uc804\uccb4" },
    { key: "hull", label: "\ud568\uae09" },
    { key: "engine", label: "\uc5d4\uc9c4" },
    { key: "weapon", label: "\ubb34\uae30" },
    { key: "defense", label: "\ubc29\uc5b4" },
    { key: "utility", label: "\ubcf4\uc870" }
  ];
  if (!filterOptions.some((item) => item.key === researchCategoryFilter)) researchCategoryFilter = "all";
  const categoryOfUnlockItem = (item) => {
    const direct = String(item?.type || item?.category || "").toLowerCase();
    if (["hull", "engine", "weapon", "defense", "utility"].includes(direct)) return direct;
    const value = String(item?.name || "").toLowerCase();
    if (/(corvette|destroyer|cruiser|monitor|battleship|carrier|dreadnought|titan)/.test(value)) return "hull";
    if (/engine/.test(value)) return "engine";
    if (/(weapon|rail|laser|missile|siege|torpedo)/.test(value)) return "weapon";
    if (/(armor|shield|defense)/.test(value)) return "defense";
    return "utility";
  };
  const lockedItems = Array.isArray(unlockSummary?.locked) ? unlockSummary.locked : [];
  const unlockedItems = Array.isArray(unlockSummary?.unlocked) ? unlockSummary.unlocked : [];
  const filteredLocked = researchCategoryFilter === "all" ? lockedItems : lockedItems.filter((item) => categoryOfUnlockItem(item) === researchCategoryFilter);
  const filteredUnlocked = researchCategoryFilter === "all" ? unlockedItems : unlockedItems.filter((item) => categoryOfUnlockItem(item) === researchCategoryFilter);
  const currentTrack = active?.trackType ? tracks.find((track) => String(track.key) === String(active.trackType)) : null;
  const activeTitle = currentTrack ? `${currentTrack.name} Lv.${Number(active.targetLevel || currentTrack.nextLevel || 1)}` : "\uc5c6\uc74c";
  elements.researchView.innerHTML = `
    <div class="growth-item">
      <div>
        <strong>\uc5f0\uad6c \ud604\ud669</strong>
        <span>\uc911\uc559\uc815\ubd80 Lv.${Number(policy.governmentLevel || 1)} / \uc5f0\uad6c\uc18c Lv.${Number(data?.labLevel || 1)}</span>
        <span>\uc9c4\ud589 \uc911 \uc5f0\uad6c: ${activeTitle}</span>
        ${active ? `<span id="researchActiveRemaining">\ub0a8\uc740 \uc2dc\uac04 ${formatSeconds(Number(active.remainingSeconds || 0))}</span>` : ""}
      </div>
      <div class="research-speedup-controls">
        <div class="speedup-controls">
          <select id="researchSpeedupResource">
            <option value="fuel">\uc5f0\ub8cc</option>
            <option value="metal">\uae08\uc18d</option>
          </select>
          <input id="researchSpeedupAmount" type="number" min="1" value="500">
          <button type="button" id="speedupResearchButton" ${active ? "" : "disabled"}>\uc5f0\uad6c \uac00\uc18d</button>
        </div>
        <span class="hint">\uac00\uc18d \ud6a8\uc728: \uae30\ubcf8 50 \uc7ac\ud654 = 1\ucd08, \uc5f0\uc18d \uc0ac\uc6a9 \ud328\ub110\ud2f0 \ucd5c\ub300 100 \uc7ac\ud654 = 1\ucd08</span>
      </div>
    </div>
    <div class="growth-item"><div class="tech-filter-bar">${filterOptions.map((item) => `<button type="button" class="tech-filter-button ${researchCategoryFilter === item.key ? "active" : ""}" data-tech-filter="${item.key}">${item.label}</button>`).join("")}</div></div>
    <div class="shipyard-grid">
      ${tracks.map((track) => `<div class="growth-item"><div><strong>${track.name}</strong><span>\ud604\uc7ac Lv.${Number(track.level || 0)} / \ub2e4\uc74c Lv.${Number(track.nextLevel || 1)}</span><span>${track.description || ""}</span><span>\ube44\uc6a9: \uae08\uc18d ${Number(track.nextCost?.metal || 0).toLocaleString()} / \uc5f0\ub8cc ${Number(track.nextCost?.fuel || 0).toLocaleString()}</span><span>\uc2dc\uac04: ${formatSeconds(Number(track.nextTime || 0))}</span></div><div class="button-row"><button type="button" data-tech-start="${track.key}" ${(active && !track.researching) ? "disabled" : ""}>\uc5f0\uad6c \uc2dc\uc791</button></div></div>`).join("")}
    </div>
    <div class="shipyard-grid">
      <div class="growth-item"><div><strong>\ud574\uae08 \uc644\ub8cc (${filteredUnlocked.length})</strong></div><div class="log-box">${groupUnlockItems(filteredUnlocked, false)}</div></div>
      <div class="growth-item"><div><strong>\uc7a0\uae08 \ubaa9\ub85d (${filteredLocked.length})</strong></div><div class="log-box">${groupUnlockItems(filteredLocked, true)}</div></div>
    </div>
  `;
  researchButtons = Array.from(document.querySelectorAll("[data-tech-start]"));
  researchButtons.forEach((button) => button.addEventListener("click", () => upgradeResearch(button.dataset.techStart)));
  Array.from(document.querySelectorAll("[data-tech-filter]")).forEach((button) => {
    button.addEventListener("click", () => {
      researchCategoryFilter = String(button.datasetTechFilter || button.dataset.techFilter || "all");
      renderResearchHubV4(researchHubState || data);
    });
  });
  document.getElementById("speedupResearchButton")?.addEventListener("click", speedupResearch);
  startResearchRealtimeTick();
}

async function speedupResearch() {
  clearMessages();
  setBusy(true);
  try {
    const resourceType = String(document.getElementById("researchSpeedupResource")?.value || "fuel");
    const amount = Number(document.getElementById("researchSpeedupAmount")?.value || 0);
    const data = await api("/tech-tree/speedup", {
      method: "POST",
      body: JSON.stringify({ resourceType, amount })
    });
    if (data.resources) {
      renderResources({
        ...data.resources,
        incomingAlerts,
        commander: currentRatesState?.commander || null,
        city: currentRatesState?.city || null
      });
    }
    renderResearchHubV4(data);
    await loadShipyard();
    setStatus(data.message || "\uc5f0\uad6c \uac00\uc18d\uc744 \uc801\uc6a9\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function loadResearchHub() {
  renderResearchHubV4(await api("/tech-tree"));
}

async function loadGrowth() {
  const [admirals, policies] = await Promise.all([
    api("/admirals"),
    api("/policies")
  ]);
  renderAdmirals(admirals);
  renderPolicyPanel(policies);
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
    const data = await api(`/tech-tree/${type}/start`, { method: "POST" });
    renderResearchHubV4(data);
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

async function exileAdmiral(id) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/admirals/${id}/exile`, { method: "POST" });
    renderAdmirals(data);
    await loadFleetGroups();
    setStatus(data.message || "\uc81c\ub3c5\uc744 \ucd94\ubc29\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function saveStrategicPolicies() {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/policies", {
      method: "POST",
      body: JSON.stringify({
        economy: elements.economyPolicySelect?.value,
        industry: elements.industryPolicySelect?.value,
        military: elements.militaryPolicySelect?.value
      })
    });
    await loadResources();
    await loadGrowth();
    setStatus(data.message || "\uc815\ucc45\uc744 \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4.");
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
    setError("\uac1c\ubc1c\uc790 \ube44\ubc00\ubc88\ud638\ub97c \uc785\ub825\ud558\uc138\uc694.");
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

async function attackPlayer(targetUserId, fleetSlot = 1) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/pvp/attack", {
      method: "POST",
      body: JSON.stringify({ targetUserId: Number(targetUserId), fleetSlot: Number(fleetSlot || 1) })
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

async function sendResourceTradeFromTab() {
  const targetUserId = Number(elements.tradeTargetUserIdInput?.value || 0);
  const metal = Number(elements.tradeMetalAmountInput?.value || 0);
  const fuel = Number(elements.tradeFuelAmountInput?.value || 0);
  if (!targetUserId) {
    setError("\uac70\ub798 \ub300\uc0c1 \uc720\uc800 ID\ub97c \uc785\ub825\ud558\uc138\uc694.");
    return;
  }
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/trade/transfer", {
      method: "POST",
      body: JSON.stringify({ toUserId: targetUserId, metal, fuel })
    });
    setStatus(data.message);
    await Promise.all([loadResources(), loadTradeLogs()]);
  } catch (err) {
    handleAuthError(err);
  } finally {
    setBusy(false);
  }
}

async function loadShipTradeLogs() {
  const data = await api("/trade/ship-logs");
  renderShipTradeLogs(data?.logs);
}

async function sendShipTrade() {
  const targetUserId = Number(elements.tradeTargetUserIdInput?.value || 0);
  const designId = Number(elements.tradeShipDesignSelect?.value || 0);
  const quantity = Number(elements.tradeShipQtyInput?.value || 0);
  if (!targetUserId || !designId || quantity < 1) {
    setError("\ud568\uc120 \uac70\ub798 \ub300\uc0c1, \uc124\uacc4\uc548, \uc218\ub7c9\uc744 \ud655\uc778\ud558\uc138\uc694.");
    return;
  }
  clearMessages();
  setBusy(true);
  try {
    const data = await api("/trade/ships", {
      method: "POST",
      body: JSON.stringify({ toUserId: targetUserId, designId, quantity })
    });
    setStatus(data.message);
    if (Array.isArray(data?.ownedShips)) {
      elements.ownedShipsView.innerHTML = data.ownedShips.length
        ? data.ownedShips.map((item) => `
          <div class="growth-item">
            <div><strong>${item.designName}</strong><span>${item.hullName}</span></div>
            <span>${Number(item.quantity || 0)}\ucc99</span>
          </div>
        `).join("")
        : `<div class="growth-item"><div>\ubcf4\uc720 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
    }
    await Promise.all([loadFleet(), loadShipTradeLogs()]);
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

async function captureZone(zoneId, fleetSlot = 1) {
  clearMessages();
  setBusy(true);
  try {
    const data = await api(`/zones/${zoneId}/capture`, {
      method: "POST",
      body: JSON.stringify({ fleetSlot: Number(fleetSlot || 1) })
    });
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

// Initial post-login synchronization for all primary panels.
async function refreshAll() {
  const [resources, fleet, map, empire, research, admirals, policies, players, options, designs, production, repairs, missions, records, sessions, trades, shipTrades, city, fleetGroups, garrison] = await Promise.all([
    api("/resources"),
    api("/fleet"),
    api("/map"),
    api("/empire"),
    api("/tech-tree"),
    api("/admirals"),
    api("/policies"),
    api("/players"),
    api("/shipyard/options"),
    api("/designs"),
    api("/production"),
    api("/repairs"),
    api("/missions"),
    api("/battle-records"),
    api("/battle-sessions"),
    api("/trade/logs"),
    api("/trade/ship-logs"),
    api("/city"),
    api("/fleet-groups"),
    api("/garrison/overview")
  ]);

  renderResources(resources);
  renderFleet(fleet);
  renderMap(map);
  renderEmpire(empire);
  renderResearchHubV4(research);
  renderCityV2(city);
  renderAdmirals(admirals);
  renderPolicyPanel(policies);
  renderPlayers(players);
  renderFleetGroupsV2(fleetGroups);
  renderGarrisonOverviewV2(garrison);
  shipyardOptions = options;
  renderShipyardOptions();
  renderDesigns(designs);
  renderProduction(production);
  renderRepairs(repairs);
  activeMissions = Array.isArray(missions?.activeMissions) ? missions.activeMissions : [];
  renderMissionRoute();
  renderBattleRecords(records?.records);
  renderBattleSessions(sessions?.sessions);
  if (elements.tradeLogView) {
    const logs = Array.isArray(trades?.logs) ? trades.logs : [];
    elements.tradeLogView.innerHTML = logs.length
      ? logs.map((item) => `<div class="growth-item"><div><strong>${item.fromName} -> ${item.toName}</strong><span>\uae08\uc18d ${Number(item.metal || 0).toLocaleString()} / \uc5f0\ub8cc ${Number(item.fuel || 0).toLocaleString()}</span></div></div>`).join("")
      : `<div class="growth-item"><div>\uac70\ub798 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div></div>`;
  }
  renderShipTradeLogs(shipTrades?.logs);
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

// Final module display helper. Modules now follow the Notion Family + Mk1~Mk3 model.
function componentNameById(id) {
  const found = shipyardOptions.components.find((item) => Number(item.id) === Number(id));
  if (!found) return `#${id}`;
  return found.name;
}

// Final module option label used by design slot selects.
function optionLabel(component) {
  const bonus = Number(component.powerBonus || 0) > 0 ? `, +\uc804\ub825\ud55c\uacc4 ${component.powerBonus}` : "";
  const lockedText = component.unlocked === false ? ` (\uc7a0\uae08: ${component.unlockRequirementText || "\uc5f0\uad6c \ud544\uc694"})` : "";
  return `${component.name} / +\uacf5\uaca9 ${component.attackBonus}, +\ubc29\uc5b4 ${component.defenseBonus}, +HP ${component.hpBonus}, +\uc18d\ub3c4 ${component.speedBonus}${bonus} / \uc804\ub825 ${component.powerCost}, \uae08\uc18d ${component.metalCost}, \uc5f0\ub8cc ${component.fuelCost}${lockedText}`;
}

// Wires UI events once during startup. Optional controls are guarded.
function bindEvents() {
  elements.signupButton.addEventListener("click", signup);
  elements.loginButton.addEventListener("click", login);
  elements.logoutButton.addEventListener("click", logout);
  elements.quickStartButton?.addEventListener("click", quickStart);
  elements.enterCurrentSessionButton?.addEventListener("click", enterCurrentSession);
  elements.createRoomButton?.addEventListener("click", createRoom);
  elements.joinInviteButton?.addEventListener("click", joinInviteRoom);
  elements.refreshLobbyButton?.addEventListener("click", () => loadLobby().catch(handleAuthError));
  elements.lobbyRecruitNormalButton?.addEventListener("click", () => recruitLobbyAdmiral("normal"));
  elements.lobbyRecruitPremiumButton?.addEventListener("click", () => recruitLobbyAdmiral("premium"));
  elements.endSessionButton?.addEventListener("click", endCurrentSession);
  elements.refreshResourcesButton.addEventListener("click", loadResources);
  elements.refreshFleetButton.addEventListener("click", loadFleet);
  elements.refreshZonesButton.addEventListener("click", loadZones);
  elements.refreshPlayersButton?.addEventListener("click", loadPlayers);
  elements.battleButton.addEventListener("click", startBattle);
  elements.toggleZoneSearchButton.addEventListener("click", toggleZoneSearch);
  elements.zoneSearchInput.addEventListener("input", renderZoneSearchList);
  elements.zoneLevelFilter.addEventListener("change", renderZoneSearchList);
  elements.zoneLayerFilter?.addEventListener("change", renderZoneSearchList);
  elements.zoneOwnerFilter.addEventListener("change", renderZoneSearchList);
  elements.playerSearchInput?.addEventListener("input", renderPlayerSearchList);
  elements.drawAdmiralButton.addEventListener("click", drawAdmiral);
  elements.moveBaseButton.addEventListener("click", moveBase);
  elements.saveDesignButton.addEventListener("click", saveDesign);
  elements.deleteDesignButton.addEventListener("click", deleteDesign);
  elements.resetDesignButton.addEventListener("click", resetDesignForm);
  elements.startProductionButton.addEventListener("click", startDesignProduction);
  elements.speedupProductionButton.addEventListener("click", speedupProduction);
  elements.cancelProductionButton.addEventListener("click", cancelProduction);
  elements.resetProductionLogsButton?.addEventListener("click", resetProductionLogs);
  elements.cancelMissionButton.addEventListener("click", cancelMission);
  elements.speedupMissionButton.addEventListener("click", speedupMission);
  elements.toggleDevButton.addEventListener("click", toggleDevPanel);
  elements.devLoginButton.addEventListener("click", devLogin);
  elements.refreshDevUsersButton.addEventListener("click", () => refreshDevUsers().catch(handleAuthError));
  elements.zoomInButton?.addEventListener("click", () => applyMapZoom(mapZoom + 0.1));
  elements.zoomOutButton?.addEventListener("click", () => applyMapZoom(mapZoom - 0.1));
  elements.centerBaseButton?.addEventListener("click", centerOnBase);
  elements.uiScaleRange?.addEventListener("input", () => applyUiScale(Number(elements.uiScaleRange.value)));
  elements.toggleDetailButton?.addEventListener("click", () => setDetailPanelVisible(!detailPanelVisible));
  elements.toggleAlertButton?.addEventListener("click", () => setAlertPanelVisible(!alertPanelVisible));
  elements.closeAlertHudButton?.addEventListener("click", () => setAlertPanelVisible(false));
  elements.closeBaseOverlayButton?.addEventListener("click", () => setBaseOverlayVisible(false));
  elements.designSubtabButton.addEventListener("click", () => showProductionSubtab("design"));
  elements.buildSubtabButton.addEventListener("click", () => showProductionSubtab("build"));
  elements.productionDesignSelect.addEventListener("change", renderSelectedProductionDesign);
  elements.resetBattleRecordsButton.addEventListener("click", resetBattleRecords);
  elements.savePolicyButton?.addEventListener("click", saveStrategicPolicies);
  elements.tradeResourceButton?.addEventListener("click", sendResourceTradeFromTab);
  elements.tradeShipButton?.addEventListener("click", sendShipTrade);
  elements.baseMoveX.addEventListener("input", renderMoveCost);
  elements.baseMoveY.addEventListener("input", renderMoveCost);

  elements.hullSelect.addEventListener("change", () => {
    createSlotSelects();
    renderDesignPreview();
  });
  [elements.engineSlots, elements.weaponSlots, elements.defenseSlots, elements.utilitySlots].filter(Boolean).forEach((container) => {
    container.addEventListener("change", renderDesignPreview);
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  });

  setupMapDragging();
  setupDraggableWindows();
  if (elements.mapZoomLabel) {
    elements.mapZoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
  }
  applyUiScale(uiScale);

  elements.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  elements.devPasscodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") devLogin();
  });

  elements.lobbyPanel?.addEventListener("click", handleLobbyDelegatedClick, true);
}

function handleLobbyDelegatedClick(event) {
  const button = event.target.closest("button");
  if (!button || !elements.lobbyPanel?.contains(button) || button.disabled) return;

  let action = null;
  if (button.id === "quickStartButton") action = () => quickStart();
  else if (button.id === "enterCurrentSessionButton" || button.dataset.enterSession) action = () => enterCurrentSession();
  else if (button.id === "createRoomButton") action = () => createRoom();
  else if (button.id === "joinInviteButton") action = () => joinInviteRoom();
  else if (button.id === "refreshLobbyButton") action = () => loadLobby().catch(handleAuthError);
  else if (button.id === "lobbyRecruitNormalButton") action = () => recruitLobbyAdmiral("normal");
  else if (button.id === "lobbyRecruitPremiumButton") action = () => recruitLobbyAdmiral("premium");
  else if (button.dataset.joinRoom) action = () => joinRoom(Number(button.dataset.joinRoom));
  else if (button.dataset.readyRoom) action = () => toggleRoomReady(Number(button.dataset.readyRoom));
  else if (button.dataset.startRoom) action = () => startRoom(Number(button.dataset.startRoom));
  else if (button.dataset.leaveRoom) action = () => leaveRoom(Number(button.dataset.leaveRoom));
  else if (button.dataset.featuredAdmiral) action = () => selectLobbyAdmiral("featured", Number(button.dataset.featuredAdmiral));
  else if (button.dataset.sessionAdmiral) action = () => selectLobbyAdmiral("session", Number(button.dataset.sessionAdmiral));
  else if (button.dataset.hostAction === "refresh") action = () => loadLobby().catch(handleAuthError);
  else if (button.dataset.hostAction === "start") {
    const roomId = Number(lobbyState.joinedRoom?.id || window.lobbyState?.joinedRoom?.id || 0);
    action = () => roomId ? startRoom(roomId) : setError("시작할 방을 찾을 수 없습니다.");
  } else if (button.dataset.shopAction === "normal" || button.dataset.shopAction === "premium") {
    action = () => recruitLobbyAdmiral(String(button.dataset.shopAction));
  } else if (button.dataset.shortcut) {
    const shortcut = String(button.dataset.shortcut);
    action = () => {
      if (shortcut === "quick") return quickStart();
      if (shortcut === "enter") return enterCurrentSession();
      const tabKey = { room: "room", mission: "mission", result: "result", admiral: "admiral", shop: "shop" }[shortcut];
      if (tabKey) document.querySelector(`[data-lobby-tab="${tabKey}"]`)?.click();
    };
  }

  if (!action) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  action();
}

function exposePublicApi() {
  Object.assign(window, {
    TOKEN_KEY,
    USERNAME_KEY,
    api,
    clearMessages,
    setBusy,
    setStatus,
    setError,
    handleAuthError,
    loadLobby,
    renderLobby,
    renderLobbyAdmirals,
    renderCurrentRoom,
    renderSessionSummary,
    renderRewardLogs,
    loadLobbyAdmirals,
    recruitLobbyAdmiral,
    selectLobbyAdmiral,
    quickStart,
    enterCurrentSession,
    createRoom,
    joinRoom,
    joinInviteRoom,
    toggleRoomReady,
    startRoom,
    leaveRoom,
    roomStatusLabel,
    endCurrentSession,
    showLobby,
    showGame,
    showAuth,
    refreshAll,
    loadGrowth,
    renderAdmirals,
    renderPolicyPanel,
    renderPlayers,
    renderPlayerSearchList,
    loadPlayers,
    assignZoneGarrison,
    attackPlayer,
    renderBattleSessions,
    retreatBattleSession,
    ensureBattleSessionPolling,
    ensureMissionPolling,
    renderMissionRoute,
    updateDebug
  });
  syncPublicState();
}

async function restoreSession() {
  await loadShipInfo();

  if (!authToken) {
    showAuth();
    return;
  }

  const username = localStorage.getItem(USERNAME_KEY) || "\uc0ac\ub839\uad00";
  showLobby(username);

  try {
    await loadLobby();
    setStatus("\uc800\uc7a5\ub41c \ud1a0\ud070\uc73c\ub85c \uc811\uc18d\uc744 \ubcf5\uad6c\ud588\uc2b5\ub2c8\ub2e4.");
  } catch (err) {
    clearRealtimeTimers();
    clearSession();
    showAuth();
    setError("\uc800\uc7a5\ub41c \ub85c\uadf8\uc778 \uc815\ubcf4\uac00 \ub9cc\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub85c\uadf8\uc778\ud558\uc138\uc694.");
  }
}

exposePublicApi();
bindEvents();
restoreSession();
