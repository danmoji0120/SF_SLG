(() => {
  function installMissionPollingShim() {
    if (typeof window.startMissionPolling === "function") return;
    if (typeof window.ensureMissionPolling === "function") {
      window.startMissionPolling = (...args) => window.ensureMissionPolling(...args);
      console.info("[SF_SLG hotfix] startMissionPolling shim installed.");
      return;
    }
    window.startMissionPolling = () => {
      console.warn("[SF_SLG hotfix] startMissionPolling fallback called before ensureMissionPolling was available.");
    };
  }

  function hideLegacyGrowthAdmiralCard() {
    const admiralView = document.getElementById("admiralView");
    const drawButton = document.getElementById("drawAdmiralButton");
    if (!admiralView && !drawButton) return;

    const card = (drawButton || admiralView)?.closest(".card");
    if (!card) return;

    card.dataset.legacyHidden = "1";
    card.style.display = "none";
    console.info("[SF_SLG hotfix] legacy growth admiral card hidden. Use lobby admiral system instead.");
  }

  function labelGrowthPolicyAsPrimary() {
    const growthTab = document.querySelector('[data-tab-panel="growth"]');
    if (!growthTab) return;
    const firstCard = growthTab.querySelector('.card');
    if (!firstCard || firstCard.querySelector('[data-growth-policy-notice]')) return;
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.dataset.growthPolicyNotice = '1';
    hint.textContent = '제독 영입/선택은 로비에서 진행합니다. 성장 탭은 정책 전용으로 사용하세요.';
    firstCard.appendChild(hint);
  }

  function overrideLoadGrowth() {
    if (typeof api !== 'function' || typeof renderPolicyPanel !== 'function') return;
    window.loadGrowth = async function loadGrowthHotfixed() {
      const policies = await api('/policies');
      renderPolicyPanel(policies);
    };
  }

  function overrideAssignZoneGarrison() {
    if (typeof api !== 'function') return;
    window.assignZoneGarrison = async function assignZoneGarrisonHotfixed(zoneId, fleetSlot) {
      clearMessages();
      setBusy(true);
      try {
        const data = await api(`/zones/${zoneId}/garrison/dispatch`, {
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
    if (typeof api !== 'function') return;
    window.refreshAll = async function refreshAllHotfixed() {
      const [resources, fleet, map, empire, research, policies, options, designs, production, repairs, missions, records, sessions, trades, shipTrades, city, fleetGroups, garrison] = await Promise.all([
        api('/resources'),
        api('/fleet'),
        api('/map'),
        api('/empire'),
        api('/tech-tree'),
        api('/policies'),
        api('/shipyard/options'),
        api('/designs'),
        api('/production'),
        api('/repairs'),
        api('/missions'),
        api('/battle-records'),
        api('/battle-sessions'),
        api('/trade/logs'),
        api('/trade/ship-logs'),
        api('/city'),
        api('/fleet-groups'),
        api('/garrison/overview')
      ]);

      renderResources(resources);
      renderFleet(fleet);
      renderMap(map);
      renderEmpire(empire);
      renderResearchHubV4(research);
      renderCityV2(city);
      renderPolicyPanel(policies);
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
          ? logs.map((item) => `<div class="growth-item"><div><strong>${item.fromName} -> ${item.toName}</strong><span>금속 ${Number(item.metal || 0).toLocaleString()} / 연료 ${Number(item.fuel || 0).toLocaleString()}</span></div></div>`).join('')
          : `<div class="growth-item"><div>거래 기록이 없습니다.</div></div>`;
      }
      renderShipTradeLogs(shipTrades?.logs);
      updateDebug({
        session: {
          username: localStorage.getItem(USERNAME_KEY) || '',
          activeTab,
          hotfixLegacyBypass: true
        }
      });
    };
  }

  function install() {
    installMissionPollingShim();
    hideLegacyGrowthAdmiralCard();
    labelGrowthPolicyAsPrimary();
    overrideLoadGrowth();
    overrideAssignZoneGarrison();
    overrideRefreshAll();
    console.info('[SF_SLG hotfix] second-stage legacy bypasses installed.');
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
