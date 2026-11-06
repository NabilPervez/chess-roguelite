# Gambit Spire — agent guide

Chess roguelite PWA (React + Vite + TS, no engine). Spec: PRD in Notion / `docs` (Gambit Spire PRD, Nov 2026).

## Rules for changes
- `src/rules/` is pure: no UI, no randomness. Every rule change gets a Vitest test.
- Courts and passives are `Hook` objects (`src/rules/types.ts`), **one file per passive** in `src/passives/`, registered in `src/passives/index.ts`. Hooks: `moveCap`, `onMoveGen`, `canBeCaptured`, `objectiveWorth`, `promoteEarly`, `afterMove` (both sides, gets `owner`), `onSetup` (fight start via `setupFight`).
- Effect tiles live in `src/rules/tiles.ts` (`state.tiles`, keyed "r,c"); frozen/shielded/goldEarned/used are state fields, not UI.
- Owner passives apply to their own side; `canBeCaptured` is checked on the *target's* side; the court applies to both.
- No hard-coded tuning numbers: put them in `src/data/tuning.json`.
- Court `onMoveGen` runs after passives. `src/run/` holds map/run/rewards; seeded via `src/run/rng.ts`.
- `ui/` never owns game rules; it calls `legalMoves` / `applyMove`.
- AI must stay under 300 ms per move on a mid-range phone.

## Commands
`npm run dev` · `npm test` · `npm run build`

## Definition of Done
CI green · tests for touched rules/passives · played at 375 px and desktop · within perf budgets · no hard-coded tuning · pushed to main and deployed.
