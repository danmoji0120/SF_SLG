(() => {
  function overrideRenderBattleSessions() {
    window.renderBattleSessions = function renderBattleSessionsHotfixed(sessions) {
      if (!window.elements?.battleSessionsView) return;
      const list = Array.isArray(sessions) ? sessions : [];
      const hasActive = list.some((session) => ['active', 'retreating'].includes(String(session.state || '')));
      const stateLabel = { active: '전투 중', retreating: '후퇴 중', ended: '종료' };
      const resultLabel = { victory: '승리', defeat: '패배', retreat: '후퇴', combat: '교전' };
      elements.battleSessionsView.innerHTML = list.length
        ? list.map((session) => {
            const logs = Array.isArray(session.log) ? session.log : [];
            const latest = logs.length ? logs[logs.length - 1] : '';
            const retreatButton = session.state === 'active' || session.state === 'retreating'
              ? `<button type="button" data-retreat-session="${session.id}">후퇴</button>`
              : '';
            return `
              <div class="growth-item">
                <div>
                  <strong>${session.targetName || `${session.targetType} #${session.targetId || '-'}`} / ${stateLabel[session.state] || session.state} / ${resultLabel[session.result] || session.result || '진행'}</strong>
                  <span>틱 ${Number(session.tick || 0)} / ${latest}</span>
                  <details>
                    <summary>전체 로그</summary>
                    <pre>${logs.join('\n') || '기록 없음'}</pre>
                  </details>
                </div>
                ${retreatButton}
              </div>
            `;
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

  function overridePlayerListFlow() {
    if (typeof window.api !== 'function') return;
    window.renderPlayers = function renderPlayersHotfixed(data) {
      window.currentPlayers = Array.isArray(data?.players) ? data.players : window.currentPlayers;
      if (typeof window.renderPlayerSearchList === 'function') window.renderPlayerSearchList();
      if (typeof window.updateDebug === 'function') {
        window.updateDebug({ playerListHotfixed: true, playerCount: Array.isArray(window.currentPlayers) ? window.currentPlayers.length : 0 });
      }
    };

    window.loadPlayers = async function loadPlayersHotfixed() {
      const map = await window.api('/map');
      window.currentPlayers = Array.isArray(map?.players) ? map.players : [];
      if (typeof window.renderMap === 'function') window.renderMap(map);
      if (typeof window.setStatus === 'function') window.setStatus('지도 기반 플레이어 정보로 갱신했습니다.');
    };
  }

  function overrideLegacyAdmiralFlow() {
    window.renderAdmirals = function renderAdmiralsHotfixed() {
      if (window.elements?.admiralView) {
        window.elements.admiralView.innerHTML = '<div class="growth-item"><div>레거시 제독 목록은 비활성화되었습니다. 로비 제독 시스템을 사용하세요.</div></div>';
      }
      if (Array.isArray(window.admiralButtons)) window.admiralButtons.length = 0;
    };

    window.drawAdmiral = async function drawAdmiralHotfixed() {
      if (typeof window.setStatus === 'function') window.setStatus('제독 영입은 로비에서 진행합니다.');
      const username = localStorage.getItem(window.USERNAME_KEY || 'sf_slg_username') || '사령관';
      if (typeof window.showLobby === 'function') window.showLobby(username);
      if (typeof window.loadLobby === 'function') await window.loadLobby();
    };

    window.assignAdmiral = async function assignAdmiralHotfixed() {
      if (typeof window.setStatus === 'function') window.setStatus('제독 선택은 로비에서 진행합니다.');
    };

    window.exileAdmiral = async function exileAdmiralHotfixed() {
      if (typeof window.setStatus === 'function') window.setStatus('제독 관리 기능은 로비 기준으로 정리 중입니다.');
    };
  }

  function loadStage4Hotfix() {
    if (document.querySelector('script[data-hotfix-stage="4"]')) return;
    const script = document.createElement('script');
    script.src = '/hotfix4.js?v=1';
    script.dataset.hotfixStage = '4';
    document.body.appendChild(script);
  }

  function install() {
    overrideRenderBattleSessions();
    overridePlayerListFlow();
    overrideLegacyAdmiralFlow();
    loadStage4Hotfix();
    if (typeof window.updateDebug === 'function') {
      window.updateDebug({ hotfixStage: 3 });
    }
    console.info('[SF_SLG hotfix3] third-stage legacy bypasses installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
