(() => {
  const upgradeState = {
    activeTab: 0,
    tabs: [
      { key: 'home', label: '홈' },
      { key: 'room', label: '방' },
      { key: 'shop', label: '상점' },
      { key: 'admiral', label: '제독' },
      { key: 'mission', label: '미션' },
      { key: 'result', label: '정산' }
    ],
    extra: {
      profile: null,
      rewardLogs: [],
      recruitLogs: []
    },
    installed: false,
    shopBusy: false,
    refreshScheduled: false
  };

  const SHOP_PRODUCTS = [
    { key: 'normal_1', type: 'recruit', title: '일반 영입 x1', detail: '기본 제독 1회 영입', bundle: ['normal'] },
    { key: 'premium_1', type: 'recruit', title: '고급 영입 x1', detail: '희귀 확률 강화 영입', bundle: ['premium'] },
    { key: 'normal_3', type: 'recruit', title: '일반 영입 팩 x3', detail: '일반 영입 3회를 연속 실행', bundle: ['normal', 'normal', 'normal'] },
    { key: 'premium_3', type: 'recruit', title: '고급 영입 팩 x3', detail: '고급 영입 3회를 연속 실행', bundle: ['premium', 'premium', 'premium'] },
    { key: 'starter_mix', type: 'recruit', title: '세션 스타터 팩', detail: '일반 1회 + 고급 1회', bundle: ['normal', 'premium'] },
    { key: 'finisher_mix', type: 'recruit', title: '마감 정비 팩', detail: '고급 1회 + 일반 2회', bundle: ['premium', 'normal', 'normal'] }
  ];

  function safeApi(path, options) {
    if (typeof window.api !== 'function') return Promise.reject(new Error('api unavailable'));
    return window.api(path, options);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function ensureMissionCard() {
    if (document.getElementById('lobbyMissionCard')) return document.getElementById('lobbyMissionCard');
    const section = document.createElement('section');
    section.id = 'lobbyMissionCard';
    section.className = 'card lobby-room-card';
    section.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>Lobby Missions</h3>
          <p class="hint">서버 보상 연동 전 추적형 미션 UI입니다.</p>
        </div>
      </div>
      <div id="lobbyMissionView" class="lobby-mission-grid"></div>
    `;
    document.getElementById('lobbyPanel')?.appendChild(section);
    return section;
  }

  function ensureCard(id, html, parent) {
    let node = document.getElementById(id);
    if (!node) {
      node = document.createElement('section');
      node.id = id;
      node.className = 'card lobby-room-card';
      node.innerHTML = html;
    }
    parent?.appendChild(node);
    return node;
  }

  function ensureUpgradeSections() {
    ensureMissionCard();
    if (document.getElementById('lobbyTabsShell')) return;
    const lobbyPanel = document.getElementById('lobbyPanel');
    if (!lobbyPanel) return;

    const shell = document.createElement('div');
    shell.id = 'lobbyTabsShell';
    shell.className = 'lobby-tabs-shell';
    const nav = document.createElement('div');
    nav.className = 'lobby-tab-nav';
    nav.id = 'lobbyTabNav';
    nav.innerHTML = upgradeState.tabs.map((tab, index) => `<button type="button" class="lobby-tab-button ${index === 0 ? 'active' : ''}" data-lobby-tab="${tab.key}">${tab.label}</button>`).join('');
    const viewport = document.createElement('div');
    viewport.className = 'lobby-tab-viewport';
    viewport.id = 'lobbyTabViewport';
    const track = document.createElement('div');
    track.className = 'lobby-tab-track';
    track.id = 'lobbyTabTrack';
    track.innerHTML = upgradeState.tabs.map((tab) => `<section class="lobby-tab-panel" data-lobby-panel="${tab.key}"></section>`).join('');
    viewport.appendChild(track);
    shell.appendChild(nav);
    shell.appendChild(viewport);

    const insertAfter = lobbyPanel.querySelector('.lobby-header');
    insertAfter?.insertAdjacentElement('afterend', shell);

    nav.addEventListener('click', (event) => {
      const button = event.target.closest('[data-lobby-tab]');
      if (!button) return;
      const index = upgradeState.tabs.findIndex((tab) => tab.key === String(button.dataset.lobbyTab || ''));
      if (index >= 0) setLobbyTab(index);
    });

    let touchStartX = 0;
    let touchDeltaX = 0;
    viewport.addEventListener('touchstart', (event) => {
      touchStartX = Number(event.touches?.[0]?.clientX || 0);
      touchDeltaX = 0;
    }, { passive: true });
    viewport.addEventListener('touchmove', (event) => {
      touchDeltaX = Number(event.touches?.[0]?.clientX || 0) - touchStartX;
    }, { passive: true });
    viewport.addEventListener('touchend', () => {
      if (Math.abs(touchDeltaX) < 48) return;
      if (touchDeltaX < 0 && upgradeState.activeTab < upgradeState.tabs.length - 1) setLobbyTab(upgradeState.activeTab + 1);
      if (touchDeltaX > 0 && upgradeState.activeTab > 0) setLobbyTab(upgradeState.activeTab - 1);
    });

    redistributeLobbySections();
  }

  function setLobbyTab(index) {
    const next = Math.max(0, Math.min(upgradeState.tabs.length - 1, Number(index || 0)));
    upgradeState.activeTab = next;
    const track = document.getElementById('lobbyTabTrack');
    if (track) track.style.transform = `translateX(-${next * 100}%)`;
    qsa('.lobby-tab-button').forEach((button, buttonIndex) => {
      button.classList.toggle('active', buttonIndex === next);
    });
  }

  function getLobbyPanel(key) {
    return document.querySelector(`[data-lobby-panel="${key}"]`);
  }

  function findSectionByHeading(text) {
    return qsa('#lobbyPanel .card, #lobbyPanel .lobby-room-card').find((card) => {
      const title = card.querySelector('h3');
      return title && title.textContent.trim() === text;
    }) || null;
  }

  function redistributeLobbySections() {
    const shell = document.getElementById('lobbyTabsShell');
    if (!shell) return;

    const home = getLobbyPanel('home');
    const room = getLobbyPanel('room');
    const shop = getLobbyPanel('shop');
    const admiral = getLobbyPanel('admiral');
    const mission = getLobbyPanel('mission');
    const result = getLobbyPanel('result');
    if (!home || !room || !shop || !admiral || !mission || !result) return;

    if (!home.querySelector('.lobby-home-grid')) {
      home.innerHTML = '<div class="lobby-panel-grid-2 lobby-home-grid"></div><div id="lobbyHomeExtra"></div>';
    }
    const homeGrid = home.querySelector('.lobby-home-grid');
    const homeExtra = home.querySelector('#lobbyHomeExtra');
    room.innerHTML = '';
    shop.innerHTML = '';
    admiral.innerHTML = '';
    mission.innerHTML = '';
    result.innerHTML = '';

    const quickStart = findSectionByHeading('Quick Start');
    const status = findSectionByHeading('Lobby Status');
    const createRoom = findSectionByHeading('Create Room');
    const inviteCode = findSectionByHeading('Invite Code');
    const rooms = findSectionByHeading('Rooms');
    const sessionResult = findSectionByHeading('Session Result');
    const lobbyAdmirals = findSectionByHeading('Lobby Admirals');
    const creditShop = document.getElementById('creditShopCard');
    const missionCard = document.getElementById('lobbyMissionCard');
    const admiralLibraryShell = document.getElementById('admiralLibraryShell');

    [quickStart, status].filter(Boolean).forEach((node) => homeGrid?.appendChild(node));

    ensureCard('lobbyOverviewCard', `
      <div class="panel-head">
        <div>
          <h3>Lobby Overview</h3>
          <p class="hint">다음 행동과 진행 상태를 빠르게 확인합니다.</p>
        </div>
      </div>
      <div id="lobbyOverviewView"></div>
    `, homeExtra);

    ensureCard('lobbyShortcutCard', `
      <div class="panel-head">
        <div>
          <h3>Quick Actions</h3>
          <p class="hint">세션 재입장, 방 이동, 결과 확인을 빠르게 실행합니다.</p>
        </div>
      </div>
      <div id="lobbyShortcutView"></div>
    `, homeExtra);

    const roomGrid = document.createElement('div');
    roomGrid.className = 'lobby-panel-grid-2';
    [createRoom, inviteCode].filter(Boolean).forEach((node) => roomGrid.appendChild(node));
    room.appendChild(roomGrid);

    ensureCard('lobbyRoomChecklistCard', `
      <div class="panel-head">
        <div>
          <h3>Room Checklist</h3>
          <p class="hint">현재 방의 시작 조건과 참가자 상태를 정리합니다.</p>
        </div>
      </div>
      <div id="lobbyRoomChecklistView"></div>
    `, room);

    ensureCard('lobbyHostPanelCard', `
      <div class="panel-head">
        <div>
          <h3>Host Panel</h3>
          <p class="hint">현재 API 기준으로 가능한 방장 액션을 정리합니다.</p>
        </div>
      </div>
      <div id="lobbyHostPanelView"></div>
    `, room);

    rooms && room.appendChild(rooms);

    if (creditShop) shop.appendChild(creditShop);
    ensureCard('lobbyShopUpgradeCard', `
      <div class="panel-head">
        <div>
          <h3>Shop Bundles</h3>
          <p class="hint">기존 영입 API를 묶어 실제 상품처럼 사용합니다.</p>
        </div>
      </div>
      <div id="lobbyShopUpgradeView" class="lobby-shop-grid"></div>
    `, shop);
    ensureCard('lobbyCreditGuideCard', `
      <div class="panel-head">
        <div>
          <h3>Credit Usage Guide</h3>
          <p class="hint">현재 구현에서 크레딧을 쓰는 핵심 루트를 요약합니다.</p>
        </div>
      </div>
      <div class="lobby-empty-note">현재 크레딧은 제독 영입과 영입 묶음상품 소비에 사용됩니다. 세션용 소비 아이템은 서버 상점 라우트가 추가되면 연결됩니다.</div>
    `, shop);

    admiralLibraryShell && admiral.appendChild(admiralLibraryShell);
    lobbyAdmirals && admiral.appendChild(lobbyAdmirals);
    ensureCard('lobbyAdmiralGuideCard', `
      <div class="panel-head">
        <div>
          <h3>Admiral Guide</h3>
          <p class="hint">대표 제독과 다음 세션 제독 선택이 로비 성능에 연결됩니다.</p>
        </div>
      </div>
      <div id="lobbyAdmiralGuideView"></div>
    `, admiral);

    missionCard && mission.appendChild(missionCard);
    ensureCard('lobbyMissionGuideCard', `
      <div class="panel-head">
        <div>
          <h3>Mission Notes</h3>
          <p class="hint">현재 미션은 프론트 추적형입니다. 서버 크레딧 지급 연동은 아직 없습니다.</p>
        </div>
      </div>
      <div class="lobby-empty-note">크레딧 실지급이 필요한 미션 보상은 서버 라우트가 추가되면 즉시 붙일 수 있도록 UI만 먼저 분리했습니다.</div>
    `, mission);

    ensureCard('lobbySettlementDetailCard', `
      <div class="panel-head">
        <div>
          <h3>Settlement Detail</h3>
          <p class="hint">최근 세션의 점수와 보상 산식을 분해해서 보여줍니다.</p>
        </div>
      </div>
      <div id="lobbySettlementDetailView"></div>
    `, result);

    ensureCard('lobbySettlementHistoryCard', `
      <div class="panel-head">
        <div>
          <h3>Settlement History</h3>
          <p class="hint">최근 세션 보상 로그를 확인합니다.</p>
        </div>
      </div>
      <div id="lobbyRewardLogView"></div>
    `, result);

    sessionResult && result.appendChild(sessionResult);
  }

  function roomStatusLabel(status) {
    const map = { waiting: '대기', starting: '시작 준비', in_game: '진행 중', ended: '종료' };
    return map[String(status || '')] || String(status || '-');
  }

  function getProfileCredit() {
    return Number(window.lobbyState?.profile?.credit || upgradeState.extra.profile?.profile?.credit || 0);
  }

  function getRecruitTypeMap() {
    const list = Array.isArray(window.lobbyAdmiralState?.recruitTypes) ? window.lobbyAdmiralState.recruitTypes : [];
    return new Map(list.map((item) => [String(item.key), item]));
  }

  function productCost(product) {
    const recruitTypes = getRecruitTypeMap();
    return (product.bundle || []).reduce((sum, key) => sum + Number(recruitTypes.get(String(key))?.costCredit || 0), 0);
  }

  async function buyLobbyProduct(productKey) {
    const product = SHOP_PRODUCTS.find((item) => item.key === productKey);
    if (!product || upgradeState.shopBusy) return;
    const cost = productCost(product);
    if (getProfileCredit() < cost) {
      window.setError?.(`크레딧이 부족합니다. 필요 ${cost.toLocaleString()}`);
      return;
    }
    upgradeState.shopBusy = true;
    window.clearMessages?.();
    window.setBusy?.(true);
    try {
      let lastMessage = '';
      for (const type of product.bundle) {
        const data = await safeApi('/lobby/recruit-admiral', {
          method: 'POST',
          body: JSON.stringify({ type })
        });
        lastMessage = data?.message || lastMessage;
      }
      window.setStatus?.(`${product.title} 구매 완료. ${lastMessage}`);
      await refreshLobbyUpgradeData();
      if (typeof window.loadLobby === 'function') await window.loadLobby();
    } catch (err) {
      window.handleAuthError?.(err);
    } finally {
      upgradeState.shopBusy = false;
      window.setBusy?.(false);
    }
  }

  function renderShopBundles() {
    const view = document.getElementById('lobbyShopUpgradeView');
    if (!view) return;
    const credit = getProfileCredit();
    view.innerHTML = SHOP_PRODUCTS.map((product) => {
      const cost = productCost(product);
      const disabled = upgradeState.shopBusy || credit < cost;
      return `
        <div class="lobby-shop-card">
          <div>
            <strong>${product.title}</strong>
            <span>${cost.toLocaleString()} credits</span>
            <small>${product.detail}</small>
          </div>
          <button type="button" ${disabled ? 'disabled' : ''} data-lobby-buy="${product.key}">${disabled && credit < cost ? '크레딧 부족' : '구매'}</button>
        </div>
      `;
    }).join('');
    qsa('[data-lobby-buy]', view).forEach((button) => {
      button.addEventListener('click', () => buyLobbyProduct(String(button.dataset.lobbyBuy || '')));
    });
  }

  function deriveMissionItems() {
    const recruitLogs = Array.isArray(upgradeState.extra.recruitLogs) ? upgradeState.extra.recruitLogs : [];
    const rewardLogs = Array.isArray(upgradeState.extra.rewardLogs) ? upgradeState.extra.rewardLogs : [];
    const admirals = Array.isArray(window.lobbyAdmiralState?.admirals) ? window.lobbyAdmiralState.admirals : [];
    const joinedRoom = upgradeState.extra.profile?.joinedRoom || null;
    const currentSession = upgradeState.extra.profile?.currentSession || null;
    const credit = getProfileCredit();

    return [
      { key: 'm1', title: '첫 영입 진행', target: 1, value: recruitLogs.length, reward: '예정 100 크레딧', note: '제독 영입 로그 1회' },
      { key: 'm2', title: '제독 3명 확보', target: 3, value: admirals.length, reward: '예정 150 크레딧', note: '보유 제독 수' },
      { key: 'm3', title: '세션 정산 1회 확인', target: 1, value: rewardLogs.length, reward: '예정 120 크레딧', note: '정산 로그 확인' },
      { key: 'm4', title: '방 참가 상태 만들기', target: 1, value: joinedRoom ? 1 : 0, reward: '예정 80 크레딧', note: '참가 중인 방' },
      { key: 'm5', title: '진행 중 세션 확보', target: 1, value: currentSession ? 1 : 0, reward: '예정 200 크레딧', note: '현재 세션 입장' },
      { key: 'm6', title: '크레딧 300 이상 유지', target: 300, value: credit, reward: '예정 60 크레딧', note: '현재 크레딧' }
    ];
  }

  function renderMissionTracker() {
    const view = document.getElementById('lobbyMissionView');
    if (!view) return;
    const missions = deriveMissionItems();
    view.innerHTML = missions.map((mission) => {
      const progress = Math.max(0, Math.min(100, Math.round((mission.value / Math.max(1, mission.target)) * 100)));
      const complete = mission.value >= mission.target;
      return `
        <div class="lobby-mission-card ${complete ? 'complete' : ''}">
          <div>
            <strong>${mission.title}</strong>
            <div class="hint">${mission.note}</div>
          </div>
          <div class="lobby-mission-progress"><span style="width:${progress}%;"></span></div>
          <div class="lobby-mission-meta">
            <span>${mission.value.toLocaleString()} / ${mission.target.toLocaleString()}</span>
            <span>${mission.reward}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderOverview() {
    const view = document.getElementById('lobbyOverviewView');
    if (!view) return;
    const profile = window.lobbyState?.profile || {};
    const currentSession = upgradeState.extra.profile?.currentSession || null;
    const joinedRoom = upgradeState.extra.profile?.joinedRoom || null;
    const admirals = Array.isArray(window.lobbyAdmiralState?.admirals) ? window.lobbyAdmiralState.admirals : [];
    const rewardLogs = Array.isArray(upgradeState.extra.rewardLogs) ? upgradeState.extra.rewardLogs : [];
    view.innerHTML = `
      <div class="lobby-summary-grid">
        <div class="lobby-summary-tile"><span>대표 제독</span><strong>${profile.featuredAdmiralName || '미지정'}</strong></div>
        <div class="lobby-summary-tile"><span>다음 세션 제독</span><strong>${profile.selectedSessionAdmiralName || '미선택'}</strong></div>
        <div class="lobby-summary-tile"><span>보유 제독</span><strong>${admirals.length.toLocaleString()}</strong></div>
        <div class="lobby-summary-tile"><span>현재 크레딧</span><strong>${getProfileCredit().toLocaleString()}</strong></div>
        <div class="lobby-summary-tile"><span>참가 중 방</span><strong>${joinedRoom ? joinedRoom.roomName : '없음'}</strong></div>
        <div class="lobby-summary-tile"><span>최근 정산</span><strong>${rewardLogs.length.toLocaleString()}회</strong></div>
      </div>
      <div class="lobby-empty-note" style="margin-top:12px;">${currentSession ? `현재 세션 진행 중: ${currentSession.roomName || 'Session'} / ${roomStatusLabel(currentSession.status)}` : '현재 진행 중인 세션이 없습니다. 방을 만들거나 참가 후 세션을 시작하세요.'}</div>
    `;

    const shortcutView = document.getElementById('lobbyShortcutView');
    if (shortcutView) {
      shortcutView.innerHTML = `
        <div class="button-row">
          <button type="button" data-shortcut="quick">즉시 솔로 시작</button>
          <button type="button" data-shortcut="room">방 탭으로 이동</button>
          <button type="button" data-shortcut="mission">미션 탭으로 이동</button>
          <button type="button" data-shortcut="result">정산 탭으로 이동</button>
          <button type="button" data-shortcut="enter" ${currentSession ? '' : 'disabled'}>현재 세션 입장</button>
        </div>
      `;
      shortcutView.querySelector('[data-shortcut="quick"]')?.addEventListener('click', () => window.elements?.quickStartButton?.click());
      shortcutView.querySelector('[data-shortcut="room"]')?.addEventListener('click', () => setLobbyTab(1));
      shortcutView.querySelector('[data-shortcut="mission"]')?.addEventListener('click', () => setLobbyTab(4));
      shortcutView.querySelector('[data-shortcut="result"]')?.addEventListener('click', () => setLobbyTab(5));
      shortcutView.querySelector('[data-shortcut="enter"]')?.addEventListener('click', () => window.enterCurrentSession?.());
    }
  }

  function renderRoomChecklist() {
    const view = document.getElementById('lobbyRoomChecklistView');
    const hostView = document.getElementById('lobbyHostPanelView');
    if (!view) return;
    const room = upgradeState.extra.profile?.joinedRoom || null;
    if (!room) {
      view.innerHTML = '<div class="lobby-empty-note">참가 중인 방이 없습니다.</div>';
      if (hostView) hostView.innerHTML = '<div class="lobby-empty-note">현재 방이 없어 방장 기능을 표시할 수 없습니다.</div>';
      return;
    }
    const players = Array.isArray(room.players) ? room.players : [];
    const nonHost = players.filter((player) => !player.isHost);
    const readyCount = players.filter((player) => player.isReady).length;
    const me = players.find((player) => player.isMe);
    const checklist = [
      { label: '방장 존재', done: Boolean(room.hostUsername) },
      { label: room.mode === 'multi' ? '최소 2인 충족' : '솔로 모드 준비', done: room.mode === 'solo' || players.length >= 2 },
      { label: '참가자 준비 상태', done: nonHost.every((player) => player.isReady) },
      { label: '내 준비 상태', done: Boolean(me?.isReady || me?.isHost) }
    ];
    view.innerHTML = `
      <div class="lobby-checklist">
        ${checklist.map((item) => `<div class="lobby-check-item ${item.done ? 'done' : 'pending'}"><strong>${item.label}</strong><span>${item.done ? '완료' : '대기'}</span></div>`).join('')}
      </div>
      <div class="lobby-empty-note" style="margin-top:12px;">준비 인원 ${readyCount}/${players.length} · 초대 코드 ${room.inviteCode} · ${room.mode === 'multi' ? '멀티' : '솔로'}</div>
      <div class="lobby-room-roster" style="margin-top:12px;">
        ${players.map((player) => `
          <div class="lobby-room-line">
            <div><strong>${player.username}${player.isMe ? ' (나)' : ''}</strong><span>${player.isHost ? '방장' : '참가자'}</span></div>
            <span class="lobby-tag ${player.isReady ? 'ready' : 'warn'}">${player.isReady ? '준비 완료' : '준비 전'}</span>
            <span class="lobby-tag">${player.isHost ? 'HOST' : 'MEMBER'}</span>
          </div>
        `).join('')}
      </div>
    `;

    if (!hostView) return;
    if (!room.isHost) {
      hostView.innerHTML = '<div class="lobby-empty-note">방장만 시작과 운영 관련 액션을 직접 실행할 수 있습니다. 현재는 준비 상태 확인과 시작 가능 여부만 표시합니다.</div>';
      return;
    }
    const canStart = (room.mode === 'solo' && players.length === 1) || (room.mode === 'multi' && players.length >= 2 && nonHost.every((player) => player.isReady));
    hostView.innerHTML = `
      <div class="lobby-checklist">
        <div class="lobby-check-item ${canStart ? 'done' : 'pending'}"><strong>세션 시작 가능</strong><span>${canStart ? '가능' : '조건 미충족'}</span></div>
        <div class="lobby-check-item"><strong>방 모드</strong><span>${room.mode === 'multi' ? '멀티' : '솔로'}</span></div>
        <div class="lobby-check-item"><strong>방 상태</strong><span>${roomStatusLabel(room.status)}</span></div>
      </div>
      <div class="button-row" style="margin-top:12px;">
        <button type="button" data-host-action="refresh">방 상태 새로고침</button>
        <button type="button" data-host-action="start" ${canStart ? '' : 'disabled'}>세션 시작</button>
      </div>
      <div class="lobby-empty-note" style="margin-top:12px;">방 이름 변경, 강퇴, 위임, 해산은 서버 라우트가 추가되면 바로 연결할 수 있도록 방장 전용 패널 위치만 먼저 확보했습니다.</div>
    `;
    hostView.querySelector('[data-host-action="refresh"]')?.addEventListener('click', () => window.loadLobby?.());
    hostView.querySelector('[data-host-action="start"]')?.addEventListener('click', () => window.startRoom?.(room.id));
  }

  function renderSettlementDetail() {
    const view = document.getElementById('lobbySettlementDetailView');
    if (!view) return;
    const latest = Array.isArray(upgradeState.extra.rewardLogs) ? upgradeState.extra.rewardLogs[0] : null;
    const detail = latest?.detail || {};
    const reward = detail.reward || {};
    const score = detail.score || {};
    if (!latest) {
      view.innerHTML = '<div class="lobby-empty-note">아직 세션 정산 데이터가 없습니다.</div>';
      return;
    }
    view.innerHTML = `
      <div class="lobby-settlement-grid">
        <div class="lobby-settlement-breakdown">
          <div class="lobby-breakdown-line"><strong>최종 순위</strong><span>#${detail.rank || '-'}</span></div>
          <div class="lobby-breakdown-line"><strong>총점</strong><span>${Number(score.totalScore || 0).toLocaleString()}</span></div>
          <div class="lobby-breakdown-line"><strong>거점 점수</strong><span>${Number(score.outpostScore || 0).toLocaleString()}</span></div>
          <div class="lobby-breakdown-line"><strong>전투 점수</strong><span>${Number(score.combatScore || 0).toLocaleString()}</span></div>
          <div class="lobby-breakdown-line"><strong>생존 점수</strong><span>${Number(score.cityScore || 0).toLocaleString()}</span></div>
        </div>
        <div class="lobby-settlement-breakdown">
          <div class="lobby-breakdown-line"><strong>기본 보상</strong><span>${Number(reward.baseReward || 0).toLocaleString()}</span></div>
          <div class="lobby-breakdown-line"><strong>순위 보상</strong><span>${Number(reward.rankReward || 0).toLocaleString()}</span></div>
          <div class="lobby-breakdown-line"><strong>성과 보상</strong><span>${Number(reward.bonusReward || 0).toLocaleString()}</span></div>
          <div class="lobby-breakdown-line"><strong>미션 보상</strong><span>${Number(reward.missionReward || 0).toLocaleString()}</span></div>
          <div class="lobby-breakdown-line"><strong>최종 크레딧</strong><span>+${Number(latest.creditReward || reward.creditTotal || 0).toLocaleString()}</span></div>
        </div>
      </div>
    `;
  }

  function renderRewardHistory() {
    const view = document.getElementById('lobbyRewardLogView');
    if (!view) return;
    const logs = Array.isArray(upgradeState.extra.rewardLogs) ? upgradeState.extra.rewardLogs : [];
    view.innerHTML = logs.length ? `<div class="lobby-history-list">${logs.map((item) => `
      <div class="lobby-history-item">
        <strong>Session #${item.sessionId || '-'}</strong>
        <div class="hint">+${Number(item.creditReward || 0).toLocaleString()} credits · rank ${item.detail?.rank || '-'} · total ${Number(item.detail?.score?.totalScore || 0).toLocaleString()}</div>
      </div>
    `).join('')}</div>` : '<div class="lobby-empty-note">보상 로그가 없습니다.</div>';
  }

  function renderAdmiralGuide() {
    const view = document.getElementById('lobbyAdmiralGuideView');
    if (!view) return;
    const profile = window.lobbyState?.profile || {};
    const admirals = Array.isArray(window.lobbyAdmiralState?.admirals) ? window.lobbyAdmiralState.admirals : [];
    const featured = profile.featuredAdmiralName || '미지정';
    const selected = profile.selectedSessionAdmiralName || '미선택';
    view.innerHTML = `
      <div class="lobby-checklist">
        <div class="lobby-check-item done"><strong>대표 제독</strong><span>${featured}</span></div>
        <div class="lobby-check-item ${profile.selectedSessionAdmiralName ? 'done' : 'pending'}"><strong>다음 세션 제독</strong><span>${selected}</span></div>
        <div class="lobby-check-item done"><strong>총 보유 제독</strong><span>${admirals.length.toLocaleString()}명</span></div>
      </div>
    `;
  }

  async function refreshLobbyUpgradeData() {
    try {
      const [profileData, rewardData, recruitData] = await Promise.all([
        safeApi('/lobby/profile'),
        safeApi('/lobby/reward-logs'),
        safeApi('/lobby/recruit-logs')
      ]);
      upgradeState.extra.profile = profileData || null;
      upgradeState.extra.rewardLogs = Array.isArray(rewardData?.logs) ? rewardData.logs : [];
      upgradeState.extra.recruitLogs = Array.isArray(recruitData?.logs) ? recruitData.logs : [];
      renderOverview();
      renderRoomChecklist();
      renderMissionTracker();
      renderSettlementDetail();
      renderRewardHistory();
      renderShopBundles();
      renderAdmiralGuide();
    } catch (err) {
      console.warn('[lobby.upgrade] refresh failed', err);
    }
  }

  function scheduleLobbyRefresh() {
    if (upgradeState.refreshScheduled) return;
    upgradeState.refreshScheduled = true;
    requestAnimationFrame(() => {
      upgradeState.refreshScheduled = false;
      const lobbyPanel = document.getElementById('lobbyPanel');
      if (!lobbyPanel || lobbyPanel.classList.contains('hidden')) return;
      ensureUpgradeSections();
      redistributeLobbySections();
    });
  }

  function wrapGlobal(name, fn) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = fn(original);
  }

  function installOverrides() {
    wrapGlobal('renderLobby', (original) => function wrappedRenderLobby(data) {
      original.call(this, data);
      ensureUpgradeSections();
      redistributeLobbySections();
      refreshLobbyUpgradeData();
    });
    wrapGlobal('renderLobbyAdmirals', (original) => function wrappedRenderLobbyAdmirals(data, logs) {
      original.call(this, data, logs);
      renderMissionTracker();
      renderShopBundles();
      renderOverview();
      renderAdmiralGuide();
    });
    wrapGlobal('renderSessionSummary', (original) => function wrappedSessionSummary(summary) {
      original.call(this, summary);
      renderSettlementDetail();
      renderRewardHistory();
    });
    wrapGlobal('showLobby', (original) => function wrappedShowLobby(username) {
      const result = original.call(this, username);
      setTimeout(() => {
        ensureUpgradeSections();
        redistributeLobbySections();
        setLobbyTab(upgradeState.activeTab || 0);
        refreshLobbyUpgradeData();
      }, 50);
      return result;
    });
    wrapGlobal('loadLobby', (original) => async function wrappedLoadLobby(...args) {
      const result = await original.apply(this, args);
      ensureUpgradeSections();
      redistributeLobbySections();
      refreshLobbyUpgradeData();
      return result;
    });
  }

  function install() {
    if (upgradeState.installed) return;
    upgradeState.installed = true;
    ensureUpgradeSections();
    redistributeLobbySections();
    installOverrides();
    setLobbyTab(0);
    const observer = new MutationObserver(() => {
      scheduleLobbyRefresh();
    });
    const lobbyPanel = document.getElementById('lobbyPanel');
    if (lobbyPanel) {
      observer.observe(lobbyPanel, { childList: true, subtree: true });
    }
    refreshLobbyUpgradeData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
