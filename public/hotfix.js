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
    if (!firstCard) return;
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = '제독 영입/선택은 로비에서 진행합니다. 성장 탭은 정책 전용으로 사용하세요.';
    firstCard.appendChild(hint);
  }

  function install() {
    installMissionPollingShim();
    hideLegacyGrowthAdmiralCard();
    labelGrowthPolicyAsPrimary();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
