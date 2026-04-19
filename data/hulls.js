// Hull balance data. Edit this file to tune ship classes without touching server logic.
module.exports = [
  {
    key: "corvette",
    name: "\ucd08\uacc4\ud568 \uc120\uccb4",
    classType: "corvette",
    baseHp: 80,
    baseSpeed: 9,
    powerLimit: 75,
    baseBuildTime: 20,
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
    baseBuildTime: 45,
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
    baseBuildTime: 90,
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
    baseBuildTime: 150,
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
    baseBuildTime: 180,
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
    baseBuildTime: 170,
    metalCost: 3000,
    fuelCost: 1700,
    slots: { engine: 2, weapon: 2, defense: 3, utility: 5 }
  },
  {
    key: "tactical_support",
    name: "\uc804\uc220\uc9c0\uc6d0\ud568 \uc120\uccb4",
    classType: "tactical_support",
    baseHp: 580,
    baseSpeed: 3,
    powerLimit: 360,
    baseBuildTime: 165,
    metalCost: 2850,
    fuelCost: 1600,
    slots: { engine: 2, weapon: 1, defense: 3, utility: 5 }
  },
  {
    key: "dreadnought",
    name: "\ub4dc\ub808\ub4dc\ub178\ud2b8 \uc120\uccb4",
    classType: "dreadnought",
    baseHp: 1180,
    baseSpeed: 2,
    powerLimit: 620,
    baseBuildTime: 300,
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
    baseBuildTime: 600,
    metalCost: 9800,
    fuelCost: 5600,
    slots: { engine: 3, weapon: 6, defense: 6, utility: 3 }
  }
];
