(() => {
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
    hideLegacyGrowthAdmiralCard();
    labelGrowthPolicyAsPrimary();
    overrideLoadGrowth();
    overrideAssignZoneGarrison();
    overrideRefreshAll();
    overrideRenderBattleSessions();
    overridePlayerFlow();
    overrideLegacyAdmiralFlow();
    removeLegacyGrowthAdmiralDom();
    sanitizeElementRefs();
    overrideSetBusy();
    cleanupLegacyArrays();
    overrideAttackPlayer();
    hideUnusedControls();
    if (typeof window.updateDebug === 'function') {
      window.updateDebug({ cleanEntry: 'app.clean.js', cleanStage: 'all' });
    }
    console.info('[SF_SLG clean] full cleanup migrated into app.clean.js.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
