const admiralCatalog = [
  { name: '카이로 벤', rarity: 'Common', nickname: '도망자', role: '기동', summary: '이동속도 +10%, 후퇴 성공률 +5%', combatBonus: 0.06, resourceBonus: 0.05, costBonus: 0.03 },
  { name: '마야 렌', rarity: 'Common', nickname: '패치워크', role: '정비 / 복구', summary: '전투 종료 후 수리 효율 +15%', combatBonus: 0.05, resourceBonus: 0.04, costBonus: 0.06 },
  { name: '드릭 할버', rarity: 'Common', nickname: '퍼스트 샷', role: '선제타격', summary: '첫 공격 피해 +15%', combatBonus: 0.09, resourceBonus: 0.03, costBonus: 0.02 },
  { name: '오르한 제크', rarity: 'Common', nickname: '방벽', role: '초반 방어', summary: '전투 시작 2틱 동안 받는 피해 -10%', combatBonus: 0.07, resourceBonus: 0.02, costBonus: 0.04 },
  { name: '리오 칸', rarity: 'Common', nickname: '쿼터마스터', role: '보급', summary: '유지비 -10%', combatBonus: 0.04, resourceBonus: 0.06, costBonus: 0.06 },
  { name: '세라 노바', rarity: 'Common', nickname: '핀포인트', role: '타겟팅', summary: '후열 타겟 확률 +10%', combatBonus: 0.08, resourceBonus: 0.03, costBonus: 0.03 },
  { name: '베일 헥스', rarity: 'Common', nickname: '고스트 스텝', role: '회피', summary: '첫 2회 공격 회피 확률 +15%', combatBonus: 0.07, resourceBonus: 0.04, costBonus: 0.03 },
  { name: '에단 루크', rarity: 'Common', nickname: '리커버리', role: '손상 복구', summary: '중파 상태 함선 수리 속도 +20%', combatBonus: 0.05, resourceBonus: 0.05, costBonus: 0.04 },
  { name: '아이리스 발렌', rarity: 'Rare', nickname: '스카이체이서', role: '함대 기동', summary: '전체 함대 속도 +8%, 후퇴 시 피해 감소', combatBonus: 0.11, resourceBonus: 0.07, costBonus: 0.05 },
  { name: '로크 하딘', rarity: 'Rare', nickname: '스카이가드', role: '방공', summary: '대공포 요격률 +10%', combatBonus: 0.12, resourceBonus: 0.04, costBonus: 0.05 },
  { name: '칼릭 스트론', rarity: 'Rare', nickname: '브로드사이드', role: '포격', summary: '무기 쿨다운 -10%', combatBonus: 0.13, resourceBonus: 0.04, costBonus: 0.04 },
  { name: '브론 카쉬', rarity: 'Rare', nickname: '아이언월', role: '장갑', summary: '장갑 계열 효과 +15%', combatBonus: 0.12, resourceBonus: 0.03, costBonus: 0.06 },
  { name: '린 세이', rarity: 'Rare', nickname: '블루헤이븐', role: '실드', summary: '실드 재생량 +20%', combatBonus: 0.11, resourceBonus: 0.05, costBonus: 0.05 },
  { name: '제로스', rarity: 'Rare', nickname: '락온', role: '정밀 타격', summary: '타겟팅 시스템 효과 +20%', combatBonus: 0.14, resourceBonus: 0.03, costBonus: 0.04 },
  { name: '헤일 벡터', rarity: 'Rare', nickname: '플럭스', role: '지원 / 전력', summary: '전력 초과 직전 안정성 증가', combatBonus: 0.10, resourceBonus: 0.07, costBonus: 0.05 },
  { name: '유나 미르', rarity: 'Rare', nickname: '스틸멜로디', role: '장기전 지원', summary: '수리 드론/지원 유틸 효율 증가', combatBonus: 0.10, resourceBonus: 0.08, costBonus: 0.04 },
  { name: '토르 벡센', rarity: 'Rare', nickname: '애프터버너', role: '추격 / 마무리', summary: '후퇴 준비 중 대상 피해 +15%', combatBonus: 0.15, resourceBonus: 0.03, costBonus: 0.04 },
  { name: '엘라 시렌', rarity: 'Rare', nickname: '웨이크콜', role: '정찰 / 시야', summary: '이벤트/거점 정보 노출 속도 증가', combatBonus: 0.09, resourceBonus: 0.09, costBonus: 0.04 },
  { name: '마렉 둔', rarity: 'Rare', nickname: '스톤앵커', role: '점령 / 방어', summary: '점령 중 받는 피해 감소', combatBonus: 0.12, resourceBonus: 0.05, costBonus: 0.05 },
  { name: '아스트라 벨', rarity: 'Epic', nickname: '스카이퀸', role: '항공전', summary: '항공단 출격 쿨다운 -15%', combatBonus: 0.18, resourceBonus: 0.07, costBonus: 0.07 },
  { name: '네메시스', rarity: 'Epic', nickname: '노이즈', role: '전자전', summary: 'ECM 효과 +25%', combatBonus: 0.17, resourceBonus: 0.09, costBonus: 0.07 },
  { name: '바르칸', rarity: 'Epic', nickname: '브레이커', role: '돌파', summary: '전열 대상 피해 +15%', combatBonus: 0.20, resourceBonus: 0.05, costBonus: 0.06 },
  { name: '그라비온', rarity: 'Epic', nickname: '폴다운', role: '철벽', summary: '피해 누적 임계치 +20%', combatBonus: 0.18, resourceBonus: 0.06, costBonus: 0.08 },
  { name: '라에나 크로우', rarity: 'Epic', nickname: '하프라이트', role: '구조 / 생존', summary: '대파 직전 함선 생존 보정', combatBonus: 0.16, resourceBonus: 0.10, costBonus: 0.07 },
  { name: '제이든 프록스', rarity: 'Epic', nickname: '그레이티드', role: '경제 / 생산', summary: '생산 큐 효율 증가', combatBonus: 0.14, resourceBonus: 0.14, costBonus: 0.08 },
  { name: '실바 케인', rarity: 'Epic', nickname: '블랙프레임', role: '저격 / 고정밀', summary: '후열 직접 타격 효율 증가', combatBonus: 0.21, resourceBonus: 0.04, costBonus: 0.06 },
  { name: '오메가 타이탄', rarity: 'Legendary', nickname: '센터폴', role: '타이탄 지원', summary: '타이탄 주변 함대 피해 +10%', combatBonus: 0.24, resourceBonus: 0.08, costBonus: 0.09 },
  { name: '노바 팬텀', rarity: 'Legendary', nickname: '이클립스', role: '초반 지배', summary: '첫 3틱 적 명중률 -20%', combatBonus: 0.26, resourceBonus: 0.06, costBonus: 0.08 },
  { name: '루시안 베가', rarity: 'Legendary', nickname: '파운드리 킹', role: '산업 / 장기전', summary: '세션 중반 이후 생산 효율 증가', combatBonus: 0.18, resourceBonus: 0.18, costBonus: 0.10 },
  { name: '에코 라일', rarity: 'Legendary', nickname: '클러스터', role: '함대 연계', summary: '다중 함대 동시 교전 지원 효과 상승', combatBonus: 0.25, resourceBonus: 0.07, costBonus: 0.09 }
];

const lobbyRecruitTypes = {
  normal: { key: 'normal', name: '일반 영입', costCredit: 100, chances: { Common: 0.68, Rare: 0.25, Epic: 0.06, Legendary: 0.01 } },
  premium: { key: 'premium', name: '고급 영입', costCredit: 300, chances: { Common: 0.35, Rare: 0.40, Epic: 0.20, Legendary: 0.05 } }
};

module.exports = {
  admiralCatalog,
  lobbyRecruitTypes
};
