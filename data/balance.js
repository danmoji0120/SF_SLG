// Global balance knobs. Keep formulas in server.js, keep numbers here.
module.exports = {
  baseProduction: { metal: 2, fuel: 1 },
  movement: { baseFuelPerDistance: 120, mapDistanceUnit: 20 },
  map: { maxX: 2000, maxY: 2000 },
  timing: { coreUnlockAfterSeconds: 3 * 60 * 60, targetEndSeconds: 5 * 60 * 60 },
  speedup: { resourcePerSecond: 100 },
  production: {
    minimumBuildTime: 20,
    powerDivisor: 110,
    complexityExponent: 1.45,
    slotWeights: { engine: 0.6, weapon: 1.2, defense: 1, utility: 0.7 },
    slotTimeWeight: 25
  },
  combatLoop: {
    tickSeconds: 8,
    maxTicks: 32,
    retreatDelayTicks: 2,
    autoRetreatAverageHpRatio: 0.3,
    lineCollapseHpRatio: 0.1,
    hitBase: 90,
    hitMin: 55,
    hitMax: 97,
    speedHitWeight: 2,
    critChance: 0.05,
    critMultiplier: 1.5,
    weaponPowerCoefficient: 1,
    lineInitiativeBonus: { front: 20, mid: 10, back: 0 },
    damageStateModifiers: {
      normal: { attack: 1, speed: 1 },
      light: { attack: 0.95, speed: 0.95 },
      heavy: { attack: 0.85, speed: 0.9 },
      critical: { attack: 0.65, speed: 0.8 }
    },
    lineTargetOrder: ["front", "mid", "back"],
    bypassFamilies: {
      missile_weapon: { backChance: 0.28 },
      siege_weapon: { backChance: 0.18 }
    }
  },
  repair: {
    hpRatioPerTick: 0.02,
    tickSeconds: 10,
    costCoefficient: 0.7
  },
  zoneTargetPowerByLevel: { 1: 750, 2: 4600, 3: 16500, 4: 36000, 5: 68000 },
  zoneCapture: { baseSeconds: 45, perLevelSeconds: 45 },
  zoneRoleStackLimit: 3,
  zoneRoleBonuses: {
    supply: { buildCostPct: 0.025 },
    production: { buildTimePct: 0.04 },
    mobility: { movementPct: 0.05 },
    combat: { combatPct: 0.045 },
    command_hub: { combatPct: 0.025, resourcePct: 0.015 },
    titan_core: { titanCoreCount: 1 }
  },
  combatPower: { attackWeight: 1, defenseWeight: 0.45, hpWeight: 0.12, shipHpDefenseDivisor: 8 },
  fleetSpeed: { minimumSpeed: 0.5, sizePenaltyDivisor: 80 },
  thirdEmpire: { powerScaleBase: 1.65, powerScalePerLevel: 0.18, recommendedPowerMultiplier: 2.2, recommendedPowerFlatPerLevel: 850 },
  legacyShips: {
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
}
};
