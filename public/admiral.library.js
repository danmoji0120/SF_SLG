(() => {
  const ADMIRAL_CARD_DATA = {
    '카이로 벤': { nickname: '도망자', rarity: 'Common', role: '기동', effect: '이동속도 +10%, 후퇴 성공률 +5%', profile: '살아남는 것을 최우선으로 생각하는 기동형 지휘관', quote: '살아남아야 다음 판이 있다', keywords: '젊은 남성, 날카로운 눈매, 경량 전투복, 우주 항법 장교', details: '짧은 흑발, 슬림 체형, 휴대 전술 패드, 목 주변 장갑 적음', colors: '청록, 회색', forbidden: '과도한 중장갑, 왕족 느낌' },
    '마야 렌': { nickname: '패치워크', rarity: 'Common', role: '정비 / 복구', effect: '전투 종료 후 수리 효율 +15%', profile: '망가진 함선을 이어붙이며 전장을 떠도는 기술자', quote: '부서진 건 버리는 게 아니라 고치는 거야', keywords: '여성 엔지니어, 정비복, 공구 드론, 피곤하지만 집중한 표정', details: '짙은 갈색 머리 묶음, 작업 장갑, 멜빵형 공구 하네스', colors: '주황, 강철색', forbidden: '과한 메카 팔, 귀여움 과장' },
    '드릭 할버': { nickname: '퍼스트 샷', rarity: 'Common', role: '선제타격', effect: '첫 공격 피해 +15%', profile: '먼저 쏘는 쪽이 산다고 믿는 냉정한 사수', quote: '먼저 쏘면 끝난다', keywords: '남성 사수, 장거리 조준 장비, 단정한 제복, 냉소적 표정', details: '한쪽 눈에 조준 바이저, 얇은 장교 코트', colors: '적색, 검정', forbidden: '광기 어린 표정, 중무장 병사 느낌' },
    '오르한 제크': { nickname: '방벽', rarity: 'Common', role: '초반 방어', effect: '전투 시작 2틱 동안 받는 피해 -10%', profile: '첫 충돌을 버텨내는 방어 교리 장교', quote: '첫 충돌만 넘기면 흐름은 우리 거다', keywords: '중년 남성, 튼튼한 체격, 방어형 코트, 믿음직한 자세', details: '짧은 수염, 넓은 어깨, 두꺼운 칼라', colors: '진회색, 청색', forbidden: '노년 노쇠 이미지, 과장된 근육' },
    '리오 칸': { nickname: '쿼터마스터', rarity: 'Common', role: '보급', effect: '유지비 -10%', profile: '전쟁은 결국 자원과 연료 싸움이라고 믿는 보급관', quote: '포탄보다 연료가 먼저 떨어진다', keywords: '차분한 남성, 보급 장교, 서류와 홀로패드, 절제된 인상', details: '반듯한 머리, 정돈된 제복, 얇은 장갑', colors: '카키, 남색', forbidden: '상인/해적 이미지' },
    '세라 노바': { nickname: '핀포인트', rarity: 'Common', role: '타겟팅', effect: '후열 타겟 확률 +10%', profile: '적 후열을 정확히 짚어내는 분석형 지휘관', quote: '뒤에 숨은 놈부터 지워', keywords: '날카로운 여성, 분석 HUD, 짧은 흰 머리, 차가운 눈빛', details: '반투명 전술 스크린, 슬림한 제복', colors: '백색, 보라', forbidden: '과한 감정 표현' },
    '베일 헥스': { nickname: '고스트 스텝', rarity: 'Common', role: '회피', effect: '첫 2회 공격 회피 확률 +15%', profile: '예측 불가능한 움직임으로 살아남는 회피형', quote: '안 맞으면 된다', keywords: '호리호리한 인물, 후드형 전술복, 그림자 같은 실루엣', details: '눈 밑 다크서클, 얇은 턱선, 가벼운 장비', colors: '흑색, 민트', forbidden: '닌자 과장, 판타지 느낌' },
    '에단 루크': { nickname: '리커버리', rarity: 'Common', role: '손상 복구', effect: '중파 상태 함선 수리 속도 +20%', profile: '망가진 전력을 다시 끌어올리는 복구 지휘관', quote: '아직 끝난 게 아니야', keywords: '청년 남성, 구조대 느낌, 응급 수리 장치', details: '금발 단발, 응급 패치 케이스, 밝은 표정', colors: '노랑, 회색', forbidden: '과도한 의사복' },
    '아이리스 발렌': { nickname: '스카이체이서', rarity: 'Rare', role: '함대 기동', effect: '전체 함대 속도 +8%, 후퇴 시 피해 감소', profile: '빠른 전개와 이탈을 중시하는 기동 사령관', quote: '움직이지 못하면 죽는다', keywords: '여성 지휘관, 고급 기동 제복, 날렵한 실루엣', details: '긴 포니테일, 얇은 장갑, 공군 느낌의 망토', colors: '청색, 은색', forbidden: '중장 탱커 느낌' },
    '로크 하딘': { nickname: '스카이가드', rarity: 'Rare', role: '방공', effect: '대공포 요격률 +10%, 요격 성공 시 피해 추가 감소', profile: '하늘을 막아내는 방공 지휘 전문가', quote: '하늘은 내가 막는다', keywords: '남성 베테랑, 방공 통제실, 무거운 헤드셋, 단단한 인상', details: '짧은 회색 머리, 굵은 목 보호대', colors: '회청, 황색', forbidden: '항공모함 조종사 느낌' },
    '칼릭 스트론': { nickname: '브로드사이드', rarity: 'Rare', role: '포격', effect: '무기 쿨다운 -10%', profile: '압도적 탄막으로 적을 밀어붙이는 포격 지휘관', quote: '탄막으로 밀어버려', keywords: '거친 남성, 포격 장교, 묵직한 코트, 강한 눈빛', details: '붉은 흉터, 두꺼운 장갑 장교복', colors: '적갈색, 흑색', forbidden: '광전사 이미지' },
    '브론 카쉬': { nickname: '아이언월', rarity: 'Rare', role: '장갑', effect: '장갑 계열 효과 +15%', profile: '뚫리지 않는 전열을 만드는 방어 장인', quote: '뚫리면 끝이다', keywords: '장년 남성, 중장 장교, 견고한 체격', details: '짧은 백발, 육중한 상체, 장갑 샘플 홀더', colors: '강철색, 짙은 남색', forbidden: '해병대 느낌 과장' },
    '린 세이': { nickname: '블루헤이븐', rarity: 'Rare', role: '실드', effect: '실드 재생량 +20%', profile: '시간을 벌며 전선을 유지하는 실드 기술자', quote: '시간이 우리 편이다', keywords: '여성 과학자형 지휘관, 실드 투영 장치, 차분한 미소', details: '단정한 흑발, 얇은 안경형 HUD', colors: '하늘색, 흰색', forbidden: '과도한 실험복' },
    '제로스': { nickname: '락온', rarity: 'Rare', role: '정밀 타격', effect: '타겟팅 시스템 효과 +20%', profile: '감정보다 계산을 믿는 무표정한 분석가', quote: '락온 완료', keywords: '중성적 인상, 사이버네틱 눈, 검은 코트', details: '짧은 백은발, 비대칭 장식, 차가운 표정', colors: '보라, 검정', forbidden: '안드로이드 전면 강조' },
    '아스트라 벨': { nickname: '스카이퀸', rarity: 'Epic', role: '항공전', effect: '항공단 출격 쿨다운 -15%, 요격기 효과 +10%', profile: '항공단을 완벽하게 통제하는 스타 파일럿 출신 제독', quote: '하늘에서 끝낸다', keywords: '카리스마 있는 여성 에이스, 항공 지휘관, 긴 코트, 스타 파일럿 분위기', details: '금발 웨이브, 한쪽 귀 통신장치, 고급 장교 장갑', colors: '백금색, 청금', forbidden: '아이돌풍 과장' },
    '네메시스': { nickname: '노이즈', rarity: 'Epic', role: '전자전', effect: 'ECM 효과 +25%, 적 명중률 추가 감소', profile: '보이지 않는 교란으로 적을 무력화하는 전자전 전문가', quote: '보이지 않는 전쟁이 진짜 전쟁이야', keywords: '신비로운 인물, 어두운 후드, 전자 파형 HUD', details: '얼굴 일부 가림, 가는 체형, 미소 없는 입매', colors: '자주, 흑색', forbidden: '마법사 느낌' },
    '바르칸': { nickname: '브레이커', rarity: 'Epic', role: '돌파', effect: '전열 대상 피해 +15%, 후열 타겟 확률 감소', profile: '정면 돌파만을 신봉하는 파괴적 지휘관', quote: '정면으로 부숴', keywords: '거대한 남성, 돌격형 장교, 전투 흉터, 무거운 실루엣', details: '짧은 붉은 머리, 넓은 턱, 강화된 팔 보호구', colors: '붉은색, 강철색', forbidden: '괴수형 과장' },
    '그라비온': { nickname: '폴다운', rarity: 'Epic', role: '철벽', effect: '피해 누적 임계치 +20%', profile: '무너지지 않는 전선을 만드는 침묵의 사령관', quote: '아직 안 무너졌다', keywords: '무거운 분위기의 남성, 낮게 깔린 시선, 두꺼운 외투', details: '짙은 흑발, 두터운 어깨, 무표정', colors: '검정, 짙은 청색', forbidden: '악당 군주 느낌' },
    '오메가 타이탄': { nickname: '센터폴', rarity: 'Legendary', role: '타이탄 지원', effect: '타이탄 포함 시 주변 함대 피해 +10%, 타이탄 수리 속도 +20%', profile: '타이탄급 전력을 중심으로 함대를 운영하는 상징적 총사령관', quote: '전장은 하나의 중심으로 수렴한다', keywords: '위엄 있는 중년 남성, 최고 사령관, 긴 군복, 장대한 실루엣', details: '은백 장발, 금속 장식 견장, 낮은 시선', colors: '금색, 흑청', forbidden: '판타지 왕, 과한 왕관' },
    '노바 팬텀': { nickname: '이클립스', rarity: 'Legendary', role: '초반 지배', effect: '전투 첫 3틱 동안 적 명중률 -20%, 이후 적 명중률 +5%', profile: '초반 우위를 위해 모든 것을 거는 유령 함대의 지휘관', quote: '처음 3틱이면 충분해', keywords: '치명적으로 우아한 여성, 어두운 망토, 날카로운 미소', details: '긴 흑보라 머리, 반쯤 가린 얼굴, 고급 군복', colors: '보라, 흑색, 붉은 포인트', forbidden: '뱀파이어풍, 과한 판타지' },
    '헤일 벡터': { nickname: '플럭스', rarity: 'Rare', role: '지원 / 전력', effect: '보조 리액터 패널티 완화, 전력 초과 직전 안정성 증가', profile: '무거운 빌드를 실전에서 굴리게 만드는 시스템 설계자', quote: '무거워도 굴러가면 된다', keywords: '젊은 남성 공학 장교, 반응로 도면, 정교한 장비', details: '청회색 짧은 머리, 얇은 반응로 장갑, 손목 홀로그램', colors: '청회, 황록', forbidden: '과학자 과장' },
    '유나 미르': { nickname: '스틸멜로디', rarity: 'Rare', role: '장기전 지원', effect: '수리 드론/지원 유틸 효율 증가', profile: '차분한 목소리로 전장을 정리하는 지원형 지휘관', quote: '급할수록 정리해야 해', keywords: '온화한 여성, 지원 지휘관, 깨끗한 제복, 부드러운 인상', details: '긴 남색 머리, 얇은 이어피스, 단정한 실루엣', colors: '남색, 은색', forbidden: '지나친 치유사 판타지' },
    '토르 벡센': { nickname: '애프터버너', rarity: 'Rare', role: '추격 / 마무리', effect: '적 후퇴 준비 중 대상 피해 +15%, 이동 후 첫 공격 우선도 증가', profile: '무너지는 적을 끝까지 물고 늘어지는 추격형 지휘관', quote: '도망치는 등을 쏘는 게 제일 쉽지', keywords: '강한 체격의 남성, 추격전 지휘관, 날렵한 외투, 전술 엔진 표시', details: '짧은 금갈색 머리, 턱수염, 열 배기 장치가 달린 제복', colors: '주황, 검정', forbidden: '폭주족 느낌 과장' },
    '엘라 시렌': { nickname: '웨이크콜', rarity: 'Rare', role: '정찰 / 시야', effect: '이벤트/거점 정보 노출 속도 증가, 초반 미션 탐색 효율 증가', profile: '정확한 정보가 전장의 절반이라 믿는 정찰망 지휘관', quote: '보이지 않으면, 아직 네 것이 아니야', keywords: '냉정한 여성 정찰장교, 홀로맵, 긴 코트, 별자리 같은 HUD', details: '짧은 은회색 머리, 얇은 바이저, 정찰 드론 마커', colors: '은색, 청록', forbidden: '점술가 느낌, 판타지 망토' },
    '마렉 둔': { nickname: '스톤앵커', rarity: 'Rare', role: '점령 / 방어', effect: '점령 중 받는 피해 감소, 점령 유지 안정성 증가', profile: '차지한 곳은 반드시 지켜야 한다는 집념의 거점전 지휘관', quote: '먹은 자리는 돌처럼 굳힌다', keywords: '중후한 남성, 거점 수비 장교, 두꺼운 코트, 요새 같은 실루엣', details: '굵은 눈썹, 넓은 견갑, 방어 표시 핀 다수', colors: '카키, 철색', forbidden: '건설 노동자 이미지 과장' },
    '라에나 크로우': { nickname: '하프라이트', rarity: 'Epic', role: '구조 / 생존', effect: '대파 직전 함선의 생존 확률 보정, 전투 종료 후 생존 함선 HP 최소 보존치 증가', profile: '전멸 직전의 전력을 기어코 끌고 돌아오는 구조 사령관', quote: '하나라도 더 데려와', keywords: '강한 눈빛의 여성 구조 지휘관, 구난 비콘, 어두운 함교 배경', details: '묶은 흑발, 응급 표식이 새겨진 장갑, 단호한 표정', colors: '적갈색, 회색', forbidden: '성직자 / 치유사 풍 과장' },
    '제이든 프록스': { nickname: '그레이티드', rarity: 'Epic', role: '경제 / 생산', effect: '생산 큐 효율 증가, 긴급 생산 명령 비용 완화', profile: '공장과 조선소의 흐름을 전장 타이밍에 맞춰 조율하는 산업형 사령관', quote: '전쟁은 생산 타이밍이 끝낸다', keywords: '냉철한 남성 산업 지휘관, 조선소 배경, 생산 라인 HUD', details: '짧은 흑회색 머리, 정교한 장갑장갑, 공장용 전술 태블릿', colors: '청회, 주황', forbidden: '기업 CEO 느낌 과장' },
    '실바 케인': { nickname: '블랙프레임', rarity: 'Epic', role: '저격 / 고정밀', effect: '후열 직접 타격 계열 무기 효율 증가, 대형 목표 우선 타격 보정', profile: '한 번의 정확한 타격으로 전황을 바꾸는 장거리 교전 전문가', quote: '한 발이면 구조가 무너진다', keywords: '차가운 여성 저격 지휘관, 장거리 센서, 고정밀 조준선', details: '흑단색 단발, 눈가 HUD 라인, 얇은 검은 코트', colors: '흑색, 백금', forbidden: '암살자 / 판타지 활잡이 느낌' },
    '루시안 베가': { nickname: '파운드리 킹', rarity: 'Legendary', role: '산업 / 장기전', effect: '세션 중반 이후 생산 효율 증가, 대형함 생산/수리 전환 판단 보정', profile: '후반 전쟁은 누가 더 오래 굴리느냐의 싸움이라 믿는 산업 전쟁의 군주', quote: '부서진 함대도 공장은 다시 세운다', keywords: '위엄 있는 장년 남성, 산업 총사령관, 거대한 조선소 창 배경', details: '은회색 뒤로 넘긴 머리, 검은 장교복, 금속 장식 장갑', colors: '금속 금, 먹색', forbidden: '황제풍 왕좌, 판타지 군주' },
    '에코 라일': { nickname: '클러스터', rarity: 'Legendary', role: '함대 연계', effect: '동일 거점 아군 함대 협동 보정, 다중 함대 동시 교전 시 지원 효과 상승', profile: '분산된 전력을 하나의 교향곡처럼 엮어내는 연계 지휘의 대가', quote: '흩어진 전력도, 지휘는 하나다', keywords: '우아한 중성적 지휘관, 다중 전술 스크린, 오케스트라 같은 손짓', details: '긴 은백 머리, 섬세한 손 장식, 얇은 장교 망토', colors: '청백, 자주', forbidden: '지휘봉 든 음악가 과장, 마도사 느낌' }
  };

  const state = { installed: false, subtab: 'recruit', modalOpen: false };

  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function qs(selector, root = document) { return root.querySelector(selector); }
  function rarityClass(value) { return String(value || '').toLowerCase(); }

  function getOwnedAdmirals() {
    return Array.isArray(window.lobbyAdmiralState?.admirals) ? window.lobbyAdmiralState.admirals : [];
  }

  function buildMergedAdmiral(admiral) {
    const meta = ADMIRAL_CARD_DATA[admiral?.name] || {};
    return {
      id: admiral?.id || null,
      isOwned: Boolean(admiral?.isOwned ?? admiral?.id),
      name: admiral?.name || meta.name || 'Unknown Admiral',
      nickname: meta.nickname || admiral?.nickname || '-',
      rarity: admiral?.rarity || meta.rarity || 'Common',
      role: meta.role || admiral?.role || '미분류',
      effect: meta.effect || admiral?.effectText || '효과 정보 없음',
      profile: meta.profile || '설명 없음',
      quote: meta.quote || '',
      keywords: meta.keywords || '',
      details: meta.details || '',
      colors: meta.colors || '',
      forbidden: meta.forbidden || '',
      isFeatured: Boolean(admiral?.isFeatured),
      isSessionSelected: Boolean(admiral?.isSessionSelected)
    };
  }

  function buildCodexEntries() {
    const owned = getOwnedAdmirals();
    const ownedMap = new Map(owned.map((item) => [item.name, item]));
    return Object.keys(ADMIRAL_CARD_DATA).map((name) => {
      const ownedData = ownedMap.get(name);
      return buildMergedAdmiral({ ...(ownedData || {}), name, rarity: ownedData?.rarity || ADMIRAL_CARD_DATA[name].rarity, isOwned: Boolean(ownedData) });
    });
  }

  function ensureModal() {
    let modal = document.getElementById('admiralDetailModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'admiralDetailModal';
    modal.className = 'admiral-modal hidden';
    modal.innerHTML = `<div class="admiral-modal-card" id="admiralDetailCard"></div>`;
    modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    document.body.appendChild(modal);
    return modal;
  }

  function ensureShell() {
    const admiralPanel = document.querySelector('[data-lobby-panel="admiral"]');
    if (!admiralPanel) return null;
    if (!document.getElementById('admiralLibraryShell')) {
      const shell = document.createElement('section');
      shell.id = 'admiralLibraryShell';
      shell.className = 'card lobby-room-card';
      shell.innerHTML = `
        <div class="panel-head">
          <div>
            <h3>Admiral Center</h3>
            <p class="hint">영입, 대기실, 도감을 한 곳에서 관리합니다.</p>
          </div>
        </div>
        <div class="admiral-subtabs" id="admiralSubtabs">
          <button type="button" class="admiral-subtab-button active" data-admiral-subtab="recruit">영입</button>
          <button type="button" class="admiral-subtab-button" data-admiral-subtab="lounge">대기실</button>
          <button type="button" class="admiral-subtab-button" data-admiral-subtab="codex">도감</button>
        </div>
        <div class="admiral-subpanel active" data-admiral-subpanel="recruit"></div>
        <div class="admiral-subpanel" data-admiral-subpanel="lounge">
          <div class="admiral-toolbar">
            <input id="admiralLoungeSearch" type="text" placeholder="이름 / 별명 검색">
            <select id="admiralLoungeRarity"><option value="">전체 희귀도</option><option value="Common">Common</option><option value="Rare">Rare</option><option value="Epic">Epic</option><option value="Legendary">Legendary</option></select>
            <select id="admiralLoungeRole"><option value="">전체 역할</option></select>
            <select id="admiralLoungeSort"><option value="rarity">희귀도 우선</option><option value="name">이름순</option></select>
          </div>
          <div id="admiralLoungeView" class="admiral-card-grid"></div>
        </div>
        <div class="admiral-subpanel" data-admiral-subpanel="codex">
          <div class="admiral-toolbar">
            <input id="admiralCodexSearch" type="text" placeholder="도감 검색">
            <select id="admiralCodexRarity"><option value="">전체 희귀도</option><option value="Common">Common</option><option value="Rare">Rare</option><option value="Epic">Epic</option><option value="Legendary">Legendary</option></select>
            <select id="admiralCodexRole"><option value="">전체 역할</option></select>
            <select id="admiralCodexFilter"><option value="all">전체</option><option value="owned">보유만</option><option value="locked">미보유만</option></select>
          </div>
          <div id="admiralCodexView" class="admiral-card-grid"></div>
        </div>
      `;
      admiralPanel.prepend(shell);
      shell.addEventListener('click', (event) => {
        const button = event.target.closest('[data-admiral-subtab]');
        if (!button) return;
        setSubtab(String(button.dataset.admiralSubtab || 'recruit'));
      });
    }

    const recruitCard = qsa('#lobbyPanel .card, #lobbyPanel .lobby-room-card').find((node) => qs('h3', node)?.textContent.trim() === 'Lobby Admirals');
    const recruitPanel = qs('[data-admiral-subpanel="recruit"]');
    if (recruitCard && recruitPanel && recruitCard.parentElement !== recruitPanel) recruitPanel.appendChild(recruitCard);

    bindFilters();
    populateRoleFilters();
    return admiralPanel;
  }

  function populateRoleFilters() {
    const roles = [...new Set(Object.values(ADMIRAL_CARD_DATA).map((item) => item.role).filter(Boolean))].sort();
    ['admiralLoungeRole', 'admiralCodexRole'].forEach((id) => {
      const select = document.getElementById(id);
      if (!select || select.dataset.filled === '1') return;
      roles.forEach((role) => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        select.appendChild(option);
      });
      select.dataset.filled = '1';
    });
  }

  function bindFilters() {
    ['admiralLoungeSearch','admiralLoungeRarity','admiralLoungeRole','admiralLoungeSort','admiralCodexSearch','admiralCodexRarity','admiralCodexRole','admiralCodexFilter'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.bound === '1') return;
      el.addEventListener('input', renderAll);
      el.addEventListener('change', renderAll);
      el.dataset.bound = '1';
    });
  }

  function setSubtab(key) {
    state.subtab = key;
    qsa('.admiral-subtab-button').forEach((button) => button.classList.toggle('active', button.dataset.admiralSubtab === key));
    qsa('.admiral-subpanel').forEach((panel) => panel.classList.toggle('active', panel.dataset.admiralSubpanel === key));
  }

  function filterCards(items, prefix) {
    const search = String(document.getElementById(`${prefix}Search`)?.value || '').trim().toLowerCase();
    const rarity = String(document.getElementById(`${prefix}Rarity`)?.value || '');
    const role = String(document.getElementById(`${prefix}Role`)?.value || '');
    const ownership = prefix === 'admiralCodex' ? String(document.getElementById('admiralCodexFilter')?.value || 'all') : 'all';
    return items.filter((item) => {
      if (search) {
        const hay = `${item.name} ${item.nickname} ${item.role} ${item.effect}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (rarity && item.rarity !== rarity) return false;
      if (role && item.role !== role) return false;
      if (ownership === 'owned' && !item.isOwned) return false;
      if (ownership === 'locked' && item.isOwned) return false;
      return true;
    });
  }

  function sortCards(items, sortKey) {
    const rarityOrder = { Legendary: 0, Epic: 1, Rare: 2, Common: 3 };
    return [...items].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
      const rarityGap = (rarityOrder[a.rarity] ?? 9) - (rarityOrder[b.rarity] ?? 9);
      if (rarityGap !== 0) return rarityGap;
      return a.name.localeCompare(b.name, 'ko');
    });
  }

  function renderCard(item, locked = false) {
    const tags = [];
    if (item.isFeatured) tags.push('<span class="admiral-tag highlight">대표 제독</span>');
    if (item.isSessionSelected) tags.push('<span class="admiral-tag highlight">다음 세션</span>');
    if (item.isOwned && !item.isFeatured && !item.isSessionSelected) tags.push('<span class="admiral-tag">보유</span>');
    if (!item.isOwned) tags.push('<span class="admiral-tag">미보유</span>');
    return `
      <article class="admiral-card ${locked ? 'locked' : ''}" data-admiral-name="${item.name}">
        <div class="admiral-card-header">
          <div>
            <strong>${item.name}</strong>
            <span>${locked ? '???' : item.nickname}</span>
          </div>
          <span class="admiral-rarity ${rarityClass(item.rarity)}">${item.rarity}</span>
        </div>
        <div class="admiral-tags">
          <span class="admiral-tag">${locked ? '미확인 역할' : item.role}</span>
          ${tags.join('')}
        </div>
        <div class="effect">${locked ? '아직 획득하지 못한 제독입니다.' : item.effect}</div>
        <small>${locked ? '도감에서 상세를 확인할 수 없습니다.' : item.profile}</small>
      </article>
    `;
  }

  function renderLounge() {
    const view = document.getElementById('admiralLoungeView');
    if (!view) return;
    const items = sortCards(filterCards(getOwnedAdmirals().map(buildMergedAdmiral).map((item) => ({ ...item, isOwned: true })), 'admiralLounge'), String(document.getElementById('admiralLoungeSort')?.value || 'rarity'));
    if (!items.length) {
      view.innerHTML = '<div class="admiral-empty">아직 보유한 제독이 없습니다. 영입 탭에서 제독을 획득해보세요.</div>';
      return;
    }
    view.innerHTML = items.map((item) => renderCard(item, false)).join('');
    bindCardClicks(view, false);
  }

  function renderCodex() {
    const view = document.getElementById('admiralCodexView');
    if (!view) return;
    const entries = filterCards(buildCodexEntries().map((item) => ({ ...item, isOwned: item.isOwned ?? getOwnedAdmirals().some((owned) => owned.name === item.name) })), 'admiralCodex');
    if (!entries.length) {
      view.innerHTML = '<div class="admiral-empty">조건에 맞는 제독이 없습니다.</div>';
      return;
    }
    view.innerHTML = entries.map((item) => renderCard(item, !item.isOwned)).join('');
    bindCardClicks(view, true);
  }

  function bindCardClicks(root, codexMode) {
    qsa('[data-admiral-name]', root).forEach((node) => {
      if (node.dataset.bound === '1') return;
      node.addEventListener('click', () => openModal(String(node.dataset.admiralName || ''), codexMode));
      node.dataset.bound = '1';
    });
  }

  async function selectFromModal(kind, item) {
    if (!item?.id || typeof window.selectLobbyAdmiral !== 'function') {
      window.setError?.('이 제독은 아직 직접 지정할 수 없습니다.');
      return;
    }
    try {
      await window.selectLobbyAdmiral(kind, Number(item.id));
      closeModal();
      renderAll();
      if (typeof window.loadLobby === 'function') await window.loadLobby();
    } catch (err) {
      if (typeof window.handleAuthError === 'function') window.handleAuthError(err);
      else window.setError?.(err?.message || '제독 지정에 실패했습니다.');
    }
  }

  function openModal(name, codexMode) {
    const modal = ensureModal();
    const card = document.getElementById('admiralDetailCard');
    if (!modal || !card) return;
    const owned = getOwnedAdmirals().find((item) => item.name === name);
    const item = buildMergedAdmiral({ ...(owned || {}), name, rarity: owned?.rarity || ADMIRAL_CARD_DATA[name]?.rarity });
    const locked = codexMode && !owned;
    card.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow">ADMIRAL DETAIL</p>
          <h2>${locked ? '미확인 제독' : item.name}</h2>
        </div>
        <button type="button" id="closeAdmiralDetailButton">닫기</button>
      </div>
      <div class="admiral-modal-grid">
        <div class="admiral-portrait">
          <span class="admiral-rarity ${rarityClass(item.rarity)}">${item.rarity}</span>
          <div class="name">${locked ? '???' : item.name}</div>
          <div class="hint">${locked ? '획득 후 상세가 공개됩니다.' : `${item.nickname} · ${item.role}`}</div>
        </div>
        <div class="admiral-info-list">
          <div class="admiral-info-line"><strong>핵심 효과</strong><span>${locked ? '미확인' : item.effect}</span></div>
          <div class="admiral-info-line"><strong>성격 / 설정</strong><span>${locked ? '미확인' : item.profile}</span></div>
          <div class="admiral-info-line"><strong>대표 대사</strong><span>${locked ? '미확인' : item.quote}</span></div>
          <div class="admiral-info-line"><strong>일러스트 키워드</strong><span>${locked ? '미확인' : item.keywords}</span></div>
          <div class="admiral-info-line"><strong>외형 디테일</strong><span>${locked ? '미확인' : item.details}</span></div>
          <div class="admiral-info-line"><strong>색상 포인트</strong><span>${locked ? '미확인' : item.colors}</span></div>
          <div class="admiral-info-line"><strong>금지 요소</strong><span>${locked ? '미확인' : item.forbidden}</span></div>
        </div>
      </div>
      ${locked ? '<div class="admiral-empty" style="margin-top:14px;">도감의 미보유 제독은 이름과 역할 일부만 공개하고, 나머지는 획득 후 열리도록 구성했습니다.</div>' : `<div class="button-row" style="margin-top:14px;"><button type="button" data-detail-action="featured" ${item.isFeatured ? 'disabled' : ''}>대표 제독으로 지정</button><button type="button" data-detail-action="session" ${item.isSessionSelected ? 'disabled' : ''}>다음 세션 제독으로 지정</button><button type="button" data-detail-action="recruit">한 번 더 영입</button></div>`}
    `;
    card.querySelector('#closeAdmiralDetailButton')?.addEventListener('click', closeModal);
    card.querySelector('[data-detail-action="recruit"]')?.addEventListener('click', () => {
      closeModal();
      document.querySelector('[data-admiral-subtab="recruit"]')?.click();
      document.getElementById('lobbyRecruitPremiumButton')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    card.querySelector('[data-detail-action="featured"]')?.addEventListener('click', () => selectFromModal('featured', item));
    card.querySelector('[data-detail-action="session"]')?.addEventListener('click', () => selectFromModal('session', item));
    modal.classList.remove('hidden');
    state.modalOpen = true;
  }

  function closeModal() {
    const modal = document.getElementById('admiralDetailModal');
    const card = document.getElementById('admiralDetailCard');
    if (card) card.innerHTML = '';
    if (modal) {
      modal.classList.add('hidden');
      modal.remove();
    }
    state.modalOpen = false;
  }

  function renderAll() {
    ensureShell();
    renderLounge();
    renderCodex();
  }

  function wrap(name, handler) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = handler(original);
  }

  function installHooks() {
    wrap('renderLobbyAdmirals', (original) => function (...args) { const result = original.apply(this, args); renderAll(); return result; });
    wrap('renderLobby', (original) => function (...args) { const result = original.apply(this, args); renderAll(); return result; });
    wrap('showLobby', (original) => function (...args) { const result = original.apply(this, args); setTimeout(renderAll, 60); return result; });
    wrap('loadLobby', (original) => async function (...args) { const result = await original.apply(this, args); renderAll(); return result; });
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    ensureShell();
    installHooks();
    renderAll();
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.modalOpen) closeModal(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
