(() => {
  function install() {
    if (typeof window.api === 'function') {
      window.attackPlayer = async function(targetUserId, fleetSlot = 1) {
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

      window.loadPlayers = async function() {
        if (typeof setStatus === 'function') setStatus('별도 플레이어 목록 갱신은 비활성화되었습니다. 지도 정보로 처리합니다.');
        return { players: Array.isArray(window.currentPlayers) ? window.currentPlayers : [] };
      };

      window.loadGrowth = async function() {
        const policies = await api('/policies');
        if (typeof renderPolicyPanel === 'function') renderPolicyPanel(policies);
        return policies;
      };
    }

    ['refreshPlayersButton', 'drawAdmiralButton'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    if (typeof window.updateDebug === 'function') window.updateDebug({ hotfixStage: 5, legacyCallsTrimmed: true });
    console.info('[SF_SLG hotfix5] remaining legacy calls trimmed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
