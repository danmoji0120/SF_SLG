# Admiral legacy cleanup notes

This repository has migrated the admiral feature toward the new system files:
- `data/admirals.js`
- `public/data/admiral-catalog.js`
- `public/systems/admiral-system.js`
- `public/systems/lobby-system.js`

## Legacy targets to remove

### Frontend
- Old growth-tab admiral recruit card in `public/index.html`
- Old growth-tab elements: `drawAdmiralButton`, `admiralView`
- Unused legacy assets that were replaced by system files:
  - `public/lobby.upgrade.js`
  - `public/lobby.upgrade.css`
  - `public/admiral.library.css`

### Backend
- Runtime wrapper server bootstrap in `server.js`
- Any remaining legacy admiral rarity logic (`R`, `SR`, `SSR`)
- Any embedded legacy admiral pools once server-side migration is fully inlined

## Desired end state
- Only `Common / Rare / Epic / Legendary`
- Only catalog-driven admiral definitions
- Only lobby/system-based admiral UI
- No hidden duplicate recruit UI in growth tab
