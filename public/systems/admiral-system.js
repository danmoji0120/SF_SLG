(() => {
  const FALLBACK_CATALOG = {
    '카이로 벤': { rarity: 'Common', nickname: '도망자', role: '기동', summary: '이동속도 +10%, 후퇴 성공률 +5%' },
    '마야 렌': { rarity: 'Common', nickname: '패치워크', role: '정비 / 복구', summary: '전투 종료 후 수리 효율 +15%' },
    '드릭 할버': { rarity: 'Common', nickname: '퍼스트 샷', role: '선제타격', summary: '첫 공격 피해 +15%' },
    '오르한 제크': { rarity: 'Common', nickname: '방벽', role: '초반 방어', summary: '전투 시작 2틱 동안 받는 피해 -10%' },
    '리오 칸': { rarity: 'Common', nickname: '쿼터마스터', role: '보급', summary: '유지비 -10%' },
    '세라 노바': { rarity: 'Common', nickname: '핀포인트', role: '타겟팅', summary: '후열 타겟 확률 +10%' },
    '베일 헥스': { rarity: 'Common', nickname: '고스트 스텝', role: '회피', summary: '첫 2회 공격 회피 확률 +15%' },
    '에단 루크': { rarity: 'Common', nickname: '리커버리', role: '손상 복구', summary: '중파 상태 함선 수리 속도 +20%' },
    '아이리스 발렌': { rarity: 'Rare', nickname: '스카이체이서', role: '함대 기동', summary: '전체 함대 속도 +8%, 후퇴 시 피해 감소' },
    '로크 하딘': { rarity: 'Rare', nickname: '스카이가드', role: '방공', summary: '대공포 요격률 +10%' },
    '칼릭 스트론': { rarity: 'Rare', nickname: '브로드사이드', role: '포격', summary: '무기 쿨다운 -10%' },
    '브론 카쉬': { rarity: 'Rare', nickname: '아이언월', role: '장갑', summary: '장갑 계열 효과 +15%' },
    '린 세이': { rarity: 'Rare', nickname: '블루헤이븐', role: '실드', summary: '실드 재생량 +20%' },
    '제로스': { rarity: 'Rare', nickname: '락온', role: '정밀 타격', summary: '타겟팅 시스템 효과 +20%' },
    '헤일 벡터': { rarity: 'Rare', nickname: '플럭스', role: '지원 / 전력', summary: '전력 초과 직전 안정성 증가' },
    '유나 미르': { rarity: 'Rare', nickname: '스틸멜로디', role: '장기전 지원', summary: '수리 드론/지원 유틸 효율 증가' },
    '토르 벡센': { rarity: 'Rare', nickname: '애프터버너', role: '추격 / 마무리', summary: '후퇴 준비 중 대상 피해 +15%' },
    '엘라 시렌': { rarity: 'Rare', nickname: '웨이크콜', role: '정찰 / 시야', summary: '이벤트/거점 정보 노출 속도 증가' },
    '마렉 둔': { rarity: 'Rare', nickname: '스톤앵커', role: '점령 / 방어', summary: '점령 중 받는 피해 감소' },
    '아스트라 벨': { rarity: 'Epic', nickname: '스카이퀸', role: '항공전', summary: '항공단 출격 쿨다운 -15%' },
    '네메시스': { rarity: 'Epic', nickname: '노이즈', role: '전자전', summary: 'ECM 효과 +25%' },
    '바르칸': { rarity: 'Epic', nickname: '브레이커', role: '돌파', summary: '전열 대상 피해 +15%' },
    '그라비온': { rarity: 'Epic', nickname: '폴다운', role: '철벽', summary: '피해 누적 임계치 +20%' },
    '라에나 크로우': { rarity: 'Epic', nickname: '하프라이트', role: '구조 / 생존', summary: '대파 직전 함선 생존 보정' },
    '제이든 프록스': { rarity: 'Epic', nickname: '그레이티드', role: '경제 / 생산', summary: '생산 큐 효율 증가' },
    '실바 케인': { rarity: 'Epic', nickname: '블랙프레임', role: '저격 / 고정밀', summary: '후열 직접 타격 효율 증가' },
    '오메가 타이탄': { rarity: 'Legendary', nickname: '센터폴', role: '타이탄 지원', summary: '타이탄 주변 함대 피해 +10%' },
    '노바 팬텀': { rarity: 'Legendary', nickname: '이클립스', role: '초반 지배', summary: '첫 3틱 적 명중률 -20%' },
    '루시안 베가': { rarity: 'Legendary', nickname: '파운드리 킹', role: '산업 / 장기전', summary: '세션 중반 이후 생산 효율 증가' },
    '에코 라일': { rarity: 'Legendary', nickname: '클러스터', role: '함대 연계', summary: '다중 함대 동시 교전 지원 효과 상승' }
  };

  const state = {
    installed: false,
    activeSubtab: 'recruit',
    modalOpen: false,
    catalog: { ...FALLBACK_CATALOG },
    catalogReady: false,
    catalogPromise: null
  };

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function rarityClass(value) {
    return String(value || 'R').toLowerCase();
  }

  function admirals() {
    return Array.isArray(window.lobbyAdmiralState?.admirals) ? window.lobbyAdmiralState.admirals : [];
  }

  function getCatalog() {
    return state.catalog || FALLBACK_CATALOG;
  }

  function loadCatalogData() {
    if (state.catalogPromise) return state.catalogPromise;
    state.catalogPromise = new Promise((resolve) => {
      const applyCatalog = () => {
        const entries = Array.isArray(window.ADMIRAL_CATALOG_DATA?.catalog) ? window.ADMIRAL_CATALOG_DATA.catalog : [];
        if (entries.length) {
          state.catalog = Object.fromEntries(entries.map((entry) => [entry.name, {
            rarity: entry.rarity,
            nickname: entry.nickname,
            role: entry.role,
            summary: entry.summary,
            combatBonus: entry.combatBonus,
            resourceBonus: entry.resourceBonus,
            costBonus: entry.costBonus
          }]));
        }
        state.catalogReady = true;
        resolve(state.catalog);
      };

      if (window.ADMIRAL_CATALOG_DATA?.catalog) {
        applyCatalog();
        return;
      }

      const existing = document.querySelector('script[data-admiral-catalog-script="1"]');
      if (existing) {
        existing.addEventListener('load', applyCatalog, { once: true });
        existing.addEventListener('error', () => resolve(state.catalog), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = '/data/admiral-catalog.js?v=1';
      script.async = true;
      script.dataset.admiralCatalogScript = '1';
      script.addEventListener('load', applyCatalog, { once: true });
      script.addEventListener('error', () => resolve(state.catalog), { once: true });
      document.head.appendChild(script);
    }).finally(() => {
      render();
    });
    return state.catalogPromise;
  }

  function ensureShell() {
    const panel = qs('[data-lobby-system-panel="admiral"], [data-lobby-panel="admiral"]');
    if (!panel) return null;
    let shell = document.getElementById('admiralLibraryShell');
    if (shell) {
      if (shell.parentElement !== panel) panel.prepend(shell);
      return shell;
    }

    shell = document.createElement('section');
    shell.id = 'admiralLibraryShell';
    shell.className = 'card lobby-room-card';
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

    shell.addEventListener('click', (event) => {
      const subtab = event.target.closest('[data-admiral-subtab]');
      if (subtab) {
        event.preventDefault();
        setSubtab(subtab.dataset.admiralSubtab);
        return;
      }

      const card = event.target.closest('[data-admiral-card-id]');
      if (card) openModal(card.dataset.admiralCardId);
    });
    return shell;
  }

  function moveRecruitCard() {
    const shell = ensureShell();
    const recruitPanel = qs('[data-admiral-subpanel="recruit"]', shell);
    const recruitCard = qsa('#lobbyPanel .card, #lobbyPanel .lobby-room-card').find((card) => {
      if (card.id === 'admiralLibraryShell') return false;
      return qs('h3', card)?.textContent.trim() === 'Lobby Admirals';
    });
    if (recruitCard && recruitPanel && recruitCard.parentElement !== recruitPanel) {
      recruitPanel.appendChild(recruitCard);
    }
  }

  function setSubtab(key) {
    state.activeSubtab = key || 'recruit';
    qsa('#admiralLibraryShell [data-admiral-subtab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.admiralSubtab === state.activeSubtab);
    });
    qsa('#admiralLibraryShell [data-admiral-subpanel]').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.admiralSubpanel === state.activeSubtab);
    });
  }

  function statLine(admiral) {
    const combat = Number(admiral.combatBonus || 0) * 100;
    const resource = Number(admiral.resourceBonus || 0) * 100;
    const cost = Number(admiral.costBonus || 0) * 100;
    return `전투 +${combat.toFixed(0)}% / 자원 +${resource.toFixed(0)}% / 비용 -${cost.toFixed(0)}%`;
  }

  function loungeCardHtml(admiral) {
    const tags = [];
    if (admiral.isFeatured) tags.push('<span class="admiral-tag highlight">대표</span>');
    if (admiral.isSessionSelected) tags.push('<span class="admiral-tag highlight">다음 세션</span>');
    return `
      <article class="admiral-card" data-admiral-card-id="owned:${admiral.id}">
        <div class="admiral-card-header">
          <div>
            <strong>${admiral.name}</strong>
            <span>${statLine(admiral)}</span>
          </div>
          <span class="admiral-rarity ${rarityClass(admiral.rarity)}">${admiral.rarity}</span>
        </div>
        <div class="admiral-tags">${tags.join('') || '<span class="admiral-tag">보유</span>'}</div>
      </article>
    `;
  }

  function codexCardHtml(entry, owned) {
    return `
      <article class="admiral-card ${owned ? '' : 'locked'}" data-admiral-card-id="catalog:${entry.name}">
        <div class="admiral-card-header">
          <div>
            <strong>${owned ? entry.name : '???'}</strong>
            <span>${owned ? entry.nickname : '미획득 제독'}</span>
          </div>
          <span class="admiral-rarity ${rarityClass(entry.rarity)}">${entry.rarity}</span>
        </div>
        <div class="admiral-tags">
          <span class="admiral-tag">${owned ? entry.role : '미확인 역할'}</span>
          <span class="admiral-tag ${owned ? 'highlight' : ''}">${owned ? '도감 해금' : '잠김'}</span>
        </div>
        <div class="effect">${owned ? entry.summary : '획득 전까지 상세 정보가 숨겨집니다.'}</div>
      </article>
    `;
  }

  function buildCodexEntries() {
    const ownedMap = new Map(admirals().map((admiral) => [admiral.name, admiral]));
    return Object.entries(getCatalog()).map(([name, meta]) => ({
      key: name,
      name,
      rarity: meta.rarity,
      nickname: meta.nickname,
      role: meta.role,
      summary: meta.summary,
      owned: ownedMap.has(name),
      ownedData: ownedMap.get(name) || null
    })).sort((a, b) => {
      const rarityOrder = { Legendary: 0, Epic: 1, Rare: 2, Common: 3 };
      const diff = (rarityOrder[a.rarity] ?? 9) - (rarityOrder[b.rarity] ?? 9);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ko');
    });
  }

  function renderLists() {
    const list = admirals();
    const lounge = document.getElementById('admiralLoungeView');
    const codex = document.getElementById('admiralCodexView');
    const empty = '<div class="admiral-empty">아직 보유한 제독이 없습니다. 영입 탭에서 제독을 획득하세요.</div>';
    if (lounge) lounge.innerHTML = list.length ? list.map(loungeCardHtml).join('') : empty;
    if (codex) {
      const entries = buildCodexEntries();
      codex.innerHTML = entries.length ? entries.map((entry) => codexCardHtml(entry, entry.owned)).join('') : '<div class="admiral-empty">도감 데이터가 없습니다.</div>';
    }
  }

  function ensureModal() {
    let modal = document.getElementById('admiralDetailModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'admiralDetailModal';
    modal.className = 'admiral-modal hidden';
    modal.innerHTML = '<div class="admiral-modal-card" id="admiralDetailCard"></div>';
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    document.body.appendChild(modal);
    return modal;
  }

  function openModal(cardId) {
    if (!cardId) return;
    const [kind, raw] = String(cardId).split(':');
    let admiral = null;
    let locked = false;
    const catalog = getCatalog();
    if (kind === 'owned') {
      admiral = admirals().find((item) => Number(item.id) === Number(raw));
    } else if (kind === 'catalog') {
      const meta = catalog[raw];
      const owned = admirals().find((item) => item.name === raw);
      locked = !owned;
      admiral = owned || (meta ? { name: raw, rarity: meta.rarity, nickname: meta.nickname, role: meta.role, summary: meta.summary } : null);
    }
    if (!admiral) return;

    const meta = catalog[admiral.name] || {};
    const modal = ensureModal();
    const card = document.getElementById('admiralDetailCard');
    card.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow">ADMIRAL DETAIL</p>
          <h2>${locked ? `[${meta.rarity || admiral.rarity}] ???` : `[${admiral.rarity}] ${admiral.name}`}</h2>
        </div>
        <button type="button" data-admiral-close>닫기</button>
      </div>
      <div class="admiral-info-list">
        <div class="admiral-info-line"><strong>코드명</strong><span>${locked ? '미확인' : (meta.nickname || admiral.nickname || '-')}</span></div>
        <div class="admiral-info-line"><strong>역할</strong><span>${locked ? '미확인' : (meta.role || admiral.role || '-')}</span></div>
        <div class="admiral-info-line"><strong>효과</strong><span>${locked ? '획득 전까지 숨겨집니다.' : (meta.summary || statLine(admiral))}</span></div>
        <div class="admiral-info-line"><strong>상태</strong><span>${locked ? '미획득' : `${admiral.isFeatured ? '대표 제독' : '대표 미지정'} / ${admiral.isSessionSelected ? '다음 세션 배치' : '세션 미선택'}`}</span></div>
      </div>
      ${locked ? '<div class="admiral-empty" style="margin-top:14px;">이 제독은 아직 획득하지 않았습니다. 영입에서 발견하면 상세가 공개됩니다.</div>' : `<div class="button-row" style="margin-top:14px;"><button type="button" data-featured-admiral="${admiral.id}" ${admiral.isFeatured ? 'disabled' : ''}>대표 제독</button><button type="button" data-session-admiral="${admiral.id}" ${admiral.isSessionSelected ? 'disabled' : ''}>다음 세션</button></div>`}
    `;
    qs('[data-admiral-close]', card)?.addEventListener('click', closeModal);
    qs('[data-featured-admiral]', card)?.addEventListener('click', async () => {
      await window.selectLobbyAdmiral?.('featured', admiral.id);
      closeModal();
    });
    qs('[data-session-admiral]', card)?.addEventListener('click', async () => {
      await window.selectLobbyAdmiral?.('session', admiral.id);
      closeModal();
    });
    modal.classList.remove('hidden');
    state.modalOpen = true;
  }

  function closeModal() {
    document.getElementById('admiralDetailModal')?.classList.add('hidden');
    state.modalOpen = false;
  }

  function render() {
    ensureShell();
    moveRecruitCard();
    renderLists();
    setSubtab(state.activeSubtab);
  }

  function hideLegacyGrowthAdmiralCard() {
    const admiralView = document.getElementById('admiralView');
    const drawButton = document.getElementById('drawAdmiralButton');
    const card = (drawButton || admiralView)?.closest('.card');
    if (card) card.style.display = 'none';
  }

  function wrap(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__admiralSystemWrapped) return;
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
    wrap('renderLobby');
    wrap('renderLobbyAdmirals');
    wrap('loadLobby');
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.modalOpen) closeModal();
    });
    loadCatalogData();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
