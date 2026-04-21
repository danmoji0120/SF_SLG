const https = require("https");
const Module = require("module");
const path = require("path");
const { applySessionPatch } = require("./server_session_patch");

const ORIGINAL_SERVER_URL = "https://raw.githubusercontent.com/danmoji0120/SF_SLG/08b49d7db5b8316f0084fb9598901773c22778cc/server.js";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch original server.js: HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      res.setEncoding("utf8");
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function replaceOnce(source, searchValue, replaceValue, label) {
  const next = source.replace(searchValue, replaceValue);
  if (next === source) {
    throw new Error(`Patch failed: ${label}`);
  }
  return next;
}

function patchSource(source) {
  let patched = source;

  patched = replaceOnce(
    patched,
    'const { hulls: DEFAULT_HULLS, modules: DEFAULT_COMPONENTS, zoneRoles: ZONE_ROLE_DEFS, balance, researchUnlocks: RESEARCH_UNLOCKS } = require("./data");',
    'const { hulls: DEFAULT_HULLS, modules: DEFAULT_COMPONENTS, zoneRoles: ZONE_ROLE_DEFS, balance, researchUnlocks: RESEARCH_UNLOCKS } = require("./data");\nconst { admiralCatalog: NOTION_ADMIRAL_POOL, lobbyRecruitTypes: NOTION_LOBBY_RECRUIT_TYPES } = require("./data/admirals");',
    "data/admirals import"
  );

  patched = replaceOnce(
    patched,
    /const ADMIRAL_POOL = \[[\s\S]*?\n\];\n\nconst LOBBY_RECRUIT_TYPES = \{[\s\S]*?\n\};/,
    `const ADMIRAL_POOL = NOTION_ADMIRAL_POOL.map((admiral) => ({ ...admiral }));\n\nconst LOBBY_RECRUIT_TYPES = { ...NOTION_LOBBY_RECRUIT_TYPES };\n\nconst RESOURCE_RECRUIT_TYPE = {\n  key: "resource",\n  name: "자원 영입",\n  metalCost: 600,\n  fuelCost: 300,\n  chances: { Common: 0.62, Rare: 0.26, Epic: 0.09, Legendary: 0.03 }\n};`,
    "admiral pool constants"
  );

  patched = replaceOnce(
    patched,
    /function pickLobbyAdmiral\(recruitType\) \{[\s\S]*?return candidates\[Math\.floor\(Math\.random\(\) \* candidates\.length\)\] \|\| ADMIRAL_POOL\[0\];\n\}/,
    `function pickLobbyAdmiral(recruitTypeOrConfig) {\n  const config = typeof recruitTypeOrConfig === "string"\n    ? (LOBBY_RECRUIT_TYPES[recruitTypeOrConfig] || LOBBY_RECRUIT_TYPES.normal)\n    : (recruitTypeOrConfig || RESOURCE_RECRUIT_TYPE);\n  const roll = Math.random();\n  let rarity = Object.keys(config.chances || {})[0] || "Common";\n  let threshold = 0;\n  for (const [key, chance] of Object.entries(config.chances || {})) {\n    threshold += Number(chance || 0);\n    if (roll <= threshold) {\n      rarity = key;\n      break;\n    }\n  }\n  const candidates = ADMIRAL_POOL.filter((admiral) => String(admiral.rarity) === String(rarity));\n  return candidates[Math.floor(Math.random() * candidates.length)] || ADMIRAL_POOL[0];\n}`,
    "pickLobbyAdmiral function"
  );

  patched = replaceOnce(
    patched,
    /const roll = Math\.random\(\);\n    const candidates = ADMIRAL_POOL\.filter\(\(admiral\) => \{[\s\S]*?const admiral = candidates\[Math\.floor\(Math\.random\(\) \* candidates\.length\)\];/,
    'const admiral = pickLobbyAdmiral(RESOURCE_RECRUIT_TYPE);',
    "/admirals/draw recruit selection"
  );

  patched = applySessionPatch(patched);

  return patched;
}

(async () => {
  try {
    const originalSource = await fetchText(ORIGINAL_SERVER_URL);
    const patchedSource = patchSource(originalSource);
    const runtimeModule = new Module(__filename, module.parent);
    runtimeModule.filename = path.join(__dirname, "server.runtime.js");
    runtimeModule.paths = Module._nodeModulePaths(__dirname);
    runtimeModule._compile(patchedSource, runtimeModule.filename);
  } catch (err) {
    console.error("Failed to bootstrap patched server.js:", err);
    process.exit(1);
  }
})();
