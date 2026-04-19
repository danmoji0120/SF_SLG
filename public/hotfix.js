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

  function overrideLoadGrowth() {
    if (typeof window.api !== 'function' || typeof window.renderPolicyPanel !== 'function') return;
    window.loadGrowth = async function () {
      const policies = await window.api('/policies');
      window.renderPolicyPanel(policies);
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

  function loadStage3Hotfix() {
    if (document.querySelector('script[data-hotfix-stage="3"]')) return;
    const script = document.createElement('script');
    script.src = '/hotfix3.js?v=1';
    script.dataset.hotfixStage = '3';
    document.body.appendChild(script);
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
    loadStage3Hotfix();
    console.info('[SF_SLG hotfix] bootstrap loaded.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
