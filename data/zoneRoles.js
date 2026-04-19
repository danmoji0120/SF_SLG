// Zone role data. Effects use additive percentages and are capped by maxStacks.
module.exports = {
  metal: {
    label: "\uae08\uc18d \uac70\uc810",
    effect: "\uae08\uc18d \uc0dd\uc0b0 \uc99d\uac00",
    icon: "M",
    effects: {},
    maxStacks: 3,
    layers: ["outer", "mid"]
  },
  fuel: {
    label: "\uc5f0\ub8cc \uac70\uc810",
    effect: "\uc5f0\ub8cc \uc0dd\uc0b0 \uc99d\uac00",
    icon: "F",
    effects: {},
    maxStacks: 3,
    layers: ["outer", "mid"]
  },
  supply: {
    label: "\ubcf4\uae09 \uac70\uc810",
    effect: "\uc720\uc9c0/\uc81c\uc791 \ube44\uc6a9 \uac10\uc18c",
    icon: "S",
    effects: { buildCostPct: 0.025 },
    maxStacks: 3,
    layers: ["outer", "mid"]
  },
  production: {
    label: "\uc0dd\uc0b0 \uac70\uc810",
    effect: "\ud568\uc120 \uc0dd\uc0b0 \uc18d\ub3c4 \uc99d\uac00",
    icon: "P",
    effects: { buildTimePct: 0.04 },
    maxStacks: 3,
    layers: ["mid"]
  },
  mobility: {
    label: "\uae30\ub3d9 \uac70\uc810",
    effect: "\ud568\ub300 \uc774\ub3d9 \uc18d\ub3c4 \uc99d\uac00",
    icon: "V",
    effects: { movementPct: 0.05 },
    maxStacks: 3,
    layers: ["mid"]
  },
  combat: {
    label: "\uc804\ud22c \uac70\uc810",
    effect: "\uacf5\uaca9/\ubc29\uc5b4 \uc804\ud22c\ub825 \uc99d\uac00",
    icon: "C",
    effects: { combatPct: 0.045 },
    maxStacks: 3,
    layers: ["mid"]
  },
  titan_core: {
    label: "\ud0c0\uc774\ud0c4 \uc81c\uc5b4 \ucf54\uc5b4",
    effect: "\ud0c0\uc774\ud0c4 \uad00\ub828 \ucd5c\uc0c1\uc704 \ubcf4\uc0c1",
    icon: "T",
    effects: { titanCoreCount: 1 },
    maxStacks: 3,
    layers: ["core"]
  },
  command_hub: {
    label: "\uc911\uc559 \uc9c0\ud718 \ud5c8\ube0c",
    effect: "\uc804\uccb4 \ud568\ub300 \uc18c\ud3ed \ubc84\ud504",
    icon: "H",
    effects: { combatPct: 0.025, resourcePct: 0.015 },
    maxStacks: 3,
    layers: ["core"]
  }
};
