(() => {
  const state = {
    installed: false,
    activeTab: "home",
    tabs: [
      { key: "home", label: "메인" },
      { key: "room", label: "방" },
      { key: "shop", label: "상점" },
      { key: "admiral", label: "제독" },
      { key: "result", label: "정산" }
    ]
  };

  const recruitBundles = [
    { key: "normal", title: "일반 영입", type: "normal" },
    { key: "premium", title: "고급 영입", type: "premium" }
  ];

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function panel(key) {
    return qs(`[data-lobby-system-panel="${key}"]`);
  }

  function findCardByTitle(title) {
    return qsa("#lobbyPanel .card, #lobbyPanel .lobby-room-card").find((card) => {
      if (card.closest("#lobbySystemTabs")) return false;
      return qs("h3", card)?.textContent.trim() === title;
    }) || null;
  }

  function ensureCard(id, title, bodyHtml, targetPanel) {
    let card = document.getElementById(id);
    if (!card) {
      card = document.createElement("section");
      card.id = id;
      card.className = "card lobby-room-card";
      card.innerHTML = `
        <div class="panel-head">
          <div>
            <h3>${title}</h3>
          </div>
        </div>
        ${bodyHtml}
      `;
    }
    targetPanel?.appendChild(card);
    return card;
  }

  function ensureShell() {
    const lobby = document.getElementById("lobbyPanel");
    if (!lobby) return null;
    let shell = document.getElementById("lobbySystemTabs");
    if (shell) return shell;

    shell = document.createElement("div");
    shell.id = "lobbySystemTabs";
    shell.className = "lobby-tabs-shell";
    shell.innerHTML = `
      <div class="lobby-tab-nav" id="lobbySystemNav">
        ${state.tabs.map((tab) => `<button type="button" class="lobby-tab-button" data-lobby-system-tab="${tab.key}">${tab.label}</button>`).join("")}
      </div>
      <div class="lobby-tab-viewport">
        <div class="lobby-tab-track" id="lobbySystemTrack">
          ${state.tabs.map((tab) => `<section class="lobby-tab-panel" data-lobby-system-panel="${tab.key}"></section>`).join("")}
        </div>
      </div>
    `;

    qs(".lobby-header", lobby)?.insertAdjacentElement("afterend", shell);
    qs("#lobbySystemNav", shell)?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-lobby-system-tab]");
      if (!button) return;
      setTab(button.dataset.lobbySystemTab);
    });
    setTab(state.activeTab);
    return shell;
  }

  function setTab(key) {
    const index = Math.max(0, state.tabs.findIndex((tab) => tab.key === key));
    state.activeTab = state.tabs[index]?.key || "home";
    const track = document.getElementById("lobbySystemTrack");
    if (track) track.style.transform = `translateX(-${index * 100}%)`;
    qsa("[data-lobby-system-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.lobbySystemTab === state.activeTab);
    });
  }

  function moveBaseCards() {
    ensureShell();
    const home = panel("home");
    const room = panel("room");
    const shop = panel("shop");
    const admiral = panel("admiral");
    const result = panel("result");
    if (!home || !room || !shop || !admiral || !result) return;

    const quickStart = findCardByTitle("Quick Start");
    const status = findCardByTitle("Lobby Status");
    const createRoom = findCardByTitle("Create Room");
    const inviteCode = findCardByTitle("Invite Code");
    const rooms = findCardByTitle("Rooms");
    const sessionResult = findCardByTitle("Session Result");
    const lobbyAdmirals = findCardByTitle("Lobby Admirals");

    if (!qs("#lobbyHomeGrid", home)) {
      home.innerHTML = `<div id="lobbyHomeGrid" class="lobby-panel-grid-2"></div><div id="lobbyHomeExtra"></div>`;
    }
    const homeGrid = qs("#lobbyHomeGrid", home);
    if (quickStart && quickStart.parentElement !== homeGrid) homeGrid.appendChild(quickStart);
    if (status && status.parentElement !== homeGrid) homeGrid.appendChild(status);

    if (!qs("#lobbyRoomGrid", room)) room.innerHTML = `<div id="lobbyRoomGrid" class="lobby-panel-grid-2"></div>`;
    const roomGrid = qs("#lobbyRoomGrid", room);
    if (createRoom && createRoom.parentElement !== roomGrid) roomGrid.appendChild(createRoom);
    if (inviteCode && inviteCode.parentElement !== roomGrid) roomGrid.appendChild(inviteCode);
    if (rooms && rooms.parentElement !== room) room.appendChild(rooms);

    ensureCard("lobbySystemShopCard", "크레딧 상점", `<div id="lobbySystemShopView" class="lobby-shop-grid"></div>`, shop);
    if (lobbyAdmirals && !document.getElementById("admiralLibraryShell") && lobbyAdmirals.parentElement !== admiral) {
      admiral.appendChild(lobbyAdmirals);
    }
    ensureCard("lobbySystemAdmiralGuide", "제독 가이드", `<div id="lobbyAdmiralGuideView"></div>`, admiral);

    if (sessionResult && sessionResult.parentElement !== result) result.appendChild(sessionResult);
  }

  function renderShop() {
    const view = document.getElementById("lobbySystemShopView");
    if (!view) return;
    const recruitTypes = new Map((window.lobbyAdmiralState?.recruitTypes || []).map((item) => [String(item.key), item]));
    view.innerHTML = recruitBundles.map((item) => {
      const type = recruitTypes.get(item.type);
      const cost = Number(type?.costCredit || 0);
      return `
        <div class="lobby-shop-card">
          <div>
            <strong>${type?.name || item.title}</strong>
            <span>${cost.toLocaleString()} credits</span>
            <small>R ${Math.round(Number(type?.chances?.R || 0) * 100)}% / SR ${Math.round(Number(type?.chances?.SR || 0) * 100)}% / SSR ${Math.round(Number(type?.chances?.SSR || 0) * 100)}%</small>
          </div>
          <button type="button" data-lobby-recruit="${item.type}">영입</button>
        </div>
      `;
    }).join("");
  }

  function renderGuide() {
    const view = document.getElementById("lobbyAdmiralGuideView");
    if (!view) return;
    const profile = window.lobbyState?.profile || {};
    const count = Array.isArray(window.lobbyAdmiralState?.admirals) ? window.lobbyAdmiralState.admirals.length : 0;
    view.innerHTML = `
      <div class="lobby-checklist">
        <div class="lobby-check-item done"><strong>대표 제독</strong><span>${profile.featuredAdmiralName || "미지정"}</span></div>
        <div class="lobby-check-item ${profile.selectedSessionAdmiralName ? "done" : "pending"}"><strong>다음 세션 제독</strong><span>${profile.selectedSessionAdmiralName || "미선택"}</span></div>
        <div class="lobby-check-item done"><strong>보유 제독</strong><span>${count.toLocaleString()}명</span></div>
      </div>
    `;
  }

  function refresh() {
    moveBaseCards();
    renderShop();
    renderGuide();
    window.renderAdmiralSystem?.();
  }

  function bindDelegatedActions() {
    const lobby = document.getElementById("lobbyPanel");
    if (!lobby || lobby.dataset.lobbySystemBound === "1") return;
    lobby.dataset.lobbySystemBound = "1";
    lobby.addEventListener("click", (event) => {
      const recruit = event.target.closest("[data-lobby-recruit]");
      if (!recruit || recruit.disabled) return;
      event.preventDefault();
      window.recruitLobbyAdmiral?.(recruit.dataset.lobbyRecruit);
    });
  }

  function wrap(name, after) {
    const original = window[name];
    if (typeof original !== "function" || original.__lobbySystemWrapped) return;
    const wrapped = function wrappedLobbySystem(...args) {
      const result = original.apply(this, args);
      Promise.resolve(result).finally(after);
      return result;
    };
    wrapped.__lobbySystemWrapped = true;
    window[name] = wrapped;
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    bindDelegatedActions();
    wrap("renderLobby", refresh);
    wrap("renderLobbyAdmirals", refresh);
    wrap("showLobby", () => setTimeout(refresh, 0));
    wrap("loadLobby", refresh);
    refresh();
    window.setLobbySystemTab = setTab;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
