(() => {
  let recruitOverlayTimer = null;

  function hideLegacyGrowthAdmiralCard() {
    const admiralView = document.getElementById('admiralView');
    const drawButton = document.getElementById('drawAdmiralButton');
    const card = (drawButton || admiralView)?.closest('.card');
    if (card) {
      card.style.display = 'none';
      card.dataset.legacyHidden = '1';
    }
  }

  function removeLegacyGrowthAdmiralDom() {
    const admiralView = document.getElementById('admiralView');
    const drawButton = document.getElementById('drawAdmiralButton');
    const card = (drawButton || admiralView)?.closest('.card');
    if (card) card.remove();
  }

  function labelGrowthPolicyAsPrimary() {
    const growthTab = document.querySelector('[data-tab-panel="growth"]');
    const firstCard = growthTab?.querySelector('.card');
    if (!firstCard || firstCard.querySelector('[data-growth-policy-notice]')) return;
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.dataset.growthPolicyNotice = '1';
    hint.textContent = '제독 영입/선택은 로비에서 진행합니다. 성장 탭은 정책 전용으로 사용하세요.';
    firstCard.appendChild(hint);
  }

  function sanitizeElementRefs() {
    if (!window.elements) return;
    ['admiralView', 'drawAdmiralButton', 'playerTargetView', 'refreshPlayersButton'].forEach((key) => {
      if (key in window.elements) window.elements[key] = null;
    });
  }

  function ensureLobbyEnhancementShell() {
    const lobbyPanel = elements.lobbyPanel;
    if (!lobbyPanel) return;
    if (!document.getElementById('creditShopCard')) {
      const card = document.createElement('section');
      card.id = 'creditShopCard';
      card.className = 'card lobby-room-card';
      card.innerHTML = `
        <div class="panel-head">
          <div>
            <h3>Credit Shop</h3>
            <p class="hint">크레딧으로 다음 세션 준비를 진행합니다.</p>
          </div>
        </div>
        <div id="creditShopView" class="credit-shop-grid"></div>
      `;
      lobbyPanel.appendChild(card);
    }
    if (!document.getElementById('recruitOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'recruitOverlay';
      overlay.className = 'recruit-overlay hidden';
      overlay.innerHTML = `
        <div class="recruit-overlay-card">
          <div class="eyebrow">ADMIRAL RECRUIT</div>
          <h2 id="recruitOverlayTitle">신규 제독</h2>
          <div id="recruitOverlayRarity" class="recruit-rarity">R</div>
          <p id="recruitOverlayQuote" class="recruit-quote"></p>
          <button type="button" id="closeRecruitOverlayButton" class="primary">확인</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) hideRecruitOverlay();
      });
      document.getElementById('closeRecruitOverlayButton')?.addEventListener('click', hideRecruitOverlay);
    }
  }

  function hideRecruitOverlay() {
    if (recruitOverlayTimer) {
      clearTimeout(recruitOverlayTimer);
      recruitOverlayTimer = null;
    }
    document.getElementById('recruitOverlay')?.classList.add('hidden');
  }

  function showRecruitOverlay(log) {
    ensureLobbyEnhancementShell();
    const overlay = document.getElementById('recruitOverlay');
    if (!overlay || !log?.admiral) return;
    document.getElementById('recruitOverlayTitle').textContent = log.admiral.name || '신규 제독';
    const rarityNode = document.getElementById('recruitOverlayRarity');
    rarityNode.textContent = log.admiral.rarity || 'R';
    rarityNode.dataset.rarity = String(log.admiral.rarity || 'R').toUpperCase();
    document.getElementById('recruitOverlayQuote').textContent = `${log.recruitType || 'Recruit'} / -${Number(log.costCredit || 0).toLocaleString()} credits`;
    overlay.classList.remove('hidden');
    recruitOverlayTimer = setTimeout(() => overlay.classList.add('hidden'), 3200);
  }

  function renderCreditShop(recruitTypes) {
    ensureLobbyEnhancementShell();
    const view = document.getElementById('creditShopView');
    if (!view) return;
    const types = Array.isArray(recruitTypes) ? recruitTypes : [];
    const extras = [
      { key: 'coming_mission', name: 'Mission Pack', costCredit: 800, detail: '준비 중 / 세션 미션 추가 보상 예정', disabled: true },
      { key: 'coming_skin', name: 'Bridge Theme', costCredit: 1200, detail: '준비 중 / 로비 테마 확장 예정', disabled: true }
    ];
    const cards = types.map((type) => ({
      key: type.key,
      name: type.name,
      costCredit: type.costCredit,
      detail: `R ${Math.round(Number(type.chances?.R || 0) * 100)}% · SR ${Math.round(Number(type.chances?.SR || 0) * 100)}% · SSR ${Math.round(Number(type.chances?.SSR || 0) * 100)}%`,
      disabled: false,
      actionLabel: '구매 / 영입',
      recruitType: type.key
    })).concat(extras);
    view.innerHTML = cards.map((item) => `
      <div class="shop-item ${item.disabled ? 'disabled' : ''}">
        <div>
          <strong>${item.name}</strong>
          <span>${Number(item.costCredit || 0).toLocaleString()} credits</span>
          <span>${item.detail || ''}</span>
        </div>
        <button type="button" ${item.disabled ? 'disabled' : ''} data-shop-action="${item.recruitType || item.key}">${item.actionLabel || '준비 중'}</button>
      </div>
    `).join('');
    Array.from(view.querySelectorAll('[data-shop-action]')).forEach((button) => {
      button.addEventListener('click', () => {
        const key = String(button.dataset.shopAction || '');
        if (key === 'normal' || key === 'premium') recruitLobbyAdmiral(key);
      });
    });
  }

  function overrideSetBusy() {
    if (!window.elements) return;
    window.setBusy = function (isBusy) {
      const buttons = [
        elements.signupButton, elements.loginButton, elements.logoutButton,
        elements.refreshResourcesButton, elements.refreshFleetButton, elements.refreshZonesButton,
        elements.battleButton, elements.moveBaseButton, elements.saveDesignButton,
        elements.deleteDesignButton, elements.resetDesignButton, elements.startProductionButton,
        elements.speedupProductionButton, elements.cancelProductionButton, elements.resetProductionLogsButton,
        elements.cancelMissionButton, elements.speedupMissionButton, elements.designSubtabButton,
        elements.buildSubtabButton, elements.toggleDevButton, elements.devLoginButton,
        elements.refreshDevUsersButton, elements.resetBattleRecordsButton, elements.savePolicyButton,
        elements.toggleZoneSearchButton, elements.tradeResourceButton, elements.tradeShipButton,
        elements.centerBaseButton, elements.endSessionButton, elements.quickStartButton,
        elements.enterCurrentSessionButton, elements.createRoomButton, elements.joinInviteButton,
        elements.refreshLobbyButton, elements.lobbyRecruitNormalButton, elements.lobbyRecruitPremiumButton,
        ...(Array.isArray(window.captureButtons) ? window.captureButtons : []),
        ...(Array.isArray(window.researchButtons) ? window.researchButtons : []),
        ...(Array.isArray(window.pvpButtons) ? window.pvpButtons : [])
      ].filter(Boolean);
      buttons.forEach((button) => {
        button.disabled = isBusy;
      });
    };
  }

  function overrideLoadGrowth() {
    if (typeof window.api !== 'function' || typeof window.renderPolicyPanel !== 'function') return;
    window.loadGrowth = async function () {
      const policies = await window.api('/policies');
      window.renderPolicyPanel(policies);
      return policies;
    };
  }

  function overrideAssignZoneGarrison() {
    if (typeof window.api !== 'function') return;
    window.assignZoneGarrison = async function (zoneId, fleetSlot) {
      clearMessages();
      setBusy(true);
      try {
        const data = await window.api(`/zones/${zoneId}/garrison/dispatch`, {
          method: 'POST',
          body: JSON.stringify({ fleetSlot })
        });
        setStatus(data.message);
        if (Array.isArray(data.activeMissions)) {
          activeMissions = data.activeMissions;
          renderMissionRoute();
          ensureMissionPolling();
        }
        await loadZones();
      } catch (err) {
        handleAuthError(err);
      } finally {
        setBusy(false);
      }
    };
  }

  function overrideRefreshAll() {
    if (typeof window.api !== 'function') return;
    window.refreshAll = async function () {
      const [resources, fleet, map, empire, research, policies, options, designs, production, repairs, missions, records, sessions, trades, shipTrades, city, fleetGroups, garrison] = await Promise.all([
        api('/resources'), api('/fleet'), api('/map'), api('/empire'), api('/tech-tree'), api('/policies'), api('/shipyard/options'), api('/designs'), api('/production'), api('/repairs'), api('/missions'), api('/battle-records'), api('/battle-sessions'), api('/trade/logs'), api('/trade/ship-logs'), api('/city'), api('/fleet-groups'), api('/garrison/overview')
      ]);
      renderResources(resources); renderFleet(fleet); renderMap(map); renderEmpire(empire); renderResearchHubV4(research); renderCityV2(city); renderPolicyPanel(policies); renderFleetGroupsV2(fleetGroups); renderGarrisonOverviewV2(garrison); shipyardOptions = options; renderShipyardOptions(); renderDesigns(designs); renderProduction(production); renderRepairs(repairs); activeMissions = Array.isArray(missions?.activeMissions) ? missions.activeMissions : []; renderMissionRoute(); renderBattleRecords(records?.records); renderBattleSessions(sessions?.sessions);
      if (elements.tradeLogView) {
        const logs = Array.isArray(trades?.logs) ? trades.logs : [];
        elements.tradeLogView.innerHTML = logs.length ? logs.map((item) => `<div class="growth-item"><div><strong>${item.fromName} -> ${item.toName}</strong><span>금속 ${Number(item.metal || 0).toLocaleString()} / 연료 ${Number(item.fuel || 0).toLocaleString()}</span></div></div>`).join('') : `<div class="growth-item"><div>거래 기록이 없습니다.</div></div>`;
      }
      renderShipTradeLogs(shipTrades?.logs);
    };
  }

  function overrideRenderBattleSessions() {
    window.renderBattleSessions = function (sessions) {
      if (!window.elements?.battleSessionsView) return;
      const list = Array.isArray(sessions) ? sessions : [];
      const hasActive = list.some((session) => ['active', 'retreating'].includes(String(session.state || '')));
      const stateLabel = { active: '전투 중', retreating: '후퇴 중', ended: '종료' };
      const resultLabel = { victory: '승리', defeat: '패배', retreat: '후퇴', combat: '교전' };
      elements.battleSessionsView.innerHTML = list.length
        ? list.map((session) => {
            const logs = Array.isArray(session.log) ? session.log : [];
            const latest = logs.length ? logs[logs.length - 1] : '';
            const retreatButton = session.state === 'active' || session.state === 'retreating' ? `<button type="button" data-retreat-session="${session.id}">후퇴</button>` : '';
            return `<div class="growth-item"><div><strong>${session.targetName || `${session.targetType} #${session.targetId || '-'}`} / ${stateLabel[session.state] || session.state} / ${resultLabel[session.result] || session.result || '진행'}</strong><span>틱 ${Number(session.tick || 0)} / ${latest}</span><details><summary>전체 로그</summary><pre>${logs.join('\n') || '기록 없음'}</pre></details></div>${retreatButton}</div>`;
          }).join('')
        : `<div class="growth-item"><div>전투 세션 기록이 없습니다.</div></div>`;
      Array.from(elements.battleSessionsView.querySelectorAll('[data-retreat-session]')).forEach((button) => {
        button.addEventListener('click', () => retreatBattleSession(Number(button.dataset.retreatSession)));
      });
      if (hasActive) ensureBattleSessionPolling();
      if (!hasActive && window.battleSessionPoller) {
        clearInterval(window.battleSessionPoller);
        window.battleSessionPoller = null;
      }
    };
  }

  function overridePlayerFlow() {
    if (typeof window.api !== 'function') return;
    window.renderPlayers = function (data) {
      window.currentPlayers = Array.isArray(data?.players) ? data.players : window.currentPlayers;
      if (typeof window.renderPlayerSearchList === 'function') window.renderPlayerSearchList();
      if (typeof window.updateDebug === 'function') {
        window.updateDebug({ playerListHotfixed: true, playerCount: Array.isArray(window.currentPlayers) ? window.currentPlayers.length : 0 });
      }
    };
    window.loadPlayers = async function () {
      if (typeof setStatus === 'function') setStatus('별도 플레이어 목록 갱신은 비활성화되었습니다. 지도 정보로 처리합니다.');
      return { players: Array.isArray(window.currentPlayers) ? window.currentPlayers : [] };
    };
  }

  function overrideLegacyAdmiralFlow() {
    window.renderAdmirals = function () {
      if (window.elements?.admiralView) {
        window.elements.admiralView.innerHTML = '<div class="growth-item"><div>레거시 제독 목록은 비활성화되었습니다. 로비 제독 시스템을 사용하세요.</div></div>';
      }
      if (Array.isArray(window.admiralButtons)) window.admiralButtons.length = 0;
    };
    window.drawAdmiral = async function () {
      if (typeof window.setStatus === 'function') window.setStatus('제독 영입은 로비에서 진행합니다.');
      const username = localStorage.getItem(window.USERNAME_KEY || 'sf_slg_username') || '사령관';
      if (typeof window.showLobby === 'function') window.showLobby(username);
      if (typeof window.loadLobby === 'function') await window.loadLobby();
    };
    window.assignAdmiral = async function () {
      if (typeof window.setStatus === 'function') window.setStatus('제독 선택은 로비에서 진행합니다.');
    };
    window.exileAdmiral = async function () {
      if (typeof window.setStatus === 'function') window.setStatus('제독 관리 기능은 로비 기준으로 정리 중입니다.');
    };
  }

  function overrideAttackPlayer() {
    if (typeof window.api !== 'function') return;
    window.attackPlayer = async function (targetUserId, fleetSlot = 1) {
      clearMessages();
      setBusy(true);
      try {
        const data = await api('/pvp/attack', {
          method: 'POST',
          body: JSON.stringify({ targetUserId: Number(targetUserId), fleetSlot: Number(fleetSlot || 1) })
        });
        if (data && data.to && typeof showRouteTo === 'function') showRouteTo(data.to, data.travelTimeSeconds);
        await Promise.all([loadZones(), refreshMissionsAndRecords()]);
        showTab('battle');
        setStatus((data && data.message ? data.message : '공격 명령 완료') + ' 이동 시간: ' + (data && data.travelTimeText ? data.travelTimeText : '-'));
      } catch (err) {
        handleAuthError(err);
      } finally {
        setBusy(false);
      }
    };
  }

  function overrideRenderLobby() {
    if (typeof window.renderLobby !== 'function') return;
    const baseRenderLobby = window.renderLobby;
    window.renderLobby = function (data) {
      baseRenderLobby(data);
      ensureLobbyEnhancementShell();
      const profile = lobbyState.profile || {};
      if (elements.lobbyProfileView) {
        const featured = profile.featuredAdmiralName || '대표 제독 미지정';
        const sessionAdmiral = profile.selectedSessionAdmiralName || '다음 세션 미선택';
        const credit = Number(profile.credit || 0).toLocaleString();
        elements.lobbyProfileView.innerHTML = `
          <div class="growth-item assigned">
            <div>
              <strong>${featured}</strong>
              <span>다음 세션: ${sessionAdmiral}</span>
              <span>현재 보유 크레딧 ${credit}</span>
            </div>
          </div>
        `;
      }
      renderCreditShop(lobbyAdmiralState.recruitTypes || []);
    };
  }

  function overrideRenderCurrentRoom() {
    if (typeof window.renderCurrentRoom !== 'function') return;
    window.renderCurrentRoom = function (room) {
      if (!elements.currentRoomView) return;
      if (!room) {
        elements.currentRoomView.innerHTML = `<div class="growth-item"><div>참가 중인 방이 없습니다.</div></div>`;
        return;
      }
      const players = Array.isArray(room.players) ? room.players : [];
      const readyCount = players.filter((player) => player.isReady).length;
      const totalCount = Math.max(1, players.length);
      const progress = Math.round((readyCount / totalCount) * 100);
      const chips = players.map((player) => `<span class="room-player-chip ${player.isReady ? 'ready' : ''}">${player.isHost ? '방장 ' : ''}${player.username}${player.isMe ? ' (나)' : ''}</span>`).join('');
      const startButton = room.isHost && room.status === 'waiting' ? `<button type="button" class="primary" data-start-room="${room.id}">세션 시작</button>` : '';
      const readyButton = room.status === 'waiting' ? `<button type="button" data-ready-room="${room.id}">${players.find((p) => p.isMe && p.isReady) ? '준비 해제' : '준비 완료'}</button>` : '';
      const enterButton = room.status === 'in_game' ? `<button type="button" class="primary" data-enter-session="1">게임 입장</button>` : '';
      const leaveButton = room.status === 'waiting' ? `<button type="button" data-leave-room="${room.id}">나가기</button>` : '';
      elements.currentRoomView.innerHTML = `
        <div class="growth-item assigned room-ready-card">
          <div>
            <strong>${room.roomName} (${roomStatusLabel(room.status)})</strong>
            <span>초대 코드 ${room.inviteCode} · ${room.currentPlayers}/${room.maxPlayers} · ${room.mode}</span>
            <div class="room-ready-bar"><span style="width:${progress}%;"></span></div>
            <span>준비 인원 ${readyCount}/${totalCount}</span>
            <div class="room-player-chip-list">${chips}</div>
          </div>
          <div class="button-row">${readyButton}${startButton}${enterButton}${leaveButton}</div>
        </div>
      `;
      elements.currentRoomView.querySelector('[data-ready-room]')?.addEventListener('click', () => toggleRoomReady(room.id));
      elements.currentRoomView.querySelector('[data-start-room]')?.addEventListener('click', () => startRoom(room.id));
      elements.currentRoomView.querySelector('[data-leave-room]')?.addEventListener('click', () => leaveRoom(room.id));
      elements.currentRoomView.querySelector('[data-enter-session]')?.addEventListener('click', enterCurrentSession);
    };
  }

  function overrideRenderSessionSummary() {
    if (typeof window.renderSessionSummary !== 'function') return;
    window.renderSessionSummary = function (summary) {
      if (!elements.sessionSummaryView) return;
      if (!summary) {
        elements.sessionSummaryView.innerHTML = `<div class="growth-item"><div>No settled session yet.</div></div>`;
        return;
      }
      const meName = localStorage.getItem(USERNAME_KEY) || '';
      const players = Array.isArray(summary.players) ? summary.players : [];
      const me = players.find((player) => player.username === meName) || players[0] || {};
      const score = me.detail?.score || {};
      const reward = me.detail?.reward || {};
      const breakdown = [
        `거점 ${Number(score.occupiedZones || 0)}`,
        `전투 승리 ${Number(score.battleWins || 0)}`,
        `전투력 ${Number(score.fleetPowerScore || 0).toLocaleString()}`
      ].join(' · ');
      const ranking = players.slice(0, 5).map((player) => `<div class="result-rank-line"><strong>#${player.rank || '-'}</strong><span>${player.username}</span><span>${Number(player.finalScore || 0).toLocaleString()}</span></div>`).join('') || '<div class="result-rank-line"><span>정산 데이터 없음</span></div>';
      elements.sessionSummaryView.innerHTML = `
        <div class="growth-item assigned session-summary-card">
          <div>
            <strong>${summary.roomName || 'Session'} / Rank ${me.rank || '-'}</strong>
            <span>Total Score ${Number(me.finalScore || score.totalScore || 0).toLocaleString()}</span>
            <span>Credits +${Number(me.creditReward || reward.creditTotal || 0).toLocaleString()}</span>
            <span>${breakdown}</span>
          </div>
        </div>
        <div class="growth-item session-ranking-card">
          <div>
            <strong>세션 순위</strong>
            <div class="result-rank-list">${ranking}</div>
          </div>
        </div>
      `;
    };
  }

  function overrideRenderLobbyAdmirals() {
    if (typeof window.renderLobbyAdmirals !== 'function') return;
    const baseRender = window.renderLobbyAdmirals;
    window.renderLobbyAdmirals = function (data, recruitLogsData = null) {
      baseRender(data, recruitLogsData);
      renderCreditShop(lobbyAdmiralState.recruitTypes || []);
    };
  }

  function overrideRecruitLobbyAdmiral() {
    if (typeof window.recruitLobbyAdmiral !== 'function') return;
    window.recruitLobbyAdmiral = async function (type) {
      clearMessages();
      setBusy(true);
      try {
        const data = await api('/lobby/recruit-admiral', {
          method: 'POST',
          body: JSON.stringify({ type })
        });
        const logs = await api('/lobby/recruit-logs');
        setStatus(data.message || 'Admiral recruited.');
        renderLobbyAdmirals(data, logs);
        await loadLobby();
        const latest = Array.isArray(logs?.logs) ? logs.logs[0] : null;
        if (latest) showRecruitOverlay(latest);
      } catch (err) {
        handleAuthError(err);
      } finally {
        setBusy(false);
      }
    };
  }

  function hideUnusedControls() {
    ['refreshPlayersButton', 'drawAdmiralButton'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function cleanupLegacyArrays() {
    if (Array.isArray(window.admiralButtons)) window.admiralButtons.length = 0;
  }

  function install() {
    if (typeof window.startMissionPolling !== 'function' && typeof window.ensureMissionPolling === 'function') {
      window.startMissionPolling = (...args) => window.ensureMissionPolling(...args);
    }
    ensureLobbyEnhancementShell();
    hideLegacyGrowthAdmiralCard();
    labelGrowthPolicyAsPrimary();
    overrideLoadGrowth();
    overrideAssignZoneGarrison();
    overrideRefreshAll();
    overrideRenderBattleSessions();
    overridePlayerFlow();
    overrideLegacyAdmiralFlow();
    overrideRenderLobby();
    overrideRenderCurrentRoom();
    overrideRenderSessionSummary();
    overrideRenderLobbyAdmirals();
    overrideRecruitLobbyAdmiral();
    removeLegacyGrowthAdmiralDom();
    sanitizeElementRefs();
    overrideSetBusy();
    cleanupLegacyArrays();
    overrideAttackPlayer();
    hideUnusedControls();
    if (typeof window.updateDebug === 'function') {
      window.updateDebug({ cleanEntry: 'app.clean.js', cleanStage: 'all', lobbyUiEnhanced: true });
    }
    console.info('[SF_SLG clean] full cleanup migrated into app.clean.js.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
