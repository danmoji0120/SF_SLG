function replaceOnce(source, searchValue, replaceValue, label) {
  const next = source.replace(searchValue, replaceValue);
  if (next === source) throw new Error(`Patch failed: ${label}`);
  return next;
}

function applySessionPatch(source) {
  let patched = source;

  patched = replaceOnce(
    patched,
    'const GAME_TARGET_END_SECONDS = balance.timing.targetEndSeconds;',
    `const GAME_TARGET_END_SECONDS = balance.timing.targetEndSeconds;\nconst SESSION_EARLY_SECONDS = 60 * 60;\nconst SESSION_MID_SECONDS = 180 * 60;\n\nfunction getSessionGameFlow(session) {\n  const startedAt = Number(session?.started_at || session?.startedAt || Date.now());\n  const endedAt = Number(session?.ended_at || session?.endedAt || 0);\n  const now = endedAt > 0 ? endedAt : Date.now();\n  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));\n  const coreUnlockAfterSeconds = CORE_UNLOCK_AFTER_SECONDS;\n  const targetEndSeconds = GAME_TARGET_END_SECONDS;\n  const coreUnlocked = elapsedSeconds >= coreUnlockAfterSeconds;\n  let phase = 'early';\n  if (endedAt > 0 || String(session?.status || '') === 'ended' || elapsedSeconds >= targetEndSeconds) phase = 'ended';\n  else if (elapsedSeconds >= SESSION_MID_SECONDS) phase = 'late';\n  else if (elapsedSeconds >= SESSION_EARLY_SECONDS) phase = 'mid';\n  return {\n    elapsedSeconds,\n    coreUnlockAfterSeconds,\n    targetEndSeconds,\n    coreUnlocked,\n    phase,\n    remainingSeconds: Math.max(0, targetEndSeconds - elapsedSeconds),\n    coreUnlockRemainingSeconds: Math.max(0, coreUnlockAfterSeconds - elapsedSeconds)\n  };\n}`,
    'session constants'
  );

  patched = replaceOnce(
    patched,
    'async function getCurrentSessionForUser(userId) {',
    `async function finalizeExpiredSessionForUser(userId) {\n  const row = await get(\n    \`\n      SELECT s.*, r.room_name, r.mode, r.status AS room_status\n      FROM sessions s\n      JOIN session_players sp ON sp.session_id = s.id\n      JOIN rooms r ON r.id = s.room_id\n      WHERE sp.user_id = ? AND s.status = 'active'\n      ORDER BY s.id DESC\n      LIMIT 1\n    \`,\n    [userId]\n  );\n  if (!row) return null;\n  const flow = getSessionGameFlow(row);\n  if (flow.phase !== 'ended') return row;\n  await finalizeSession(row.id, userId);\n  return null;\n}\n\nasync function getCurrentSessionForUser(userId) {`,
    'inject finalizeExpiredSessionForUser'
  );

  patched = replaceOnce(
    patched,
    '  const row = await get(',
    '  const row = await finalizeExpiredSessionForUser(userId) || await get(',
    'getCurrentSession row source'
  );

  patched = replaceOnce(
    patched,
    '    endedAt: row.ended_at || null',
    '    endedAt: row.ended_at || null,\n    gameFlow: getSessionGameFlow(row)',
    'current session gameFlow field'
  );

  patched = patched.replace(
    /gameFlow: \{\n        elapsedSeconds: gameElapsedSeconds\(\),\n        coreUnlockAfterSeconds: CORE_UNLOCK_AFTER_SECONDS,\n        targetEndSeconds: GAME_TARGET_END_SECONDS,\n        coreUnlocked: gameElapsedSeconds\(\) >= CORE_UNLOCK_AFTER_SECONDS\n      \}/g,
    "gameFlow: ((currentSession) => currentSession?.gameFlow || { elapsedSeconds: gameElapsedSeconds(), coreUnlockAfterSeconds: CORE_UNLOCK_AFTER_SECONDS, targetEndSeconds: GAME_TARGET_END_SECONDS, coreUnlocked: gameElapsedSeconds() >= CORE_UNLOCK_AFTER_SECONDS, phase: gameElapsedSeconds() >= GAME_TARGET_END_SECONDS ? 'ended' : gameElapsedSeconds() >= SESSION_MID_SECONDS ? 'late' : gameElapsedSeconds() >= SESSION_EARLY_SECONDS ? 'mid' : 'early', remainingSeconds: Math.max(0, GAME_TARGET_END_SECONDS - gameElapsedSeconds()), coreUnlockRemainingSeconds: Math.max(0, CORE_UNLOCK_AFTER_SECONDS - gameElapsedSeconds()) })(await getCurrentSessionForUser(req.user.id))"
  );

  patched = patched.replace(
    /const outpostScore = Number\(occupied\?\.count \|\| 0\) \* 20;\n  const combatScore = Number\(battleWins\?\.count \|\| 0\) \* 30;\n  const survivalScore = Math\.max\(10, Math\.floor\(\(endedAt - startedAt\) \/ 60000\) \* 2\);\n  const totalScore = outpostScore \+ combatScore \+ survivalScore;/,
    "const sessionFlow = getSessionGameFlow({ started_at: startedAt, ended_at: endedAt, status: 'ended' });\n  const phaseBonus = sessionFlow.elapsedSeconds >= SESSION_MID_SECONDS ? 80 : sessionFlow.elapsedSeconds >= SESSION_EARLY_SECONDS ? 40 : 0;\n  const outpostScore = Number(occupied?.count || 0) * 40;\n  const combatScore = Number(battleWins?.count || 0) * 35;\n  const survivalScore = Math.max(10, Math.floor((endedAt - startedAt) / 60000) * 2);\n  const totalScore = outpostScore + combatScore + survivalScore + phaseBonus;"
  );

  return patched;
}

module.exports = { applySessionPatch };