const path = require("path");
const fs = require("fs");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ADMIN_PANEL_PASS = process.env.ADMIN_PANEL_PASS || "0305";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "game.db");

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

app.use(cors({
  origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database(DB_PATH);
let passwordColumn = "password_hash";

const SHIPS = {
  corvette: {
    name: "\ucd08\uacc4\ud568",
    cost: { metal: 120, fuel: 40 },
    attack: 8,
    hp: 18,
    speed: 9,
    targetPriority: ["corvette", "destroyer", "cruiser", "battleship", "carrier"]
  },
  destroyer: {
    name: "\uad6c\ucd95\ud568",
    cost: { metal: 300, fuel: 120 },
    attack: 22,
    hp: 48,
    speed: 7,
    targetPriority: ["corvette", "destroyer", "cruiser", "carrier", "battleship"]
  },
  cruiser: {
    name: "\uc21c\uc591\ud568",
    cost: { metal: 700, fuel: 260 },
    attack: 46,
    hp: 115,
    speed: 5,
    targetPriority: ["destroyer", "cruiser", "battleship", "carrier", "corvette"]
  },
  battleship: {
    name: "\uc804\ud568",
    cost: { metal: 1500, fuel: 700 },
    attack: 110,
    hp: 320,
    speed: 3,
    targetPriority: ["cruiser", "battleship", "carrier", "destroyer", "corvette"]
  },
  carrier: {
    name: "\ud56d\uacf5\ubaa8\ud568",
    cost: { metal: 2200, fuel: 1100 },
    attack: 150,
    hp: 260,
    speed: 2,
    targetPriority: ["battleship", "cruiser", "destroyer", "carrier", "corvette"]
  }
};

const SHIP_TYPES = Object.keys(SHIPS);
const FLEET_COLUMNS = SHIP_TYPES.join(", ");
const BASE_PRODUCTION = { metal: 2, fuel: 1 };
const BASE_MOVE_FUEL_PER_DISTANCE = 120;
const MAP_MAX_X = 2000;
const MAP_MAX_Y = 2000;
const MAP_DISTANCE_UNIT = 20;
const SPEEDUP_RESOURCE_PER_SECOND = 100;
const ZONE_TARGET_POWER_BY_LEVEL = {
  1: 500,
  2: 3000,
  3: 12000,
  4: 28000,
  5: 50000
};

const DEFAULT_ZONES = [
  {
    id: 1,
    name: "\uc678\uacfd \uc18c\ud589\uc131 \uad11\uc0b0",
    description: "\uae08\uc18d \uc0dd\uc0b0\uc5d0 \uac15\uc810\uc774 \uc788\ub294 \uc911\ub9bd \ucc44\uad74\uc9c0",
    level: 1,
    x: 320,
    y: 1160,
    metalRate: 9,
    fuelRate: 3,
    recommendedPower: 900,
    garrison: { corvette: 28, destroyer: 6, cruiser: 1, battleship: 0, carrier: 0 }
  },
  {
    id: 2,
    name: "\uc5f0\ub8cc \uc131\uc6b4 \ucd94\ucd9c\uc18c",
    description: "\uc5f0\ub8cc \uc0dd\uc0b0\uc744 \ub298\ub9ac\ub294 \uc131\uc6b4 \uac70\uc810",
    level: 1,
    x: 560,
    y: 620,
    metalRate: 4,
    fuelRate: 10,
    recommendedPower: 1300,
    garrison: { corvette: 36, destroyer: 8, cruiser: 1, battleship: 0, carrier: 0 }
  },
  {
    id: 3,
    name: "\ud3d0\ud5c8\ud654\ub41c \uae30\uc9c0 \ud3ec\ud2b8",
    description: "\uae08\uc18d\uacfc \uc5f0\ub8cc\ub97c \uade0\ud615 \uc788\uac8c \uc0dd\uc0b0\ud558\ub294 \uc804\ucd08 \uae30\uc9c0",
    level: 2,
    x: 860,
    y: 1280,
    metalRate: 8,
    fuelRate: 8,
    recommendedPower: 4200,
    garrison: { corvette: 82, destroyer: 28, cruiser: 8, battleship: 1, carrier: 0 }
  },
  {
    id: 4,
    name: "\uc774\uc628 \ud30c\ud3b8\ub300",
    description: "\ub0ae\uc740 \uc704\ud5d8\ub3c4\uc758 \uae08\uc18d \uc794\ud574 \uc9c0\ub300",
    level: 2,
    x: 1100,
    y: 480,
    metalRate: 12,
    fuelRate: 5,
    recommendedPower: 6500,
    garrison: { corvette: 104, destroyer: 36, cruiser: 12, battleship: 2, carrier: 0 }
  },
  {
    id: 5,
    name: "\uc544\ub974\uace4 \ub9ac\ud504\ud2b8",
    description: "\uc5f0\ub8cc \uc0dd\uc0b0\uc774 \ub192\uc740 \uc131\uac04 \uae30\ub958 \uad6c\uc5ed",
    level: 3,
    x: 1240,
    y: 1460,
    metalRate: 6,
    fuelRate: 16,
    recommendedPower: 12000,
    garrison: { corvette: 160, destroyer: 56, cruiser: 20, battleship: 5, carrier: 1 }
  },
  {
    id: 6,
    name: "\ud669\ud3d0\ud55c \uae30\uacc4 \uc870\uc120\uc18c",
    description: "\uace0\uae09 \ud568\uc120 \uc0dd\uc0b0\uc758 \ubc1c\ud310\uc774 \ub418\ub294 \uc911\uc559 \uacf5\uc5c5 \uac70\uc810",
    level: 3,
    x: 1480,
    y: 840,
    metalRate: 16,
    fuelRate: 11,
    recommendedPower: 17000,
    garrison: { corvette: 210, destroyer: 78, cruiser: 30, battleship: 8, carrier: 2 }
  },
  {
    id: 7,
    name: "\uac80\uc740 \ub9ac\uc544 \uad00\ubb38",
    description: "\uace0\uc704\ud5d8 \uacf5\uac04 \uad00\ubb38. \ubc29\uc5b4 \ud568\ub300\uac00 \ub450\ud130\uc6b4 \uad6c\uc5ed",
    level: 4,
    x: 1680,
    y: 360,
    metalRate: 24,
    fuelRate: 14,
    recommendedPower: 28000,
    garrison: { corvette: 290, destroyer: 120, cruiser: 48, battleship: 14, carrier: 4 }
  },
  {
    id: 8,
    name: "\uc720\ub839 \uc131\ucc44",
    description: "\ubc84\ub824\uc9c4 \ud558\uc774\ube0c \ubc29\uc5b4\uc120. \ub300\ud615 \ubcf4\uc0c1\uc744 \uc81c\uacf5",
    level: 4,
    x: 1760,
    y: 1340,
    metalRate: 15,
    fuelRate: 23,
    recommendedPower: 36000,
    garrison: { corvette: 350, destroyer: 150, cruiser: 64, battleship: 18, carrier: 5 }
  },
  {
    id: 9,
    name: "\uc624\ub9ac\uc628 \uc911\ucd94 \uc2a4\ud14c\uc774\uc158",
    description: "\uc131\uacc4 \ud655\uc7a5\uc758 \ud575\uc2ec \ucd95. \ub9e4\uc6b0 \uac15\ub825\ud55c \uc8fc\ub454\uad70\uc774 \uc788\uc74c",
    level: 5,
    x: 1900,
    y: 920,
    metalRate: 28,
    fuelRate: 28,
    recommendedPower: 52000,
    garrison: { corvette: 430, destroyer: 190, cruiser: 86, battleship: 26, carrier: 8 }
  }
];

function pseudoRandomUnit(seed, salt) {
  const x = Math.sin((seed + 1) * 12.9898 + salt * 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function baseShipPower(type) {
  const ship = SHIPS[type];
  if (!ship) return 1;
  const defense = Math.floor(Number(ship.hp || 0) / 8);
  return Number(ship.attack || 0) + defense * 0.45 + Number(ship.hp || 0) * 0.12;
}

function targetZonePower(level, spreadA, spreadB) {
  const base = Number(ZONE_TARGET_POWER_BY_LEVEL[level] || ZONE_TARGET_POWER_BY_LEVEL[1]);
  const variance = 0.82 + ((Number(spreadA || 0) + Number(spreadB || 0)) / 2) * 0.36;
  return Math.max(200, Math.round(base * variance));
}

function createZoneGarrison(level, targetPower, spreadA, spreadB) {
  const allowedByLevel = {
    1: ["corvette", "destroyer"],
    2: ["corvette", "destroyer"],
    3: ["corvette", "destroyer", "cruiser"],
    4: ["corvette", "destroyer", "cruiser", "battleship"],
    5: ["corvette", "destroyer", "cruiser", "battleship", "carrier"]
  };
  const allowed = allowedByLevel[level] || allowedByLevel[1];
  const profileByLevel = {
    1: { corvette: 0.88, destroyer: 0.12, cruiser: 0, battleship: 0, carrier: 0 },
    2: { corvette: 0.7, destroyer: 0.3, cruiser: 0, battleship: 0, carrier: 0 },
    3: { corvette: 0.45, destroyer: 0.38, cruiser: 0.17, battleship: 0, carrier: 0 },
    4: { corvette: 0.28, destroyer: 0.36, cruiser: 0.24, battleship: 0.12, carrier: 0 },
    5: { corvette: 0.16, destroyer: 0.28, cruiser: 0.27, battleship: 0.18, carrier: 0.11 }
  };
  const profile = profileByLevel[level] || profileByLevel[1];
  const spread = (Number(spreadA || 0) - 0.5) * 0.1;

  const garrison = { corvette: 0, destroyer: 0, cruiser: 0, battleship: 0, carrier: 0 };
  for (const type of allowed) {
    const shipPower = baseShipPower(type);
    const share = Math.max(0.02, Number(profile[type] || 0) + spread);
    garrison[type] = Math.max(0, Math.floor((targetPower * share) / Math.max(1, shipPower)));
  }

  let currentPower = 0;
  for (const type of SHIP_TYPES) {
    currentPower += garrison[type] * baseShipPower(type);
  }
  const deficit = Math.max(0, targetPower - currentPower);
  if (deficit > 0) {
    garrison.corvette += Math.max(1, Math.ceil(deficit / baseShipPower("corvette")));
  }

  return garrison;
}

function buildZoneCombatProfile(zoneId, level) {
  const spreadA = pseudoRandomUnit(zoneId, 47);
  const spreadB = pseudoRandomUnit(zoneId, 71);
  const power = targetZonePower(level, spreadA, spreadB);
  return {
    recommendedPower: power,
    garrison: createZoneGarrison(level, power, spreadA, spreadB)
  };
}

for (let id = 10; id <= 620; id += 1) {
  const level = Math.min(5, Math.floor((id - 10) / 122) + 1);
  const x = 20 + Math.floor(pseudoRandomUnit(id, 11) * (MAP_MAX_X - 40));
  const y = 20 + Math.floor(pseudoRandomUnit(id, 29) * (MAP_MAX_Y - 40));
  const spreadA = pseudoRandomUnit(id, 47);
  const spreadB = pseudoRandomUnit(id, 71);
  const combat = buildZoneCombatProfile(id, level);
  DEFAULT_ZONES.push({
    id,
    name: `\uc12d\ud130 ${id} \uc804\ucd08 \uac70\uc810`,
    description: `Lv.${level} \uc911\ub9bd \uc790\uc6d0 \uac70\uc810. \uc131\uacc4 \ud655\uc7a5\uc744 \uc704\ud55c \uc810\ub839 \ubaa9\ud45c\uc785\ub2c8\ub2e4.`,
    level,
    x,
    y,
    metalRate: 6 + level * 8 + Math.floor(spreadA * (10 + level * 8)),
    fuelRate: 5 + level * 7 + Math.floor(spreadB * (10 + level * 8)),
    recommendedPower: combat.recommendedPower,
    garrison: combat.garrison
  });
}

for (const zone of DEFAULT_ZONES) {
  const combat = buildZoneCombatProfile(zone.id, Number(zone.level || 1));
  zone.recommendedPower = combat.recommendedPower;
  zone.garrison = combat.garrison;
}

const RESEARCH = {
  resource: {
    name: "\uc790\uc6d0 \uac1c\ubc1c",
    description: "\uae30\uc9c0\uc640 \uc810\ub839\uc9c0\uc758 \uc790\uc6d0 \uc0dd\uc0b0\ub7c9\uc744 \ub298\ub9bd\ub2c8\ub2e4.",
    metalCost: 1400,
    fuelCost: 700,
    metalGrowth: 1.9,
    fuelGrowth: 1.82,
    effectPerLevel: 0.05
  },
  logistics: {
    name: "\ubcf4\uae09 \ucd5c\uc801\ud654",
    description: "\ud568\uc120 \uc0dd\uc0b0 \uc790\uc6d0 \uc18c\ube44\ub97c \uc904\uc785\ub2c8\ub2e4.",
    metalCost: 1300,
    fuelCost: 840,
    metalGrowth: 1.88,
    fuelGrowth: 1.85,
    effectPerLevel: 0.03
  },
  tactics: {
    name: "\ud568\ub300 \uc804\uc220",
    description: "\uc804\ud22c \uc2dc \uc544\uad70 \ud568\ub300\uc758 \uacf5\uaca9\ub825\uc744 \ub298\ub9bd\ub2c8\ub2e4.",
    metalCost: 1700,
    fuelCost: 980,
    metalGrowth: 1.92,
    fuelGrowth: 1.86,
    effectPerLevel: 0.07
  }
};

const TECH_TREE_NODES = [
  { key: "engine_1", name: "엔진 I", tier: 1, category: "engine", description: "기초 추진 제어. 함대 이동 보너스 +8%", metalCost: 1800, fuelCost: 900, researchTime: 600, requires: [], exclusiveGroup: "", effectType: "buff_movement_pct", effectValue: 0.08 },
  { key: "armor_1", name: "장갑 I", tier: 1, category: "defense", description: "기초 장갑학. 함대 방어 보너스 +8%", metalCost: 1800, fuelCost: 900, researchTime: 600, requires: [], exclusiveGroup: "", effectType: "buff_defense_pct", effectValue: 0.08 },
  { key: "industry_1", name: "채굴 I", tier: 1, category: "industry", description: "기초 산업학. 자원 생산 +10%", metalCost: 1700, fuelCost: 800, researchTime: 600, requires: [], exclusiveGroup: "", effectType: "buff_resource_pct", effectValue: 0.1 },

  { key: "engine_overdrive", name: "고출력 엔진", tier: 2, category: "engine", description: "속도 강화, 연료 효율 저하. 이동 +15%", metalCost: 3600, fuelCost: 1900, researchTime: 1200, requires: ["engine_1"], exclusiveGroup: "engine_t2", effectType: "buff_movement_pct", effectValue: 0.15 },
  { key: "engine_efficiency", name: "효율 엔진", tier: 2, category: "engine", description: "연료 효율 향상. 이동 +6%, 생산 연료비 절감", metalCost: 3400, fuelCost: 1700, researchTime: 1200, requires: ["engine_1"], exclusiveGroup: "engine_t2", effectType: "buff_build_cost_pct", effectValue: 0.06 },
  { key: "armor_fort", name: "강화 장갑", tier: 2, category: "defense", description: "방어 교리 확장. 방어 +14%", metalCost: 3800, fuelCost: 1800, researchTime: 1200, requires: ["armor_1"], exclusiveGroup: "defense_t2", effectType: "buff_defense_pct", effectValue: 0.14 },
  { key: "shield_system", name: "실드 시스템", tier: 2, category: "defense", description: "실드 기반 방어체계. 체력/방어 계열 강화", metalCost: 3800, fuelCost: 2100, researchTime: 1200, requires: ["armor_1"], exclusiveGroup: "defense_t2", effectType: "unlock_component", effectValue: 0, unlockKey: "shield_generator" },

  { key: "doctrine_intercept", name: "요격 교리", tier: 3, category: "tactics", description: "기동전술 심화. 전투 +12%, 요격함급 해금", metalCost: 6200, fuelCost: 3400, researchTime: 2200, requires: ["engine_overdrive"], exclusiveGroup: "doctrine_t3", effectType: "unlock_hull", effectValue: 0, unlockKey: "destroyer" },
  { key: "doctrine_mobility", name: "기동전 교리", tier: 3, category: "tactics", description: "선제 기동 강화. 이동 +18%, 전투 +6%", metalCost: 6200, fuelCost: 3400, researchTime: 2200, requires: ["engine_efficiency"], exclusiveGroup: "doctrine_t3", effectType: "buff_movement_pct", effectValue: 0.18 },
  { key: "doctrine_siege", name: "공성 교리", tier: 3, category: "weapon", description: "중화력 교리. 전투 +16%, 전함급 해금", metalCost: 7000, fuelCost: 4200, researchTime: 2400, requires: ["armor_fort"], exclusiveGroup: "siege_t3", effectType: "unlock_hull", effectValue: 0, unlockKey: "battleship" },
  { key: "doctrine_guard", name: "방어 교리", tier: 3, category: "defense", description: "방어 특화. 방어 +20%, 기지 방어 강화", metalCost: 6800, fuelCost: 3900, researchTime: 2400, requires: ["shield_system"], exclusiveGroup: "siege_t3", effectType: "buff_defense_pct", effectValue: 0.2 },

  { key: "unlock_monitor", name: "모니터함 설계", tier: 4, category: "special", description: "특화 방어 함급 모니터 해금", metalCost: 11000, fuelCost: 6800, researchTime: 3600, requires: ["doctrine_siege"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "monitor" },
  { key: "advanced_shield_module", name: "고급 실드 모듈", tier: 4, category: "special", description: "고급 실드 계열 모듈 해금", metalCost: 10400, fuelCost: 7200, researchTime: 3600, requires: ["doctrine_guard"], exclusiveGroup: "", effectType: "unlock_component", effectValue: 0, unlockKey: "adaptive_barrier" },
  { key: "unlock_carrier", name: "항공모함 운용", tier: 4, category: "special", description: "항공모함 선체 해금", metalCost: 12000, fuelCost: 8200, researchTime: 3800, requires: ["doctrine_intercept"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "carrier" },
  { key: "unlock_dreadnought", name: "드레드노트 공학", tier: 4, category: "special", description: "드레드노트 선체 해금", metalCost: 14500, fuelCost: 9800, researchTime: 4200, requires: ["doctrine_siege"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "dreadnought" },
  { key: "unlock_titan", name: "타이탄 프로젝트", tier: 4, category: "special", description: "타이탄 선체 해금", metalCost: 18000, fuelCost: 13000, researchTime: 5200, requires: ["unlock_dreadnought"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "titan" }
];

const ACTIVE_TECH_TREE_NODES = [
  { key: "engine_1", name: "엔진 I", tier: 1, category: "engine", description: "기본 추진 최적화. 이동 +8%", metalCost: 1800, fuelCost: 900, researchTime: 600, requires: [], exclusiveGroup: "", effectType: "buff_movement_pct", effectValue: 0.08 },
  { key: "armor_1", name: "장갑 I", tier: 1, category: "defense", description: "기본 선체 안정화. 방어 +8%", metalCost: 1800, fuelCost: 900, researchTime: 600, requires: [], exclusiveGroup: "", effectType: "buff_defense_pct", effectValue: 0.08 },
  { key: "industry_1", name: "산업 I", tier: 1, category: "industry", description: "기지 자동화 공정. 자원 +10%", metalCost: 1700, fuelCost: 800, researchTime: 600, requires: [], exclusiveGroup: "", effectType: "buff_resource_pct", effectValue: 0.1 },
  { key: "rail_mk2", name: "레일건 개량", tier: 1, category: "weapon", description: "중형 레일 계열 해금", metalCost: 2000, fuelCost: 950, researchTime: 680, requires: [], exclusiveGroup: "", effectType: "unlock_component", effectValue: 0, unlockKey: "gauss_battery" },
  { key: "engine_overdrive", name: "고출력 엔진", tier: 2, category: "engine", description: "순항 속도 강화. 이동 +15%", metalCost: 3600, fuelCost: 1900, researchTime: 1200, requires: ["engine_1"], exclusiveGroup: "engine_t2", effectType: "buff_movement_pct", effectValue: 0.15 },
  { key: "engine_efficiency", name: "효율 엔진", tier: 2, category: "engine", description: "연료 소모 절감. 생산 연료비 절감", metalCost: 3400, fuelCost: 1700, researchTime: 1200, requires: ["engine_1"], exclusiveGroup: "engine_t2", effectType: "buff_build_cost_pct", effectValue: 0.06 },
  { key: "armor_fort", name: "강화 장갑", tier: 2, category: "defense", description: "중장갑 운용 교리. 방어 +14%", metalCost: 3800, fuelCost: 1800, researchTime: 1200, requires: ["armor_1"], exclusiveGroup: "defense_t2", effectType: "buff_defense_pct", effectValue: 0.14 },
  { key: "shield_system", name: "실드 시스템", tier: 2, category: "defense", description: "실드 제어 기술. 실드 발생기 해금", metalCost: 3800, fuelCost: 2100, researchTime: 1200, requires: ["armor_1"], exclusiveGroup: "defense_t2", effectType: "unlock_component", effectValue: 0, unlockKey: "shield_generator" },
  { key: "destroyer_blueprint", name: "구축함 설계", tier: 2, category: "hull", description: "구축함 선체 해금", metalCost: 3900, fuelCost: 2200, researchTime: 1400, requires: ["rail_mk2"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "destroyer" },
  { key: "cruiser_command", name: "순양함 지휘", tier: 3, category: "hull", description: "순양함 선체 해금", metalCost: 6200, fuelCost: 3600, researchTime: 2200, requires: ["destroyer_blueprint"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "cruiser" },
  { key: "tactical_computer", name: "전술 컴퓨터", tier: 3, category: "utility", description: "고급 전술 지원 모듈 해금", metalCost: 5800, fuelCost: 3300, researchTime: 2100, requires: ["engine_overdrive"], exclusiveGroup: "utility_t3", effectType: "unlock_component", effectValue: 0, unlockKey: "battle_computer" },
  { key: "reactor_control", name: "원자로 제어", tier: 3, category: "utility", description: "전력 확장 모듈 해금", metalCost: 5900, fuelCost: 3400, researchTime: 2100, requires: ["engine_efficiency"], exclusiveGroup: "utility_t3", effectType: "unlock_component", effectValue: 0, unlockKey: "reactor_boost" },
  { key: "doctrine_siege", name: "공성 교리", tier: 3, category: "weapon", description: "중화력 운용. 전투 +16%", metalCost: 7000, fuelCost: 4200, researchTime: 2400, requires: ["armor_fort"], exclusiveGroup: "siege_t3", effectType: "buff_combat_pct", effectValue: 0.16 },
  { key: "doctrine_guard", name: "방어 교리", tier: 3, category: "defense", description: "지구전 특화. 방어 +20%", metalCost: 6800, fuelCost: 3900, researchTime: 2400, requires: ["shield_system"], exclusiveGroup: "siege_t3", effectType: "buff_defense_pct", effectValue: 0.2 },
  { key: "unlock_monitor", name: "모니터함 설계", tier: 4, category: "special", description: "방어 특화 모니터함 해금", metalCost: 11000, fuelCost: 6800, researchTime: 3600, requires: ["doctrine_guard"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "monitor" },
  { key: "unlock_battleship", name: "전함 공학", tier: 4, category: "special", description: "전함 선체 해금", metalCost: 12000, fuelCost: 7600, researchTime: 3800, requires: ["doctrine_siege", "cruiser_command"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "battleship" },
  { key: "unlock_carrier", name: "항공모함 운용", tier: 4, category: "special", description: "항공모함 선체 해금", metalCost: 12000, fuelCost: 8200, researchTime: 3800, requires: ["tactical_computer", "cruiser_command"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "carrier" },
  { key: "unlock_dreadnought", name: "드레드노트 공학", tier: 4, category: "special", description: "드레드노트 선체 해금", metalCost: 14500, fuelCost: 9800, researchTime: 4200, requires: ["unlock_battleship"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "dreadnought" },
  { key: "unlock_titan", name: "타이탄 프로젝트", tier: 4, category: "special", description: "타이탄 선체 해금", metalCost: 18000, fuelCost: 13000, researchTime: 5200, requires: ["unlock_dreadnought"], exclusiveGroup: "", effectType: "unlock_hull", effectValue: 0, unlockKey: "titan" },
  { key: "advanced_shield_module", name: "고급 실드 모듈", tier: 4, category: "special", description: "적응성 바리어 해금", metalCost: 10400, fuelCost: 7200, researchTime: 3600, requires: ["doctrine_guard"], exclusiveGroup: "", effectType: "unlock_component", effectValue: 0, unlockKey: "adaptive_barrier" },
  { key: "siege_artillery_suite", name: "공성 병기 통합", tier: 4, category: "special", description: "시즈 포병 해금", metalCost: 9800, fuelCost: 6400, researchTime: 3500, requires: ["doctrine_siege"], exclusiveGroup: "", effectType: "unlock_component", effectValue: 0, unlockKey: "siege_artillery" }
];

const POLICY_LOCK_MS = 30 * 60 * 1000;
const DEFAULT_POLICY_SELECTION = { economy: "civilian", industry: "infrastructure", military: "defense" };
const STRATEGIC_POLICIES = {
  economy: [
    { key: "wartime", name: "전시경제", description: "생산 자원 소모 감소, 자원 획득 감소", effects: { buildCostPct: 0.18, resourcePct: -0.08, combatPct: 0.05 } },
    { key: "civilian", name: "민간경제", description: "자원 획득 증가, 생산 비용 증가", effects: { resourcePct: 0.18, buildCostPct: -0.05 } },
    { key: "balanced", name: "균형경제", description: "균형형 성장", effects: { resourcePct: 0.08, buildCostPct: 0.04 } }
  ],
  industry: [
    { key: "mobilization", name: "총동원", description: "이동 속도 및 전투 상승, 자원 획득 감소", effects: { movementPct: 0.14, combatPct: 0.06, resourcePct: -0.06 } },
    { key: "infrastructure", name: "인프라 투자", description: "자원/이동 균형 강화", effects: { resourcePct: 0.09, movementPct: 0.06 } },
    { key: "fortress", name: "요새화", description: "전투/방어 강화, 이동 감소", effects: { combatPct: 0.12, defensePct: 0.08, movementPct: -0.05 } }
  ],
  military: [
    { key: "assault", name: "공세교리", description: "공격력 중심 운용", effects: { combatPct: 0.16, movementPct: 0.03, buildCostPct: -0.03 } },
    { key: "defense", name: "방어교리", description: "안정형 운용", effects: { combatPct: 0.08, defensePct: 0.1 } },
    { key: "logistics", name: "기동교리", description: "이동/보급 중심 운용", effects: { movementPct: 0.18, resourcePct: 0.03, combatPct: -0.05 } }
  ]
};

const TECH_NODE_KEY_OVERRIDES = {
  unlock_monitor: {
    tier: 5,
    requires: ["doctrine_guard", "cruiser_command"],
    metalCost: 21000,
    fuelCost: 12600,
    researchTime: 6200
  },
  advanced_shield_module: {
    tier: 5,
    requires: ["unlock_monitor", "doctrine_guard"],
    metalCost: 18800,
    fuelCost: 11900,
    researchTime: 5800
  },
  unlock_battleship: {
    tier: 6,
    requires: ["unlock_monitor", "doctrine_siege"],
    metalCost: 26000,
    fuelCost: 16400,
    researchTime: 7400
  },
  siege_artillery_suite: {
    tier: 6,
    requires: ["unlock_battleship", "doctrine_siege"],
    metalCost: 23600,
    fuelCost: 15200,
    researchTime: 7100
  },
  unlock_carrier: {
    tier: 7,
    requires: ["unlock_battleship", "tactical_computer"],
    metalCost: 32400,
    fuelCost: 21600,
    researchTime: 8600
  },
  unlock_dreadnought: {
    tier: 8,
    requires: ["unlock_battleship", "unlock_carrier"],
    metalCost: 42000,
    fuelCost: 28600,
    researchTime: 9800
  },
  unlock_titan: {
    tier: 10,
    requires: ["titan_war_forge", "unlock_dreadnought"],
    metalCost: 74000,
    fuelCost: 52000,
    researchTime: 13200
  }
};

const EXTRA_TECH_TREE_NODES = [
  {
    key: "shipyard_parallel_1",
    name: "조선소 병렬화 I",
    tier: 4,
    category: "industry",
    description: "생산 공정을 병렬화해 제작 라인을 1개 추가합니다.",
    metalCost: 12800,
    fuelCost: 7800,
    researchTime: 3600,
    requires: ["cruiser_command", "industry_1"],
    exclusiveGroup: "",
    effectType: "buff_build_lines_flat",
    effectValue: 1
  },
  {
    key: "population_registry_1",
    name: "정착민 등록망 I",
    tier: 5,
    category: "industry",
    description: "함선 운용 인구를 확장해 함선 보유 상한을 늘립니다.",
    metalCost: 19800,
    fuelCost: 12100,
    researchTime: 5200,
    requires: ["shipyard_parallel_1", "unlock_monitor"],
    exclusiveGroup: "",
    effectType: "buff_population_cap_flat",
    effectValue: 120
  },
  {
    key: "resource_refinery_grid",
    name: "자원 정제망",
    tier: 6,
    category: "industry",
    description: "기지 및 점령지 자원 처리 효율을 높여 자원 획득량을 증가시킵니다.",
    metalCost: 27600,
    fuelCost: 16800,
    researchTime: 6900,
    requires: ["population_registry_1", "unlock_battleship"],
    exclusiveGroup: "",
    effectType: "buff_resource_pct",
    effectValue: 0.14
  },
  {
    key: "maneuver_warp_coordination",
    name: "기동 워프 연동",
    tier: 6,
    category: "engine",
    description: "대규모 함대의 이동 연동을 최적화해 이동 보너스를 제공합니다.",
    metalCost: 26200,
    fuelCost: 17200,
    researchTime: 6800,
    requires: ["unlock_battleship", "engine_overdrive"],
    exclusiveGroup: "",
    effectType: "buff_movement_pct",
    effectValue: 0.13
  },
  {
    key: "supercapital_logistics",
    name: "초주력 군수체계",
    tier: 8,
    category: "industry",
    description: "초대형 함대의 유지/정비 체계를 정립하여 생산 비용을 크게 낮춥니다.",
    metalCost: 38800,
    fuelCost: 25200,
    researchTime: 9300,
    requires: ["unlock_carrier", "unlock_battleship"],
    exclusiveGroup: "",
    effectType: "buff_build_cost_pct",
    effectValue: 0.12
  },
  {
    key: "dreadnought_command_matrix",
    name: "드레드노트 지휘행렬",
    tier: 9,
    category: "tactics",
    description: "중전력 함대 지휘 체계를 통합해 전투 보너스를 크게 올립니다.",
    metalCost: 52000,
    fuelCost: 35600,
    researchTime: 11200,
    requires: ["unlock_dreadnought"],
    exclusiveGroup: "",
    effectType: "buff_combat_pct",
    effectValue: 0.22
  },
  {
    key: "titan_war_forge",
    name: "타이탄 전쟁공방",
    tier: 9,
    category: "special",
    description: "최상위 함선 생산 기술과 초고급 장갑 모듈 운용 체계를 해금합니다.",
    metalCost: 57000,
    fuelCost: 39000,
    researchTime: 11800,
    requires: ["unlock_dreadnought", "supercapital_logistics"],
    exclusiveGroup: "",
    effectType: "unlock_component",
    effectValue: 0,
    unlockKey: "citadel_armor"
  },
  {
    key: "omega_reactor_theory",
    name: "오메가 반응로 이론",
    tier: 10,
    category: "engine",
    description: "타이탄급 동력 코어 이론을 완성해 최상위 엔진 모듈을 해금합니다.",
    metalCost: 69000,
    fuelCost: 47000,
    researchTime: 12800,
    requires: ["titan_war_forge"],
    exclusiveGroup: "",
    effectType: "unlock_component",
    effectValue: 0,
    unlockKey: "titan_reactor_core"
  },
  {
    key: "apex_fleet_doctrine",
    name: "정점 함대 교리",
    tier: 10,
    category: "tactics",
    description: "종반 함대 운용의 최종 교리. 전체 함대 전투 보너스를 크게 제공합니다.",
    metalCost: 78000,
    fuelCost: 56000,
    researchTime: 13800,
    requires: ["unlock_titan", "dreadnought_command_matrix"],
    exclusiveGroup: "",
    effectType: "buff_combat_pct",
    effectValue: 0.35
  }
];

function normalizeTechNodeEconomy(node) {
  const tier = Number(node.tier || 1);
  const tuned = { ...node };
  if (tier >= 8) {
    const targetMetal = 52000 + (tier - 8) * 29000;
    const targetFuel = 42000 + (tier - 8) * 30000;
    const targetTime = 12000 + (tier - 8) * 3200;
    tuned.metalCost = Math.max(Number(node.metalCost || 0), targetMetal);
    tuned.fuelCost = Math.max(Number(node.fuelCost || 0), targetFuel);
    tuned.researchTime = Math.max(Number(node.researchTime || 0), targetTime);
  }
  return tuned;
}

function getBaseTechNodes() {
  const tunedActive = ACTIVE_TECH_TREE_NODES.map((node) => {
    const override = TECH_NODE_KEY_OVERRIDES[String(node.key || "")];
    return normalizeTechNodeEconomy(override ? { ...node, ...override } : node);
  });
  return [...tunedActive, ...EXTRA_TECH_TREE_NODES.map(normalizeTechNodeEconomy)];
}

function componentUnlockNodeKey(componentKey) {
  const fixed = {
    gauss_battery: "rail_mk2",
    shield_generator: "shield_system",
    battle_computer: "tactical_computer",
    reactor_boost: "reactor_control",
    adaptive_barrier: "advanced_shield_module",
    siege_artillery: "siege_artillery_suite"
  };
  return fixed[String(componentKey || "")] || `unlock_component_${String(componentKey || "")}`;
}

function stableKeySpread(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 3) - 1;
}

function buildAutoComponentTechNodes() {
  const basicKeys = new Set(["standard_engine", "light_railgun", "reinforced_armor", "cargo_module"]);
  const reserved = new Set(
    getBaseTechNodes()
      .filter((node) => String(node.effectType || "") === "unlock_component" && String(node.unlockKey || ""))
      .map((node) => String(node.unlockKey))
  );
  const categoryRoot = {
    engine: "engine_1",
    weapon: "rail_mk2",
    defense: "armor_1",
    utility: "industry_1"
  };

  return DEFAULT_COMPONENTS
    .filter((component) => !basicKeys.has(String(component.key || "")))
    .filter((component) => !reserved.has(String(component.key || "")))
    .map((component) => {
      const power = Number(component.power || 0);
      const baseTier = componentTierByPower(power);
      const tier = Math.max(2, Math.min(10, baseTier + stableKeySpread(component.key)));
      const requires = [String(categoryRoot[String(component.category || "")] || "industry_1")];
      if (tier >= 3) requires.push("destroyer_blueprint");
      if (tier >= 4) requires.push("cruiser_command");
      if (tier >= 5) requires.push("unlock_monitor");
      if (tier >= 6) requires.push("unlock_battleship");
      if (tier >= 7) requires.push("unlock_carrier");
      if (tier >= 8) requires.push("unlock_dreadnought");
      if (tier >= 10) requires.push("unlock_titan");
      const metal = Math.max(1800, Math.floor(Number(component.metal || 0) * (6 + tier * 1.2)));
      const fuel = Math.max(900, Math.floor(Number(component.fuel || 0) * (6 + tier * 1.1)));
      const researchTime = Math.max(700, Math.floor((power * 40) + (tier * 520)));
      return {
        key: componentUnlockNodeKey(component.key),
        name: `${component.name} 설계`,
        tier,
        category: String(component.category || "special"),
        description: `${component.name} 모듈 사용 해금`,
        metalCost: metal,
        fuelCost: fuel,
        researchTime,
        requires,
        exclusiveGroup: "",
        effectType: "unlock_component",
        effectValue: 0,
        unlockKey: String(component.key)
      };
    });
}

const CITY_BUILDINGS = {
  shipyard: {
    key: "shipyard",
    name: "조선소",
    description: "함선 제작 시간 단축, 제작 라인 증가",
    baseMetal: 1200,
    baseFuel: 700,
    metalGrowth: 1.65,
    fuelGrowth: 1.58
  },
  government: {
    key: "government",
    name: "중앙 정부",
    description: "기지 생산량, 식민지 상한 증가",
    baseMetal: 900,
    baseFuel: 500,
    metalGrowth: 1.58,
    fuelGrowth: 1.52
  },
  housing: {
    key: "housing",
    name: "주거 지역",
    description: "인구 상한(함선 보유 제한) 증가",
    baseMetal: 700,
    baseFuel: 420,
    metalGrowth: 1.54,
    fuelGrowth: 1.48
  },
  research_lab: {
    key: "research_lab",
    name: "연구소",
    description: "연구 레벨 상한 증가",
    baseMetal: 1050,
    baseFuel: 780,
    metalGrowth: 1.6,
    fuelGrowth: 1.55
  },
  tactical_center: {
    key: "tactical_center",
    name: "중앙 전술소",
    description: "전투력/이동 속도, 함대 슬롯 강화",
    baseMetal: 1400,
    baseFuel: 980,
    metalGrowth: 1.66,
    fuelGrowth: 1.6
  }
};

const ADMIRAL_POOL = [
  { name: "\uc720\ub098 \ubc14\uc2a4", rarity: "R", combatBonus: 0.12, resourceBonus: 0.06, costBonus: 0.04 },
  { name: "\uce74\uc774 \ubca0\ub974\ub2e8", rarity: "R", combatBonus: 0.1, resourceBonus: 0.04, costBonus: 0.06 },
  { name: "\ub9c8\ub77c \ud3f0", rarity: "R", combatBonus: 0.11, resourceBonus: 0.07, costBonus: 0.03 },
  { name: "\uc81c\ud06c \uc5d0\ub9ac\uc628", rarity: "R", combatBonus: 0.09, resourceBonus: 0.05, costBonus: 0.07 },
  { name: "\ud5e4\ub77c \ub2cc\uc2a4", rarity: "R", combatBonus: 0.13, resourceBonus: 0.03, costBonus: 0.05 },
  { name: "\ud1a0\ub9ac \uc5d8\ub9b0", rarity: "R", combatBonus: 0.1, resourceBonus: 0.08, costBonus: 0.04 },
  { name: "\ub9ac\uc624 \uc0e4\ub974", rarity: "SR", combatBonus: 0.2, resourceBonus: 0.09, costBonus: 0.08 },
  { name: "\uc138\ub77c \uc624\ub974\ud2f4", rarity: "SR", combatBonus: 0.16, resourceBonus: 0.18, costBonus: 0.06 },
  { name: "\uc774\ubca0\ub978 \ud558\uc6b4\ub4dc", rarity: "SR", combatBonus: 0.24, resourceBonus: 0.1, costBonus: 0.08 },
  { name: "\ub9ac\uc2a4 \ucf54\ubd88", rarity: "SR", combatBonus: 0.19, resourceBonus: 0.16, costBonus: 0.07 },
  { name: "\ucf54\ub85c \ube14\ub79c\ud2b8", rarity: "SR", combatBonus: 0.22, resourceBonus: 0.11, costBonus: 0.1 },
  { name: "\ud0a4\uc5d8 \ud2b8\ub808\uc2a4", rarity: "SR", combatBonus: 0.21, resourceBonus: 0.13, costBonus: 0.09 },
  { name: "\uc544\ub378 \ud06c\ub85c\uc2a4", rarity: "SSR", combatBonus: 0.34, resourceBonus: 0.2, costBonus: 0.14 }
  ,{ name: "\ub77c\uc6b0\ub77c \ud06c\ub808\uc2a4", rarity: "SSR", combatBonus: 0.31, resourceBonus: 0.24, costBonus: 0.12 }
  ,{ name: "\uce74\ub9ac\uc2a4 \ud544\ub4dc", rarity: "SSR", combatBonus: 0.36, resourceBonus: 0.16, costBonus: 0.15 }
  ,{ name: "\ub3c4\ubbf8\ub2c9 \ub808\uc988", rarity: "SSR", combatBonus: 0.33, resourceBonus: 0.22, costBonus: 0.13 }
  ,{ name: "\uc138\ub9ac\uc2a4 \ub8ec", rarity: "SSR", combatBonus: 0.29, resourceBonus: 0.28, costBonus: 0.1 }
];

const DEFAULT_HULLS = [
  {
    key: "corvette",
    name: "\ucd08\uacc4\ud568 \uc120\uccb4",
    classType: "corvette",
    baseHp: 80,
    baseSpeed: 9,
    powerLimit: 75,
    baseBuildTime: 30,
    metalCost: 180,
    fuelCost: 60,
    slots: { engine: 1, weapon: 1, defense: 1, utility: 1 }
  },
  {
    key: "destroyer",
    name: "\uad6c\ucd95\ud568 \uc120\uccb4",
    classType: "destroyer",
    baseHp: 160,
    baseSpeed: 7,
    powerLimit: 135,
    baseBuildTime: 95,
    metalCost: 420,
    fuelCost: 160,
    slots: { engine: 1, weapon: 2, defense: 2, utility: 1 }
  },
  {
    key: "cruiser",
    name: "\uc21c\uc591\ud568 \uc120\uccb4",
    classType: "cruiser",
    baseHp: 340,
    baseSpeed: 5,
    powerLimit: 230,
    baseBuildTime: 240,
    metalCost: 900,
    fuelCost: 360,
    slots: { engine: 1, weapon: 3, defense: 2, utility: 2 }
  },
  {
    key: "monitor",
    name: "\ubaa8\ub2c8\ud130 \uc120\uccb4",
    classType: "monitor",
    baseHp: 520,
    baseSpeed: 3,
    powerLimit: 360,
    baseBuildTime: 840,
    metalCost: 1750,
    fuelCost: 620,
    slots: { engine: 1, weapon: 2, defense: 6, utility: 2 }
  },
  {
    key: "battleship",
    name: "\uc804\ud568 \uc120\uccb4",
    classType: "battleship",
    baseHp: 760,
    baseSpeed: 3,
    powerLimit: 420,
    baseBuildTime: 680,
    metalCost: 2600,
    fuelCost: 1300,
    slots: { engine: 2, weapon: 4, defense: 4, utility: 2 }
  },
  {
    key: "carrier",
    name: "\ud56d\uacf5\ubaa8\ud568 \uc120\uccb4",
    classType: "carrier",
    baseHp: 610,
    baseSpeed: 3,
    powerLimit: 390,
    baseBuildTime: 920,
    metalCost: 3000,
    fuelCost: 1700,
    slots: { engine: 2, weapon: 3, defense: 3, utility: 4 }
  },
  {
    key: "dreadnought",
    name: "\ub4dc\ub808\ub4dc\ub178\ud2b8 \uc120\uccb4",
    classType: "dreadnought",
    baseHp: 1180,
    baseSpeed: 2,
    powerLimit: 620,
    baseBuildTime: 1650,
    metalCost: 5600,
    fuelCost: 3200,
    slots: { engine: 2, weapon: 5, defense: 5, utility: 2 }
  },
  {
    key: "titan",
    name: "\ud0c0\uc774\ud0c4 \uc120\uccb4",
    classType: "titan",
    baseHp: 1850,
    baseSpeed: 1,
    powerLimit: 920,
    baseBuildTime: 2900,
    metalCost: 9800,
    fuelCost: 5600,
    slots: { engine: 3, weapon: 6, defense: 6, utility: 3 }
  }
];

const DEFAULT_COMPONENTS = [
  { key: "standard_engine", name: "\ud45c\uc900 \uc5d4\uc9c4", category: "engine", hp: 0, attack: 0, defense: 0, speed: 1, power: 12, metal: 80, fuel: 40 },
  { key: "high_output_engine", name: "\uace0\ucd9c\ub825 \uc5d4\uc9c4", category: "engine", hp: 0, attack: 0, defense: 0, speed: 3, power: 26, metal: 180, fuel: 130 },
  { key: "warp_stabilizer_engine", name: "\uc6cc\ud504 \uc548\uc815\ud654 \uc5d4\uc9c4", category: "engine", hp: 50, attack: 0, defense: 8, speed: 2, power: 36, metal: 320, fuel: 220 },
  { key: "ion_turbine_engine", name: "\uc774\uc628 \ud130\ube48 \uc5d4\uc9c4", category: "engine", hp: 20, attack: 0, defense: 2, speed: 2, power: 18, metal: 130, fuel: 80 },
  { key: "fusion_drive", name: "\ud575\uc735\ud569 \ub4dc\ub77c\uc774\ube0c", category: "engine", hp: 45, attack: 0, defense: 4, speed: 3, power: 30, metal: 260, fuel: 180 },
  { key: "vector_thruster", name: "\ubca1\ud130 \uc2a4\ub7ec\uc2a4\ud130", category: "engine", hp: 30, attack: 0, defense: 6, speed: 4, power: 34, metal: 290, fuel: 210 },
  { key: "gravitic_impeller", name: "\uc911\ub825 \uc784\ud3a0\ub7ec", category: "engine", hp: 70, attack: 0, defense: 10, speed: 1, power: 40, metal: 360, fuel: 260 },
  { key: "pulse_booster", name: "\ud384\uc2a4 \ubd80\uc2a4\ud130", category: "engine", hp: 10, attack: 0, defense: 0, speed: 5, power: 28, metal: 240, fuel: 240 },
  { key: "antimatter_nozzle", name: "\ubc18\ubb3c\uc9c8 \ub178\uc990", category: "engine", hp: 85, attack: 0, defense: 12, speed: 2, power: 52, metal: 520, fuel: 420 },
  { key: "titan_reactor_core", name: "\ud0c0\uc774\ud0c4 \ub9ac\uc561\ud130 \ucf54\uc5b4", category: "engine", hp: 140, attack: 0, defense: 18, speed: 0, power: 74, metal: 820, fuel: 620 },
  { key: "light_railgun", name: "\uacbd\ub7c9 \ub808\uc77c\uac74", category: "weapon", hp: 0, attack: 28, defense: 0, speed: 0, power: 18, metal: 140, fuel: 40 },
  { key: "missile_launcher", name: "\ubbf8\uc0ac\uc77c \ubc1c\uc0ac\uae30", category: "weapon", hp: 0, attack: 45, defense: 0, speed: -1, power: 30, metal: 220, fuel: 90 },
  { key: "plasma_lance", name: "\ud50c\ub77c\uc988\ub9c8 \ub79c\uc2a4", category: "weapon", hp: 0, attack: 72, defense: 0, speed: -2, power: 52, metal: 430, fuel: 260 },
  { key: "coil_cannon", name: "\ucf54\uc77c \uce90\ub17c", category: "weapon", hp: 0, attack: 34, defense: 0, speed: 0, power: 22, metal: 170, fuel: 60 },
  { key: "gauss_battery", name: "\uac00\uc6b0\uc2a4 \ubc30\ud130\ub9ac", category: "weapon", hp: 0, attack: 56, defense: 0, speed: -1, power: 38, metal: 290, fuel: 170 },
  { key: "heavy_torpedo_bay", name: "\uc911\uc5b4\ub8b0 \ud1a0\ub974\ud398\ub3c4 \ubca0\uc774", category: "weapon", hp: 0, attack: 84, defense: 0, speed: -2, power: 60, metal: 510, fuel: 320 },
  { key: "beam_emitter", name: "\ube54 \uc5d0\ubbf8\ud130", category: "weapon", hp: 0, attack: 63, defense: 0, speed: -1, power: 44, metal: 350, fuel: 250 },
  { key: "siege_artillery", name: "\uc2dc\uc988 \ud3ec\ubcd1", category: "weapon", hp: 0, attack: 108, defense: 0, speed: -3, power: 78, metal: 760, fuel: 470 },
  { key: "flak_array", name: "\ud50c\ub799 \ubc30\uc5f4", category: "weapon", hp: 0, attack: 41, defense: 4, speed: 0, power: 26, metal: 220, fuel: 120 },
  { key: "spinal_cannon", name: "\ucc99\ucd94 \uc8fc\ud3ec", category: "weapon", hp: 0, attack: 160, defense: 0, speed: -4, power: 110, metal: 1300, fuel: 900 },
  { key: "reinforced_armor", name: "\uac15\ud654 \uc7a5\uac11\ud310", category: "defense", hp: 70, attack: 0, defense: 18, speed: -1, power: 20, metal: 190, fuel: 30 },
  { key: "shield_generator", name: "\uc2e4\ub4dc \ubc1c\uc0dd\uae30", category: "defense", hp: 120, attack: 0, defense: 12, speed: 0, power: 32, metal: 260, fuel: 150 },
  { key: "reactive_armor", name: "\ubc18\uc751\uc131 \uc7a5\uac11", category: "defense", hp: 210, attack: 0, defense: 26, speed: -2, power: 55, metal: 520, fuel: 240 },
  { key: "nano_plating", name: "\ub098\ub178 \ud50c\ub808\uc774\ud305", category: "defense", hp: 95, attack: 0, defense: 16, speed: 0, power: 24, metal: 180, fuel: 120 },
  { key: "ablative_layer", name: "\uc5b4\ube14\ub808\uc774\ud2f0\ube0c \ub808\uc774\uc5b4", category: "defense", hp: 150, attack: 0, defense: 14, speed: -1, power: 30, metal: 230, fuel: 140 },
  { key: "fortress_bulkhead", name: "\ud3ec\ud2b8\ub9ac\uc2a4 \ubcbd\uccb4", category: "defense", hp: 260, attack: 0, defense: 30, speed: -3, power: 70, metal: 680, fuel: 310 },
  { key: "phase_shield", name: "\ud398\uc774\uc988 \uc2e4\ub4dc", category: "defense", hp: 190, attack: 0, defense: 22, speed: 0, power: 46, metal: 420, fuel: 300 },
  { key: "point_defense_grid", name: "\uc810\ubc29\uc5b4 \uadf8\ub9ac\ub4dc", category: "defense", hp: 80, attack: 6, defense: 20, speed: 0, power: 34, metal: 300, fuel: 190 },
  { key: "adaptive_barrier", name: "\uc801\uc751\uc131 \ubc14\ub9ac\uc5b4", category: "defense", hp: 310, attack: 0, defense: 38, speed: -2, power: 86, metal: 980, fuel: 640 },
  { key: "citadel_armor", name: "\uc2dc\ud0c0\ub378 \uc544\uba38", category: "defense", hp: 520, attack: 0, defense: 56, speed: -4, power: 140, metal: 2200, fuel: 1200 },
  { key: "tactical_ai", name: "\uc804\uc220 AI", category: "utility", hp: 0, attack: 14, defense: 0, speed: 0, power: 14, metal: 120, fuel: 120 },
  { key: "cargo_module", name: "\ud654\ubb3c \ubaa8\ub4c8", category: "utility", hp: 30, attack: 0, defense: 4, speed: -1, power: 10, metal: 110, fuel: 40 },
  { key: "targeting_array", name: "\ud0c0\uaca9 \uc5f0\uc0b0 \ubc30\uc5f4", category: "utility", hp: 0, attack: 22, defense: 6, speed: 0, power: 28, metal: 240, fuel: 170 },
  { key: "repair_drone_bay", name: "\uc218\ub9ac \ub4dc\ub860 \ubca0\uc774", category: "utility", hp: 110, attack: 0, defense: 10, speed: 0, power: 36, metal: 330, fuel: 230 },
  { key: "ecm_suite", name: "ECM \uc218\ud2b8", category: "utility", hp: 40, attack: 0, defense: 14, speed: 1, power: 26, metal: 210, fuel: 190 },
  { key: "sensor_fusion_core", name: "\uc13c\uc11c \ud719\ud569 \ucf54\uc5b4", category: "utility", hp: 35, attack: 10, defense: 6, speed: 1, power: 24, metal: 200, fuel: 160 },
  { key: "command_uplink", name: "\uc9c0\ud718 \uc5c5\ub9c1\ud06c", category: "utility", hp: 60, attack: 18, defense: 8, speed: 0, power: 34, metal: 320, fuel: 220 },
  { key: "fuel_optimizer", name: "\uc5f0\ub8cc \ucd5c\uc801\ud654 \ubaa8\ub4c8", category: "utility", hp: 20, attack: 0, defense: 8, speed: 2, power: 18, metal: 180, fuel: 120 },
  { key: "ammo_fabricator", name: "\ud0c4\uc57d \uc81c\uc870 \ubaa8\ub4c8", category: "utility", hp: 50, attack: 26, defense: 4, speed: -1, power: 40, metal: 420, fuel: 260 },
  { key: "battle_computer", name: "\ubc30\ud2c0 \ucef4\ud4e8\ud130", category: "utility", hp: 75, attack: 34, defense: 10, speed: 0, power: 52, metal: 560, fuel: 420, powerBonus: 0 },
  { key: "reactor_boost", name: "\uc6d0\uc790\ub85c \ubd80\uc2a4\ud2b8", category: "utility", hp: 0, attack: 0, defense: 0, speed: -1, power: 16, metal: 700, fuel: 520, powerBonus: 110 },

  { key: "micro_burst_drive", name: "\ub9c8\uc774\ud06c\ub85c \ubc84\uc2a4\ud2b8 \ub4dc\ub77c\uc774\ube0c", category: "engine", hp: 0, attack: 4, defense: -3, speed: 6, power: 42, metal: 360, fuel: 340 },
  { key: "armored_impulse_engine", name: "\uc7a5\uac11 \uc784\ud384\uc2a4 \uc5d4\uc9c4", category: "engine", hp: 120, attack: 0, defense: 24, speed: -2, power: 68, metal: 760, fuel: 420 },
  { key: "siege_drive", name: "\uc2dc\uc988 \ub4dc\ub77c\uc774\ube0c", category: "engine", hp: 220, attack: 0, defense: 30, speed: -4, power: 88, metal: 980, fuel: 560 },
  { key: "escort_afterburner", name: "\uc5d0\uc2a4\ucf54\ud2b8 \uc560\ud504\ud130\ubc84\ub108", category: "engine", hp: 20, attack: 8, defense: -2, speed: 4, power: 30, metal: 280, fuel: 260 },
  { key: "silent_cruise_engine", name: "\uc0ac\uc77c\ub7f0\ud2b8 \ud06c\ub8e8\uc988 \uc5d4\uc9c4", category: "engine", hp: 40, attack: -4, defense: 10, speed: 2, power: 24, metal: 230, fuel: 170 },
  { key: "overclocked_ion_drive", name: "\uc624\ubc84\ud074\ub7ed \uc774\uc628 \ub4dc\ub77c\uc774\ube0c", category: "engine", hp: -20, attack: 6, defense: -4, speed: 7, power: 48, metal: 420, fuel: 410 },
  { key: "ballast_drive", name: "\ubc38\ub7ec\uc2a4\ud2b8 \ub4dc\ub77c\uc774\ube0c", category: "engine", hp: 260, attack: 0, defense: 34, speed: -5, power: 96, metal: 1250, fuel: 680 },
  { key: "long_range_cruise_core", name: "\uc7a5\uac70\ub9ac \uc21c\ud56d \ucf54\uc5b4", category: "engine", hp: 60, attack: 0, defense: 8, speed: 3, power: 36, metal: 340, fuel: 280 },
  { key: "interceptor_vector_pack", name: "\uc694\uaca9 \ubca1\ud130 \ud329", category: "engine", hp: 10, attack: 10, defense: -1, speed: 5, power: 44, metal: 390, fuel: 360 },
  { key: "bastion_propulsion", name: "\ubc14\uc2a4\ud2f0\uc628 \ucd94\uc9c4\uae30", category: "engine", hp: 180, attack: 0, defense: 28, speed: -3, power: 80, metal: 920, fuel: 540 },

  { key: "anti_armor_cannon", name: "\ub300\uc7a5\uac11 \uce90\ub17c", category: "weapon", hp: 0, attack: 92, defense: 0, speed: -3, power: 68, metal: 640, fuel: 340 },
  { key: "swarm_rocket_pod", name: "\uc2a4\uc6dc \ub85c\ucf13 \ud3ec\ub4dc", category: "weapon", hp: 0, attack: 52, defense: -2, speed: 1, power: 34, metal: 300, fuel: 220 },
  { key: "interceptor_laser_net", name: "\uc694\uaca9 \ub808\uc774\uc800 \ub124\ud2b8", category: "weapon", hp: 0, attack: 36, defense: 10, speed: 0, power: 28, metal: 260, fuel: 130 },
  { key: "breacher_rams", name: "\ube0c\ub9ac\ucc98 \ub7a8", category: "weapon", hp: 80, attack: 44, defense: 6, speed: -2, power: 36, metal: 340, fuel: 120 },
  { key: "ion_spear", name: "\uc774\uc628 \uc2a4\ud53c\uc5b4", category: "weapon", hp: 0, attack: 74, defense: 0, speed: -1, power: 50, metal: 430, fuel: 290 },
  { key: "suppression_mortar", name: "\uc81c\uc555 \ubaa8\ud0c0", category: "weapon", hp: 0, attack: 118, defense: 0, speed: -4, power: 92, metal: 980, fuel: 620 },
  { key: "rail_burst_array", name: "\ub808\uc77c \ubc84\uc2a4\ud2b8 \ubc30\uc5f4", category: "weapon", hp: 0, attack: 62, defense: 2, speed: -1, power: 42, metal: 380, fuel: 210 },
  { key: "carrier_strike_rack", name: "\uce90\ub9ac\uc5b4 \uacf5\uc2b5 \ub799", category: "weapon", hp: 20, attack: 88, defense: 0, speed: -2, power: 66, metal: 620, fuel: 440 },
  { key: "guardian_turret_ring", name: "\uac00\ub514\uc5b8 \ud130\ub81b \ub9c1", category: "weapon", hp: 30, attack: 48, defense: 12, speed: -1, power: 40, metal: 360, fuel: 200 },
  { key: "volatile_plasma_silo", name: "\ud718\ubc1c\uc131 \ud50c\ub77c\uc988\ub9c8 \uc0ac\uc77c\ub85c", category: "weapon", hp: -40, attack: 142, defense: -6, speed: -3, power: 104, metal: 1200, fuel: 840 },

  { key: "kinetic_mesh_armor", name: "\ud0a4\ub124\ud2f1 \uba54\uc26c \uc544\uba38", category: "defense", hp: 170, attack: 0, defense: 24, speed: -1, power: 40, metal: 410, fuel: 180 },
  { key: "fortified_keel", name: "\ud3ec\ud2f0\ud30c\uc774\ub4dc \ud0ac", category: "defense", hp: 290, attack: 0, defense: 32, speed: -2, power: 64, metal: 690, fuel: 280 },
  { key: "countermeasure_shell", name: "\uce74\uc6b4\ud130\uba54\uc800 \uc178", category: "defense", hp: 90, attack: 8, defense: 16, speed: 1, power: 28, metal: 260, fuel: 170 },
  { key: "polarized_armor", name: "\ud3f4\ub77c\ub77c\uc774\uc988 \uc544\uba38", category: "defense", hp: 140, attack: 0, defense: 28, speed: 0, power: 38, metal: 330, fuel: 240 },
  { key: "shock_absorber_layer", name: "\ucda9\uaca9 \ud761\uc218 \ub808\uc774\uc5b4", category: "defense", hp: 220, attack: 0, defense: 18, speed: 0, power: 36, metal: 300, fuel: 210 },
  { key: "guardian_bulkhead", name: "\uac00\ub514\uc5b8 \ubcbd\uccb4", category: "defense", hp: 360, attack: 0, defense: 42, speed: -3, power: 90, metal: 1080, fuel: 520 },
  { key: "hardened_radiator_shell", name: "\uac15\ud654 \ub77c\ub514\uc5d0\uc774\ud130 \uc178", category: "defense", hp: 130, attack: 0, defense: 22, speed: 1, power: 34, metal: 320, fuel: 200 },
  { key: "auxiliary_shield_bank", name: "\ubcf4\uc870 \uc2e4\ub4dc \ubc45\ud06c", category: "defense", hp: 250, attack: 0, defense: 20, speed: -1, power: 48, metal: 470, fuel: 360 },
  { key: "siege_fortress_plating", name: "\uc2dc\uc988 \ud3ec\ud2b8\ub9ac\uc2a4 \ud50c\ub808\uc774\ud305", category: "defense", hp: 520, attack: 0, defense: 60, speed: -5, power: 150, metal: 2350, fuel: 1260 },
  { key: "mirror_field_barrier", name: "\ubbf8\ub7ec \ud544\ub4dc \ubc14\ub9ac\uc5b4", category: "defense", hp: 160, attack: 0, defense: 26, speed: 1, power: 44, metal: 450, fuel: 320 },

  { key: "reactor_cooling_suite", name: "\ub9ac\uc561\ud130 \ucee8\ub9c1 \uc218\ud2b8", category: "utility", hp: 40, attack: 0, defense: 8, speed: 0, power: 18, metal: 200, fuel: 150, powerBonus: 26 },
  { key: "siege_targeting_ai", name: "\uc2dc\uc988 \ud0c0\uac9f\ud305 AI", category: "utility", hp: 0, attack: 52, defense: -4, speed: -1, power: 58, metal: 640, fuel: 440 },
  { key: "combat_medbay", name: "\uc804\ud22c \uba54\ub4dc\ubca0\uc774", category: "utility", hp: 160, attack: 0, defense: 8, speed: 0, power: 42, metal: 500, fuel: 280 },
  { key: "deception_field", name: "\uae30\ub9cc \ud544\ub4dc", category: "utility", hp: 30, attack: 10, defense: 12, speed: 2, power: 34, metal: 340, fuel: 260 },
  { key: "drone_control_spine", name: "\ub4dc\ub860 \uc81c\uc5b4 \uc2a4\ud30c\uc778", category: "utility", hp: 90, attack: 24, defense: 6, speed: -1, power: 46, metal: 520, fuel: 320 },
  { key: "fuel_refinery_pod", name: "\uc5f0\ub8cc \uc815\uc81c \ud3ec\ub4dc", category: "utility", hp: 35, attack: 0, defense: 6, speed: 1, power: 16, metal: 190, fuel: 110 },
  { key: "auxiliary_reactor_node", name: "\ubcf4\uc870 \ub9ac\uc561\ud130 \ub178\ub4dc", category: "utility", hp: 0, attack: 0, defense: 2, speed: -1, power: 24, metal: 520, fuel: 360, powerBonus: 70 },
  { key: "command_broadcast_hub", name: "\uc9c0\ud718 \ube0c\ub85c\ub4dc\uce90\uc2a4\ud2b8 \ud5c8\ube0c", category: "utility", hp: 70, attack: 20, defense: 12, speed: 0, power: 40, metal: 410, fuel: 280 },
  { key: "stability_gyro_array", name: "\uc548\uc815\ud654 \uc790\uc774\ub85c \ubc30\uc5f4", category: "utility", hp: 50, attack: 0, defense: 18, speed: 1, power: 30, metal: 300, fuel: 230 },
  { key: "overheat_converter", name: "\uc624\ubc84\ud788\ud2b8 \ucee8\ubc84\ud130", category: "utility", hp: -30, attack: 30, defense: -5, speed: 2, power: 28, metal: 260, fuel: 220, powerBonus: 30 }
];

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function seedNeutralZones() {
  for (const zone of DEFAULT_ZONES) {
    const isThirdEmpire = Number(zone.level || 1) >= 4 && Number(zone.id || 0) % 4 === 0;
    const faction = isThirdEmpire ? "third_empire" : "neutral";
    const baseGarrison = normalizeFleet(zone.garrison || {});
    const powerScale = isThirdEmpire ? (1.65 + Number(zone.level || 1) * 0.18) : 1;
    const boostedGarrison = isThirdEmpire
      ? {
          corvette: Math.max(0, Math.floor(Number(baseGarrison.corvette || 0) * powerScale) + 6),
          destroyer: Math.max(0, Math.floor(Number(baseGarrison.destroyer || 0) * powerScale) + 2),
          cruiser: Math.max(0, Math.floor(Number(baseGarrison.cruiser || 0) * powerScale) + 1),
          battleship: Math.max(0, Math.floor(Number(baseGarrison.battleship || 0) * (powerScale * 0.9))),
          carrier: Math.max(0, Math.floor(Number(baseGarrison.carrier || 0) * (powerScale * 0.8)))
        }
      : baseGarrison;
    const recommendedPower = isThirdEmpire
      ? Math.floor(Number(zone.recommendedPower || 0) * 2.2 + Number(zone.level || 1) * 850)
      : zone.recommendedPower;
    const zoneDescription = isThirdEmpire
      ? `[제3제국] ${zone.description}`
      : zone.description;

    await run(
      `
        INSERT OR IGNORE INTO neutral_zones
          (id, name, description, level, map_x, map_y, metal_rate, fuel_rate, recommended_power, garrison_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        zone.id,
        zone.name,
        zoneDescription,
        zone.level,
        zone.x,
        zone.y,
        zone.metalRate,
        zone.fuelRate,
        recommendedPower,
        JSON.stringify(boostedGarrison)
      ]
    );

    await run(
      `
        UPDATE neutral_zones
        SET name = ?, description = ?, level = ?, map_x = ?, map_y = ?,
            metal_rate = ?, fuel_rate = ?, recommended_power = ?, garrison_json = ?, faction = ?
        WHERE id = ?
      `,
      [
        zone.name,
        zoneDescription,
        zone.level,
        zone.x,
        zone.y,
        zone.metalRate,
        zone.fuelRate,
        recommendedPower,
        JSON.stringify(boostedGarrison),
        faction,
        zone.id
      ]
    );
  }
}

async function normalizeZoneOwnership() {
  await run(`
    DELETE FROM occupied_zones
    WHERE rowid NOT IN (
      SELECT MAX(rowid)
      FROM occupied_zones
      GROUP BY zone_id
    )
  `);
}

async function seedShipyardData() {
  for (const hull of DEFAULT_HULLS) {
    await run(
      `
        INSERT OR IGNORE INTO hulls
          (key, name, class_type, base_hp, base_speed, power_limit, base_build_time, metal_cost, fuel_cost,
           slot_engine, slot_weapon, slot_defense, slot_utility, tech_requirement)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')
      `,
      [
        hull.key,
        hull.name,
        hull.classType,
        hull.baseHp,
        hull.baseSpeed,
        hull.powerLimit,
        hull.baseBuildTime,
        hull.metalCost,
        hull.fuelCost,
        hull.slots.engine,
        hull.slots.weapon,
        hull.slots.defense,
        hull.slots.utility
      ]
    );
    await run(
      `
        UPDATE hulls
        SET name = ?, class_type = ?, base_hp = ?, base_speed = ?, power_limit = ?,
            base_build_time = ?, metal_cost = ?, fuel_cost = ?, slot_engine = ?, slot_weapon = ?, slot_defense = ?, slot_utility = ?
        WHERE key = ?
      `,
      [
        hull.name,
        hull.classType,
        hull.baseHp,
        hull.baseSpeed,
        hull.powerLimit,
        hull.baseBuildTime,
        hull.metalCost,
        hull.fuelCost,
        hull.slots.engine,
        hull.slots.weapon,
        hull.slots.defense,
        hull.slots.utility,
        hull.key
      ]
    );
  }

  for (const component of DEFAULT_COMPONENTS) {
    const tuned = tunedComponentForTier(component);
    await run(
      `
        INSERT OR IGNORE INTO components
          (key, name, category, hp_bonus, attack_bonus, defense_bonus, speed_bonus,
           power_cost, power_bonus, metal_cost, fuel_cost, tech_requirement)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')
      `,
      [
        tuned.key,
        tuned.name,
        tuned.category,
        tuned.hp,
        tuned.attack,
        tuned.defense,
        tuned.speed,
        tuned.power,
        tuned.powerBonus || 0,
        tuned.metal,
        tuned.fuel
      ]
    );
    await run(
      `
        UPDATE components
        SET name = ?, category = ?, hp_bonus = ?, attack_bonus = ?, defense_bonus = ?, speed_bonus = ?,
            power_cost = ?, power_bonus = ?, metal_cost = ?, fuel_cost = ?
        WHERE key = ?
      `,
      [
        tuned.name,
        tuned.category,
        tuned.hp,
        tuned.attack,
        tuned.defense,
        tuned.speed,
        tuned.power,
        tuned.powerBonus || 0,
        tuned.metal,
        tuned.fuel,
        tuned.key
      ]
    );
  }
}

async function seedTechTreeData() {
  const generatedNodes = buildAutoComponentTechNodes();
  const allTechNodes = [...getBaseTechNodes(), ...generatedNodes];
  const activeKeys = allTechNodes.map((node) => String(node.key));
  if (activeKeys.length) {
    const placeholders = activeKeys.map(() => "?").join(", ");
    await run(`DELETE FROM tech_nodes WHERE key NOT IN (${placeholders})`, activeKeys);
  }
  for (const node of allTechNodes) {
    await run(
      `
        INSERT OR IGNORE INTO tech_nodes
          (key, name, tier, category, description, metal_cost, fuel_cost, research_time, requires_json, exclusive_group, effect_type, effect_value, unlock_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        node.key,
        node.name,
        node.tier,
        node.category,
        node.description,
        node.metalCost,
        node.fuelCost,
        node.researchTime,
        JSON.stringify(node.requires || []),
        node.exclusiveGroup || "",
        node.effectType || "",
        Number(node.effectValue || 0),
        node.unlockKey || ""
      ]
    );
    await run(
      `
        UPDATE tech_nodes
        SET name = ?, tier = ?, category = ?, description = ?, metal_cost = ?, fuel_cost = ?, research_time = ?,
            requires_json = ?, exclusive_group = ?, effect_type = ?, effect_value = ?, unlock_key = ?
        WHERE key = ?
      `,
      [
        node.name,
        node.tier,
        node.category,
        node.description,
        node.metalCost,
        node.fuelCost,
        node.researchTime,
        JSON.stringify(node.requires || []),
        node.exclusiveGroup || "",
        node.effectType || "",
        Number(node.effectValue || 0),
        node.unlockKey || "",
        node.key
      ]
    );
  }
}

function randomBaseCoordinate() {
  return Math.floor(40 + Math.random() * (MAP_MAX_X - 80));
}

async function ensureBase(userId) {
  let base = await get("SELECT user_id, map_x, map_y FROM bases WHERE user_id = ?", [userId]);
  if (!base) {
    await run(
      "INSERT INTO bases (user_id, map_x, map_y, moved_at) VALUES (?, ?, ?, ?)",
      [userId, randomBaseCoordinate(), randomBaseCoordinate(), Date.now()]
    );
    base = await get("SELECT user_id, map_x, map_y FROM bases WHERE user_id = ?", [userId]);
  }

  return {
    userId: base.user_id,
    x: base.map_x,
    y: base.map_y
  };
}

function movementCost(from, to) {
  const dx = Number(from.x) - Number(to.x);
  const dy = Number(from.y) - Number(to.y);
  const normalizedDistance = Math.sqrt(dx * dx + dy * dy) / MAP_DISTANCE_UNIT;
  return Math.ceil(normalizedDistance * BASE_MOVE_FUEL_PER_DISTANCE);
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS resources (
      user_id INTEGER PRIMARY KEY,
      metal INTEGER NOT NULL DEFAULT 1000,
      fuel INTEGER NOT NULL DEFAULT 500,
      last_update INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS fleets (
      user_id INTEGER PRIMARY KEY,
      corvette INTEGER NOT NULL DEFAULT 6,
      destroyer INTEGER NOT NULL DEFAULT 2,
      cruiser INTEGER NOT NULL DEFAULT 0,
      battleship INTEGER NOT NULL DEFAULT 0,
      carrier INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS neutral_zones (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      map_x INTEGER NOT NULL DEFAULT 50,
      map_y INTEGER NOT NULL DEFAULT 50,
      metal_rate INTEGER NOT NULL,
      fuel_rate INTEGER NOT NULL,
      recommended_power INTEGER NOT NULL DEFAULT 100,
      garrison_json TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS occupied_zones (
      user_id INTEGER NOT NULL,
      zone_id INTEGER NOT NULL,
      captured_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, zone_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (zone_id) REFERENCES neutral_zones(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bases (
      user_id INTEGER PRIMARY KEY,
      map_x INTEGER NOT NULL,
      map_y INTEGER NOT NULL,
      moved_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS hulls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      class_type TEXT NOT NULL,
      base_hp INTEGER NOT NULL,
      base_speed INTEGER NOT NULL,
      power_limit INTEGER NOT NULL,
      base_build_time INTEGER NOT NULL,
      metal_cost INTEGER NOT NULL,
      fuel_cost INTEGER NOT NULL,
      slot_engine INTEGER NOT NULL DEFAULT 1,
      slot_weapon INTEGER NOT NULL DEFAULT 1,
      slot_defense INTEGER NOT NULL DEFAULT 1,
      slot_utility INTEGER NOT NULL DEFAULT 1,
      tech_requirement TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      hp_bonus INTEGER NOT NULL DEFAULT 0,
      attack_bonus INTEGER NOT NULL DEFAULT 0,
      defense_bonus INTEGER NOT NULL DEFAULT 0,
      speed_bonus INTEGER NOT NULL DEFAULT 0,
      power_cost INTEGER NOT NULL DEFAULT 0,
      metal_cost INTEGER NOT NULL DEFAULT 0,
      fuel_cost INTEGER NOT NULL DEFAULT 0,
      tech_requirement TEXT
    )
  `);
  await ensureColumn("components", "power_bonus", "INTEGER NOT NULL DEFAULT 0");

  await run(`
    CREATE TABLE IF NOT EXISTS ship_designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      hull_id INTEGER NOT NULL,
      engine_component_id INTEGER NOT NULL,
      weapon_component_id INTEGER NOT NULL,
      defense_component_id INTEGER NOT NULL,
      utility_component_id INTEGER NOT NULL,
      final_hp INTEGER NOT NULL,
      final_attack INTEGER NOT NULL,
      final_defense INTEGER NOT NULL,
      final_speed INTEGER NOT NULL,
      total_power INTEGER NOT NULL,
      total_metal_cost INTEGER NOT NULL,
      total_fuel_cost INTEGER NOT NULL,
      total_build_time INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (hull_id) REFERENCES hulls(id)
    )
  `);
  await ensureColumn("ship_designs", "engine_components_json", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("ship_designs", "weapon_components_json", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("ship_designs", "defense_components_json", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("ship_designs", "utility_components_json", "TEXT NOT NULL DEFAULT '[]'");

  await run(`
    CREATE TABLE IF NOT EXISTS production_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      design_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (design_id) REFERENCES ship_designs(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS owned_ships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      design_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, design_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (design_id) REFERENCES ship_designs(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      mission_type TEXT NOT NULL,
      target_user_id INTEGER,
      target_zone_id INTEGER,
      target_name TEXT NOT NULL,
      from_x INTEGER NOT NULL,
      from_y INTEGER NOT NULL,
      to_x INTEGER NOT NULL,
      to_y INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      arrive_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'traveling',
      result TEXT,
      log_json TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await ensureColumn("missions", "attacker_power", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("missions", "attacker_ship_count", "INTEGER NOT NULL DEFAULT 0");

  await run(`
    CREATE TABLE IF NOT EXISTS battle_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      result TEXT NOT NULL,
      travel_seconds INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      log_json TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS research (
      user_id INTEGER PRIMARY KEY,
      resource_level INTEGER NOT NULL DEFAULT 0,
      logistics_level INTEGER NOT NULL DEFAULT 0,
      tactics_level INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS commander_progress (
      user_id INTEGER PRIMARY KEY,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS admirals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      rarity TEXT NOT NULL,
      combat_bonus REAL NOT NULL DEFAULT 0,
      resource_bonus REAL NOT NULL DEFAULT 0,
      cost_bonus REAL NOT NULL DEFAULT 0,
      assigned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await ensureColumn("admirals", "captured_from", "INTEGER");
  await ensureColumn("admirals", "captured_at", "INTEGER");
  await ensureColumn("admirals", "status", "TEXT NOT NULL DEFAULT 'active'");
  await ensureColumn("admirals", "dead_at", "INTEGER");

  await run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      admiral_policy TEXT NOT NULL DEFAULT 'capture',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await ensureColumn("user_settings", "economy_policy", "TEXT NOT NULL DEFAULT 'civilian'");
  await ensureColumn("user_settings", "industry_policy", "TEXT NOT NULL DEFAULT 'infrastructure'");
  await ensureColumn("user_settings", "military_policy", "TEXT NOT NULL DEFAULT 'defense'");
  await ensureColumn("user_settings", "policy_locked_until", "INTEGER NOT NULL DEFAULT 0");
  await run(`
    CREATE TABLE IF NOT EXISTS speedup_usage (
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      streak INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, category),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS incoming_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id INTEGER NOT NULL,
      mission_id INTEGER,
      attacker_user_id INTEGER NOT NULL,
      attacker_username TEXT NOT NULL,
      attack_power INTEGER NOT NULL DEFAULT 0,
      ship_count INTEGER NOT NULL DEFAULT 0,
      arrive_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    )
  `);
  await ensureColumn("incoming_alerts", "target_kind", "TEXT NOT NULL DEFAULT 'base'");
  await ensureColumn("incoming_alerts", "target_name", "TEXT NOT NULL DEFAULT ''");

  await run(`
    CREATE TABLE IF NOT EXISTS trade_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      metal INTEGER NOT NULL DEFAULT 0,
      fuel INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS ship_trade_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      design_id INTEGER NOT NULL,
      design_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS city_buildings (
      user_id INTEGER PRIMARY KEY,
      shipyard_level INTEGER NOT NULL DEFAULT 1,
      government_level INTEGER NOT NULL DEFAULT 1,
      housing_level INTEGER NOT NULL DEFAULT 1,
      research_lab_level INTEGER NOT NULL DEFAULT 1,
      tactical_center_level INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS fleet_groups (
      user_id INTEGER NOT NULL,
      slot_index INTEGER NOT NULL,
      name TEXT NOT NULL,
      admiral_id INTEGER,
      ship_plan_json TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (user_id, slot_index),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS zone_garrisons (
      user_id INTEGER NOT NULL,
      zone_id INTEGER NOT NULL,
      ship_plan_json TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, zone_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (zone_id) REFERENCES neutral_zones(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS tech_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tier INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      metal_cost INTEGER NOT NULL DEFAULT 0,
      fuel_cost INTEGER NOT NULL DEFAULT 0,
      research_time INTEGER NOT NULL DEFAULT 60,
      requires_json TEXT NOT NULL DEFAULT '[]',
      exclusive_group TEXT NOT NULL DEFAULT '',
      effect_type TEXT NOT NULL DEFAULT '',
      effect_value REAL NOT NULL DEFAULT 0,
      unlock_key TEXT NOT NULL DEFAULT ''
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS user_tech (
      user_id INTEGER NOT NULL,
      tech_key TEXT NOT NULL,
      researched_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, tech_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS tech_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tech_key TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'researching',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const userColumns = await all("PRAGMA table_info(users)");
  const userColumnNames = userColumns.map((column) => column.name);
  if (!userColumnNames.includes("created_at")) {
    await run("ALTER TABLE users ADD COLUMN created_at INTEGER");
  }
  passwordColumn = userColumnNames.includes("password_hash") ? "password_hash" : "password";

  await ensureColumn("fleets", "cruiser", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("fleets", "battleship", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("fleets", "carrier", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("neutral_zones", "level", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn("neutral_zones", "map_x", "INTEGER NOT NULL DEFAULT 50");
  await ensureColumn("neutral_zones", "map_y", "INTEGER NOT NULL DEFAULT 50");
  await ensureColumn("neutral_zones", "recommended_power", "INTEGER NOT NULL DEFAULT 100");
  await ensureColumn("neutral_zones", "faction", "TEXT NOT NULL DEFAULT 'neutral'");
  await ensureColumn("missions", "attacker_fleet_json", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("missions", "attacker_fleet_slot", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn("missions", "attacker_admiral_id", "INTEGER");
  await seedNeutralZones();
  await normalizeZoneOwnership();
  await seedShipyardData();
  await seedTechTreeData();

  const users = await all("SELECT id FROM users");
  for (const user of users) {
    await ensureBase(user.id);
    await ensureStarterDesign(user.id);
    await run("INSERT OR IGNORE INTO user_settings (user_id, admiral_policy) VALUES (?, 'capture')", [user.id]);
    await run(
      "INSERT OR IGNORE INTO city_buildings (user_id, shipyard_level, government_level, housing_level, research_lab_level, tactical_center_level) VALUES (?, 1, 1, 1, 1, 1)",
      [user.id]
    );
    await ensureFleetGroups(user.id);
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function signAdminToken(userId) {
  return jwt.sign(
    { admin: true, issuedBy: userId },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function readToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return header;
}

function requireAuth(req, res, next) {
  const token = readToken(req);

  if (!token) {
    return res.status(401).json({ error: "\uc778\uc99d \ud1a0\ud070\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub85c\uadf8\uc778\ud558\uc138\uc694." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: "\ud1a0\ud070\uc774 \ub9cc\ub8cc\ub418\uc5c8\uac70\ub098 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4." });
  }
}

function requireAdmin(req, res, next) {
  const token = String(req.headers["x-admin-token"] || "");
  if (!token) {
    return res.status(401).json({ error: "개발자 인증이 필요합니다." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.admin) {
      return res.status(401).json({ error: "개발자 인증이 유효하지 않습니다." });
    }
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "개발자 인증이 만료되었거나 유효하지 않습니다." });
  }
}

function policyOptionKeys(category) {
  return (Array.isArray(STRATEGIC_POLICIES[category]) ? STRATEGIC_POLICIES[category] : []).map((item) => String(item.key));
}

function normalizePolicySelection(row = {}) {
  const economyKeys = policyOptionKeys("economy");
  const industryKeys = policyOptionKeys("industry");
  const militaryKeys = policyOptionKeys("military");
  return {
    economy: economyKeys.includes(String(row.economy_policy || "")) ? String(row.economy_policy) : DEFAULT_POLICY_SELECTION.economy,
    industry: industryKeys.includes(String(row.industry_policy || "")) ? String(row.industry_policy) : DEFAULT_POLICY_SELECTION.industry,
    military: militaryKeys.includes(String(row.military_policy || "")) ? String(row.military_policy) : DEFAULT_POLICY_SELECTION.military
  };
}

function getStrategicPolicyOptions() {
  return Object.entries(STRATEGIC_POLICIES).reduce((acc, [category, options]) => {
    acc[category] = (Array.isArray(options) ? options : []).map((item) => ({
      key: String(item.key),
      name: String(item.name),
      description: String(item.description || ""),
      effects: item.effects || {}
    }));
    return acc;
  }, {});
}

function getStrategicPolicyEffects(selection) {
  const normalized = normalizePolicySelection({
    economy_policy: selection?.economy,
    industry_policy: selection?.industry,
    military_policy: selection?.military
  });
  const result = { resourcePct: 0, buildCostPct: 0, combatPct: 0, movementPct: 0, defensePct: 0 };
  for (const [category, key] of Object.entries(normalized)) {
    const found = (STRATEGIC_POLICIES[category] || []).find((item) => String(item.key) === String(key));
    const effects = found?.effects || {};
    result.resourcePct += Number(effects.resourcePct || 0);
    result.buildCostPct += Number(effects.buildCostPct || 0);
    result.combatPct += Number(effects.combatPct || 0);
    result.movementPct += Number(effects.movementPct || 0);
    result.defensePct += Number(effects.defensePct || 0);
  }
  return result;
}

async function getUserSettings(userId) {
  let row = await get(
    "SELECT admiral_policy, economy_policy, industry_policy, military_policy, policy_locked_until FROM user_settings WHERE user_id = ?",
    [userId]
  );
  if (!row) {
    await run(
      "INSERT INTO user_settings (user_id, admiral_policy, economy_policy, industry_policy, military_policy, policy_locked_until) VALUES (?, 'capture', ?, ?, ?, 0)",
      [userId, DEFAULT_POLICY_SELECTION.economy, DEFAULT_POLICY_SELECTION.industry, DEFAULT_POLICY_SELECTION.military]
    );
    row = {
      admiral_policy: "capture",
      economy_policy: DEFAULT_POLICY_SELECTION.economy,
      industry_policy: DEFAULT_POLICY_SELECTION.industry,
      military_policy: DEFAULT_POLICY_SELECTION.military,
      policy_locked_until: 0
    };
  }
  const admiralPolicy = ["capture", "kill", "release"].includes(String(row.admiral_policy || "capture"))
    ? String(row.admiral_policy)
    : "capture";
  const policies = normalizePolicySelection(row);
  const policyEffects = getStrategicPolicyEffects(policies);
  const policyLockedUntil = Number(row.policy_locked_until || 0);
  return {
    admiralPolicy,
    policies,
    policyEffects,
    policyLockedUntil,
    policyLockedRemainingSeconds: Math.max(0, Math.ceil((policyLockedUntil - Date.now()) / 1000)),
    policyOptions: getStrategicPolicyOptions()
  };
}

function ownerColorHex(ownerId) {
  if (!ownerId) return "#9de7d9";
  const hue = (Number(ownerId) * 47) % 360;
  return `hsl(${hue} 70% 62%)`;
}

function hullUnlockRequirement(hullKey) {
  const map = {
    corvette: { type: "lab", level: 1 },
    destroyer: { type: "tech", key: "destroyer_blueprint" },
    cruiser: { type: "tech", key: "cruiser_command" },
    monitor: { type: "tech", key: "unlock_monitor" },
    battleship: { type: "tech", key: "unlock_battleship" },
    carrier: { type: "tech", key: "unlock_carrier" },
    dreadnought: { type: "tech", key: "unlock_dreadnought" },
    titan: { type: "tech", key: "unlock_titan" }
  };
  return map[hullKey] || { type: "lab", level: 1 };
}

function componentTierByPower(powerCost) {
  const power = Number(powerCost || 0);
  if (power <= 14) return 1;
  if (power <= 20) return 2;
  if (power <= 28) return 3;
  if (power <= 36) return 4;
  if (power <= 46) return 5;
  if (power <= 58) return 6;
  if (power <= 72) return 7;
  if (power <= 90) return 8;
  if (power <= 115) return 9;
  return 10;
}

function tunedComponentForTier(baseComponent) {
  const component = { ...baseComponent };
  const tier = componentTierByPower(component.power);
  if (tier <= 5) return component;
  const growth = tier - 5;
  const statMult = 1 + (growth * 0.13);
  const speedMult = 1 + (growth * 0.06);
  const costMult = 1 + (growth * 0.11);
  const powerMult = 1 + (growth * 0.05);
  component.hp = Math.round(Number(component.hp || 0) * statMult);
  component.attack = Math.round(Number(component.attack || 0) * statMult);
  component.defense = Math.round(Number(component.defense || 0) * statMult);
  const speed = Number(component.speed || 0);
  component.speed = speed >= 0
    ? Math.round(speed * speedMult)
    : Math.round(speed * (1 + ((speedMult - 1) * 0.5)));
  component.power = Math.max(1, Math.round(Number(component.power || 0) * powerMult));
  component.powerBonus = Math.round(Number(component.powerBonus || 0) * statMult);
  component.metal = Math.max(1, Math.round(Number(component.metal || 0) * costMult));
  component.fuel = Math.max(1, Math.round(Number(component.fuel || 0) * costMult));
  return component;
}

function componentUnlockRequirement(component) {
  const basicKeys = new Set(["standard_engine", "light_railgun", "reinforced_armor", "cargo_module"]);
  const key = String(component?.key || "");
  if (basicKeys.has(key)) {
    return { type: "lab", level: 1 };
  }
  return { type: "tech", key: componentUnlockNodeKey(key) };
}

function isUnlockedByResearch(requirement, research) {
  if (String(requirement?.type || "") === "tech") {
    const keys = Array.isArray(research?.techKeys) ? research.techKeys : [];
    return keys.includes(String(requirement.key || ""));
  }
  if (String(requirement?.type || "") === "lab") {
    return Number(research?.labLevel || 1) >= Number(requirement.level || 1);
  }
  const level = Number(research?.[requirement.type] || 0);
  return level >= Number(requirement.level || 0);
}

async function getIncomingAlerts(userId) {
  const rows = await all(
    `
      SELECT id, mission_id, attacker_user_id, attacker_username, attack_power, ship_count, arrive_at, status, created_at
      FROM incoming_alerts
      WHERE target_user_id = ? AND status = 'active'
      ORDER BY arrive_at ASC, id ASC
      LIMIT 20
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    missionId: row.mission_id,
    attackerUserId: row.attacker_user_id,
    attackerUsername: row.attacker_username,
    targetKind: String(row.target_kind || "base"),
    targetName: String(row.target_name || ""),
    attackPower: Number(row.attack_power || 0),
    shipCount: Number(row.ship_count || 0),
    arriveAt: Number(row.arrive_at || 0),
    remainingSeconds: Math.max(0, Math.ceil((Number(row.arrive_at || 0) - Date.now()) / 1000)),
    createdAt: Number(row.created_at || 0)
  }));
}

async function getSpeedupState(userId, category) {
  const key = String(category || "").trim().toLowerCase();
  let row = await get(
    "SELECT streak, last_used_at FROM speedup_usage WHERE user_id = ? AND category = ?",
    [userId, key]
  );
  if (!row) {
    await run(
      "INSERT INTO speedup_usage (user_id, category, streak, last_used_at) VALUES (?, ?, 0, 0)",
      [userId, key]
    );
    row = { streak: 0, last_used_at: 0 };
  }
  return {
    streak: Math.max(0, Number(row.streak || 0)),
    lastUsedAt: Math.max(0, Number(row.last_used_at || 0))
  };
}

function speedupPenaltyMultiplier(streak) {
  const s = Math.max(0, Number(streak || 0));
  if (s >= 20) return 1.1;
  if (s >= 12) return 1.08;
  if (s >= 7) return 1.06;
  if (s >= 3) return 1.03;
  return 1.0;
}

function speedupResourcePerSecondFor(category, streak) {
  const key = String(category || "").trim().toLowerCase();
  const s = Math.max(0, Number(streak || 0));
  if (key === "research") {
    // research: 50 resource = 1 sec, penalty rises up to 100 resource = 1 sec
    return Math.min(100, 50 + (s * 5));
  }
  const multiplier = speedupPenaltyMultiplier(s);
  return Math.max(1, Math.ceil(SPEEDUP_RESOURCE_PER_SECOND * multiplier));
}

async function consumeSpeedup(userId, category, amount) {
  const state = await getSpeedupState(userId, category);
  const now = Date.now();
  const resetWindowMs = 10 * 60 * 1000;
  const activeStreak = now - state.lastUsedAt > resetWindowMs ? 0 : state.streak;
  const resourcePerSecond = speedupResourcePerSecondFor(category, activeStreak);
  const multiplier = Number((resourcePerSecond / Math.max(1, SPEEDUP_RESOURCE_PER_SECOND)).toFixed(3));
  const reducedSeconds = Math.floor(Number(amount || 0) / resourcePerSecond);
  if (reducedSeconds < 1) {
    return {
      ok: false,
      reducedSeconds: 0,
      streak: activeStreak,
      nextStreak: activeStreak,
      multiplier,
      resourcePerSecond
    };
  }
  const nextStreak = Math.min(99, activeStreak + 1);
  await run(
    "UPDATE speedup_usage SET streak = ?, last_used_at = ? WHERE user_id = ? AND category = ?",
    [nextStreak, now, userId, String(category || "").trim().toLowerCase()]
  );
  return {
    ok: true,
    reducedSeconds,
    streak: activeStreak,
    nextStreak,
    multiplier,
    resourcePerSecond
  };
}

function cityUpgradeCost(buildingKey, level) {
  const building = CITY_BUILDINGS[buildingKey];
  return {
    metal: Math.floor(building.baseMetal * Math.pow(building.metalGrowth, Math.max(0, level - 1))),
    fuel: Math.floor(building.baseFuel * Math.pow(building.fuelGrowth, Math.max(0, level - 1)))
  };
}

function cityBonusesFromLevels(levels) {
  return {
    baseMetalFlat: levels.government * 3 + Math.floor(levels.housing * 0.8),
    baseFuelFlat: levels.government * 2 + Math.floor(levels.research_lab * 0.6),
    colonyCap: 2 + levels.government * 2,
    researchCap: 2 + levels.research_lab * 2,
    populationCap: 40 + levels.housing * 24,
    buildLines: 1 + Math.floor((levels.shipyard - 1) / 2),
    buildTimeMultiplier: Math.max(0.2, 1 - levels.shipyard * 0.1),
    buildCostMultiplier: Math.max(0.45, 1 - levels.shipyard * 0.02),
    combatBonus: levels.tactical_center * 0.08,
    movementBonus: levels.tactical_center * 0.03,
    fleetSlotLimit: Math.min(5, 3 + Math.floor((levels.tactical_center - 1) / 2))
  };
}

function cityBuildingEffectSummary(key, levels, bonuses, nextBonuses) {
  if (key === "shipyard") {
    return {
      current: `\uc81c\uc791\ub77c\uc778 ${bonuses.buildLines}, \uc81c\uc791\uc2dc\uac04 x${bonuses.buildTimeMultiplier.toFixed(2)}, \uc81c\uc791\ube44\uc6a9 x${bonuses.buildCostMultiplier.toFixed(2)}`,
      next: `\uc81c\uc791\ub77c\uc778 ${nextBonuses.buildLines}, \uc81c\uc791\uc2dc\uac04 x${nextBonuses.buildTimeMultiplier.toFixed(2)}, \uc81c\uc791\ube44\uc6a9 x${nextBonuses.buildCostMultiplier.toFixed(2)}`
    };
  }
  if (key === "government") {
    return {
      current: `\uae30\uc9c0\uc790\uc6d0 +\uae08\uc18d ${bonuses.baseMetalFlat} / +\uc5f0\ub8cc ${bonuses.baseFuelFlat}, \uc2dd\ubbfc\uc9c0 \uc0c1\ud55c ${bonuses.colonyCap}`,
      next: `\uae30\uc9c0\uc790\uc6d0 +\uae08\uc18d ${nextBonuses.baseMetalFlat} / +\uc5f0\ub8cc ${nextBonuses.baseFuelFlat}, \uc2dd\ubbfc\uc9c0 \uc0c1\ud55c ${nextBonuses.colonyCap}`
    };
  }
  if (key === "housing") {
    return {
      current: `\ud568\uc120 \ubcf4\uc720 \uc0c1\ud55c ${bonuses.populationCap}, \uae30\uc9c0 \uae08\uc18d +${bonuses.baseMetalFlat}`,
      next: `\ud568\uc120 \ubcf4\uc720 \uc0c1\ud55c ${nextBonuses.populationCap}, \uae30\uc9c0 \uae08\uc18d +${nextBonuses.baseMetalFlat}`
    };
  }
  if (key === "research_lab") {
    return {
      current: `\uc5f0\uad6c \uc0c1\ud55c ${bonuses.researchCap}, \uae30\uc9c0 \uc5f0\ub8cc +${bonuses.baseFuelFlat}`,
      next: `\uc5f0\uad6c \uc0c1\ud55c ${nextBonuses.researchCap}, \uae30\uc9c0 \uc5f0\ub8cc +${nextBonuses.baseFuelFlat}`
    };
  }
  return {
    current: `\uc804\ud22c +${Math.round(bonuses.combatBonus * 100)}%, \uc774\ub3d9 +${Math.round(bonuses.movementBonus * 100)}%, \ud568\ub300\uc2ac\ub86f ${bonuses.fleetSlotLimit}`,
    next: `\uc804\ud22c +${Math.round(nextBonuses.combatBonus * 100)}%, \uc774\ub3d9 +${Math.round(nextBonuses.movementBonus * 100)}%, \ud568\ub300\uc2ac\ub86f ${nextBonuses.fleetSlotLimit}`
  };
}

async function getCityState(userId) {
  let row = await get(
    "SELECT shipyard_level, government_level, housing_level, research_lab_level, tactical_center_level FROM city_buildings WHERE user_id = ?",
    [userId]
  );
  if (!row) {
    await run(
      "INSERT INTO city_buildings (user_id, shipyard_level, government_level, housing_level, research_lab_level, tactical_center_level) VALUES (?, 1, 1, 1, 1, 1)",
      [userId]
    );
    row = {
      shipyard_level: 1,
      government_level: 1,
      housing_level: 1,
      research_lab_level: 1,
      tactical_center_level: 1
    };
  }

  const levels = {
    shipyard: Math.max(1, Number(row.shipyard_level || 1)),
    government: Math.max(1, Number(row.government_level || 1)),
    housing: Math.max(1, Number(row.housing_level || 1)),
    research_lab: Math.max(1, Number(row.research_lab_level || 1)),
    tactical_center: Math.max(1, Number(row.tactical_center_level || 1))
  };
  const bonuses = cityBonusesFromLevels(levels);
  const colonyRow = await get("SELECT COUNT(*) AS cnt FROM occupied_zones WHERE user_id = ?", [userId]);
  const colonyCount = Number(colonyRow?.cnt || 0);
  const buildingList = Object.values(CITY_BUILDINGS).map((item) => {
    const level = levels[item.key];
    const nextLevels = { ...levels, [item.key]: level + 1 };
    const nextBonuses = cityBonusesFromLevels(nextLevels);
    const effect = cityBuildingEffectSummary(item.key, levels, bonuses, nextBonuses);
    return {
      key: item.key,
      name: item.name,
      description: item.description,
      level,
      currentEffect: effect.current,
      nextEffect: effect.next,
      nextCost: cityUpgradeCost(item.key, level + 1)
    };
  });

  return { levels, bonuses, colonyCount, buildings: buildingList };
}

async function ensureFleetGroups(userId) {
  const defaults = [1, 2, 3, 4, 5].map((slot) => ({ slot, name: `함대 ${slot}` }));
  for (const item of defaults) {
    await run(
      "INSERT OR IGNORE INTO fleet_groups (user_id, slot_index, name, admiral_id, ship_plan_json) VALUES (?, ?, ?, NULL, '[]')",
      [userId, item.slot, item.name]
    );
  }
}

function normalizeShipPlan(plan) {
  if (!Array.isArray(plan)) return [];
  const normalized = [];
  const used = new Set();
  for (const raw of plan) {
    const designId = Number.parseInt(raw?.designId, 10);
    const quantity = Math.max(0, Number.parseInt(raw?.quantity, 10) || 0);
    if (!Number.isInteger(designId) || quantity <= 0 || used.has(designId)) continue;
    used.add(designId);
    normalized.push({ designId, quantity });
  }
  return normalized;
}

async function getFleetGroups(userId) {
  await ensureFleetGroups(userId);
  const owned = await all(
    `
      SELECT os.design_id, os.quantity, d.name, d.final_hp, d.final_attack, d.final_defense, d.final_speed
      FROM owned_ships os
      JOIN ship_designs d ON d.id = os.design_id
      WHERE os.user_id = ? AND os.quantity > 0
    `,
    [userId]
  );
  const ownedByDesign = new Map();
  for (const row of owned) {
    ownedByDesign.set(Number(row.design_id), {
      quantity: Number(row.quantity || 0),
      name: row.name,
      finalHp: Number(row.final_hp || 0),
      finalAttack: Number(row.final_attack || 0),
      finalDefense: Number(row.final_defense || 0),
      finalSpeed: Number(row.final_speed || 0)
    });
  }

  const rows = await all(
    `
      SELECT fg.slot_index, fg.name, fg.admiral_id, fg.ship_plan_json,
             a.name AS admiral_name, a.rarity AS admiral_rarity, a.combat_bonus AS admiral_combat
      FROM fleet_groups fg
      LEFT JOIN admirals a ON a.id = fg.admiral_id AND a.user_id = fg.user_id
      WHERE fg.user_id = ?
      ORDER BY fg.slot_index ASC
    `,
    [userId]
  );
  return rows.map((row) => {
    let plan = [];
    try {
      plan = normalizeShipPlan(JSON.parse(row.ship_plan_json || "[]"));
    } catch (err) {
      plan = [];
    }
    const cappedFleet = [];
    for (const ship of plan) {
      const ownedShip = ownedByDesign.get(Number(ship.designId));
      if (!ownedShip) continue;
      const qty = Math.min(Number(ownedShip.quantity || 0), Number(ship.quantity || 0));
      if (qty <= 0) continue;
      cappedFleet.push({
        designId: Number(ship.designId),
        name: ownedShip.name,
        quantity: qty,
        finalHp: ownedShip.finalHp,
        finalAttack: ownedShip.finalAttack,
        finalDefense: ownedShip.finalDefense,
        finalSpeed: ownedShip.finalSpeed
      });
    }
    const basePower = Math.floor(designFleetPower(cappedFleet));
    const admiralCombatBonus = Number(row.admiral_combat || 0);
    const fleetCombatPower = Math.floor(basePower * (1 + admiralCombatBonus * 0.9));
    return {
      slot: Number(row.slot_index || 0),
      name: String(row.name || ""),
      admiralId: row.admiral_id ? Number(row.admiral_id) : null,
      admiralName: row.admiral_name || null,
      admiralRarity: row.admiral_rarity || null,
      admiralCombatBonus,
      basePower,
      fleetCombatPower,
      totalShips: cappedFleet.reduce((sum, ship) => sum + Number(ship.quantity || 0), 0),
      ships: plan
    };
  });
}

async function getLaunchFleetFromSlot(userId, slot) {
  const slotNumber = Number.parseInt(slot, 10);
  if (!Number.isInteger(slotNumber) || slotNumber < 1) {
    return { slot: 1, fleet: [], admiral: null };
  }
  await ensureFleetGroups(userId);
  const row = await get(
    `
      SELECT fg.slot_index, fg.admiral_id, fg.ship_plan_json,
             a.id AS aid, a.name AS aname, a.rarity AS ararity,
             a.combat_bonus AS acombat, a.resource_bonus AS aresource, a.cost_bonus AS acost
      FROM fleet_groups fg
      LEFT JOIN admirals a ON a.id = fg.admiral_id AND a.user_id = fg.user_id AND a.status = 'active'
      WHERE fg.user_id = ? AND fg.slot_index = ?
    `,
    [userId, slotNumber]
  );
  if (!row) return { slot: slotNumber, fleet: [], admiral: null };

  let plan = [];
  try {
    plan = normalizeShipPlan(JSON.parse(row.ship_plan_json || "[]"));
  } catch (err) {
    plan = [];
  }
  const owned = await all(
    `
      SELECT os.design_id, os.quantity, d.name, d.final_hp, d.final_attack, d.final_defense, d.final_speed
      FROM owned_ships os
      JOIN ship_designs d ON d.id = os.design_id
      WHERE os.user_id = ? AND os.quantity > 0
    `,
    [userId]
  );
  const ownedByDesign = new Map();
  for (const ship of owned) {
    ownedByDesign.set(Number(ship.design_id), {
      quantity: Number(ship.quantity || 0),
      name: ship.name,
      finalHp: Number(ship.final_hp || 0),
      finalAttack: Number(ship.final_attack || 0),
      finalDefense: Number(ship.final_defense || 0),
      finalSpeed: Number(ship.final_speed || 0)
    });
  }
  const fleet = [];
  for (const item of plan) {
    const ownedShip = ownedByDesign.get(item.designId);
    if (!ownedShip) continue;
    const useCount = Math.min(ownedShip.quantity, Number(item.quantity || 0));
    if (useCount <= 0) continue;
    fleet.push({
      designId: item.designId,
      name: ownedShip.name,
      quantity: useCount,
      finalHp: ownedShip.finalHp,
      finalAttack: ownedShip.finalAttack,
      finalDefense: ownedShip.finalDefense,
      finalSpeed: ownedShip.finalSpeed
    });
  }

  const admiral = row.aid
    ? {
        id: Number(row.aid),
        name: row.aname,
        rarity: row.ararity,
        combatBonus: Number(row.acombat || 0),
        resourceBonus: Number(row.aresource || 0),
        costBonus: Number(row.acost || 0)
      }
    : null;

  return { slot: slotNumber, fleet, admiral };
}

async function getTotalShipCount(userId) {
  const owned = await get("SELECT COALESCE(SUM(quantity), 0) AS cnt FROM owned_ships WHERE user_id = ?", [userId]);
  const queued = await get("SELECT COALESCE(SUM(quantity), 0) AS cnt FROM production_queue WHERE user_id = ? AND status = 'building'", [userId]);
  return Number(owned?.cnt || 0) + Number(queued?.cnt || 0);
}

async function applyFleetLosses(userId, startFleet, remainingFleet) {
  const startMap = new Map();
  for (const ship of Array.isArray(startFleet) ? startFleet : []) {
    const key = Number.parseInt(ship.designId, 10);
    if (!Number.isInteger(key)) continue;
    startMap.set(key, Number(ship.quantity || 0));
  }
  const remainMap = new Map();
  for (const ship of Array.isArray(remainingFleet) ? remainingFleet : []) {
    const key = Number.parseInt(ship.designId, 10);
    if (!Number.isInteger(key)) continue;
    remainMap.set(key, Number(ship.quantity || 0));
  }

  for (const [designId, startQty] of startMap.entries()) {
    const remainQty = Math.max(0, Number(remainMap.get(designId) || 0));
    const loss = Math.max(0, startQty - remainQty);
    if (loss <= 0) continue;
    await run(
      "UPDATE owned_ships SET quantity = CASE WHEN quantity > ? THEN quantity - ? ELSE 0 END WHERE user_id = ? AND design_id = ?",
      [loss, loss, userId, designId]
    );
  }
}

async function getProductionRates(userId) {
  const bonus = await get(
    `
      SELECT
        COALESCE(SUM(z.metal_rate), 0) AS metal,
        COALESCE(SUM(z.fuel_rate), 0) AS fuel
      FROM occupied_zones oz
      JOIN neutral_zones z ON z.id = oz.zone_id
      WHERE oz.user_id = ?
    `,
    [userId]
  );

  const playerBonuses = await getPlayerBonuses(userId);
  const city = playerBonuses.city?.bonuses || {};
  const baseMetal = BASE_PRODUCTION.metal + Number(city.baseMetalFlat || 0);
  const baseFuel = BASE_PRODUCTION.fuel + Number(city.baseFuelFlat || 0);
  const rawMetal = baseMetal + Number(bonus?.metal || 0);
  const rawFuel = baseFuel + Number(bonus?.fuel || 0);

  return {
    metal: Math.floor(rawMetal * playerBonuses.resourceMultiplier * 100) / 100,
    fuel: Math.floor(rawFuel * playerBonuses.resourceMultiplier * 100) / 100,
    base: { metal: baseMetal, fuel: baseFuel },
    zones: {
      metal: Number(bonus?.metal || 0),
      fuel: Number(bonus?.fuel || 0)
    },
    multiplier: playerBonuses.resourceMultiplier
  };
}

async function getResearch(userId) {
  await processTechQueueForUser(userId);
  const city = await getCityState(userId);
  const govLevel = Number(city?.levels?.government || 1);
  const techRows = await all("SELECT tech_key FROM user_tech WHERE user_id = ?", [userId]);
  const techKeys = techRows.map((row) => String(row.tech_key || ""));
  return {
    resource: govLevel,
    logistics: govLevel,
    tactics: govLevel,
    labLevel: Number(city?.levels?.research_lab || 1),
    techKeys
  };
}

async function processTechQueueForUser(userId) {
  const now = Date.now();
  const due = await all(
    "SELECT id, tech_key FROM tech_queue WHERE user_id = ? AND status = 'researching' AND end_time <= ? ORDER BY id ASC",
    [userId, now]
  );
  for (const row of due) {
    await run("BEGIN TRANSACTION");
    try {
      await run(
        "INSERT OR IGNORE INTO user_tech (user_id, tech_key, researched_at) VALUES (?, ?, ?)",
        [userId, row.tech_key, now]
      );
      await run("UPDATE tech_queue SET status = 'completed' WHERE id = ?", [row.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
  }
}

async function getTechTreeState(userId) {
  await processTechQueueForUser(userId);
  const city = await getCityState(userId);
  const labLevel = Number(city?.levels?.research_lab || 1);
  const nodes = await all("SELECT * FROM tech_nodes ORDER BY tier ASC, id ASC");
  const researchedRows = await all("SELECT tech_key FROM user_tech WHERE user_id = ?", [userId]);
  const researchedSet = new Set(researchedRows.map((row) => String(row.tech_key || "")));
  const active = await get(
    "SELECT tech_key, start_time, end_time, status FROM tech_queue WHERE user_id = ? AND status = 'researching' ORDER BY id DESC LIMIT 1",
    [userId]
  );
  const activeKey = active ? String(active.tech_key || "") : null;
  const now = Date.now();

  const parsedNodes = nodes.map((node) => {
    let requires = [];
    try {
      requires = Array.isArray(JSON.parse(node.requires_json || "[]")) ? JSON.parse(node.requires_json || "[]") : [];
    } catch (err) {
      requires = [];
    }
    const isResearched = researchedSet.has(String(node.key));
    const requirementMet = requires.every((key) => researchedSet.has(String(key)));
    const sameBranchLocked = String(node.exclusive_group || "") && nodes.some((other) =>
      String(other.exclusive_group || "") === String(node.exclusive_group || "") &&
      String(other.key || "") !== String(node.key || "") &&
      researchedSet.has(String(other.key || ""))
    );
    const tierUnlocked = labLevel >= Number(node.tier || 1);
    const available = !isResearched && !sameBranchLocked && requirementMet && tierUnlocked && !activeKey;

    return {
      key: String(node.key),
      name: String(node.name),
      tier: Number(node.tier || 1),
      category: String(node.category || ""),
      description: String(node.description || ""),
      cost: { metal: Number(node.metal_cost || 0), fuel: Number(node.fuel_cost || 0) },
      researchTime: Number(node.research_time || 0),
      requires: requires.map((key) => String(key)),
      exclusiveGroup: String(node.exclusive_group || ""),
      effectType: String(node.effect_type || ""),
      effectValue: Number(node.effect_value || 0),
      unlockKey: String(node.unlock_key || ""),
      researched: isResearched,
      lockedByBranch: sameBranchLocked,
      available
    };
  });
  const maxTier = parsedNodes.length
    ? Math.max(...parsedNodes.map((node) => Number(node.tier || 1)))
    : 1;

  return {
    labLevel,
    labTierUnlocked: Math.max(1, Math.min(maxTier, labLevel)),
    nodes: parsedNodes,
    researchedKeys: Array.from(researchedSet),
    activeResearch: active
      ? {
          key: String(active.tech_key || ""),
          startTime: Number(active.start_time || 0),
          endTime: Number(active.end_time || 0),
          remainingSeconds: Math.max(0, Math.ceil((Number(active.end_time || 0) - now) / 1000))
        }
      : null
  };
}

async function getTechEffects(userId) {
  await processTechQueueForUser(userId);
  const rows = await all(
    `
      SELECT tn.effect_type, tn.effect_value, tn.unlock_key
      FROM user_tech ut
      JOIN tech_nodes tn ON tn.key = ut.tech_key
      WHERE ut.user_id = ?
    `,
    [userId]
  );
  const effect = {
    resourcePct: 0,
    movementPct: 0,
    combatPct: 0,
    defensePct: 0,
    buildCostPct: 0,
    buildLinesFlat: 0,
    populationCapFlat: 0,
    colonyCapFlat: 0,
    hulls: new Set(),
    components: new Set()
  };
  for (const row of rows) {
    const type = String(row.effect_type || "");
    const value = Number(row.effect_value || 0);
    if (type === "buff_resource_pct") effect.resourcePct += value;
    if (type === "buff_movement_pct") effect.movementPct += value;
    if (type === "buff_combat_pct") effect.combatPct += value;
    if (type === "buff_defense_pct") effect.defensePct += value;
    if (type === "buff_build_cost_pct") effect.buildCostPct += value;
    if (type === "buff_build_lines_flat") effect.buildLinesFlat += Math.floor(value);
    if (type === "buff_population_cap_flat") effect.populationCapFlat += Math.floor(value);
    if (type === "buff_colony_cap_flat") effect.colonyCapFlat += Math.floor(value);
    if (type === "unlock_hull" && row.unlock_key) effect.hulls.add(String(row.unlock_key));
    if (type === "unlock_component" && row.unlock_key) effect.components.add(String(row.unlock_key));
  }
  return effect;
}

async function getAssignedAdmiral(userId) {
  return get(
    `
      SELECT id, name, rarity, combat_bonus AS combatBonus,
             resource_bonus AS resourceBonus, cost_bonus AS costBonus, assigned, status
      FROM admirals
      WHERE user_id = ? AND assigned = 1 AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `,
    [userId]
  );
}

function commanderXpForNextLevel(level) {
  return Math.floor(240 + level * 180 + level * level * 65);
}

async function getCommanderProgress(userId) {
  let row = await get("SELECT level, xp FROM commander_progress WHERE user_id = ?", [userId]);
  if (!row) {
    await run("INSERT INTO commander_progress (user_id, level, xp) VALUES (?, 1, 0)", [userId]);
    row = { level: 1, xp: 0 };
  }
  const level = Math.max(1, Number(row.level || 1));
  const xp = Math.max(0, Number(row.xp || 0));
  const nextXp = commanderXpForNextLevel(level);
  return { level, xp, nextXp };
}

async function addCommanderXp(userId, amount) {
  const gain = Math.max(0, Math.floor(Number(amount || 0)));
  if (gain <= 0) return getCommanderProgress(userId);

  const progress = await getCommanderProgress(userId);
  let level = progress.level;
  let xp = progress.xp + gain;
  while (xp >= commanderXpForNextLevel(level)) {
    xp -= commanderXpForNextLevel(level);
    level += 1;
  }
  await run("UPDATE commander_progress SET level = ?, xp = ? WHERE user_id = ?", [level, xp, userId]);
  return getCommanderProgress(userId);
}

async function getPlayerBonuses(userId) {
  const research = await getResearch(userId);
  const techEffects = await getTechEffects(userId);
  const admiral = await getAssignedAdmiral(userId);
  const commander = await getCommanderProgress(userId);
  const city = await getCityState(userId);
  const settings = await getUserSettings(userId);
  const strategicPolicy = settings.policyEffects || { resourcePct: 0, buildCostPct: 0, combatPct: 0, movementPct: 0, defensePct: 0 };
  const govLevel = Number(city?.levels?.government || 1);
  const commanderResource = commander.level * 0.03;
  const commanderCost = commander.level * 0.015;
  const commanderCombat = commander.level * 0.04;
  const commanderMove = commander.level * 0.03;
  const policyResource = govLevel * 0.04;
  const policyCost = govLevel * 0.025;
  const policyCombat = govLevel * 0.03;
  const policyMovement = govLevel * 0.02;
  const resourceBonus =
    policyResource +
    Number(strategicPolicy.resourcePct || 0) +
    techEffects.resourcePct +
    Number(admiral?.resourceBonus || 0) +
    commanderResource;
  const costBonus =
    policyCost +
    Number(strategicPolicy.buildCostPct || 0) +
    techEffects.buildCostPct +
    Number(admiral?.costBonus || 0) +
    commanderCost +
    Number(city.bonuses.buildCostMultiplier ? 1 - city.bonuses.buildCostMultiplier : 0);
  const combatBonus =
    policyCombat +
    Number(strategicPolicy.combatPct || 0) +
    techEffects.combatPct +
    (techEffects.defensePct + Number(strategicPolicy.defensePct || 0)) * 0.35 +
    Number(admiral?.combatBonus || 0) +
    commanderCombat +
    Number(city.bonuses.combatBonus || 0);
  const movementBonus =
    policyMovement +
    Number(strategicPolicy.movementPct || 0) +
    techEffects.movementPct +
    Number(admiral?.combatBonus || 0) * 0.5 +
    Number(admiral?.resourceBonus || 0) * 0.25 +
    commanderMove +
    Number(city.bonuses.movementBonus || 0);
  const effectiveCityBonuses = {
    ...city.bonuses,
    buildLines: Math.max(1, Number(city.bonuses.buildLines || 1) + Number(techEffects.buildLinesFlat || 0)),
    populationCap: Math.max(1, Number(city.bonuses.populationCap || 0) + Number(techEffects.populationCapFlat || 0)),
    colonyCap: Math.max(1, Number(city.bonuses.colonyCap || 0) + Number(techEffects.colonyCapFlat || 0))
  };

  return {
    resourceMultiplier: 1 + resourceBonus,
    buildCostMultiplier: Math.max(0.5, 1 - costBonus),
    combatMultiplier: 1 + combatBonus,
    movementMultiplier: 1 + movementBonus,
    commander,
    research,
    settings,
    techEffects: {
      resourcePct: techEffects.resourcePct,
      movementPct: techEffects.movementPct,
      combatPct: techEffects.combatPct,
      defensePct: techEffects.defensePct,
      buildCostPct: techEffects.buildCostPct,
      buildLinesFlat: techEffects.buildLinesFlat,
      populationCapFlat: techEffects.populationCapFlat,
      colonyCapFlat: techEffects.colonyCapFlat,
      unlockedHulls: Array.from(techEffects.hulls),
      unlockedComponents: Array.from(techEffects.components)
    },
    admiral: admiral || null,
    city: {
      ...city,
      bonuses: effectiveCityBonuses
    }
  };
}

function researchCost(type, level) {
  const item = RESEARCH[type];
  return {
    metal: Math.floor(item.metalCost * Math.pow(item.metalGrowth, level)),
    fuel: Math.floor(item.fuelCost * Math.pow(item.fuelGrowth, level))
  };
}

function formatResearchState(research) {
  return Object.entries(RESEARCH).map(([type, item]) => {
    const level = research[type] || 0;
    return {
      type,
      name: item.name,
      description: item.description,
      level,
      effectPerLevel: item.effectPerLevel,
      nextCost: researchCost(type, level)
    };
  });
}

function formatRequirementText(requirement) {
  if (String(requirement?.type || "") === "tech") return `tech:${requirement.key}`;
  if (String(requirement?.type || "") === "lab") return `lab Lv.${requirement.level}`;
  return `${requirement.type} Lv.${requirement.level}`;
}

function buildUnlockSummary(research, hulls, components) {
  const requirementOrder = (requirement) => {
    const type = String(requirement?.type || "");
    if (type === "lab") return Number(requirement.level || 0);
    if (type === "tech") return 1000;
    return 500;
  };
  const unlockedHulls = hulls.filter((hull) => isUnlockedByResearch(hullUnlockRequirement(hull.key), research));
  const unlockedComponents = components.filter((component) => isUnlockedByResearch(componentUnlockRequirement(component), research));
  const nextHull = hulls
    .filter((hull) => !isUnlockedByResearch(hullUnlockRequirement(hull.key), research))
    .map((hull) => ({ name: hull.name, requirement: hullUnlockRequirement(hull.key) }))
    .sort((a, b) => requirementOrder(a.requirement) - requirementOrder(b.requirement))[0] || null;
  const nextComponent = components
    .filter((component) => !isUnlockedByResearch(componentUnlockRequirement(component), research))
    .map((component) => ({ name: component.name, requirement: componentUnlockRequirement(component) }))
    .sort((a, b) => requirementOrder(a.requirement) - requirementOrder(b.requirement))[0] || null;

  return {
    hulls: {
      unlocked: unlockedHulls.length,
      total: hulls.length,
      next: nextHull ? `${nextHull.name} (${formatRequirementText(nextHull.requirement)})` : "모든 선체 해금"
    },
    components: {
      unlocked: unlockedComponents.length,
      total: components.length,
      next: nextComponent ? `${nextComponent.name} (${formatRequirementText(nextComponent.requirement)})` : "모든 모듈 해금"
    }
  };
}

function parseComponentList(value, fallback) {
  if (Array.isArray(value)) return value.map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0);
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0);
  }
  if (Number.isInteger(fallback) && fallback > 0) return [fallback];
  return [];
}

function groupComponentsByCategory(components) {
  const grouped = { engine: [], weapon: [], defense: [], utility: [] };
  for (const component of components) {
    if (grouped[component.category]) grouped[component.category].push(component);
  }
  return grouped;
}

async function calculateDesign(input) {
  const hull = await get("SELECT * FROM hulls WHERE id = ?", [input.hullId]);
  if (!hull) {
    const error = new Error("\uc120\uccb4\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.");
    error.status = 400;
    throw error;
  }
  if (input.userId) {
    const research = await getResearch(input.userId);
    const hullReq = hullUnlockRequirement(hull.key);
    if (!isUnlockedByResearch(hullReq, research)) {
      const error = new Error(`해당 선체는 연구 ${hullReq.type} Lv.${hullReq.level} 이후 해금됩니다.`);
      error.status = 400;
      throw error;
    }
  }

  const engines = parseComponentList(input.engines, input.engineId);
  const weapons = parseComponentList(input.weapons, input.weaponId);
  const defenses = parseComponentList(input.defenses, input.defenseId);
  const utilities = parseComponentList(input.utilities, input.utilityId);
  const expected = {
    engine: Number(hull.slot_engine || 1),
    weapon: Number(hull.slot_weapon || 1),
    defense: Number(hull.slot_defense || 1),
    utility: Number(hull.slot_utility || 1)
  };

  if (engines.length > expected.engine || weapons.length > expected.weapon || defenses.length > expected.defense || utilities.length > expected.utility) {
    const error = new Error(
      `\uc2ac\ub86f \ucd08\uacfc \uc7a5\ucc29\uc785\ub2c8\ub2e4. \uc5d4\uc9c4 ${expected.engine}, \ubb34\uae30 ${expected.weapon}, \ubc29\uc5b4 ${expected.defense}, \ubcf4\uc870 ${expected.utility}`
    );
    error.status = 400;
    throw error;
  }

  const componentIds = [...engines, ...weapons, ...defenses, ...utilities];
  const components = [];
  for (const id of componentIds) {
    const component = await get("SELECT * FROM components WHERE id = ?", [id]);
    if (!component) {
      const error = new Error("\ubd80\ud488\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.");
      error.status = 400;
      throw error;
    }
    if (input.userId) {
      const research = input._research || await getResearch(input.userId);
      input._research = research;
      const requirement = componentUnlockRequirement(component);
      if (!isUnlockedByResearch(requirement, research)) {
        const error = new Error(`${component.name} 모듈은 연구 ${requirement.type} Lv.${requirement.level} 이후 해금됩니다.`);
        error.status = 400;
        throw error;
      }
    }
    components.push(component);
  }

  const byCategory = groupComponentsByCategory(components);
  for (const [category, count] of Object.entries(expected)) {
    if (byCategory[category].length > count) {
      const error = new Error(`${category} \ubd80\ud488\uc740 \ucd5c\ub300 ${count}\uac1c\uae4c\uc9c0 \uc7a5\ucc29 \uac00\ub2a5\ud569\ub2c8\ub2e4.`);
      error.status = 400;
      throw error;
    }
  }
  if (hull.key === "monitor") {
    if (byCategory.defense.length < Math.min(4, expected.defense)) {
      const error = new Error("\ubaa8\ub2c8\ud130 \uc120\uccb4\ub294 \ubc29\uc5b4 \ubaa8\ub4c8\uc744 \ucd5c\uc18c 4\uac1c \uc7a5\ucc29\ud574\uc57c \ud569\ub2c8\ub2e4.");
      error.status = 400;
      throw error;
    }
    if (byCategory.weapon.length > 1) {
      const error = new Error("\ubaa8\ub2c8\ud130 \uc120\uccb4\ub294 \ubb34\uae30 \uc2ac\ub86f\uc744 1\uac1c\uae4c\uc9c0\ub9cc \uc0ac\uc6a9 \uac00\ub2a5\ud569\ub2c8\ub2e4.");
      error.status = 400;
      throw error;
    }
  }

  const totalPower = components.reduce((sum, component) => sum + component.power_cost, 0);
  const bonusPowerLimit = components.reduce((sum, component) => sum + Number(component.power_bonus || 0), 0);
  const effectivePowerLimit = Number(hull.power_limit || 0) + bonusPowerLimit;
  if (totalPower > effectivePowerLimit) {
    const error = new Error(`\uc804\ub825 \uc81c\ud55c\uc744 \ucd08\uacfc\ud588\uc2b5\ub2c8\ub2e4. ${totalPower}/${effectivePowerLimit}`);
    error.status = 400;
    throw error;
  }

  const finalHp = hull.base_hp + components.reduce((sum, component) => sum + component.hp_bonus, 0);
  const finalAttack = components.reduce((sum, component) => sum + component.attack_bonus, 0);
  const finalDefense = components.reduce((sum, component) => sum + component.defense_bonus, 0);
  const finalSpeed = Math.max(1, hull.base_speed + components.reduce((sum, component) => sum + component.speed_bonus, 0));
  const totalMetalCost = hull.metal_cost + components.reduce((sum, component) => sum + component.metal_cost, 0);
  const totalFuelCost = hull.fuel_cost + components.reduce((sum, component) => sum + component.fuel_cost, 0);
  const slotWeight = expected.engine * 0.6 + expected.weapon * 1.2 + expected.defense + expected.utility * 0.7;
  const complexity = Math.pow(1 + totalPower / 110, 1.45);
  const totalBuildTime = Math.max(20, Math.floor(hull.base_build_time * complexity + slotWeight * 25));

  return {
    hull,
    components: byCategory,
    componentIds: {
      engines,
      weapons,
      defenses,
      utilities
    },
    finalHp,
    finalAttack,
    finalDefense,
    finalSpeed,
    totalPower,
    powerLimit: effectivePowerLimit,
    basePowerLimit: Number(hull.power_limit || 0),
    bonusPowerLimit,
    totalMetalCost,
    totalFuelCost,
    totalBuildTime
  };
}

function formatDesign(row, powerBonusById = {}) {
  const parseJson = (value, fallbackId) => {
    try {
      const parsed = JSON.parse(value || "[]");
      if (Array.isArray(parsed) && parsed.length) return parsed.map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0);
    } catch (err) {
      // ignore
    }
    return Number.isInteger(fallbackId) && fallbackId > 0 ? [fallbackId] : [];
  };

  const parsedComponents = {
    engines: parseJson(row.engine_components_json, row.engine_component_id),
    weapons: parseJson(row.weapon_components_json, row.weapon_component_id),
    defenses: parseJson(row.defense_components_json, row.defense_component_id),
    utilities: parseJson(row.utility_components_json, row.utility_component_id)
  };
  const allComponentIds = [...parsedComponents.engines, ...parsedComponents.weapons, ...parsedComponents.defenses, ...parsedComponents.utilities];
  const powerLimitBonus = allComponentIds.reduce((sum, id) => sum + Number(powerBonusById[id] || 0), 0);

  return {
    id: row.id,
    name: row.name,
    hullId: row.hull_id,
    hullName: row.hull_name,
    classType: row.class_type,
    components: parsedComponents,
    finalHp: row.final_hp,
    finalAttack: row.final_attack,
    finalDefense: row.final_defense,
    finalSpeed: row.final_speed,
    totalPower: row.total_power,
    powerLimit: Number(row.power_limit || 0) + powerLimitBonus,
    basePowerLimit: Number(row.power_limit || 0),
    bonusPowerLimit: powerLimitBonus,
    totalMetalCost: row.total_metal_cost,
    totalFuelCost: row.total_fuel_cost,
    totalBuildTime: row.total_build_time,
    createdAt: row.created_at
  };
}

async function getDesigns(userId) {
  const componentRows = await all("SELECT id, power_bonus FROM components");
  const powerBonusById = {};
  for (const row of componentRows) powerBonusById[row.id] = Number(row.power_bonus || 0);

  const rows = await all(
    `
      SELECT d.*, h.name AS hull_name, h.class_type, h.power_limit
      FROM ship_designs d
      JOIN hulls h ON h.id = d.hull_id
      WHERE d.user_id = ?
      ORDER BY d.id DESC
    `,
    [userId]
  );

  return rows.map((row) => formatDesign(row, powerBonusById));
}

async function processProductionQueue(userId) {
  const now = Date.now();
  const completed = await all(
    "SELECT * FROM production_queue WHERE user_id = ? AND status = 'building' AND end_time <= ?",
    [userId, now]
  );

  for (const item of completed) {
    await run("BEGIN TRANSACTION");
    try {
      await run(
        `
          INSERT INTO owned_ships (user_id, design_id, quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, design_id)
          DO UPDATE SET quantity = quantity + excluded.quantity
        `,
        [userId, item.design_id, item.quantity]
      );
      await run("UPDATE production_queue SET status = 'completed' WHERE id = ?", [item.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
  }
}

async function getProductionQueue(userId) {
  await processProductionQueue(userId);
  const rows = await all(
    `
      SELECT q.*, d.name AS design_name
      FROM production_queue q
      JOIN ship_designs d ON d.id = q.design_id
      WHERE q.user_id = ?
      ORDER BY q.id DESC
    `,
    [userId]
  );
  const now = Date.now();

  return rows.map((row) => ({
    id: row.id,
    designId: row.design_id,
    designName: row.design_name,
    quantity: row.quantity,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    remainingSeconds: row.status === "building" ? Math.max(0, Math.ceil((row.end_time - now) / 1000)) : 0
  }));
}

function parseDesignComponentIds(design) {
  const parseOrFallback = (jsonValue, fallback) => {
    try {
      const arr = JSON.parse(jsonValue || "[]");
      if (Array.isArray(arr) && arr.length) return arr.map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0);
    } catch (err) {
      // ignore
    }
    return Number.isInteger(fallback) && fallback > 0 ? [fallback] : [];
  };

  return {
    engines: parseOrFallback(design.engine_components_json, design.engine_component_id),
    weapons: parseOrFallback(design.weapon_components_json, design.weapon_component_id),
    defenses: parseOrFallback(design.defense_components_json, design.defense_component_id),
    utilities: parseOrFallback(design.utility_components_json, design.utility_component_id)
  };
}

async function getOwnedShips(userId) {
  await processProductionQueue(userId);
  const rows = await all(
    `
      SELECT os.quantity, d.*
      FROM owned_ships os
      JOIN ship_designs d ON d.id = os.design_id
      WHERE os.user_id = ? AND os.quantity > 0
      ORDER BY os.id DESC
    `,
    [userId]
  );

  return rows.map((row) => ({
    designId: row.id,
    name: row.name,
    quantity: row.quantity,
    finalHp: row.final_hp,
    finalAttack: row.final_attack,
    finalDefense: row.final_defense,
    finalSpeed: row.final_speed
  }));
}

async function ensureStarterDesign(userId) {
  const existing = await get("SELECT id FROM ship_designs WHERE user_id = ? LIMIT 1", [userId]);
  if (existing) return existing.id;

  const parts = await get(
    `
      SELECT
        h.id AS hull_id,
        e.id AS engine_id,
        w.id AS weapon_id,
        d.id AS defense_id,
        u.id AS utility_id
      FROM hulls h
      JOIN components e ON e.key = 'standard_engine'
      JOIN components w ON w.key = 'light_railgun'
      JOIN components d ON d.key = 'reinforced_armor'
      JOIN components u ON u.key = 'cargo_module'
      WHERE h.key = 'corvette'
      LIMIT 1
    `
  );
  if (!parts) return null;

  const calculated = await calculateDesign({
    hullId: parts.hull_id,
    engines: [parts.engine_id],
    weapons: [parts.weapon_id],
    defenses: [parts.defense_id],
    utilities: [parts.utility_id]
  });

  const result = await run(
    `
      INSERT INTO ship_designs
        (user_id, name, hull_id, engine_component_id, weapon_component_id, defense_component_id, utility_component_id,
         engine_components_json, weapon_components_json, defense_components_json, utility_components_json,
         final_hp, final_attack, final_defense, final_speed, total_power, total_metal_cost, total_fuel_cost, total_build_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      "\uc2a4\ud0c0\ud130 \uc21c\ucc30\ud568",
      parts.hull_id,
      parts.engine_id,
      parts.weapon_id,
      parts.defense_id,
      parts.utility_id,
      JSON.stringify(calculated.componentIds.engines),
      JSON.stringify(calculated.componentIds.weapons),
      JSON.stringify(calculated.componentIds.defenses),
      JSON.stringify(calculated.componentIds.utilities),
      calculated.finalHp,
      calculated.finalAttack,
      calculated.finalDefense,
      calculated.finalSpeed,
      calculated.totalPower,
      calculated.totalMetalCost,
      calculated.totalFuelCost,
      calculated.totalBuildTime,
      Date.now()
    ]
  );

  await run(
    "INSERT INTO owned_ships (user_id, design_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, design_id) DO NOTHING",
    [userId, result.lastID, 6]
  );

  return result.lastID;
}

async function getOwnedShipFleet(userId) {
  await ensureStarterDesign(userId);
  const ships = await getOwnedShips(userId);
  return ships.filter((ship) => Number(ship.quantity || 0) > 0);
}

function designFleetSummary(fleet) {
  const ships = Array.isArray(fleet) ? fleet : [];
  if (!ships.length) return "\uc5c6\uc74c";
  return ships.map((ship) => `${ship.name} ${Number(ship.quantity || 0)}\ucc99`).join(", ");
}

function designFleetPower(fleet) {
  const ships = Array.isArray(fleet) ? fleet : [];
  return ships.reduce((sum, ship) => {
    const attack = Number(ship.finalAttack || ship.attack || 0);
    const defense = Number(ship.finalDefense || ship.defense || 0);
    const hp = Number(ship.finalHp || ship.hp || 0);
    return sum + Number(ship.quantity || 0) * (attack + defense * 0.45 + hp * 0.12);
  }, 0);
}

function designFleetSpeed(fleet) {
  const ships = Array.isArray(fleet) ? fleet : [];
  const count = ships.reduce((sum, ship) => sum + Number(ship.quantity || 0), 0);
  if (count <= 0) return 0;

  const weightedSpeed = ships.reduce((sum, ship) => {
    return sum + Number(ship.quantity || 0) * Number(ship.finalSpeed || ship.speed || 1);
  }, 0) / count;
  const sizePenalty = 1 + count / 80;

  return Math.max(0.5, weightedSpeed / sizePenalty);
}

function travelTimeSecondsForDesignFleet(from, to, fleet, bonuses) {
  const dx = Number(from.x) - Number(to.x);
  const dy = Number(from.y) - Number(to.y);
  const distance = Math.sqrt(dx * dx + dy * dy) / MAP_DISTANCE_UNIT;
  const speed = designFleetSpeed(fleet) * Number(bonuses?.movementMultiplier || 1);
  return Math.max(10, Math.ceil((distance / Math.max(0.5, speed)) * 60));
}

function hasDesignShips(fleet) {
  return Array.isArray(fleet) && fleet.some((ship) => Number(ship.quantity || 0) > 0);
}

function cloneDesignFleet(fleet) {
  return (Array.isArray(fleet) ? fleet : []).map((ship) => ({
    designId: ship.designId || ship.id || ship.key || ship.name,
    name: ship.name,
    quantity: Math.max(0, Number(ship.quantity || 0)),
    finalHp: Math.max(1, Number(ship.finalHp || ship.hp || 1)),
    finalAttack: Math.max(1, Number(ship.finalAttack || ship.attack || 1)),
    finalDefense: Math.max(0, Number(ship.finalDefense || ship.defense || 0)),
    finalSpeed: Math.max(1, Number(ship.finalSpeed || ship.speed || 1))
  }));
}

function chooseDesignTarget(fleet) {
  return fleet
    .filter((ship) => ship.quantity > 0)
    .sort((a, b) => (a.finalHp + a.finalDefense * 2) - (b.finalHp + b.finalDefense * 2))[0];
}

function resolveDesignAttack(attacker, defender, prefix, multiplier = 1) {
  if (attacker.quantity <= 0 || !hasDesignShips(defender)) return null;

  const target = chooseDesignTarget(defender);
  if (!target) return null;

  const variance = 0.85 + Math.random() * 0.3;
  const damage = Math.max(1, Math.floor(attacker.quantity * attacker.finalAttack * variance * multiplier));
  const effectiveHp = Math.max(1, target.finalHp + target.finalDefense * 2);
  const destroyed = Math.min(target.quantity, Math.floor(damage / effectiveHp));
  if (destroyed > 0) target.quantity -= destroyed;

  return destroyed > 0
    ? `${prefix} ${attacker.name} -> ${target.name} ${destroyed}\ucc99 \uaca9\uce68`
    : `${prefix} ${attacker.name} -> ${target.name} \ud53c\ud574 ${damage}`;
}

function simulateDesignBattle(attackerInput, defenderInput, contextLabel, attackerMultiplier = 1, defenderMultiplier = 1) {
  const attacker = cloneDesignFleet(attackerInput);
  const defender = cloneDesignFleet(defenderInput);
  const log = [
    `[\uc804\ud22c \uac1c\uc2dc] ${contextLabel}`,
    `\uc544\uad70 \ud3b8\uc131: ${designFleetSummary(attacker)}`,
    `\uc801\uad70 \ud3b8\uc131: ${designFleetSummary(defender)}`
  ];

  for (let turn = 1; turn <= 8; turn += 1) {
    if (!hasDesignShips(attacker) || !hasDesignShips(defender)) break;

    log.push(`[${turn}\ud134]`);
    for (const ship of attacker) {
      const strike = resolveDesignAttack(ship, defender, "\uc544\uad70", attackerMultiplier);
      if (strike) log.push(strike);
    }

    if (!hasDesignShips(defender)) {
      log.push("\uc801 \ud568\ub300\uac00 \uc804\ud22c \uc9c0\uc18d \ub2a5\ub825\uc744 \uc0c1\uc2e4\ud588\uc2b5\ub2c8\ub2e4.");
      break;
    }

    for (const ship of defender) {
      const strike = resolveDesignAttack(ship, attacker, "\uc801\uad70", defenderMultiplier);
      if (strike) log.push(strike);
    }
  }

  const attackerScore = designFleetPower(attacker) * attackerMultiplier;
  const defenderScore = designFleetPower(defender) * defenderMultiplier;
  const result = attackerScore >= defenderScore ? "victory" : "defeat";

  log.push("[\uc804\ud22c \uc885\ub8cc]");
  log.push(result === "victory" ? "\uacb0\uacfc: \uc2b9\ub9ac." : "\uacb0\uacfc: \ud328\ubc30.");
  log.push(`\uc544\uad70 \uc794\uc874: ${designFleetSummary(attacker)}`);
  log.push(`\uc801\uad70 \uc794\uc874: ${designFleetSummary(defender)}`);

  return { result, log, remainingFleet: attacker, remainingEnemy: defender };
}

async function updateOwnedShipsFromBattle(userId, remainingFleet) {
  for (const ship of remainingFleet) {
    if (!Number.isInteger(Number(ship.designId))) continue;
    await run(
      "UPDATE owned_ships SET quantity = ? WHERE user_id = ? AND design_id = ?",
      [Math.max(0, Number(ship.quantity || 0)), userId, Number(ship.designId)]
    );
  }
}

function garrisonToDesignFleet(garrison) {
  const legacy = normalizeFleet(garrison);
  return SHIP_TYPES
    .filter((type) => legacy[type] > 0)
    .map((type) => ({
      designId: `garrison-${type}`,
      name: `\uc911\ub9bd ${SHIPS[type].name}`,
      quantity: legacy[type],
      finalHp: SHIPS[type].hp,
      finalAttack: SHIPS[type].attack,
      finalDefense: Math.floor(SHIPS[type].hp / 8),
      finalSpeed: SHIPS[type].speed
    }));
}

function formatMission(row) {
  const now = Date.now();
  return {
    id: row.id,
    missionType: row.mission_type,
    targetUserId: row.target_user_id,
    targetZoneId: row.target_zone_id,
    targetName: row.target_name,
    fleetSlot: Number(row.attacker_fleet_slot || 1),
    attackerAdmiralId: row.attacker_admiral_id ? Number(row.attacker_admiral_id) : null,
    from: { x: row.from_x, y: row.from_y },
    to: { x: row.to_x, y: row.to_y },
    startedAt: row.started_at,
    arriveAt: row.arrive_at,
    attackerPower: Number(row.attacker_power || 0),
    attackerShipCount: Number(row.attacker_ship_count || 0),
    status: row.status,
    result: row.result || null,
    remainingSeconds: row.status === "traveling" ? Math.max(0, Math.ceil((row.arrive_at - now) / 1000)) : 0
  };
}

async function addBattleRecord(userId, title, result, travelSeconds, log) {
  await run(
    `
      INSERT INTO battle_records (user_id, title, result, travel_seconds, created_at, log_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [userId, title, result, travelSeconds, Date.now(), JSON.stringify(log || [])]
  );
}

async function getBattleRecords(userId) {
  const rows = await all(
    `
      SELECT *
      FROM battle_records
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 40
    `,
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    result: row.result,
    travelSeconds: row.travel_seconds,
    createdAt: row.created_at,
    log: (() => {
      try {
        return JSON.parse(row.log_json || "[]");
      } catch (err) {
        return [];
      }
    })()
  }));
}

async function deleteUserCompletely(userId) {
  await run("BEGIN TRANSACTION");
  try {
    await run("DELETE FROM incoming_alerts WHERE target_user_id = ? OR attacker_user_id = ?", [userId, userId]);
    await run("DELETE FROM missions WHERE user_id = ? OR target_user_id = ?", [userId, userId]);
    await run("DELETE FROM battle_records WHERE user_id = ?", [userId]);
    await run("DELETE FROM production_queue WHERE user_id = ?", [userId]);
    await run("DELETE FROM owned_ships WHERE user_id = ?", [userId]);
    await run("DELETE FROM ship_designs WHERE user_id = ?", [userId]);
    await run("DELETE FROM occupied_zones WHERE user_id = ?", [userId]);
    await run("DELETE FROM zone_garrisons WHERE user_id = ?", [userId]);
    await run("DELETE FROM fleet_groups WHERE user_id = ?", [userId]);
    await run("DELETE FROM city_buildings WHERE user_id = ?", [userId]);
    await run("DELETE FROM ship_trade_logs WHERE from_user_id = ? OR to_user_id = ?", [userId, userId]);
    await run("DELETE FROM admirals WHERE user_id = ?", [userId]);
    await run("DELETE FROM commander_progress WHERE user_id = ?", [userId]);
    await run("DELETE FROM research WHERE user_id = ?", [userId]);
    await run("DELETE FROM user_settings WHERE user_id = ?", [userId]);
    await run("DELETE FROM speedup_usage WHERE user_id = ?", [userId]);
    await run("DELETE FROM bases WHERE user_id = ?", [userId]);
    await run("DELETE FROM fleets WHERE user_id = ?", [userId]);
    await run("DELETE FROM resources WHERE user_id = ?", [userId]);
    await run("DELETE FROM users WHERE id = ?", [userId]);
    await run("COMMIT");
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
}

async function getActiveMissions(userId) {
  const rows = await all(
    "SELECT * FROM missions WHERE user_id = ? AND status = 'traveling' ORDER BY arrive_at ASC",
    [userId]
  );
  return rows.map(formatMission);
}

async function resolveMission(mission) {
  if (mission.mission_type === "pvp") {
    const targetUser = await get("SELECT id, username FROM users WHERE id = ?", [mission.target_user_id]);
    if (!targetUser) {
      return {
        result: "failed",
        title: "\ucd9c\uaca9 \uc2e4\ud328",
        log: ["[\uc804\ud22c \ucde8\uc18c] \ub300\uc0c1 \uae30\uc9c0\uac00 \uc874\uc7ac\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4."]
      };
    }

    let attackerFleet = [];
    try {
      attackerFleet = cloneDesignFleet(JSON.parse(mission.attacker_fleet_json || "[]"));
    } catch (err) {
      attackerFleet = [];
    }
    if (!hasDesignShips(attackerFleet)) {
      attackerFleet = await getOwnedShipFleet(mission.user_id);
    }
    if (!hasDesignShips(attackerFleet)) {
      return {
        result: "failed",
        title: `${targetUser.username} \uae30\uc9c0 \uae30\uc2b5`,
        log: ["[\ucd9c\uaca9 \uc2e4\ud328] \ucd9c\uaca9 \uac00\ub2a5\ud55c \uc124\uacc4 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."]
      };
    }

    const defenderFleet = await getOwnedShipFleet(targetUser.id);
    const attackerBonuses = await getPlayerBonuses(mission.user_id);
    let fleetAdmiral = null;
    if (mission.attacker_admiral_id) {
      fleetAdmiral = await get(
        "SELECT id, combat_bonus AS combatBonus FROM admirals WHERE id = ? AND user_id = ? AND status = 'active'",
        [mission.attacker_admiral_id, mission.user_id]
      );
    }
    const attackerCombatMultiplier =
      attackerBonuses.combatMultiplier * (1 + Number(fleetAdmiral?.combatBonus || 0) * 0.9);
    const defenderBonuses = await getPlayerBonuses(targetUser.id);
    const travelSeconds = Math.max(10, Math.ceil((mission.arrive_at - mission.started_at) / 1000));

    let battle;
    if (!hasDesignShips(defenderFleet)) {
      battle = {
        result: "victory",
        log: [
          `[\uc804\ud22c \uac1c\uc2dc] ${targetUser.username} \uae30\uc9c0 \uae30\uc2b5`,
          "\uc801 \ubc29\uc5b4 \ud568\ub300\uac00 \uc5c6\uc5b4 \uc790\ub3d9 \uc2b9\ub9ac\ud588\uc2b5\ub2c8\ub2e4.",
          "[\uc804\ud22c \uc885\ub8cc]",
          "\uacb0\uacfc: \uc2b9\ub9ac."
        ],
        remainingFleet: attackerFleet,
        remainingEnemy: defenderFleet
      };
    } else {
      battle = simulateDesignBattle(
        attackerFleet,
        defenderFleet,
        `${targetUser.username} \uae30\uc9c0\ub97c \uae30\uc2b5\ud569\ub2c8\ub2e4.`,
        attackerCombatMultiplier,
        defenderBonuses.combatMultiplier
      );
    }

    const attackerState = await getUpdatedResources(mission.user_id);
    const defenderState = await getUpdatedResources(targetUser.id);
    const attackerSettings = await getUserSettings(mission.user_id);
    const loot = { metal: 0, fuel: 0 };
    let capturedAdmiral = null;
    let killedAdmiral = null;
    if (battle.result === "victory") {
      loot.metal = Math.min(Math.floor(defenderState.resources.metal * 0.2), 2000);
      loot.fuel = Math.min(Math.floor(defenderState.resources.fuel * 0.2), 1200);
      const defenderAdmiral = await getAssignedAdmiral(targetUser.id);
      if (defenderAdmiral) {
        if (attackerSettings.admiralPolicy === "kill") {
          killedAdmiral = defenderAdmiral;
        } else if (attackerSettings.admiralPolicy === "capture" && Math.random() < 0.65) {
          capturedAdmiral = defenderAdmiral;
        }
      }
    }

    await run("BEGIN TRANSACTION");
    try {
      await applyFleetLosses(mission.user_id, attackerFleet, battle.remainingFleet);
      await applyFleetLosses(targetUser.id, defenderFleet, battle.remainingEnemy);

      if (battle.result === "victory" && (loot.metal > 0 || loot.fuel > 0)) {
        await run("UPDATE resources SET metal = metal + ?, fuel = fuel + ? WHERE user_id = ?", [loot.metal, loot.fuel, mission.user_id]);
        await run("UPDATE resources SET metal = MAX(0, metal - ?), fuel = MAX(0, fuel - ?) WHERE user_id = ?", [loot.metal, loot.fuel, targetUser.id]);
      }
      if (capturedAdmiral) {
        await run(
          "UPDATE admirals SET user_id = ?, assigned = 0, status = 'active', dead_at = NULL, captured_from = ?, captured_at = ? WHERE id = ?",
          [mission.user_id, targetUser.id, Date.now(), capturedAdmiral.id]
        );
      }
      if (killedAdmiral) {
        await run(
          "UPDATE admirals SET assigned = 0, status = 'dead', dead_at = ? WHERE id = ? AND user_id = ?",
          [Date.now(), killedAdmiral.id, targetUser.id]
        );
      }
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const log = [...battle.log];
    if (battle.result === "victory") {
      log.push(`\uc57d\ud0c8 \uc131\uacf5: \uae08\uc18d ${loot.metal}, \uc5f0\ub8cc ${loot.fuel}`);
      if (capturedAdmiral) log.push(`\uc81c\ub3c5 \uc0dd\ud3ec: [${capturedAdmiral.rarity}] ${capturedAdmiral.name}`);
      if (killedAdmiral) log.push(`\uc81c\ub3c5 \uc0ac\ub9dd: [${killedAdmiral.rarity}] ${killedAdmiral.name}`);
      if (!capturedAdmiral && !killedAdmiral && attackerSettings.admiralPolicy === "release") {
        log.push("\uc81c\ub3c5 \ucc98\ubd84 \uc815\ucc45: \uc0dd\ud3ec \uc5c6\uc774 \uc0b4\ub824\ub454 \ud6c4 \ud6c4\ud1f4.");
      }
    } else {
      log.push("\uacf5\uaca9 \uc2e4\ud328: \uc57d\ud0c8\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
    }

    await addBattleRecord(
      mission.user_id,
      `${targetUser.username} \uae30\uc9c0 \uae30\uc2b5`,
      battle.result,
      travelSeconds,
      log
    );
    await addCommanderXp(mission.user_id, battle.result === "victory" ? 140 : 70);
    await addCommanderXp(targetUser.id, battle.result === "victory" ? 65 : 120);
    await addBattleRecord(
      targetUser.id,
      `\ubc29\uc5b4: ${targetUser.username} \uae30\uc9c0`,
      battle.result === "victory" ? "defeat" : "victory",
      travelSeconds,
      log
    );

    return { result: battle.result, title: `${targetUser.username} \uae30\uc9c0 \uae30\uc2b5`, log };
  }

  if (mission.mission_type === "zone") {
    const zone = await get("SELECT * FROM neutral_zones WHERE id = ?", [mission.target_zone_id]);
    if (!zone) {
      return {
        result: "failed",
        title: "\uc810\ub839 \uc2e4\ud328",
        log: ["[\uc804\ud22c \ucde8\uc18c] \ub300\uc0c1 \uac70\uc810\uc774 \uc874\uc7ac\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4."]
      };
    }

    const owner = await get(
      `
        SELECT oz.user_id, u.username
        FROM occupied_zones oz
        JOIN users u ON u.id = oz.user_id
        WHERE oz.zone_id = ?
      `,
      [zone.id]
    );
    if (owner?.user_id === mission.user_id) {
      return {
        result: "failed",
        title: `${zone.name} \uc810\ub839`,
        log: ["[\ucd9c\uaca9 \ucde8\uc18c] \uc774\ubbf8 \ub0b4 \uc810\ub839\uc9c0\uc785\ub2c8\ub2e4."]
      };
    }

    let fleet = [];
    try {
      fleet = cloneDesignFleet(JSON.parse(mission.attacker_fleet_json || "[]"));
    } catch (err) {
      fleet = [];
    }
    if (!hasDesignShips(fleet)) {
      fleet = await getOwnedShipFleet(mission.user_id);
    }
    if (!hasDesignShips(fleet)) {
      return {
        result: "failed",
        title: `${zone.name} \uc810\ub839`,
        log: ["[\ucd9c\uaca9 \uc2e4\ud328] \ucd9c\uaca9 \uac00\ub2a5\ud55c \uc124\uacc4 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."]
      };
    }

    let enemy = garrisonToDesignFleet(parseGarrison(zone));
    if (owner) {
      const garrisonRow = await get(
        "SELECT ship_plan_json FROM zone_garrisons WHERE user_id = ? AND zone_id = ?",
        [owner.user_id, zone.id]
      );
      if (garrisonRow) {
        try {
          const compact = normalizeShipPlan(JSON.parse(garrisonRow.ship_plan_json || "[]"));
          const ownerFleet = await getOwnedShipFleet(owner.user_id);
          const byId = new Map(ownerFleet.map((ship) => [Number(ship.designId), ship]));
          const picked = compact
            .map((item) => {
              const found = byId.get(Number(item.designId));
              if (!found) return null;
              return { ...found, quantity: Math.min(Number(found.quantity || 0), Number(item.quantity || 0)) };
            })
            .filter((item) => item && Number(item.quantity || 0) > 0);
          enemy = hasDesignShips(picked) ? picked : ownerFleet;
        } catch (err) {
          enemy = await getOwnedShipFleet(owner.user_id);
        }
      } else {
        enemy = await getOwnedShipFleet(owner.user_id);
      }
    }
    const playerBonuses = await getPlayerBonuses(mission.user_id);
    let fleetAdmiral = null;
    if (mission.attacker_admiral_id) {
      fleetAdmiral = await get(
        "SELECT id, combat_bonus AS combatBonus FROM admirals WHERE id = ? AND user_id = ? AND status = 'active'",
        [mission.attacker_admiral_id, mission.user_id]
      );
    }
    const attackerCombatMultiplier =
      playerBonuses.combatMultiplier * (1 + Number(fleetAdmiral?.combatBonus || 0) * 0.9);
    const defenderBonuses = owner ? await getPlayerBonuses(owner.user_id) : { combatMultiplier: 1 };
    const travelSeconds = Math.max(10, Math.ceil((mission.arrive_at - mission.started_at) / 1000));
    const battle = simulateDesignBattle(
      fleet,
      enemy,
      owner ? `${owner.username}\uc758 ${zone.name} \uc810\ub839\uc9c0 \ud0c8\ucde8 \uc804\ud22c` : `${zone.name} \uc810\ub839 \uc804\ud22c`,
      attackerCombatMultiplier,
      defenderBonuses.combatMultiplier
    );

    await run("BEGIN TRANSACTION");
    try {
      await applyFleetLosses(mission.user_id, fleet, battle.remainingFleet);
      if (owner) await applyFleetLosses(owner.user_id, enemy, battle.remainingEnemy);
      if (battle.result === "victory") {
        const occupiedCount = await get("SELECT COUNT(*) AS cnt FROM occupied_zones WHERE user_id = ?", [mission.user_id]);
        const ownerBonuses = await getPlayerBonuses(mission.user_id);
        const city = ownerBonuses.city;
        if (Number(occupiedCount?.cnt || 0) >= Number(city.bonuses.colonyCap || 0)) {
          await run("COMMIT");
          return {
            result: "defeat",
            title: `${zone.name} 점령`,
            log: [...battle.log, `[점령 실패] 식민지 상한(${city.bonuses.colonyCap})에 도달했습니다.`]
          };
        }
        await run("DELETE FROM occupied_zones WHERE zone_id = ?", [zone.id]);
        await run("INSERT INTO occupied_zones (user_id, zone_id, captured_at) VALUES (?, ?, ?)", [mission.user_id, zone.id, Date.now()]);
      }
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const log = [...battle.log];
    await addBattleRecord(
      mission.user_id,
      `${zone.name} ${owner ? "\ud0c8\ucde8" : "\uc810\ub839"}`,
      battle.result,
      travelSeconds,
      log
    );
    await addCommanderXp(mission.user_id, battle.result === "victory" ? 120 : 60);
    if (owner) {
      await addCommanderXp(owner.user_id, battle.result === "victory" ? 60 : 100);
      await addBattleRecord(
        owner.user_id,
        `\ubc29\uc5b4: ${zone.name}`,
        battle.result === "victory" ? "defeat" : "victory",
        travelSeconds,
        log
      );
    }

    return {
      result: battle.result,
      title: `${zone.name} ${owner ? "\ud0c8\ucde8" : "\uc810\ub839"}`,
      log
    };
  }

  if (mission.mission_type === "garrison") {
    const zone = await get("SELECT id, name FROM neutral_zones WHERE id = ?", [mission.target_zone_id]);
    if (!zone) {
      return {
        result: "failed",
        title: "\uc8fc\ub454 \uc2e4\ud328",
        log: ["[\uc8fc\ub454 \uc2e4\ud328] \ub300\uc0c1 \uac70\uc810\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."]
      };
    }
    const owner = await get("SELECT user_id FROM occupied_zones WHERE zone_id = ?", [zone.id]);
    if (!owner || Number(owner.user_id) !== Number(mission.user_id)) {
      return {
        result: "failed",
        title: `${zone.name} \uc8fc\ub454`,
        log: ["[\uc8fc\ub454 \uc2e4\ud328] \ud574\ub2f9 \uac70\uc810\uc740 \ub0b4 \uc810\ub839\uc9c0\uac00 \uc544\ub2d9\ub2c8\ub2e4."]
      };
    }

    let fleet = [];
    try {
      fleet = cloneDesignFleet(JSON.parse(mission.attacker_fleet_json || "[]"));
    } catch (err) {
      fleet = [];
    }
    if (!hasDesignShips(fleet)) {
      return {
        result: "failed",
        title: `${zone.name} \uc8fc\ub454`,
        log: ["[\uc8fc\ub454 \uc2e4\ud328] \uc8fc\ub454 \ubaa9\ub85d\uc744 \ubc88\uc5ed\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4."]
      };
    }

    const compactShips = fleet.map((ship) => ({
      designId: Number(ship.designId),
      quantity: Number(ship.quantity || 0)
    })).filter((ship) => Number.isInteger(ship.designId) && ship.designId > 0 && ship.quantity > 0);

    await run(
      "INSERT INTO zone_garrisons (user_id, zone_id, ship_plan_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, zone_id) DO UPDATE SET ship_plan_json = excluded.ship_plan_json, updated_at = excluded.updated_at",
      [mission.user_id, zone.id, JSON.stringify(compactShips), Date.now()]
    );

    return {
      result: "success",
      title: `${zone.name} \uc8fc\ub454`,
      log: [`[\uc8fc\ub454 \uc644\ub8cc] ${zone.name}\uc5d0 \ud568\ub300 \uc8fc\ub454 \ubc30\uce58\uac00 \uc644\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.`]
    };
  }

  return {
    result: "failed",
    title: "\uc784\ubb34 \uc2e4\ud328",
    log: ["[\uc2e4\ud328] \uc54c \uc218 \uc5c6\ub294 \uc784\ubb34 \ud0c0\uc785\uc785\ub2c8\ub2e4."]
  };
}

async function processMissionQueueForUser(userId) {
  const now = Date.now();
  const due = await all(
    "SELECT * FROM missions WHERE user_id = ? AND status = 'traveling' AND arrive_at <= ? ORDER BY id ASC",
    [userId, now]
  );

  for (const mission of due) {
    const claim = await run(
      "UPDATE missions SET status = 'resolving' WHERE id = ? AND user_id = ? AND status = 'traveling'",
      [mission.id, userId]
    );
    if (!claim.changes) continue;

    try {
      const resolved = await resolveMission(mission);
      await run(
        "UPDATE missions SET status = 'completed', result = ?, log_json = ? WHERE id = ? AND status = 'resolving'",
        [resolved.result, JSON.stringify(resolved.log || []), mission.id]
      );
      if ((mission.mission_type === "pvp" || mission.mission_type === "zone") && mission.target_user_id) {
        await run("UPDATE incoming_alerts SET status = 'resolved' WHERE mission_id = ?", [mission.id]);
      }
    } catch (err) {
      await run(
        "UPDATE missions SET status = 'failed', result = 'failed', log_json = ? WHERE id = ? AND status = 'resolving'",
        [JSON.stringify(["[\uc2dc\uc2a4\ud15c \uc624\ub958] \uc804\ud22c \ucc98\ub9ac\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4."]), mission.id]
      );
      if ((mission.mission_type === "pvp" || mission.mission_type === "zone") && mission.target_user_id) {
        await run("UPDATE incoming_alerts SET status = 'failed' WHERE mission_id = ?", [mission.id]);
      }
      console.error(err);
    }
  }
}

function applyProduction(resources, rates) {
  const now = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((now - resources.last_update) / 1000));

  return {
    ...resources,
    metal: resources.metal + elapsedSeconds * rates.metal,
    fuel: resources.fuel + elapsedSeconds * rates.fuel,
    last_update: now
  };
}

async function getUpdatedResources(userId) {
  const row = await get("SELECT * FROM resources WHERE user_id = ?", [userId]);
  if (!row) return null;

  const rates = await getProductionRates(userId);
  const updated = applyProduction(row, rates);
  await run(
    "UPDATE resources SET metal = ?, fuel = ?, last_update = ? WHERE user_id = ?",
    [updated.metal, updated.fuel, updated.last_update, userId]
  );

  return { resources: updated, rates };
}

function normalizeFleet(fleet) {
  const normalized = {};
  for (const type of SHIP_TYPES) {
    normalized[type] = Math.max(0, Number.parseInt(fleet?.[type] || 0, 10));
  }
  return normalized;
}

function fleetSummary(fleet) {
  return SHIP_TYPES
    .map((type) => `${SHIPS[type].name} ${fleet[type]}\ucc99`)
    .join(", ");
}

function fleetPower(fleet) {
  return SHIP_TYPES.reduce((sum, type) => sum + fleet[type] * SHIPS[type].attack, 0);
}

function totalShips(fleet) {
  return SHIP_TYPES.reduce((sum, type) => sum + Number(fleet[type] || 0), 0);
}

function fleetSpeed(fleet) {
  const count = totalShips(fleet);
  if (count <= 0) return 0;

  const weightedSpeed = SHIP_TYPES.reduce((sum, type) => {
    return sum + Number(fleet[type] || 0) * SHIPS[type].speed;
  }, 0) / count;
  const sizePenalty = 1 + count / 80;

  return Math.max(0.5, weightedSpeed / sizePenalty);
}

function travelTimeSeconds(from, to, fleet, bonuses) {
  const dx = Number(from.x) - Number(to.x);
  const dy = Number(from.y) - Number(to.y);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = fleetSpeed(fleet) * Number(bonuses?.movementMultiplier || 1);
  return Math.max(10, Math.ceil((distance / Math.max(0.5, speed)) * 60));
}

function formatTravelTime(seconds) {
  if (seconds < 60) return `${seconds}\ucd08`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes}\ubd84 ${rest}\ucd08` : `${minutes}\ubd84`;
}

function hasShips(fleet) {
  return SHIP_TYPES.some((type) => fleet[type] > 0);
}

function chooseTarget(fleet, priority) {
  return priority.find((type) => fleet[type] > 0) || SHIP_TYPES.find((type) => fleet[type] > 0);
}

function resolveAttack(attackerFleet, defenderFleet, attackerType, attackMultiplier = 1) {
  const attackerCount = attackerFleet[attackerType];
  if (attackerCount <= 0 || !hasShips(defenderFleet)) return null;

  const attacker = SHIPS[attackerType];
  const targetType = chooseTarget(defenderFleet, attacker.targetPriority);
  const target = SHIPS[targetType];
  const variance = 0.85 + Math.random() * 0.3;
  const damage = Math.max(1, Math.floor(attackerCount * attacker.attack * variance * attackMultiplier));
  const destroyed = Math.min(defenderFleet[targetType], Math.floor(damage / target.hp));

  if (destroyed > 0) {
    defenderFleet[targetType] -= destroyed;
  }

  return { attackerType, targetType, damage, destroyed };
}

function formatStrike(prefix, strike) {
  const attackerName = SHIPS[strike.attackerType].name;
  const targetName = SHIPS[strike.targetType].name;

  if (strike.destroyed > 0) {
    return `${prefix} ${attackerName} -> ${targetName} ${strike.destroyed}\ucc99 \uaca9\uce68`;
  }

  return `${prefix} ${attackerName} -> ${targetName} \ud53c\ud574 ${strike.damage}`;
}

function simulateBattle(playerInput, enemyInput, contextLabel, playerAttackMultiplier = 1, enemyAttackMultiplier = 1) {
  const player = normalizeFleet(playerInput);
  const enemy = normalizeFleet(enemyInput);
  const startPlayer = { ...player };
  const startEnemy = { ...enemy };
  const log = [
    `[\uc804\ud22c \uac1c\uc2dc] ${contextLabel}`,
    `\uc544\uad70 \ud3b8\uc131: ${fleetSummary(startPlayer)}`,
    `\uc801\uad70 \ud3b8\uc131: ${fleetSummary(startEnemy)}`
  ];

  for (let turn = 1; turn <= 8; turn += 1) {
    if (!hasShips(player) || !hasShips(enemy)) break;

    log.push(`[${turn}\ud134]`);

    for (const type of SHIP_TYPES) {
      const strike = resolveAttack(player, enemy, type, playerAttackMultiplier);
      if (strike) log.push(formatStrike("\uc544\uad70", strike));
    }

    if (!hasShips(enemy)) {
      log.push("\uc801 \ud568\ub300\uac00 \uc804\ud22c \uc9c0\uc18d \ub2a5\ub825\uc744 \uc0c1\uc2e4\ud588\uc2b5\ub2c8\ub2e4.");
      break;
    }

    for (const type of SHIP_TYPES) {
      const strike = resolveAttack(enemy, player, type, enemyAttackMultiplier);
      if (strike) log.push(formatStrike("\uc801\uad70", strike));
    }
  }

  const playerScore = fleetPower(player) * playerAttackMultiplier;
  const enemyScore = fleetPower(enemy) * enemyAttackMultiplier;
  const result = playerScore >= enemyScore ? "victory" : "defeat";

  log.push("[\uc804\ud22c \uc885\ub8cc]");
  log.push(result === "victory" ? "\uacb0\uacfc: \uc2b9\ub9ac." : "\uacb0\uacfc: \ud328\ubc30.");
  log.push(`\uc544\uad70 \uc794\uc874: ${fleetSummary(player)}`);
  log.push(`\uc801\uad70 \uc794\uc874: ${fleetSummary(enemy)}`);

  return { result, log, remainingFleet: player, remainingEnemy: enemy };
}

async function getFleet(userId) {
  const fleet = await get(`SELECT ${FLEET_COLUMNS} FROM fleets WHERE user_id = ?`, [userId]);
  return fleet ? normalizeFleet(fleet) : null;
}

async function getPlayerTarget(userId, viewerId) {
  const user = await get("SELECT id, username FROM users WHERE id = ?", [userId]);
  if (!user) return null;

  const fleet = await getOwnedShipFleet(userId);
  const resources = await getUpdatedResources(userId);
  const zones = await get(
    "SELECT COUNT(*) AS count FROM occupied_zones WHERE user_id = ?",
    [userId]
  );
  const admiral = await getAssignedAdmiral(userId);
  const commander = await getCommanderProgress(userId);
  const base = await ensureBase(userId);
  const admiralCombat = Number(admiral?.combatBonus || 0);
  const fleetPowerWithAdmiral = Math.floor(designFleetPower(fleet) * (1 + admiralCombat * 0.9));

  return {
    id: user.id,
    username: user.username,
    base,
    fleetPower: fleetPowerWithAdmiral,
    occupiedZones: Number(zones?.count || 0),
    estimatedMetal: userId === viewerId ? resources?.resources?.metal || 0 : Math.floor((resources?.resources?.metal || 0) * 0.5),
    estimatedFuel: userId === viewerId ? resources?.resources?.fuel || 0 : Math.floor((resources?.resources?.fuel || 0) * 0.5),
    commanderLevel: commander.level,
    playerColor: ownerColorHex(user.id),
    assignedAdmiral: admiral ? { name: admiral.name, rarity: admiral.rarity } : null
  };
}

async function updateFleet(userId, fleet) {
  await run(
    `
      UPDATE fleets
      SET corvette = ?, destroyer = ?, cruiser = ?, battleship = ?, carrier = ?
      WHERE user_id = ?
    `,
    [fleet.corvette, fleet.destroyer, fleet.cruiser, fleet.battleship, fleet.carrier, userId]
  );
}

function parseGarrison(zone) {
  try {
    return normalizeFleet(JSON.parse(zone.garrison_json || "{}"));
  } catch (err) {
    return normalizeFleet({});
  }
}

function formatZone(row) {
  const garrison = parseGarrison(row);
  const garrisonFleet = garrisonToDesignFleet(garrison);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    level: row.level,
    x: row.map_x,
    y: row.map_y,
    metalRate: row.metal_rate,
    fuelRate: row.fuel_rate,
    faction: String(row.faction || "neutral"),
    isThirdEmpire: String(row.faction || "") === "third_empire",
    actualPower: Math.floor(designFleetPower(garrisonFleet)),
    garrison,
    ownerId: row.owner_id || null,
    ownerUsername: row.owner_username || null,
    ownerColor: row.owner_id ? ownerColorHex(row.owner_id) : null,
    occupied: Boolean(row.owner_id),
    ownedByMe: Boolean(row.owned_by_me)
  };
}

app.get("/health", (req, res) => {
  return res.type("text/plain").send("ok");
});

app.post("/signup", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: "\uc544\uc774\ub514\ub294 3~20\uc790\ub85c \uc785\ub825\ud558\uc138\uc694." });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: "\ube44\ubc00\ubc88\ud638\ub294 4\uc790 \uc774\uc0c1 \uc785\ub825\ud558\uc138\uc694." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      `INSERT INTO users (username, ${passwordColumn}, created_at) VALUES (?, ?, ?)`,
      [username, passwordHash, Date.now()]
    );

    await run(
      "INSERT INTO resources (user_id, metal, fuel, last_update) VALUES (?, ?, ?, ?)",
      [result.lastID, 1000, 500, Date.now()]
    );

    await run(
      `
        INSERT INTO fleets (user_id, corvette, destroyer, cruiser, battleship, carrier)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [result.lastID, 6, 2, 0, 0, 0]
    );

  await run(
      "INSERT INTO research (user_id, resource_level, logistics_level, tactics_level) VALUES (?, 0, 0, 0)",
      [result.lastID]
    );
    await run("INSERT INTO commander_progress (user_id, level, xp) VALUES (?, 1, 0)", [result.lastID]);
    await run("INSERT INTO user_settings (user_id, admiral_policy) VALUES (?, 'capture')", [result.lastID]);
    await run(
      "INSERT INTO city_buildings (user_id, shipyard_level, government_level, housing_level, research_lab_level, tactical_center_level) VALUES (?, 1, 1, 1, 1, 1)",
      [result.lastID]
    );
    await run(
      "INSERT INTO bases (user_id, map_x, map_y, moved_at) VALUES (?, ?, ?, ?)",
      [result.lastID, randomBaseCoordinate(), randomBaseCoordinate(), Date.now()]
    );
    await ensureStarterDesign(result.lastID);
    await ensureFleetGroups(result.lastID);

    return res.status(201).json({ message: "\ud68c\uc6d0\uac00\uc785 \uc644\ub8cc. \uc774\uc81c \ub85c\uadf8\uc778\ud558\uc138\uc694." });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({ error: "\uc774\ubbf8 \uc0ac\uc6a9 \uc911\uc778 \uc544\uc774\ub514\uc785\ub2c8\ub2e4." });
    }

    console.error(err);
    return res.status(500).json({ error: "\ud68c\uc6d0\uac00\uc785 \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ error: "\uc544\uc774\ub514\uc640 \ube44\ubc00\ubc88\ud638\ub97c \ubaa8\ub450 \uc785\ub825\ud558\uc138\uc694." });
    }

    const user = await get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ error: "\uc544\uc774\ub514 \ub610\ub294 \ube44\ubc00\ubc88\ud638\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4." });
    }

    const ok = await bcrypt.compare(password, user[passwordColumn]);
    if (!ok) {
      return res.status(401).json({ error: "\uc544\uc774\ub514 \ub610\ub294 \ube44\ubc00\ubc88\ud638\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4." });
    }

    return res.json({
      message: "\ub85c\uadf8\uc778 \uc131\uacf5.",
      token: signToken(user),
      username: user.username
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\ub85c\uadf8\uc778 \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/resources", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    const state = await getUpdatedResources(req.user.id);
    const bonuses = await getPlayerBonuses(req.user.id);
    const settings = await getUserSettings(req.user.id);
    if (!state) {
      return res.status(404).json({ error: "\uc790\uc6d0 \uc815\ubcf4\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }

    return res.json({
      metal: state.resources.metal,
      fuel: state.resources.fuel,
      commander: bonuses.commander,
      city: bonuses.city,
      settings,
      incomingAlerts: await getIncomingAlerts(req.user.id),
      production: {
        metalPerSecond: state.rates.metal,
        fuelPerSecond: state.rates.fuel,
        base: state.rates.base,
        zones: state.rates.zones,
        multiplier: state.rates.multiplier
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc790\uc6d0 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/fleet", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    return res.json(await getOwnedShipFleet(req.user.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\ud568\ub300 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/ships", (req, res) => {
  return res.json({
    ships: SHIP_TYPES.map((type) => ({
      type,
      name: SHIPS[type].name,
      cost: SHIPS[type].cost,
      attack: SHIPS[type].attack,
      hp: SHIPS[type].hp
    }))
  });
});

app.get("/shipyard/options", requireAuth, async (req, res) => {
  try {
    const research = await getResearch(req.user.id);
    const hulls = await all("SELECT * FROM hulls ORDER BY id");
    const components = await all("SELECT * FROM components ORDER BY category, id");

    return res.json({
      hulls: hulls.map((hull) => {
        const requirement = hullUnlockRequirement(hull.key);
        return ({
        id: hull.id,
        key: hull.key,
        name: hull.name,
        classType: hull.class_type,
        baseHp: hull.base_hp,
        baseSpeed: hull.base_speed,
        powerLimit: hull.power_limit,
        baseBuildTime: hull.base_build_time,
        metalCost: hull.metal_cost,
        fuelCost: hull.fuel_cost,
        slots: {
          engine: Number(hull.slot_engine || 1),
          weapon: Number(hull.slot_weapon || 1),
          defense: Number(hull.slot_defense || 1),
          utility: Number(hull.slot_utility || 1)
        },
        unlocked: isUnlockedByResearch(requirement, research),
        unlockRequirement: requirement
      });
      }),
      components: components.map((component) => {
        const requirement = componentUnlockRequirement(component);
        return ({
        id: component.id,
        key: component.key,
        name: component.name,
        category: component.category,
        hpBonus: component.hp_bonus,
        attackBonus: component.attack_bonus,
        defenseBonus: component.defense_bonus,
        speedBonus: component.speed_bonus,
        powerCost: component.power_cost,
        powerBonus: component.power_bonus,
        metalCost: component.metal_cost,
        fuelCost: component.fuel_cost,
        techRequirement: component.tech_requirement,
        unlocked: isUnlockedByResearch(requirement, research),
        unlockRequirement: requirement
      });
      }),
      unlockSummary: buildUnlockSummary(research, hulls, components)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc870\uc120\uc18c \uc635\uc158 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/designs", requireAuth, async (req, res) => {
  try {
    return res.json({ designs: await getDesigns(req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc124\uacc4\uc548 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/designs", requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2 || name.length > 32) {
      return res.status(400).json({ error: "\uc124\uacc4\uba85\uc740 2~32\uc790\ub85c \uc785\ub825\ud558\uc138\uc694." });
    }

    const calculated = await calculateDesign({
      userId: req.user.id,
      hullId: Number.parseInt(req.body.hullId, 10),
      engines: req.body.engines,
      weapons: req.body.weapons,
      defenses: req.body.defenses,
      utilities: req.body.utilities,
      engineId: Number.parseInt(req.body.engineId, 10),
      weaponId: Number.parseInt(req.body.weaponId, 10),
      defenseId: Number.parseInt(req.body.defenseId, 10),
      utilityId: Number.parseInt(req.body.utilityId, 10)
    });

    const result = await run(
      `
        INSERT INTO ship_designs
          (user_id, name, hull_id, engine_component_id, weapon_component_id, defense_component_id, utility_component_id,
           engine_components_json, weapon_components_json, defense_components_json, utility_components_json,
           final_hp, final_attack, final_defense, final_speed, total_power, total_metal_cost, total_fuel_cost,
           total_build_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        name,
        calculated.hull.id,
        calculated.componentIds.engines[0] || 0,
        calculated.componentIds.weapons[0] || 0,
        calculated.componentIds.defenses[0] || 0,
        calculated.componentIds.utilities[0] || 0,
        JSON.stringify(calculated.componentIds.engines),
        JSON.stringify(calculated.componentIds.weapons),
        JSON.stringify(calculated.componentIds.defenses),
        JSON.stringify(calculated.componentIds.utilities),
        calculated.finalHp,
        calculated.finalAttack,
        calculated.finalDefense,
        calculated.finalSpeed,
        calculated.totalPower,
        calculated.totalMetalCost,
        calculated.totalFuelCost,
        calculated.totalBuildTime,
        Date.now()
      ]
    );

    return res.status(201).json({
      message: `${name} \uc124\uacc4\uc548\uc744 \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4.`,
      designId: result.lastID,
      designs: await getDesigns(req.user.id)
    });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "\uc124\uacc4\uc548 \uc800\uc7a5 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.put("/designs/:id", requireAuth, async (req, res) => {
  try {
    const designId = Number.parseInt(req.params.id, 10);
    const existing = await get("SELECT id FROM ship_designs WHERE id = ? AND user_id = ?", [designId, req.user.id]);
    if (!existing) return res.status(404).json({ error: "\uc218\uc815\ud560 \uc124\uacc4\uc548\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });

    const name = String(req.body.name || "").trim();
    if (name.length < 2 || name.length > 32) {
      return res.status(400).json({ error: "\uc124\uacc4\uba85\uc740 2~32\uc790\ub85c \uc785\ub825\ud558\uc138\uc694." });
    }

    const calculated = await calculateDesign({
      userId: req.user.id,
      hullId: Number.parseInt(req.body.hullId, 10),
      engines: req.body.engines,
      weapons: req.body.weapons,
      defenses: req.body.defenses,
      utilities: req.body.utilities
    });

    await run(
      `
        UPDATE ship_designs
        SET name = ?, hull_id = ?, engine_component_id = ?, weapon_component_id = ?, defense_component_id = ?, utility_component_id = ?,
            engine_components_json = ?, weapon_components_json = ?, defense_components_json = ?, utility_components_json = ?,
            final_hp = ?, final_attack = ?, final_defense = ?, final_speed = ?, total_power = ?, total_metal_cost = ?, total_fuel_cost = ?, total_build_time = ?
        WHERE id = ? AND user_id = ?
      `,
      [
        name,
        calculated.hull.id,
        calculated.componentIds.engines[0] || 0,
        calculated.componentIds.weapons[0] || 0,
        calculated.componentIds.defenses[0] || 0,
        calculated.componentIds.utilities[0] || 0,
        JSON.stringify(calculated.componentIds.engines),
        JSON.stringify(calculated.componentIds.weapons),
        JSON.stringify(calculated.componentIds.defenses),
        JSON.stringify(calculated.componentIds.utilities),
        calculated.finalHp,
        calculated.finalAttack,
        calculated.finalDefense,
        calculated.finalSpeed,
        calculated.totalPower,
        calculated.totalMetalCost,
        calculated.totalFuelCost,
        calculated.totalBuildTime,
        designId,
        req.user.id
      ]
    );

    return res.json({
      message: `${name} \uc124\uacc4\uc548\uc744 \uc218\uc815\ud588\uc2b5\ub2c8\ub2e4.`,
      designs: await getDesigns(req.user.id)
    });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "\uc124\uacc4\uc548 \uc218\uc815 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.delete("/designs/:id", requireAuth, async (req, res) => {
  try {
    const designId = Number.parseInt(req.params.id, 10);
    const inQueue = await get("SELECT id FROM production_queue WHERE user_id = ? AND design_id = ? AND status = 'building' LIMIT 1", [req.user.id, designId]);
    if (inQueue) {
      return res.status(400).json({ error: "\uc0dd\uc0b0 \uc911\uc778 \uc124\uacc4\uc548\uc740 \uc0ad\uc81c\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }
    const owned = await get("SELECT quantity FROM owned_ships WHERE user_id = ? AND design_id = ?", [req.user.id, designId]);
    if (Number(owned?.quantity || 0) > 0) {
      return res.status(400).json({ error: "보유 함선이 있는 설계안은 삭제할 수 없습니다. 함선을 먼저 소모하거나 다른 설계로 전환하세요." });
    }
    await run("DELETE FROM owned_ships WHERE user_id = ? AND design_id = ? AND quantity <= 0", [req.user.id, designId]);
    const result = await run("DELETE FROM ship_designs WHERE id = ? AND user_id = ?", [designId, req.user.id]);
    if (!result.changes) return res.status(404).json({ error: "\uc0ad\uc81c\ud560 \uc124\uacc4\uc548\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    return res.json({
      message: "\uc124\uacc4\uc548\uc744 \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.",
      designs: await getDesigns(req.user.id)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc124\uacc4\uc548 \uc0ad\uc81c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/production", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    return res.json({
      queue: await getProductionQueue(req.user.id),
      ownedShips: await getOwnedShips(req.user.id)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc0dd\uc0b0 \ud050 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/production", requireAuth, async (req, res) => {
  try {
    await processProductionQueue(req.user.id);

    const bonuses = await getPlayerBonuses(req.user.id);
    const city = bonuses.city;
    const active = await get("SELECT COUNT(*) AS cnt FROM production_queue WHERE user_id = ? AND status = 'building'", [req.user.id]);
    if (Number(active?.cnt || 0) >= Number(city.bonuses.buildLines || 1)) {
      return res.status(400).json({ error: `생산 라인 제한(${city.bonuses.buildLines})을 초과했습니다.` });
    }

    const designId = Number.parseInt(req.body.designId, 10);
    const quantity = Number.parseInt(req.body.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: "\uc0dd\uc0b0 \uc218\ub7c9\uc740 1~50 \uc0ac\uc774\uc5ec\uc57c \ud569\ub2c8\ub2e4." });
    }

    const design = await get("SELECT * FROM ship_designs WHERE id = ? AND user_id = ?", [designId, req.user.id]);
    if (!design) {
      return res.status(404).json({ error: "\uc124\uacc4\uc548\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }
    const totalShips = await getTotalShipCount(req.user.id);
    if (totalShips + quantity > Number(city.bonuses.populationCap || 0)) {
      return res.status(400).json({ error: `인구 상한(보유 함선 제한 ${city.bonuses.populationCap})을 초과합니다.` });
    }

    const state = await getUpdatedResources(req.user.id);
    const metalCost = Math.floor(design.total_metal_cost * quantity * bonuses.buildCostMultiplier);
    const fuelCost = Math.floor(design.total_fuel_cost * quantity * bonuses.buildCostMultiplier);

    if (state.resources.metal < metalCost || state.resources.fuel < fuelCost) {
      return res.status(400).json({ error: `\uc790\uc6d0\uc774 \ubd80\uc871\ud569\ub2c8\ub2e4. \ud544\uc694: \uae08\uc18d ${metalCost}, \uc5f0\ub8cc ${fuelCost}` });
    }

    const now = Date.now();
    const buildSeconds = Math.max(60, Math.floor(design.total_build_time * quantity * Number(city.bonuses.buildTimeMultiplier || 1)));
    const endTime = now + buildSeconds * 1000;
    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = metal - ?, fuel = fuel - ? WHERE user_id = ?", [metalCost, fuelCost, req.user.id]);
      await run(
        "INSERT INTO production_queue (user_id, design_id, quantity, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, 'building')",
        [req.user.id, designId, quantity, now, endTime]
      );
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const nextState = await getUpdatedResources(req.user.id);
    return res.status(201).json({
      message: `${design.name} ${quantity}\ucc99 \uc0dd\uc0b0\uc744 \uc2dc\uc791\ud588\uc2b5\ub2c8\ub2e4.`,
      queue: await getProductionQueue(req.user.id),
      ownedShips: await getOwnedShips(req.user.id),
      resources: {
        metal: nextState.resources.metal,
        fuel: nextState.resources.fuel,
        production: {
          metalPerSecond: nextState.rates.metal,
          fuelPerSecond: nextState.rates.fuel,
          base: nextState.rates.base,
          zones: nextState.rates.zones,
          multiplier: nextState.rates.multiplier
        }
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc124\uacc4\uc548 \uc0dd\uc0b0 \uc2dc\uc791 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/production/:id/cancel", requireAuth, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const queue = await get(
      `
        SELECT q.*, d.total_metal_cost, d.total_fuel_cost
        FROM production_queue q
        JOIN ship_designs d ON d.id = q.design_id
        WHERE q.id = ? AND q.user_id = ? AND q.status = 'building'
      `,
      [id, req.user.id]
    );
    if (!queue) return res.status(404).json({ error: "\ucde8\uc18c\ud560 \uc0dd\uc0b0 \ud050\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    const bonuses = await getPlayerBonuses(req.user.id);
    const spentMetal = Math.floor(queue.total_metal_cost * queue.quantity * bonuses.buildCostMultiplier);
    const spentFuel = Math.floor(queue.total_fuel_cost * queue.quantity * bonuses.buildCostMultiplier);
    const refundMetal = Math.floor(spentMetal * 0.8);
    const refundFuel = Math.floor(spentFuel * 0.8);
    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = metal + ?, fuel = fuel + ? WHERE user_id = ?", [refundMetal, refundFuel, req.user.id]);
      await run("UPDATE production_queue SET status = 'completed' WHERE id = ?", [id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
    const state = await getUpdatedResources(req.user.id);
    return res.json({
      message: `\uc0dd\uc0b0 \ucde8\uc18c \uc644\ub8cc. \ud658\ubd88: \uae08\uc18d ${refundMetal}, \uc5f0\ub8cc ${refundFuel}`,
      queue: await getProductionQueue(req.user.id),
      ownedShips: await getOwnedShips(req.user.id),
      resources: {
        metal: state.resources.metal,
        fuel: state.resources.fuel,
        production: {
          metalPerSecond: state.rates.metal,
          fuelPerSecond: state.rates.fuel,
          base: state.rates.base,
          zones: state.rates.zones,
          multiplier: state.rates.multiplier
        }
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc0dd\uc0b0 \ucde8\uc18c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/production/:id/speedup", requireAuth, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const resourceType = String(req.body.resourceType || "fuel").toLowerCase() === "metal" ? "metal" : "fuel";
    const amount = Math.max(1, Math.min(20000, Number.parseInt(req.body.amount, 10) || 500));
    const queue = await get("SELECT * FROM production_queue WHERE id = ? AND user_id = ? AND status = 'building'", [id, req.user.id]);
    if (!queue) return res.status(404).json({ error: "\uac00\uc18d\ud560 \uc0dd\uc0b0 \ud050\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    const state = await getUpdatedResources(req.user.id);
    if (Number(state.resources[resourceType] || 0) < amount) {
      return res.status(400).json({ error: `가속에 필요한 ${resourceType} 자원이 부족합니다. 필요: ${amount}` });
    }
    const speed = await consumeSpeedup(req.user.id, "production", amount);
    if (!speed.ok) {
      return res.status(400).json({
        error: `가속 효율 저하 단계입니다. 현재 1초 단축에 ${speed.resourcePerSecond} 재화가 필요합니다.`
      });
    }
    const reducedMs = speed.reducedSeconds * 1000;
    const nextEnd = Math.max(Date.now() + 1000, Number(queue.end_time) - reducedMs);
    await run("BEGIN TRANSACTION");
    try {
      await run(`UPDATE resources SET ${resourceType} = ${resourceType} - ? WHERE user_id = ?`, [amount, req.user.id]);
      await run("UPDATE production_queue SET end_time = ? WHERE id = ?", [nextEnd, id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
    return res.json({
      message: `${resourceType} ${amount} 사용: 생산 ${speed.reducedSeconds}초 단축 (페널티 x${speed.multiplier.toFixed(2)}, 연속 ${speed.nextStreak}회)`,
      queue: await getProductionQueue(req.user.id),
      ownedShips: await getOwnedShips(req.user.id),
      resources: (await getUpdatedResources(req.user.id))?.resources || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc0dd\uc0b0 \uac00\uc18d \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.delete("/production/logs", requireAuth, async (req, res) => {
  try {
    await processProductionQueue(req.user.id);
    await run(
      "DELETE FROM production_queue WHERE user_id = ? AND status IN ('completed', 'failed', 'cancelled')",
      [req.user.id]
    );
    return res.json({ message: "생산 로그를 초기화했습니다.", queue: await getProductionQueue(req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "생산 로그 초기화 중 오류가 발생했습니다." });
  }
});

app.get("/owned-ships", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    return res.json({ ownedShips: await getOwnedShips(req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\ubcf4\uc720 \ud568\uc120 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/base", requireAuth, async (req, res) => {
  try {
    const base = await ensureBase(req.user.id);
    return res.json({
      base,
      moveFuelPerDistance: BASE_MOVE_FUEL_PER_DISTANCE,
      mapConfig: { maxX: MAP_MAX_X, maxY: MAP_MAX_Y, distanceUnit: MAP_DISTANCE_UNIT }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uae30\uc9c0 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/base/move", requireAuth, async (req, res) => {
  try {
    const x = Math.round(Number(req.body.x));
    const y = Math.round(Number(req.body.y));
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > MAP_MAX_X || y < 0 || y > MAP_MAX_Y) {
      return res.status(400).json({ error: `\uc774\ub3d9\ud560 \uc88c\ud45c\ub294 0~${MAP_MAX_X} / 0~${MAP_MAX_Y} \uc0ac\uc774\uc5ec\uc57c \ud569\ub2c8\ub2e4.` });
    }

    const base = await ensureBase(req.user.id);
    const cost = movementCost(base, { x, y });
    const state = await getUpdatedResources(req.user.id);

    if (state.resources.fuel < cost) {
      return res.status(400).json({ error: `\uc5f0\ub8cc\uac00 \ubd80\uc871\ud569\ub2c8\ub2e4. \ud544\uc694 \uc5f0\ub8cc: ${cost}` });
    }

    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET fuel = fuel - ? WHERE user_id = ?", [cost, req.user.id]);
      await run("UPDATE bases SET map_x = ?, map_y = ?, moved_at = ? WHERE user_id = ?", [x, y, Date.now(), req.user.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const nextState = await getUpdatedResources(req.user.id);
    return res.json({
      message: `\uae30\uc9c0\ub97c (${x}, ${y}) \uc88c\ud45c\ub85c \uc774\ub3d9\ud588\uc2b5\ub2c8\ub2e4. \uc5f0\ub8cc ${cost}\uc744 \uc18c\ubaa8\ud588\uc2b5\ub2c8\ub2e4.`,
      base: { userId: req.user.id, x, y },
      cost,
      mapConfig: { maxX: MAP_MAX_X, maxY: MAP_MAX_Y, distanceUnit: MAP_DISTANCE_UNIT },
      resources: {
        metal: nextState.resources.metal,
        fuel: nextState.resources.fuel,
        production: {
          metalPerSecond: nextState.rates.metal,
          fuelPerSecond: nextState.rates.fuel,
          base: nextState.rates.base,
          zones: nextState.rates.zones,
          multiplier: nextState.rates.multiplier
        }
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uae30\uc9c0 \uc774\ub3d9 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/zones", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    const rows = await all(
      `
        SELECT z.*,
               owner.user_id AS owner_id,
               u.username AS owner_username,
               owner.user_id = ? AS owned_by_me
        FROM neutral_zones z
        LEFT JOIN occupied_zones owner ON owner.zone_id = z.id
        LEFT JOIN users u ON u.id = owner.user_id
        ORDER BY z.level, z.id
      `,
      [req.user.id]
    );

    const base = await ensureBase(req.user.id);
    const thirdEmpireCount = rows.filter((row) => String(row.faction || "neutral") === "third_empire").length;
    return res.json({
      base,
      zones: rows.map(formatZone),
      thirdEmpire: {
        active: true,
        label: "제3제국",
        strongholds: thirdEmpireCount
      },
      mapConfig: { maxX: MAP_MAX_X, maxY: MAP_MAX_Y, distanceUnit: MAP_DISTANCE_UNIT }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc911\ub9bd \uad6c\uc5ed \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/map", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    const rows = await all(
      `
        SELECT z.*,
               owner.user_id AS owner_id,
               u.username AS owner_username,
               owner.user_id = ? AS owned_by_me
        FROM neutral_zones z
        LEFT JOIN occupied_zones owner ON owner.zone_id = z.id
        LEFT JOIN users u ON u.id = owner.user_id
        ORDER BY z.level, z.id
      `,
      [req.user.id]
    );

    const users = await all(
      "SELECT id FROM users WHERE id != ? ORDER BY id DESC LIMIT 80",
      [req.user.id]
    );
    const players = [];
    for (const user of users) {
      const target = await getPlayerTarget(user.id, req.user.id);
      if (target) players.push(target);
    }

    const base = await ensureBase(req.user.id);
    const thirdEmpireCount = rows.filter((row) => String(row.faction || "neutral") === "third_empire").length;
    const myFleet = await getOwnedShipFleet(req.user.id);
    const myBonuses = await getPlayerBonuses(req.user.id);
    const myZoneGarrisonRows = await all(
      "SELECT zone_id, ship_plan_json FROM zone_garrisons WHERE user_id = ?",
      [req.user.id]
    );
    const myZoneGarrisonMap = new Map();
    for (const row of myZoneGarrisonRows) {
      try {
        const compact = normalizeShipPlan(JSON.parse(row.ship_plan_json || "[]"));
        const ownedByDesign = new Map(myFleet.map((ship) => [Number(ship.designId), ship]));
        const fleet = compact
          .map((item) => {
            const found = ownedByDesign.get(Number(item.designId));
            if (!found) return null;
            return {
              ...found,
              quantity: Math.min(Number(found.quantity || 0), Number(item.quantity || 0))
            };
          })
          .filter((item) => item && Number(item.quantity || 0) > 0);
        myZoneGarrisonMap.set(Number(row.zone_id), {
          totalPower: Math.floor(designFleetPower(fleet)),
          asLegacy: (() => {
            const g = { corvette: 0, destroyer: 0, cruiser: 0, battleship: 0, carrier: 0 };
            const keys = ["corvette", "destroyer", "cruiser", "battleship", "carrier"];
            fleet.forEach((ship) => {
              const key = String(ship.name || "").toLowerCase();
              const matched = keys.find((item) => key.includes(item));
              if (matched) g[matched] += Math.max(0, Number(ship.quantity || 0));
            });
            return g;
          })()
        });
      } catch (err) {
        // ignore bad garrison rows
      }
    }
    return res.json({
      base,
      zones: rows.map((row) => {
        const item = formatZone(row);
        if (item.ownedByMe && myZoneGarrisonMap.has(Number(item.id))) {
          const myGarrison = myZoneGarrisonMap.get(Number(item.id));
          item.actualPower = Number(myGarrison.totalPower || item.actualPower || 0);
          item.garrison = myGarrison.asLegacy || item.garrison;
        }
        return item;
      }),
      sectorCount: rows.length,
      thirdEmpire: {
        active: true,
        label: "제3제국",
        strongholds: thirdEmpireCount,
        message: "제3제국 거점을 공격하면 PvP 외에도 성장 루트를 확보할 수 있습니다."
      },
      players,
      activeMissions: await getActiveMissions(req.user.id),
      incomingAlerts: await getIncomingAlerts(req.user.id),
      mapConfig: { maxX: MAP_MAX_X, maxY: MAP_MAX_Y, distanceUnit: MAP_DISTANCE_UNIT },
      myBaseSpec: {
        fleetPower: Math.floor(designFleetPower(myFleet) * myBonuses.combatMultiplier),
        shipCount: myFleet.reduce((sum, ship) => sum + Number(ship.quantity || 0), 0),
        commanderLevel: myBonuses.commander.level
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc9c0\ub3c4 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/empire", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    const rows = await all(
      `
        SELECT z.*, oz.user_id AS owner_id, u.username AS owner_username, 1 AS owned_by_me
        FROM occupied_zones oz
        JOIN neutral_zones z ON z.id = oz.zone_id
        JOIN users u ON u.id = oz.user_id
        WHERE oz.user_id = ?
        ORDER BY z.id
      `,
      [req.user.id]
    );
    const rates = await getProductionRates(req.user.id);

    return res.json({
      production: rates,
      occupiedZones: rows.map(formatZone)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc810\ub839\uc9c0 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/third-empire", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    const zones = await all(
      `
        SELECT z.*, oz.user_id AS owner_id, u.username AS owner_username, oz.user_id = ? AS owned_by_me
        FROM neutral_zones z
        LEFT JOIN occupied_zones oz ON oz.zone_id = z.id
        LEFT JOIN users u ON u.id = oz.user_id
        WHERE z.faction = 'third_empire'
        ORDER BY z.level DESC, z.id ASC
      `,
      [req.user.id]
    );
    const formatted = zones.map(formatZone);
    const totalPower = formatted.reduce((sum, zone) => sum + Number(zone.actualPower || 0), 0);
    return res.json({
      faction: "third_empire",
      label: "제3제국",
      message: "공공의 적 거점을 공략해 PvP 의존 없이 성장할 수 있습니다.",
      strongholds: formatted.length,
      totalPower,
      zones: formatted
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "제3제국 정보 조회 중 오류가 발생했습니다." });
  }
});

app.get("/zones/:id/garrison", requireAuth, async (req, res) => {
  try {
    const zoneId = Number.parseInt(req.params.id, 10);
    const owner = await get("SELECT user_id FROM occupied_zones WHERE zone_id = ?", [zoneId]);
    if (!owner || owner.user_id !== req.user.id) {
      return res.status(403).json({ error: "내 점령지에서만 주둔군을 설정할 수 있습니다." });
    }
    const row = await get("SELECT ship_plan_json, updated_at FROM zone_garrisons WHERE user_id = ? AND zone_id = ?", [req.user.id, zoneId]);
    let ships = [];
    try {
      ships = normalizeShipPlan(JSON.parse(row?.ship_plan_json || "[]"));
    } catch (err) {
      ships = [];
    }
    return res.json({ zoneId, ships, updatedAt: Number(row?.updated_at || 0) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "주둔군 조회 중 오류가 발생했습니다." });
  }
});

app.post("/zones/:id/garrison/dispatch", requireAuth, async (req, res) => {
  try {
    const zoneId = Number.parseInt(req.params.id, 10);
    const zone = await get("SELECT id, name, map_x, map_y FROM neutral_zones WHERE id = ?", [zoneId]);
    if (!zone) return res.status(404).json({ error: "\uac70\uc810\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });

    const owner = await get("SELECT user_id FROM occupied_zones WHERE zone_id = ?", [zoneId]);
    if (!owner || Number(owner.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: "\ub0b4 \uc810\ub839\uc9c0\uc5d0\ub9cc \uc8fc\ub454 \ucd9c\uaca9 \uac00\ub2a5\ud569\ub2c8\ub2e4." });
    }
    const activeMission = await get("SELECT id FROM missions WHERE user_id = ? AND status = 'traveling' LIMIT 1", [req.user.id]);
    if (activeMission) {
      return res.status(400).json({ error: "\uc774\ubbf8 \uc9c4\ud589 \uc911\uc778 \uc774\ub3d9/\ucd9c\uaca9 \uc784\ubb34\uac00 \uc788\uc2b5\ub2c8\ub2e4." });
    }

    const slot = Number.parseInt(req.body.fleetSlot, 10) || 1;
    const bonuses = await getPlayerBonuses(req.user.id);
    if (slot > Number(bonuses.city?.bonuses?.fleetSlotLimit || 3)) {
      return res.status(400).json({ error: `\ud568\ub300 \uc2ac\ub86f ${slot}\uc740 \ud604\uc7ac \uc0ac\uc6a9 \ubd88\uac00\ud569\ub2c8\ub2e4.` });
    }

    const launch = await getLaunchFleetFromSlot(req.user.id, slot);
    if (!hasDesignShips(launch.fleet)) {
      return res.status(400).json({ error: "\ud574\ub2f9 \ud568\ub300\uc5d0 \uc8fc\ub454 \ucd9c\uaca9 \uac00\ub2a5\ud55c \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }

    const compactShips = launch.fleet
      .map((ship) => ({ designId: Number(ship.designId), quantity: Number(ship.quantity || 0) }))
      .filter((ship) => Number.isInteger(ship.designId) && ship.designId > 0 && ship.quantity > 0);
    const from = await ensureBase(req.user.id);
    const to = { x: Number(zone.map_x), y: Number(zone.map_y) };
    const fleetMoveMultiplier = 1 + Number(launch.admiral?.resourceBonus || 0) * 0.45;
    const travelSeconds = travelTimeSecondsForDesignFleet(from, to, launch.fleet, {
      movementMultiplier: bonuses.movementMultiplier * fleetMoveMultiplier
    });
    const attackerShipCount = launch.fleet.reduce((sum, ship) => sum + Number(ship.quantity || 0), 0);
    const attackerPower = Math.floor(designFleetPower(launch.fleet) * bonuses.combatMultiplier * (1 + Number(launch.admiral?.combatBonus || 0) * 0.9));
    const now = Date.now();
    await run(
      `
        INSERT INTO missions
          (user_id, mission_type, target_zone_id, target_name, from_x, from_y, to_x, to_y,
           started_at, arrive_at, status, attacker_power, attacker_ship_count,
           attacker_fleet_json, attacker_fleet_slot, attacker_admiral_id)
        VALUES (?, 'garrison', ?, ?, ?, ?, ?, ?, ?, ?, 'traveling', ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        zone.id,
        `${zone.name} \uc8fc\ub454`,
        from.x,
        from.y,
        to.x,
        to.y,
        now,
        now + (travelSeconds * 1000),
        attackerPower,
        attackerShipCount,
        JSON.stringify(compactShips),
        slot,
        launch.admiral?.id || null
      ]
    );

    return res.json({
      message: `${zone.name} \uc8fc\ub454 \ucd9c\ubc1c. \uc608\uc0c1 \uc774\ub3d9 ${travelSeconds}\ucd08`,
      activeMissions: await getActiveMissions(req.user.id)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc8fc\ub454 \ucd9c\uaca9 \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/zones/:id/garrison", requireAuth, async (req, res) => {
  try {
    const zoneId = Number.parseInt(req.params.id, 10);
    const owner = await get("SELECT user_id FROM occupied_zones WHERE zone_id = ?", [zoneId]);
    if (!owner || owner.user_id !== req.user.id) {
      return res.status(403).json({ error: "내 점령지에서만 주둔군을 배치할 수 있습니다." });
    }
    const slot = Number.parseInt(req.body.fleetSlot, 10) || 1;
    const bonuses = await getPlayerBonuses(req.user.id);
    if (slot > Number(bonuses.city?.bonuses?.fleetSlotLimit || 3)) {
      return res.status(400).json({ error: `현재 전술소 레벨로는 슬롯 ${slot}을 사용할 수 없습니다.` });
    }
    const launch = await getLaunchFleetFromSlot(req.user.id, slot);
    if (!hasDesignShips(launch.fleet)) {
      return res.status(400).json({ error: "선택한 함대 슬롯에 배치 가능한 함선이 없습니다." });
    }
    const compactShips = launch.fleet.map((ship) => ({
      designId: Number(ship.designId),
      quantity: Number(ship.quantity || 0)
    }));
    await run(
      "INSERT INTO zone_garrisons (user_id, zone_id, ship_plan_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, zone_id) DO UPDATE SET ship_plan_json = excluded.ship_plan_json, updated_at = excluded.updated_at",
      [req.user.id, zoneId, JSON.stringify(compactShips), Date.now()]
    );
    return res.json({ message: `함대 ${slot}을 ${zoneId}번 점령지 주둔군으로 배치했습니다.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "주둔군 배치 중 오류가 발생했습니다." });
  }
});

app.get("/garrison/overview", requireAuth, async (req, res) => {
  try {
    const zones = await all(
      `
        SELECT z.id, z.name, z.level, z.map_x, z.map_y, zg.ship_plan_json, zg.updated_at
        FROM occupied_zones oz
        JOIN neutral_zones z ON z.id = oz.zone_id
        LEFT JOIN zone_garrisons zg ON zg.user_id = oz.user_id AND zg.zone_id = oz.zone_id
        WHERE oz.user_id = ?
        ORDER BY z.level DESC, z.id ASC
      `,
      [req.user.id]
    );
    const ownedFleet = await getOwnedShipFleet(req.user.id);
    const byId = new Map(ownedFleet.map((ship) => [Number(ship.designId), ship]));

    const zoneData = zones.map((zone) => {
      let compact = [];
      try {
        compact = normalizeShipPlan(JSON.parse(zone.ship_plan_json || "[]"));
      } catch (err) {
        compact = [];
      }
      const assigned = compact
        .map((item) => {
          const found = byId.get(Number(item.designId));
          if (!found) return null;
          return {
            designId: Number(item.designId),
            designName: found.name,
            quantity: Math.min(Number(found.quantity || 0), Number(item.quantity || 0)),
            finalAttack: Number(found.finalAttack || 0),
            finalDefense: Number(found.finalDefense || 0),
            finalHp: Number(found.finalHp || 0)
          };
        })
        .filter((item) => item && Number(item.quantity || 0) > 0);
      const power = Math.floor(assigned.reduce((sum, item) => {
        return sum + Number(item.quantity || 0) * (Number(item.finalAttack || 0) + Number(item.finalDefense || 0) * 0.45 + Number(item.finalHp || 0) * 0.12);
      }, 0));
      return {
        zoneId: Number(zone.id),
        zoneName: zone.name,
        level: Number(zone.level || 1),
        x: Number(zone.map_x || 0),
        y: Number(zone.map_y || 0),
        assignedPower: power,
        assignedShips: assigned,
        updatedAt: Number(zone.updated_at || 0)
      };
    });

    const records = await all(
      `
        SELECT id, title, result, travel_seconds, created_at, log_json
        FROM battle_records
        WHERE user_id = ? AND (title LIKE '방어:%' OR title LIKE '%점령%')
        ORDER BY id DESC
        LIMIT 50
      `,
      [req.user.id]
    );
    const alerts = await getIncomingAlerts(req.user.id);
    return res.json({
      zones: zoneData,
      alerts: alerts.filter((item) => item.targetKind === "outpost" || item.targetKind === "base"),
      records: records.map((row) => ({
        id: Number(row.id),
        title: row.title,
        result: row.result,
        travelSeconds: Number(row.travel_seconds || 0),
        createdAt: Number(row.created_at || 0),
        log: (() => {
          try {
            return JSON.parse(row.log_json || "[]");
          } catch (err) {
            return [];
          }
        })()
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "주둔 전투 화면 데이터를 불러오지 못했습니다." });
  }
});

app.get("/research", requireAuth, async (req, res) => {
  try {
    const research = await getResearch(req.user.id);
    const bonuses = await getPlayerBonuses(req.user.id);
    const city = bonuses.city;
    const hulls = await all("SELECT key, name FROM hulls ORDER BY id");
    const components = await all("SELECT category, name, power_cost FROM components ORDER BY id");

    return res.json({
      research: formatResearchState(research),
      unlockSummary: buildUnlockSummary(research, hulls, components),
      bonuses: {
        resourceMultiplier: bonuses.resourceMultiplier,
        buildCostMultiplier: bonuses.buildCostMultiplier,
        combatMultiplier: bonuses.combatMultiplier,
        movementMultiplier: bonuses.movementMultiplier
      },
      city
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc5f0\uad6c \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/research/:type/upgrade", requireAuth, async (req, res) => {
  try {
    const type = String(req.params.type || "");
    if (!RESEARCH[type]) {
      return res.status(400).json({ error: "\uc5f0\uad6c\ud560 \uc218 \uc5c6\ub294 \ud56d\ubaa9\uc785\ub2c8\ub2e4." });
    }

    const research = await getResearch(req.user.id);
    const level = research[type] || 0;
    const playerBonuses = await getPlayerBonuses(req.user.id);
    const city = playerBonuses.city;
    if (level >= Number(city.bonuses.researchCap || 0)) {
      return res.status(400).json({ error: `연구소 레벨로 허용된 연구 상한(${city.bonuses.researchCap})에 도달했습니다.` });
    }
    const cost = researchCost(type, level);
    const state = await getUpdatedResources(req.user.id);

    if (state.resources.metal < cost.metal || state.resources.fuel < cost.fuel) {
      return res.status(400).json({
        error: `\uc790\uc6d0\uc774 \ubd80\uc871\ud569\ub2c8\ub2e4. \ud544\uc694: \uae08\uc18d ${cost.metal}, \uc5f0\ub8cc ${cost.fuel}`
      });
    }

    const column = `${type}_level`;
    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = metal - ?, fuel = fuel - ? WHERE user_id = ?", [cost.metal, cost.fuel, req.user.id]);
      await run(`UPDATE research SET ${column} = ${column} + 1 WHERE user_id = ?`, [req.user.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const nextResearch = await getResearch(req.user.id);
    const nextState = await getUpdatedResources(req.user.id);
    const bonuses = await getPlayerBonuses(req.user.id);
    const hulls = await all("SELECT key, name FROM hulls ORDER BY id");
    const components = await all("SELECT category, name, power_cost FROM components ORDER BY id");

    return res.json({
      message: `${RESEARCH[type].name} Lv.${nextResearch[type]} \uc5f0\uad6c \uc644\ub8cc.`,
      research: formatResearchState(nextResearch),
      unlockSummary: buildUnlockSummary(nextResearch, hulls, components),
      resources: {
        metal: nextState.resources.metal,
        fuel: nextState.resources.fuel,
        production: {
          metalPerSecond: nextState.rates.metal,
          fuelPerSecond: nextState.rates.fuel,
          base: nextState.rates.base,
          zones: nextState.rates.zones,
          multiplier: nextState.rates.multiplier
        }
      },
      bonuses
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc5f0\uad6c \uc5c5\uadf8\ub808\uc774\ub4dc \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/tech-tree", requireAuth, async (req, res) => {
  try {
    const tree = await getTechTreeState(req.user.id);
    const bonuses = await getPlayerBonuses(req.user.id);
    const settings = bonuses.settings || await getUserSettings(req.user.id);
    return res.json({
      mode: "tech_tree",
      labLevel: tree.labLevel,
      labTierUnlocked: tree.labTierUnlocked,
      activeResearch: tree.activeResearch,
      nodes: tree.nodes,
      policies: {
        source: "government+strategic",
        governmentLevel: Number(bonuses.city?.levels?.government || 1),
        selection: settings.policies,
        options: settings.policyOptions,
        lock: {
          lockedUntil: Number(settings.policyLockedUntil || 0),
          remainingSeconds: Number(settings.policyLockedRemainingSeconds || 0),
          lockMinutes: Math.floor(POLICY_LOCK_MS / 60000)
        },
        effects: settings.policyEffects,
        resourceMultiplier: bonuses.resourceMultiplier,
        buildCostMultiplier: bonuses.buildCostMultiplier,
        combatMultiplier: bonuses.combatMultiplier,
        movementMultiplier: bonuses.movementMultiplier
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\ud14c\ud06c\ud2b8\ub9ac \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/tech-tree/:key/start", requireAuth, async (req, res) => {
  try {
    const key = String(req.params.key || "").trim();
    const node = await get("SELECT * FROM tech_nodes WHERE key = ?", [key]);
    if (!node) return res.status(404).json({ error: "\uae30\uc220 \ub178\ub4dc\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });

    const tree = await getTechTreeState(req.user.id);
    if (tree.activeResearch) {
      return res.status(400).json({ error: "\uc774\ubbf8 \uc9c4\ud589 \uc911\uc778 \uc5f0\uad6c\uac00 \uc788\uc2b5\ub2c8\ub2e4." });
    }
    if (Number(tree.labLevel || 1) < Number(node.tier || 1)) {
      return res.status(400).json({ error: `\uc5f0\uad6c\uc18c Lv.${Number(node.tier || 1)} \uc774\uc0c1\uc5d0\uc11c\ub9cc \uc2dc\uc791 \uac00\ub2a5\ud569\ub2c8\ub2e4.` });
    }
    if ((tree.researchedKeys || []).includes(key)) {
      return res.status(400).json({ error: "\uc774\ubbf8 \uc644\ub8cc\ub41c \uae30\uc220\uc785\ub2c8\ub2e4." });
    }
    const requires = (() => {
      try {
        const parsed = JSON.parse(node.requires_json || "[]");
        return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
      } catch (err) {
        return [];
      }
    })();
    if (!requires.every((reqKey) => (tree.researchedKeys || []).includes(reqKey))) {
      return res.status(400).json({ error: "\uc120\ud589 \uae30\uc220\uc774 \ucda9\uc871\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4." });
    }
    if (String(node.exclusive_group || "")) {
      const sameGroup = await all("SELECT key FROM tech_nodes WHERE exclusive_group = ? AND key != ?", [String(node.exclusive_group), key]);
      if (sameGroup.some((item) => (tree.researchedKeys || []).includes(String(item.key)))) {
        return res.status(400).json({ error: "\ud574\ub2f9 \ubd84\uae30\uc5d0\uc11c\ub294 \ub2e4\ub978 \uae30\uc220\uc744 \uc774\ubbf8 \uc120\ud0dd\ud588\uc2b5\ub2c8\ub2e4." });
      }
    }

    const cost = { metal: Number(node.metal_cost || 0), fuel: Number(node.fuel_cost || 0) };
    const state = await getUpdatedResources(req.user.id);
    if (Number(state.resources.metal || 0) < cost.metal || Number(state.resources.fuel || 0) < cost.fuel) {
      return res.status(400).json({ error: `\uc790\uc6d0\uc774 \ubd80\uc871\ud569\ub2c8\ub2e4. \ud544\uc694: \uae08\uc18d ${cost.metal}, \uc5f0\ub8cc ${cost.fuel}` });
    }

    const now = Date.now();
    const end = now + (Math.max(30, Number(node.research_time || 60)) * 1000);
    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = metal - ?, fuel = fuel - ? WHERE user_id = ?", [cost.metal, cost.fuel, req.user.id]);
      await run(
        "INSERT INTO tech_queue (user_id, tech_key, start_time, end_time, status) VALUES (?, ?, ?, ?, 'researching')",
        [req.user.id, key, now, end]
      );
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const treeAfter = await getTechTreeState(req.user.id);
    const nextState = await getUpdatedResources(req.user.id);
    const bonuses = await getPlayerBonuses(req.user.id);
    const settings = bonuses.settings || await getUserSettings(req.user.id);
    return res.json({
      message: `${node.name} \uc5f0\uad6c\ub97c \uc2dc\uc791\ud588\uc2b5\ub2c8\ub2e4.`,
      mode: "tech_tree",
      labLevel: treeAfter.labLevel,
      labTierUnlocked: treeAfter.labTierUnlocked,
      activeResearch: treeAfter.activeResearch,
      nodes: treeAfter.nodes,
      resources: {
        metal: nextState.resources.metal,
        fuel: nextState.resources.fuel,
        production: {
          metalPerSecond: nextState.rates.metal,
          fuelPerSecond: nextState.rates.fuel,
          base: nextState.rates.base,
          zones: nextState.rates.zones,
          multiplier: nextState.rates.multiplier
        }
      },
      policies: {
        source: "government+strategic",
        governmentLevel: Number(bonuses.city?.levels?.government || 1),
        selection: settings.policies,
        options: settings.policyOptions,
        lock: {
          lockedUntil: Number(settings.policyLockedUntil || 0),
          remainingSeconds: Number(settings.policyLockedRemainingSeconds || 0),
          lockMinutes: Math.floor(POLICY_LOCK_MS / 60000)
        },
        effects: settings.policyEffects,
        resourceMultiplier: bonuses.resourceMultiplier,
        buildCostMultiplier: bonuses.buildCostMultiplier,
        combatMultiplier: bonuses.combatMultiplier,
        movementMultiplier: bonuses.movementMultiplier
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\ud14c\ud06c\ud2b8\ub9ac \uc5f0\uad6c \uc2dc\uc791 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/tech-tree/speedup", requireAuth, async (req, res) => {
  try {
    await processTechQueueForUser(req.user.id);
    const queue = await get(
      "SELECT id, tech_key, end_time FROM tech_queue WHERE user_id = ? AND status = 'researching' ORDER BY id DESC LIMIT 1",
      [req.user.id]
    );
    if (!queue) {
      return res.status(404).json({ error: "가속할 연구가 없습니다." });
    }
    const resourceType = String(req.body.resourceType || "fuel").toLowerCase() === "metal" ? "metal" : "fuel";
    const amount = Math.max(1, Math.min(30000, Number.parseInt(req.body.amount, 10) || 500));
    const state = await getUpdatedResources(req.user.id);
    if (Number(state.resources[resourceType] || 0) < amount) {
      return res.status(400).json({ error: `가속에 필요한 ${resourceType} 자원이 부족합니다. 필요: ${amount}` });
    }
    const speed = await consumeSpeedup(req.user.id, "research", amount);
    if (!speed.ok) {
      return res.status(400).json({
        error: `가속 효율 저하 단계입니다. 현재 1초 단축에 ${speed.resourcePerSecond} 재화가 필요합니다.`
      });
    }
    const reducedMs = speed.reducedSeconds * 1000;
    const nextEnd = Math.max(Date.now() + 1000, Number(queue.end_time || 0) - reducedMs);
    await run("BEGIN TRANSACTION");
    try {
      await run(`UPDATE resources SET ${resourceType} = ${resourceType} - ? WHERE user_id = ?`, [amount, req.user.id]);
      await run("UPDATE tech_queue SET end_time = ? WHERE id = ?", [nextEnd, queue.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const tree = await getTechTreeState(req.user.id);
    const bonuses = await getPlayerBonuses(req.user.id);
    const settings = bonuses.settings || await getUserSettings(req.user.id);
    const nextState = await getUpdatedResources(req.user.id);
    return res.json({
      message: `${resourceType} ${amount} 사용: 연구 ${speed.reducedSeconds}초 단축 (현재 1초=${speed.resourcePerSecond} 재화)`,
      mode: "tech_tree",
      labLevel: tree.labLevel,
      labTierUnlocked: tree.labTierUnlocked,
      activeResearch: tree.activeResearch,
      nodes: tree.nodes,
      resources: {
        metal: nextState.resources.metal,
        fuel: nextState.resources.fuel,
        production: {
          metalPerSecond: nextState.rates.metal,
          fuelPerSecond: nextState.rates.fuel,
          base: nextState.rates.base,
          zones: nextState.rates.zones,
          multiplier: nextState.rates.multiplier
        }
      },
      policies: {
        source: "government+strategic",
        governmentLevel: Number(bonuses.city?.levels?.government || 1),
        selection: settings.policies,
        options: settings.policyOptions,
        lock: {
          lockedUntil: Number(settings.policyLockedUntil || 0),
          remainingSeconds: Number(settings.policyLockedRemainingSeconds || 0),
          lockMinutes: Math.floor(POLICY_LOCK_MS / 60000)
        },
        effects: settings.policyEffects,
        resourceMultiplier: bonuses.resourceMultiplier,
        buildCostMultiplier: bonuses.buildCostMultiplier,
        combatMultiplier: bonuses.combatMultiplier,
        movementMultiplier: bonuses.movementMultiplier
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "연구 가속 처리 중 오류가 발생했습니다." });
  }
});

app.get("/city", requireAuth, async (req, res) => {
  try {
    const bonuses = await getPlayerBonuses(req.user.id);
    return res.json(bonuses.city);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "도시 정보 조회 중 오류가 발생했습니다." });
  }
});

app.post("/city/:key/upgrade", requireAuth, async (req, res) => {
  try {
    const key = String(req.params.key || "");
    if (!CITY_BUILDINGS[key]) {
      return res.status(400).json({ error: "업그레이드할 수 없는 건물입니다." });
    }
    const city = await getCityState(req.user.id);
    const level = Number(city.levels[key] || 1);
    if (level >= 30) {
      return res.status(400).json({ error: "해당 건물은 최대 레벨입니다." });
    }
    const cost = cityUpgradeCost(key, level + 1);
    const state = await getUpdatedResources(req.user.id);
    if (Number(state.resources.metal || 0) < cost.metal || Number(state.resources.fuel || 0) < cost.fuel) {
      return res.status(400).json({ error: `자원이 부족합니다. 필요: 금속 ${cost.metal}, 연료 ${cost.fuel}` });
    }
    const column = `${key}_level`;
    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = metal - ?, fuel = fuel - ? WHERE user_id = ?", [cost.metal, cost.fuel, req.user.id]);
      await run(`UPDATE city_buildings SET ${column} = ${column} + 1 WHERE user_id = ?`, [req.user.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
    return res.json({
      message: `${CITY_BUILDINGS[key].name} 레벨이 ${level + 1}로 상승했습니다.`,
      city: await getCityState(req.user.id),
      resources: (await getUpdatedResources(req.user.id))?.resources || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "도시 업그레이드 중 오류가 발생했습니다." });
  }
});

app.get("/fleet-groups", requireAuth, async (req, res) => {
  try {
    const groups = await getFleetGroups(req.user.id);
    const ownedShips = await getOwnedShips(req.user.id);
    const admirals = await all(
      "SELECT id, name, rarity, status, combat_bonus AS combatBonus, resource_bonus AS resourceBonus, cost_bonus AS costBonus FROM admirals WHERE user_id = ? ORDER BY assigned DESC, id DESC",
      [req.user.id]
    );
    const bonuses = await getPlayerBonuses(req.user.id);
    return res.json({
      groups,
      ownedShips,
      admirals,
      commander: bonuses.commander,
      fleetSlotLimit: bonuses.city?.bonuses?.fleetSlotLimit || 3
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "함대 편성 정보를 불러오지 못했습니다." });
  }
});

app.put("/fleet-groups/:slot", requireAuth, async (req, res) => {
  try {
    const slot = Number.parseInt(req.params.slot, 10);
    if (!Number.isInteger(slot) || slot < 1 || slot > 5) {
      return res.status(400).json({ error: "함대 슬롯 번호가 올바르지 않습니다." });
    }
    const bonuses = await getPlayerBonuses(req.user.id);
    if (slot > Number(bonuses.city?.bonuses?.fleetSlotLimit || 3)) {
      return res.status(400).json({ error: `현재 전술소 레벨로는 슬롯 ${slot}을 사용할 수 없습니다.` });
    }
    await ensureFleetGroups(req.user.id);
    const name = String(req.body.name || `함대 ${slot}`).trim().slice(0, 24) || `함대 ${slot}`;
    const ships = normalizeShipPlan(req.body.ships);
    const ownedShips = await all("SELECT design_id, quantity FROM owned_ships WHERE user_id = ?", [req.user.id]);
    const ownedMap = new Map();
    for (const row of ownedShips) {
      ownedMap.set(Number(row.design_id), Number(row.quantity || 0));
    }
    for (const item of ships) {
      if (!ownedMap.has(item.designId)) {
        return res.status(400).json({ error: `보유하지 않은 설계안(${item.designId})은 편성할 수 없습니다.` });
      }
      if (item.quantity > Number(ownedMap.get(item.designId) || 0)) {
        return res.status(400).json({ error: `설계안 ${item.designId} 수량이 보유량을 초과합니다.` });
      }
    }

    let admiralId = req.body.admiralId == null ? null : Number.parseInt(req.body.admiralId, 10);
    if (!Number.isInteger(admiralId)) admiralId = null;
    if (admiralId) {
      const admiral = await get(
        "SELECT id FROM admirals WHERE id = ? AND user_id = ? AND status = 'active'",
        [admiralId, req.user.id]
      );
      if (!admiral) return res.status(400).json({ error: "배치 가능한 제독이 아닙니다." });
    }

    await run(
      "INSERT INTO fleet_groups (user_id, slot_index, name, admiral_id, ship_plan_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, slot_index) DO UPDATE SET name = excluded.name, admiral_id = excluded.admiral_id, ship_plan_json = excluded.ship_plan_json",
      [req.user.id, slot, name, admiralId, JSON.stringify(ships)]
    );
    const groups = await getFleetGroups(req.user.id);
    const saved = groups.find((item) => Number(item.slot) === slot);
    return res.json({
      message: `함대 ${slot} 저장 완료. 전투력 ${Number(saved?.fleetCombatPower || 0).toLocaleString()}`,
      groups
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "함대 편성 저장 중 오류가 발생했습니다." });
  }
});

app.get("/admirals", requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `
        SELECT id, name, rarity, combat_bonus AS combatBonus,
               resource_bonus AS resourceBonus, cost_bonus AS costBonus, assigned, status, dead_at AS deadAt
        FROM admirals
        WHERE user_id = ?
        ORDER BY assigned DESC, status ASC, id DESC
      `,
      [req.user.id]
    );
    const settings = await getUserSettings(req.user.id);
    return res.json({ admirals: rows, settings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc81c\ub3c5 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/admirals/draw", requireAuth, async (req, res) => {
  try {
    const cost = { metal: 600, fuel: 300 };
    const state = await getUpdatedResources(req.user.id);
    if (state.resources.metal < cost.metal || state.resources.fuel < cost.fuel) {
      return res.status(400).json({ error: "\uc81c\ub3c5 \uc601\uc785\uc5d0 \ud544\uc694\ud55c \uc790\uc6d0\uc774 \ubd80\uc871\ud569\ub2c8\ub2e4." });
    }

    const roll = Math.random();
    const candidates = ADMIRAL_POOL.filter((admiral) => {
      if (roll > 0.92) return admiral.rarity === "SSR";
      if (roll > 0.62) return admiral.rarity === "SR";
      return admiral.rarity === "R";
    });
    const admiral = candidates[Math.floor(Math.random() * candidates.length)];

    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = metal - ?, fuel = fuel - ? WHERE user_id = ?", [cost.metal, cost.fuel, req.user.id]);
      const currentAssigned = await getAssignedAdmiral(req.user.id);
      await run(
        `
          INSERT INTO admirals
            (user_id, name, rarity, combat_bonus, resource_bonus, cost_bonus, assigned, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          req.user.id,
          admiral.name,
          admiral.rarity,
          admiral.combatBonus,
          admiral.resourceBonus,
          admiral.costBonus,
          currentAssigned ? 0 : 1,
          Date.now()
        ]
      );
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const rows = await all(
      "SELECT id, name, rarity, combat_bonus AS combatBonus, resource_bonus AS resourceBonus, cost_bonus AS costBonus, assigned, status, dead_at AS deadAt FROM admirals WHERE user_id = ? ORDER BY assigned DESC, status ASC, id DESC",
      [req.user.id]
    );
    const nextState = await getUpdatedResources(req.user.id);

    return res.json({
      message: `${admiral.rarity} \uc81c\ub3c5 ${admiral.name}\uc744 \uc601\uc785\ud588\uc2b5\ub2c8\ub2e4.`,
      admirals: rows,
      resources: {
        metal: nextState.resources.metal,
        fuel: nextState.resources.fuel,
        production: {
          metalPerSecond: nextState.rates.metal,
          fuelPerSecond: nextState.rates.fuel,
          base: nextState.rates.base,
          zones: nextState.rates.zones,
          multiplier: nextState.rates.multiplier
        }
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc81c\ub3c5 \uc601\uc785 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/admirals/:id/assign", requireAuth, async (req, res) => {
  try {
    const admiralId = Number.parseInt(req.params.id, 10);
    const admiral = await get("SELECT id FROM admirals WHERE id = ? AND user_id = ? AND status = 'active'", [admiralId, req.user.id]);
    if (!admiral) {
      return res.status(404).json({ error: "\uc81c\ub3c5\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }

    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE admirals SET assigned = 0 WHERE user_id = ?", [req.user.id]);
      await run("UPDATE admirals SET assigned = 1 WHERE id = ? AND user_id = ?", [admiralId, req.user.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const rows = await all(
      "SELECT id, name, rarity, combat_bonus AS combatBonus, resource_bonus AS resourceBonus, cost_bonus AS costBonus, assigned, status, dead_at AS deadAt FROM admirals WHERE user_id = ? ORDER BY assigned DESC, status ASC, id DESC",
      [req.user.id]
    );

    return res.json({ message: "\uc81c\ub3c5\uc744 \ubc30\uce58\ud588\uc2b5\ub2c8\ub2e4.", admirals: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc81c\ub3c5 \ubc30\uce58 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/admirals/:id/revive", requireAuth, async (req, res) => {
  try {
    const admiralId = Number.parseInt(req.params.id, 10);
    const admiral = await get("SELECT id, status FROM admirals WHERE id = ? AND user_id = ?", [admiralId, req.user.id]);
    if (!admiral) {
      return res.status(404).json({ error: "제독을 찾을 수 없습니다." });
    }
    if (admiral.status !== "dead") {
      return res.status(400).json({ error: "부활 가능한 상태의 제독이 아닙니다." });
    }

    const reviveCost = { metal: 1200, fuel: 700 };
    const state = await getUpdatedResources(req.user.id);
    if (state.resources.metal < reviveCost.metal || state.resources.fuel < reviveCost.fuel) {
      return res.status(400).json({ error: `부활 자원이 부족합니다. 필요: 금속 ${reviveCost.metal}, 연료 ${reviveCost.fuel}` });
    }

    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = metal - ?, fuel = fuel - ? WHERE user_id = ?", [reviveCost.metal, reviveCost.fuel, req.user.id]);
      await run("UPDATE admirals SET status = 'active', dead_at = NULL WHERE id = ? AND user_id = ?", [admiralId, req.user.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    const admirals = await all(
      "SELECT id, name, rarity, combat_bonus AS combatBonus, resource_bonus AS resourceBonus, cost_bonus AS costBonus, assigned, status, dead_at AS deadAt FROM admirals WHERE user_id = ? ORDER BY assigned DESC, status ASC, id DESC",
      [req.user.id]
    );
    return res.json({ message: "제독을 부활시켰습니다.", admirals });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "제독 부활 중 오류가 발생했습니다." });
  }
});

app.post("/admirals/:id/exile", requireAuth, async (req, res) => {
  try {
    const admiralId = Number.parseInt(req.params.id, 10);
    const admiral = await get("SELECT id FROM admirals WHERE id = ? AND user_id = ?", [admiralId, req.user.id]);
    if (!admiral) {
      return res.status(404).json({ error: "\uc81c\ub3c5\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }
    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE fleet_groups SET admiral_id = NULL WHERE user_id = ? AND admiral_id = ?", [req.user.id, admiralId]);
      await run("DELETE FROM admirals WHERE id = ? AND user_id = ?", [admiralId, req.user.id]);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
    const admirals = await all(
      "SELECT id, name, rarity, combat_bonus AS combatBonus, resource_bonus AS resourceBonus, cost_bonus AS costBonus, assigned, status, dead_at AS deadAt FROM admirals WHERE user_id = ? ORDER BY assigned DESC, status ASC, id DESC",
      [req.user.id]
    );
    return res.json({ message: "\uc81c\ub3c5\uc744 \ucd94\ubc29\ud588\uc2b5\ub2c8\ub2e4.", admirals });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc81c\ub3c5 \ucd94\ubc29 \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/policies", requireAuth, async (req, res) => {
  try {
    const settings = await getUserSettings(req.user.id);
    return res.json({
      policies: settings.policies,
      options: settings.policyOptions,
      effects: settings.policyEffects,
      lock: {
        lockedUntil: Number(settings.policyLockedUntil || 0),
        remainingSeconds: Number(settings.policyLockedRemainingSeconds || 0),
        lockMinutes: Math.floor(POLICY_LOCK_MS / 60000)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "정책 정보를 불러오지 못했습니다." });
  }
});

app.post("/policies", requireAuth, async (req, res) => {
  try {
    const current = await getUserSettings(req.user.id);
    const now = Date.now();
    if (Number(current.policyLockedUntil || 0) > now) {
      return res.status(400).json({
        error: `정책 변경 대기 중입니다. ${Math.max(1, Number(current.policyLockedRemainingSeconds || 0))}초 후 변경 가능합니다.`
      });
    }

    const next = {
      economy: String(req.body.economy || current.policies.economy),
      industry: String(req.body.industry || current.policies.industry),
      military: String(req.body.military || current.policies.military)
    };
    const normalized = normalizePolicySelection({
      economy_policy: next.economy,
      industry_policy: next.industry,
      military_policy: next.military
    });

    const changed =
      normalized.economy !== current.policies.economy ||
      normalized.industry !== current.policies.industry ||
      normalized.military !== current.policies.military;
    if (!changed) {
      return res.json({
        message: "현재 정책과 동일합니다.",
        policies: current.policies,
        effects: current.policyEffects,
        lock: {
          lockedUntil: Number(current.policyLockedUntil || 0),
          remainingSeconds: Number(current.policyLockedRemainingSeconds || 0),
          lockMinutes: Math.floor(POLICY_LOCK_MS / 60000)
        }
      });
    }

    const lockedUntil = now + POLICY_LOCK_MS;
    await run(
      `
        INSERT INTO user_settings (user_id, admiral_policy, economy_policy, industry_policy, military_policy, policy_locked_until)
        VALUES (?, 'capture', ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          economy_policy = excluded.economy_policy,
          industry_policy = excluded.industry_policy,
          military_policy = excluded.military_policy,
          policy_locked_until = excluded.policy_locked_until
      `,
      [req.user.id, normalized.economy, normalized.industry, normalized.military, lockedUntil]
    );

    const updated = await getUserSettings(req.user.id);
    return res.json({
      message: `정책을 변경했습니다. ${Math.floor(POLICY_LOCK_MS / 60000)}분 동안 고정됩니다.`,
      policies: updated.policies,
      options: updated.policyOptions,
      effects: updated.policyEffects,
      lock: {
        lockedUntil: Number(updated.policyLockedUntil || 0),
        remainingSeconds: Number(updated.policyLockedRemainingSeconds || 0),
        lockMinutes: Math.floor(POLICY_LOCK_MS / 60000)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "정책 변경 중 오류가 발생했습니다." });
  }
});

app.get("/admiral-policy", requireAuth, async (req, res) => {
  try {
    return res.json(await getUserSettings(req.user.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "제독 정책 조회 중 오류가 발생했습니다." });
  }
});

app.post("/admiral-policy", requireAuth, async (req, res) => {
  try {
    const policy = String(req.body.policy || "").trim().toLowerCase();
    if (!["capture", "kill", "release"].includes(policy)) {
      return res.status(400).json({ error: "정책은 capture / kill / release 중 하나여야 합니다." });
    }
    await run(
      "INSERT INTO user_settings (user_id, admiral_policy) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET admiral_policy = excluded.admiral_policy",
      [req.user.id, policy]
    );
    return res.json({ message: "제독 전투 정책을 변경했습니다.", settings: await getUserSettings(req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "제독 정책 저장 중 오류가 발생했습니다." });
  }
});

app.get("/players", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    const users = await all(
      "SELECT id FROM users WHERE id != ? ORDER BY id DESC LIMIT 20",
      [req.user.id]
    );
    const players = [];

    for (const user of users) {
      const target = await getPlayerTarget(user.id, req.user.id);
      if (target) players.push(target);
    }

    return res.json({ players });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\ud50c\ub808\uc774\uc5b4 \ubaa9\ub85d \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/trade/transfer", requireAuth, async (req, res) => {
  try {
    const toUserId = Number.parseInt(req.body.toUserId, 10);
    const metal = Math.max(0, Number.parseInt(req.body.metal, 10) || 0);
    const fuel = Math.max(0, Number.parseInt(req.body.fuel, 10) || 0);
    if (!Number.isInteger(toUserId) || toUserId === req.user.id) {
      return res.status(400).json({ error: "거래 대상이 올바르지 않습니다." });
    }
    if (metal <= 0 && fuel <= 0) {
      return res.status(400).json({ error: "거래 자원을 입력하세요." });
    }
    if (metal > 200000 || fuel > 200000) {
      return res.status(400).json({ error: "한 번에 전송 가능한 자원 한도를 초과했습니다." });
    }

    const target = await get("SELECT id, username FROM users WHERE id = ?", [toUserId]);
    if (!target) {
      return res.status(404).json({ error: "거래 대상을 찾을 수 없습니다." });
    }

    const senderState = await getUpdatedResources(req.user.id);
    if (Number(senderState?.resources?.metal || 0) < metal || Number(senderState?.resources?.fuel || 0) < fuel) {
      return res.status(400).json({ error: "보유 자원이 부족합니다." });
    }

    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = metal - ?, fuel = fuel - ? WHERE user_id = ?", [metal, fuel, req.user.id]);
      await run("UPDATE resources SET metal = metal + ?, fuel = fuel + ? WHERE user_id = ?", [metal, fuel, toUserId]);
      await run(
        "INSERT INTO trade_logs (from_user_id, to_user_id, metal, fuel, created_at) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, toUserId, metal, fuel, Date.now()]
      );
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    return res.json({
      message: `${target.username}에게 금속 ${metal.toLocaleString()}, 연료 ${fuel.toLocaleString()}를 보냈습니다.`,
      resources: await getUpdatedResources(req.user.id)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "거래 처리 중 오류가 발생했습니다." });
  }
});

app.get("/trade/logs", requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `
        SELECT t.id, t.from_user_id, t.to_user_id, t.metal, t.fuel, t.created_at,
               fu.username AS from_name, tu.username AS to_name
        FROM trade_logs t
        JOIN users fu ON fu.id = t.from_user_id
        JOIN users tu ON tu.id = t.to_user_id
        WHERE t.from_user_id = ? OR t.to_user_id = ?
        ORDER BY t.id DESC
        LIMIT 40
      `,
      [req.user.id, req.user.id]
    );
    return res.json({
      logs: rows.map((row) => ({
        id: row.id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        fromName: row.from_name,
        toName: row.to_name,
        metal: Number(row.metal || 0),
        fuel: Number(row.fuel || 0),
        createdAt: Number(row.created_at || 0)
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "거래 기록 조회 중 오류가 발생했습니다." });
  }
});

app.post("/trade/ships", requireAuth, async (req, res) => {
  try {
    const toUserId = Number.parseInt(req.body.toUserId, 10);
    const designId = Number.parseInt(req.body.designId, 10);
    const quantity = Math.max(1, Number.parseInt(req.body.quantity, 10) || 0);
    if (!Number.isInteger(toUserId) || toUserId === req.user.id) {
      return res.status(400).json({ error: "거래 대상이 올바르지 않습니다." });
    }
    if (!Number.isInteger(designId)) {
      return res.status(400).json({ error: "거래할 설계안을 선택하세요." });
    }
    if (quantity > 5000) {
      return res.status(400).json({ error: "1회 함선 거래 수량 제한을 초과했습니다." });
    }

    const target = await get("SELECT id, username FROM users WHERE id = ?", [toUserId]);
    if (!target) {
      return res.status(404).json({ error: "거래 대상을 찾을 수 없습니다." });
    }
    const owned = await get(
      `
        SELECT os.quantity, d.name AS design_name
        FROM owned_ships os
        JOIN ship_designs d ON d.id = os.design_id
        WHERE os.user_id = ? AND os.design_id = ?
      `,
      [req.user.id, designId]
    );
    if (!owned || Number(owned.quantity || 0) < quantity) {
      return res.status(400).json({ error: "보유 수량이 부족합니다." });
    }

    const receiverDesign = await get("SELECT id FROM ship_designs WHERE id = ? AND user_id = ?", [designId, toUserId]);
    if (!receiverDesign) {
      return res.status(400).json({ error: "상대 유저가 해당 설계안을 보유해야 함선 거래가 가능합니다." });
    }

    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE owned_ships SET quantity = quantity - ? WHERE user_id = ? AND design_id = ?", [quantity, req.user.id, designId]);
      await run(
        "INSERT INTO owned_ships (user_id, design_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, design_id) DO UPDATE SET quantity = owned_ships.quantity + excluded.quantity",
        [toUserId, designId, quantity]
      );
      await run("DELETE FROM owned_ships WHERE user_id = ? AND design_id = ? AND quantity <= 0", [req.user.id, designId]);
      await run(
        "INSERT INTO ship_trade_logs (from_user_id, to_user_id, design_id, design_name, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.id, toUserId, designId, String(owned.design_name || "설계안"), quantity, Date.now()]
      );
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }

    return res.json({
      message: `${target.username}에게 ${String(owned.design_name || "설계안")} ${quantity}척을 전달했습니다.`,
      ownedShips: await getOwnedShips(req.user.id),
      shipLogs: await all(
        `
          SELECT st.id, st.design_name, st.quantity, st.created_at,
                 fu.username AS from_name, tu.username AS to_name
          FROM ship_trade_logs st
          JOIN users fu ON fu.id = st.from_user_id
          JOIN users tu ON tu.id = st.to_user_id
          WHERE st.from_user_id = ? OR st.to_user_id = ?
          ORDER BY st.id DESC
          LIMIT 40
        `,
        [req.user.id, req.user.id]
      )
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "함선 거래 처리 중 오류가 발생했습니다." });
  }
});

app.get("/trade/ship-logs", requireAuth, async (req, res) => {
  try {
    const rows = await all(
      `
        SELECT st.id, st.design_id, st.design_name, st.quantity, st.created_at,
               fu.username AS from_name, tu.username AS to_name
        FROM ship_trade_logs st
        JOIN users fu ON fu.id = st.from_user_id
        JOIN users tu ON tu.id = st.to_user_id
        WHERE st.from_user_id = ? OR st.to_user_id = ?
        ORDER BY st.id DESC
        LIMIT 40
      `,
      [req.user.id, req.user.id]
    );
    return res.json({
      logs: rows.map((row) => ({
        id: row.id,
        designId: Number(row.design_id || 0),
        designName: row.design_name,
        quantity: Number(row.quantity || 0),
        fromName: row.from_name,
        toName: row.to_name,
        createdAt: Number(row.created_at || 0)
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "함선 거래 기록 조회 중 오류가 발생했습니다." });
  }
});

app.get("/missions", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    return res.json({ activeMissions: await getActiveMissions(req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc784\ubb34 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/alerts/incoming", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    return res.json({ alerts: await getIncomingAlerts(req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "침공 알림 조회 중 오류가 발생했습니다." });
  }
});

app.post("/missions/:id/cancel", requireAuth, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const mission = await get("SELECT * FROM missions WHERE id = ? AND user_id = ? AND status = 'traveling'", [id, req.user.id]);
    if (!mission) return res.status(404).json({ error: "\ucde8\uc18c\ud560 \uc784\ubb34\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    await run("UPDATE missions SET status = 'failed', result = 'cancelled', log_json = ? WHERE id = ?", [JSON.stringify(["[\uc784\ubb34 \ucde8\uc18c] \uc720\uc800\uac00 \ucd9c\uaca9\uc744 \ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4."]), id]);
    if ((mission.mission_type === "pvp" || mission.mission_type === "zone") && mission.target_user_id) {
      await run("UPDATE incoming_alerts SET status = 'cancelled' WHERE mission_id = ?", [id]);
    }
    return res.json({ message: "\ucd9c\uaca9 \uc784\ubb34\ub97c \ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4.", activeMissions: await getActiveMissions(req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc784\ubb34 \ucde8\uc18c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/missions/:id/speedup", requireAuth, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const resourceType = String(req.body.resourceType || "fuel").toLowerCase() === "metal" ? "metal" : "fuel";
    const amount = Math.max(1, Math.min(20000, Number.parseInt(req.body.amount, 10) || 600));
    const mission = await get("SELECT * FROM missions WHERE id = ? AND user_id = ? AND status = 'traveling'", [id, req.user.id]);
    if (!mission) return res.status(404).json({ error: "\uac00\uc18d\ud560 \uc784\ubb34\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    const state = await getUpdatedResources(req.user.id);
    if (Number(state.resources[resourceType] || 0) < amount) {
      return res.status(400).json({ error: `가속에 필요한 ${resourceType} 자원이 부족합니다. 필요: ${amount}` });
    }
    const speed = await consumeSpeedup(req.user.id, "mission", amount);
    if (!speed.ok) {
      return res.status(400).json({
        error: `가속 효율 저하 단계입니다. 현재 1초 단축에 ${speed.resourcePerSecond} 재화가 필요합니다.`
      });
    }
    const reducedMs = speed.reducedSeconds * 1000;
    const nextArrive = Math.max(Date.now() + 1000, Number(mission.arrive_at) - reducedMs);
    await run("BEGIN TRANSACTION");
    try {
      await run(`UPDATE resources SET ${resourceType} = ${resourceType} - ? WHERE user_id = ?`, [amount, req.user.id]);
      await run("UPDATE missions SET arrive_at = ? WHERE id = ?", [nextArrive, id]);
      if ((mission.mission_type === "pvp" || mission.mission_type === "zone") && mission.target_user_id) {
        await run("UPDATE incoming_alerts SET arrive_at = ? WHERE mission_id = ? AND status = 'active'", [nextArrive, id]);
      }
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
    return res.json({
      message: `${resourceType} ${amount} 사용: 이동 ${speed.reducedSeconds}초 단축 (페널티 x${speed.multiplier.toFixed(2)}, 연속 ${speed.nextStreak}회)`,
      activeMissions: await getActiveMissions(req.user.id),
      resources: (await getUpdatedResources(req.user.id))?.resources || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc784\ubb34 \uac00\uc18d \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.get("/battle-records", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    return res.json({ records: await getBattleRecords(req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc804\ud22c\uae30\ub85d \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.delete("/battle-records", requireAuth, async (req, res) => {
  try {
    await run("DELETE FROM battle_records WHERE user_id = ?", [req.user.id]);
    return res.json({ message: "전투기록을 초기화했습니다.", records: [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "전투기록 초기화 중 오류가 발생했습니다." });
  }
});

app.post("/pvp/attack", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    const targetUserId = Number.parseInt(req.body.targetUserId, 10);
    if (!Number.isInteger(targetUserId) || targetUserId === req.user.id) {
      return res.status(400).json({ error: "\uacf5\uaca9\ud560 \ub300\uc0c1\uc774 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4." });
    }

    const targetUser = await get("SELECT id, username FROM users WHERE id = ?", [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: "\ub300\uc0c1 \uc720\uc800\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }

    const activeMission = await get("SELECT id FROM missions WHERE user_id = ? AND status = 'traveling' LIMIT 1", [req.user.id]);
    if (activeMission) {
      return res.status(400).json({ error: "\uc774\ubbf8 \uc9c4\ud589 \uc911\uc778 \ucd9c\uaca9 \uc784\ubb34\uac00 \uc788\uc2b5\ub2c8\ub2e4." });
    }

    const attackerBonuses = await getPlayerBonuses(req.user.id);
    const requestedSlot = Number.parseInt(req.body.fleetSlot, 10) || 1;
    if (requestedSlot > Number(attackerBonuses.city?.bonuses?.fleetSlotLimit || 3)) {
      return res.status(400).json({ error: `현재 전술소 레벨로는 슬롯 ${requestedSlot}을 사용할 수 없습니다.` });
    }
    const launch = await getLaunchFleetFromSlot(req.user.id, requestedSlot);
    const attackerFleet = launch.fleet;
    if (!hasDesignShips(attackerFleet)) {
      return res.status(400).json({ error: "선택한 함대 슬롯에 출격 가능한 함선이 없습니다." });
    }

    const fleetCombatMultiplier = 1 + Number(launch.admiral?.combatBonus || 0) * 0.9;
    const fleetMoveMultiplier = 1 + Number(launch.admiral?.resourceBonus || 0) * 0.45;
    const attackerBase = await ensureBase(req.user.id);
    const defenderBase = await ensureBase(targetUserId);
    const attackerPower = Math.floor(designFleetPower(attackerFleet) * attackerBonuses.combatMultiplier * fleetCombatMultiplier);
    const attackerShipCount = attackerFleet.reduce((sum, ship) => sum + Number(ship.quantity || 0), 0);
    const travelSeconds = travelTimeSecondsForDesignFleet(attackerBase, defenderBase, attackerFleet, {
      movementMultiplier: attackerBonuses.movementMultiplier * fleetMoveMultiplier
    });
    const now = Date.now();
    const arriveAt = now + travelSeconds * 1000;

    const result = await run(
      `
        INSERT INTO missions
          (user_id, mission_type, target_user_id, target_name, from_x, from_y, to_x, to_y, started_at, arrive_at, status, attacker_power, attacker_ship_count, attacker_fleet_json, attacker_fleet_slot, attacker_admiral_id)
        VALUES (?, 'pvp', ?, ?, ?, ?, ?, ?, ?, ?, 'traveling', ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        targetUserId,
        targetUser.username,
        attackerBase.x,
        attackerBase.y,
        defenderBase.x,
        defenderBase.y,
        now,
        arriveAt,
        attackerPower,
        attackerShipCount,
        JSON.stringify(attackerFleet),
        launch.slot,
        launch.admiral?.id || null
      ]
    );
    await run(
      `
        INSERT INTO incoming_alerts
          (target_user_id, mission_id, attacker_user_id, attacker_username, attack_power, ship_count, arrive_at, status, created_at, target_kind, target_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, 'base', ?)
      `,
      [targetUserId, result.lastID, req.user.id, req.user.username, attackerPower, attackerShipCount, arriveAt, now, "본진"]
    );

    return res.json({
      queued: true,
      missionId: result.lastID,
      missionType: "pvp",
      message: `${targetUser.username} \uae30\uc9c0\ub85c \ucd9c\uaca9\ud588\uc2b5\ub2c8\ub2e4. \ub3c4\ucc29 \ud6c4 \uc804\ud22c\uac00 \uc790\ub3d9 \ucc98\ub9ac\ub429\ub2c8\ub2e4.`,
      travelTimeSeconds: travelSeconds,
      travelTimeText: formatTravelTime(travelSeconds),
      arriveAt,
      to: { x: defenderBase.x, y: defenderBase.y }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "PvP \uacf5\uaca9 \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/build", requireAuth, async (req, res) => {
  return res.status(410).json({
    error: "\uae30\uc874 \ud568\uc120 \ud0c0\uc785 \uc0dd\uc0b0\uc740 \uc81c\uac70\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc0dd\uc0b0 \ud0ed\uc758 \uc124\uacc4\uc548 \uc0dd\uc0b0\uc744 \uc0ac\uc6a9\ud558\uc138\uc694."
  });
});

app.post("/battle", requireAuth, async (req, res) => {
  try {
    const fleet = await getOwnedShipFleet(req.user.id);
    if (!hasDesignShips(fleet)) {
      return res.status(400).json({ error: "\ucd9c\uaca9 \uac00\ub2a5\ud55c \uc124\uacc4 \ud568\uc120\uc774 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }

    const enemy = garrisonToDesignFleet({ corvette: 7, destroyer: 2, cruiser: 1, battleship: 0, carrier: 0 });
    const battle = simulateDesignBattle(
      fleet,
      enemy,
      "\uc911\ub9bd \ud56d\ub85c\uc758 \uc21c\ucc30 \ud568\ub300\uc640 \uad50\uc804\ud569\ub2c8\ub2e4.",
      playerBonuses.combatMultiplier
    );
    await updateOwnedShipsFromBattle(req.user.id, battle.remainingFleet);
    const savedFleet = await getOwnedShipFleet(req.user.id);

    return res.json({ result: battle.result, log: battle.log, fleet: savedFleet || battle.remainingFleet });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc804\ud22c \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/zones/:id/capture", requireAuth, async (req, res) => {
  try {
    await processMissionQueueForUser(req.user.id);
    const zoneId = Number.parseInt(req.params.id, 10);
    const zone = await get("SELECT * FROM neutral_zones WHERE id = ?", [zoneId]);
    if (!zone) {
      return res.status(404).json({ error: "\uc911\ub9bd \uad6c\uc5ed\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." });
    }

    const owner = await get(
      `
        SELECT oz.user_id, u.username
        FROM occupied_zones oz
        JOIN users u ON u.id = oz.user_id
        WHERE oz.zone_id = ?
      `,
      [zoneId]
    );
    if (owner?.user_id === req.user.id) {
      return res.status(400).json({ error: "\uc774\ubbf8 \uc810\ub839\ud55c \uad6c\uc5ed\uc785\ub2c8\ub2e4." });
    }
    const city = await getCityState(req.user.id);
    const occupiedCount = await get("SELECT COUNT(*) AS cnt FROM occupied_zones WHERE user_id = ?", [req.user.id]);
    if (Number(occupiedCount?.cnt || 0) >= Number(city.bonuses.colonyCap || 0)) {
      return res.status(400).json({ error: `식민지 상한(${city.bonuses.colonyCap})에 도달해 추가 점령이 불가능합니다.` });
    }

    const activeMission = await get("SELECT id FROM missions WHERE user_id = ? AND status = 'traveling' LIMIT 1", [req.user.id]);
    if (activeMission) {
      return res.status(400).json({ error: "\uc774\ubbf8 \uc9c4\ud589 \uc911\uc778 \ucd9c\uaca9 \uc784\ubb34\uac00 \uc788\uc2b5\ub2c8\ub2e4." });
    }

    const requestedSlot = Number.parseInt(req.body.fleetSlot, 10) || 1;
    if (requestedSlot > Number(playerBonuses.city?.bonuses?.fleetSlotLimit || 3)) {
      return res.status(400).json({ error: `현재 전술소 레벨로는 슬롯 ${requestedSlot}을 사용할 수 없습니다.` });
    }
    const launch = await getLaunchFleetFromSlot(req.user.id, requestedSlot);
    const fleet = launch.fleet;
    if (!hasDesignShips(fleet)) {
      return res.status(400).json({ error: "선택한 함대 슬롯에 출격 가능한 함선이 없습니다." });
    }

    const fleetMoveMultiplier = 1 + Number(launch.admiral?.resourceBonus || 0) * 0.45;
    const attackerBase = await ensureBase(req.user.id);
    const travelSeconds = travelTimeSecondsForDesignFleet(
      attackerBase,
      { x: zone.map_x, y: zone.map_y },
      fleet,
      { movementMultiplier: playerBonuses.movementMultiplier * fleetMoveMultiplier }
    );
    const now = Date.now();
    const arriveAt = now + travelSeconds * 1000;
    const missionResult = await run(
      `
        INSERT INTO missions
          (user_id, mission_type, target_zone_id, target_name, from_x, from_y, to_x, to_y, started_at, arrive_at, status, target_user_id, attacker_fleet_json, attacker_fleet_slot, attacker_admiral_id)
        VALUES (?, 'zone', ?, ?, ?, ?, ?, ?, ?, ?, 'traveling', ?, ?, ?, ?)
      `,
      [
        req.user.id,
        zoneId,
        zone.name,
        attackerBase.x,
        attackerBase.y,
        zone.map_x,
        zone.map_y,
        now,
        arriveAt,
        owner?.user_id || null,
        JSON.stringify(fleet),
        launch.slot,
        launch.admiral?.id || null
      ]
    );
    if (owner?.user_id) {
      const attackerPower = Math.floor(designFleetPower(fleet) * playerBonuses.combatMultiplier * (1 + Number(launch.admiral?.combatBonus || 0) * 0.9));
      const attackerShipCount = fleet.reduce((sum, ship) => sum + Number(ship.quantity || 0), 0);
      await run(
        `
          INSERT INTO incoming_alerts
            (target_user_id, mission_id, attacker_user_id, attacker_username, attack_power, ship_count, arrive_at, status, created_at, target_kind, target_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, 'outpost', ?)
        `,
        [owner.user_id, missionResult.lastID, req.user.id, req.user.username, attackerPower, attackerShipCount, arriveAt, now, zone.name]
      );
    }

    return res.json({
      queued: true,
      missionId: missionResult.lastID,
      missionType: "zone",
      message: `${zone.name}\ub85c \ucd9c\uaca9\ud588\uc2b5\ub2c8\ub2e4. \ub3c4\ucc29 \ud6c4 \uc810\ub839 \uc804\ud22c\uac00 \uc790\ub3d9 \ucc98\ub9ac\ub429\ub2c8\ub2e4.`,
      travelTimeSeconds: travelSeconds,
      travelTimeText: formatTravelTime(travelSeconds),
      arriveAt,
      to: { x: zone.map_x, y: zone.map_y }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "\uc911\ub9bd \uad6c\uc5ed \uc810\ub839 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4." });
  }
});

app.post("/admin/login", requireAuth, async (req, res) => {
  try {
    const passcode = String(req.body.passcode || "");
    if (passcode !== ADMIN_PANEL_PASS) {
      return res.status(401).json({ error: "개발자 창 비밀번호가 올바르지 않습니다." });
    }
    return res.json({
      message: "개발자 모드 인증 성공",
      adminToken: signAdminToken(req.user.id)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "개발자 인증 중 오류가 발생했습니다." });
  }
});

app.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await all("SELECT id, username, created_at FROM users ORDER BY id ASC");
    const result = [];
    for (const user of users) {
      const resources = await get("SELECT metal, fuel FROM resources WHERE user_id = ?", [user.id]);
      const fleet = await getOwnedShipFleet(user.id);
      const base = await ensureBase(user.id);
      const progress = await getCommanderProgress(user.id);
      result.push({
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
        resources: {
          metal: Number(resources?.metal || 0),
          fuel: Number(resources?.fuel || 0)
        },
        base,
        commanderLevel: progress.level,
        fleetPower: Math.floor(designFleetPower(fleet))
      });
    }
    return res.json({ users: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "계정 목록 조회 중 오류가 발생했습니다." });
  }
});

app.post("/admin/users/:id/reset", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const exists = await get("SELECT id FROM users WHERE id = ?", [userId]);
    if (!exists) return res.status(404).json({ error: "대상 계정을 찾을 수 없습니다." });
    await run("BEGIN TRANSACTION");
    try {
      await run("UPDATE resources SET metal = 1000, fuel = 500, last_update = ? WHERE user_id = ?", [Date.now(), userId]);
      await run("UPDATE commander_progress SET level = 1, xp = 0 WHERE user_id = ?", [userId]);
      await run("UPDATE research SET resource_level = 0, logistics_level = 0, tactics_level = 0 WHERE user_id = ?", [userId]);
      await run("DELETE FROM production_queue WHERE user_id = ?", [userId]);
      await run("DELETE FROM owned_ships WHERE user_id = ?", [userId]);
      await run("DELETE FROM ship_designs WHERE user_id = ?", [userId]);
      await run("DELETE FROM battle_records WHERE user_id = ?", [userId]);
      await run("DELETE FROM missions WHERE user_id = ? OR target_user_id = ?", [userId, userId]);
      await run("DELETE FROM incoming_alerts WHERE target_user_id = ? OR attacker_user_id = ?", [userId, userId]);
      await run("DELETE FROM speedup_usage WHERE user_id = ?", [userId]);
      await run("DELETE FROM occupied_zones WHERE user_id = ?", [userId]);
      await run("DELETE FROM zone_garrisons WHERE user_id = ?", [userId]);
      await run("DELETE FROM fleet_groups WHERE user_id = ?", [userId]);
      await run("DELETE FROM city_buildings WHERE user_id = ?", [userId]);
      await run("DELETE FROM ship_trade_logs WHERE from_user_id = ? OR to_user_id = ?", [userId, userId]);
      await run("DELETE FROM admirals WHERE user_id = ?", [userId]);
      await ensureStarterDesign(userId);
      await run(
        "INSERT OR IGNORE INTO city_buildings (user_id, shipyard_level, government_level, housing_level, research_lab_level, tactical_center_level) VALUES (?, 1, 1, 1, 1, 1)",
        [userId]
      );
      await ensureFleetGroups(userId);
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
    return res.json({ message: "계정 데이터를 초기화했습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "계정 초기화 중 오류가 발생했습니다." });
  }
});

app.delete("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    if (userId === req.user.id) {
      return res.status(400).json({ error: "현재 로그인한 계정은 개발자 창에서 삭제할 수 없습니다." });
    }
    const exists = await get("SELECT id FROM users WHERE id = ?", [userId]);
    if (!exists) return res.status(404).json({ error: "대상 계정을 찾을 수 없습니다." });
    await deleteUserCompletely(userId);
    return res.json({ message: "계정을 삭제했습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "계정 삭제 중 오류가 발생했습니다." });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SF SLG MVP server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB initialization failed:", err);
    process.exit(1);
  });
