(() => {
  const state = {
    installed: false,
    activeSubtab: "recruit",
    modalOpen: false
  };

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function rarityClass(value) {
    return String(value || "R").toLowerCase();
  }

  function admirals() {
    return Array.isArray(window.lobbyAdmiralState?.admirals) ? window.lobbyAdmiralState.admirals : [];
  }

  function ensureShell() {
    const panel = qs('[data-lobby-system-panel="admiral"], [data-lobby-panel="admiral"]');
    if (!panel) return null;
    let shell = document.getElementById("admiralLibraryShell");
    if (shell) {
      if (shell.parentElement !== panel) panel.prepend(shell);
      return shell;
    }

    shell = document.createElement("section");
    shell.id = "admiralLibraryShell";
    shell.className = "card lobby-room-card";
    shell.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>제독 센터</h3>
          <p class="hint">영입, 보유 제독, 도감을 한 곳에서 관리합니다.</p>
        </div>
      </div>
      <div class="admiral-subtabs">
        <button type="button" class="admiral-subtab-button" data-admiral-subtab="recruit">영입</button>
        <button type="button" class="admiral-subtab-button" data-admiral-subtab="lounge">대기실</button>
        <button type="button" class="admiral-subtab-button" data-admiral-subtab="codex">도감</button>
      </div>
      <div class="admiral-subpanel" data-admiral-subpanel="recruit"></div>
      <div class="admiral-subpanel" data-admiral-subpanel="lounge">
        <div id="admiralLoungeView" class="admiral-card-grid"></div>
      </div>
      <div class="admiral-subpanel" data-admiral-subpanel="codex">
        <div id="admiralCodexView" class="admiral-card-grid"></div>
      </div>
    `;
    panel.prepend(shell);

    shell.addEventListener("click", (event) => {
      const subtab = event.target.closest("[data-admiral-subtab]");
      if (subtab) {
        event.preventDefault();
        setSubtab(subtab.dataset.admiralSubtab);
        return;
      }

      const card = event.target.closest("[data-admiral-card-id]");
      if (card) {
        openModal(Number(card.dataset.admiralCardId));
      }
    });
    return shell;
  }

  function moveRecruitCard() {
    const shell = ensureShell();
    const recruitPanel = qs('[data-admiral-subpanel="recruit"]', shell);
    const recruitCard = qsa("#lobbyPanel .card, #lobbyPanel .lobby-room-card").find((card) => {
      if (card.id === "admiralLibraryShell") return false;
      return qs("h3", card)?.textContent.trim() === "Lobby Admirals";
    });
    if (recruitCard && recruitPanel && recruitCard.parentElement !== recruitPanel) {
      recruitPanel.appendChild(recruitCard);
    }
  }

  function setSubtab(key) {
    state.activeSubtab = key || "recruit";
    qsa("#admiralLibraryShell [data-admiral-subtab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.admiralSubtab === state.activeSubtab);
    });
    qsa("#admiralLibraryShell [data-admiral-subpanel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.admiralSubpanel === state.activeSubtab);
    });
  }

  function statLine(admiral) {
    const combat = Number(admiral.combatBonus || 0) * 100;
    const resource = Number(admiral.resourceBonus || 0) * 100;
    const cost = Number(admiral.costBonus || 0) * 100;
    return `전투 +${combat.toFixed(0)}% / 자원 +${resource.toFixed(0)}% / 비용 -${cost.toFixed(0)}%`;
  }

  function cardHtml(admiral) {
    const tags = [];
    if (admiral.isFeatured) tags.push(`<span class="admiral-tag highlight">대표</span>`);
    if (admiral.isSessionSelected) tags.push(`<span class="admiral-tag highlight">다음 세션</span>`);
    return `
      <article class="admiral-card" data-admiral-card-id="${admiral.id}">
        <div class="admiral-card-header">
          <div>
            <strong>${admiral.name}</strong>
            <span>${statLine(admiral)}</span>
          </div>
          <span class="admiral-rarity ${rarityClass(admiral.rarity)}">${admiral.rarity}</span>
        </div>
        <div class="admiral-tags">${tags.join("") || `<span class="admiral-tag">보유</span>`}</div>
      </article>
    `;
  }

  function renderLists() {
    const list = admirals();
    const lounge = document.getElementById("admiralLoungeView");
    const codex = document.getElementById("admiralCodexView");
    const empty = `<div class="admiral-empty">아직 보유한 제독이 없습니다. 영입 탭에서 제독을 획득하세요.</div>`;
    if (lounge) lounge.innerHTML = list.length ? list.map(cardHtml).join("") : empty;
    if (codex) codex.innerHTML = list.length ? list.map(cardHtml).join("") : empty;
  }

  function ensureModal() {
    let modal = document.getElementById("admiralDetailModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "admiralDetailModal";
    modal.className = "admiral-modal hidden";
    modal.innerHTML = `<div class="admiral-modal-card" id="admiralDetailCard"></div>`;
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.body.appendChild(modal);
    return modal;
  }

  function openModal(id) {
    const admiral = admirals().find((item) => Number(item.id) === Number(id));
    if (!admiral) return;
    const modal = ensureModal();
    const card = document.getElementById("admiralDetailCard");
    card.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow">ADMIRAL DETAIL</p>
          <h2>[${admiral.rarity}] ${admiral.name}</h2>
        </div>
        <button type="button" data-admiral-close>닫기</button>
      </div>
      <div class="admiral-info-list">
        <div class="admiral-info-line"><strong>효과</strong><span>${statLine(admiral)}</span></div>
        <div class="admiral-info-line"><strong>상태</strong><span>${admiral.isFeatured ? "대표 제독" : "대표 미지정"} / ${admiral.isSessionSelected ? "다음 세션 배치" : "세션 미선택"}</span></div>
      </div>
      <div class="button-row" style="margin-top:14px;">
        <button type="button" data-featured-admiral="${admiral.id}" ${admiral.isFeatured ? "disabled" : ""}>대표 제독</button>
        <button type="button" data-session-admiral="${admiral.id}" ${admiral.isSessionSelected ? "disabled" : ""}>다음 세션</button>
      </div>
    `;
    qs("[data-admiral-close]", card)?.addEventListener("click", closeModal);
    qs("[data-featured-admiral]", card)?.addEventListener("click", async () => {
      await window.selectLobbyAdmiral?.("featured", admiral.id);
      closeModal();
    });
    qs("[data-session-admiral]", card)?.addEventListener("click", async () => {
      await window.selectLobbyAdmiral?.("session", admiral.id);
      closeModal();
    });
    modal.classList.remove("hidden");
    state.modalOpen = true;
  }

  function closeModal() {
    document.getElementById("admiralDetailModal")?.classList.add("hidden");
    state.modalOpen = false;
  }

  function render() {
    ensureShell();
    moveRecruitCard();
    renderLists();
    setSubtab(state.activeSubtab);
  }

  function hideLegacyGrowthAdmiralCard() {
    const admiralView = document.getElementById("admiralView");
    const drawButton = document.getElementById("drawAdmiralButton");
    const card = (drawButton || admiralView)?.closest(".card");
    if (card) card.style.display = "none";
  }

  function wrap(name) {
    const original = window[name];
    if (typeof original !== "function" || original.__admiralSystemWrapped) return;
    const wrapped = function wrappedAdmiralSystem(...args) {
      const result = original.apply(this, args);
      Promise.resolve(result).finally(render);
      return result;
    };
    wrapped.__admiralSystemWrapped = true;
    window[name] = wrapped;
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    window.renderAdmiralSystem = render;
    hideLegacyGrowthAdmiralCard();
    wrap("renderLobby");
    wrap("renderLobbyAdmirals");
    wrap("loadLobby");
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.modalOpen) closeModal();
    });
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
