(() => {
  function removeLegacyGrowthAdmiralDom() {
    const admiralView = document.getElementById('admiralView');
    const drawButton = document.getElementById('drawAdmiralButton');
    const card = (drawButton || admiralView)?.closest('.card');
    if (card) {
      card.remove();
      console.info('[SF_SLG hotfix4] legacy growth admiral DOM removed.');
    }
  }

  function sanitizeElementRefs() {
    if (!window.elements) return;
    const legacyKeys = ['admiralView', 'drawAdmiralButton', 'playerTargetView', 'refreshPlayersButton'];
    legacyKeys.forEach((key) => {
      if (key in window.elements) {
        window.elements[key] = null;
      }
    });
  }

  function overrideSetBusy() {
    if (typeof window.setBusy !== 'function' || !window.elements) return;
    window.setBusy = function setBusyHotfixed(isBusy) {
      const buttons = [
        elements.signupButton,
        elements.loginButton,
        elements.logoutButton,
        elements.refreshResourcesButton,
        elements.refreshFleetButton,
        elements.refreshZonesButton,
        elements.battleButton,
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
        ...(Array.isArray(window.captureButtons) ? window.captureButtons : []),
        ...(Array.isArray(window.researchButtons) ? window.researchButtons : []),
        ...(Array.isArray(window.pvpButtons) ? window.pvpButtons : [])
      ].filter(Boolean);
      buttons.forEach((button) => {
        button.disabled = isBusy;
      });
    };
  }

  function cleanupLegacyArrays() {
    if (Array.isArray(window.admiralButtons)) window.admiralButtons.length = 0;
  }

  function install() {
    removeLegacyGrowthAdmiralDom();
    sanitizeElementRefs();
    overrideSetBusy();
    cleanupLegacyArrays();
    if (typeof window.updateDebug === 'function') {
      window.updateDebug({ hotfixStage: 4, runtimeCleanup: true });
    }
    console.info('[SF_SLG hotfix4] runtime cleanup installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
