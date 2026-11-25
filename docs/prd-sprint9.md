# Gambit Spire — Sprint 9 PRD: Wheels, Results, Graveyard, Shop 2.0, Run Stats

**Status:** v3 (decisions locked, building) · **Date:** 2026-11-25 · **Owner:** Nabil · **Reference:** Gambonanza screenshots (shop, piece wheels, results, graveyard, game over)

> Changelog
> - **v1** — feature PRD drafted from the reference screenshots.
> - **v2** — updated after a code audit of `main` @ `cb0c519`. Changes are marked **[v2]**. Audit findings are in §6.
> - **v3** — Nabil's decisions (2026-11-25), §11. These override earlier sections where they conflict.

---

## 1. Problem
Runs feel samey and low-stakes: your army fully heals after every fight, gold has one use (spend it now), and the end screen shows four numbers. Gambonanza shows four loops that fix this — a gamble for pieces, a readable payout with interest, losing pieces for real (with a way back), and a stats-rich game-over with a shareable seed.

## 2. Goals / non-goals
**Goals**
1. **Piece Wheels** — slot-machine reveal for piece rewards.
2. **Results screen** — itemized payout after every win, plus **interest** on banked gold.
3. **Graveyard** — pieces captured in a fight are lost; the last 5 can be bought back.
4. **Shop 2.0** — drag-to-buy (tap still works), clearer layout.
5. **Game Over 2.0** — 12 run stats, copyable seed, Start run / Main menu; play a run from a seed.

**Non-goals:** a deploy cap separate from the army ("Max Piece on Board 3/3"); new pieces/passives; art-style work; reproducing Gambonanza's UI literally (colors/feel only, per brand rule).

## 3. Features & acceptance criteria

### F1 · Piece Wheels
- Opens instead of the flat "Piece" reward card, and at the start of a Draft run (replaces the 4 fixed pawns beyond the king). **[v2]** Set runs never see wheels (Set mode can't gain pieces — `canGainPieces`).
- 3 reels spin; **STOP!!** stops them left→right with a short stagger. Result is decided by the seeded RNG *before* the spin (the stop is theatre, not skill). **[v2: made explicit — keeps runs reproducible from a seed.]**
- Reel weights in `tuning.json` (`wheels.weights`, e.g. P 50 / N 18 / B 18 / R 10 / Q 4), rising slightly by row.
- Payout: you keep **one** reel of your choice. Three of a kind → keep all three (if army room). **[v2: v1 said "get all 3 pieces" — too much army growth against a 10 cap; one-pick keeps the existing reward pace.]**
- Respects `pieceCap`; if full, wheel is skipped and gold is offered instead.
- Motion respects `prefers-reduced-motion` (instant reveal).

### F2 · Results screen (+ interest)
- After a won fight, a dedicated **Results** screen before the reward screen. Rows count up one by one: Win reward · Captured pieces · Pieces saved · Speed bonus · Gold tiles · Midas ×N · **Interest**. Button: **"GET MY ◈N!!"**, coin burst into the gold pill.
- **Interest:** +1 per `interest.per` banked gold, capped at `interest.max`, paid on banked gold *before* this fight's payout. **[v2]** Our economy is ~10× Gambonanza's (shop prices 60–150), so defaults are `per: 25, max: 10`, not $1 per $5 / max $5.
- Losses skip Results and go to Game Over.

### F3 · Graveyard
- **Permadeath:** player pieces captured in a fight are removed from `run.army` when the fight ends (win or lose). The king can't be lost on a win. **[v2: biggest change — today the army fully resets every fight; see audit A1.]**
- The last `graveyard.size` (5) lost pieces are stored, newest first.
- The Graveyard opens after Results **only if it has pieces**. Drag (or tap) a piece onto "Drag here to recover" to buy it back at `graveyard.prices[kind]` **[v2: v1 had a flat $9; per-kind prices fit our economy — e.g. P 15 / N·B 45 / R 70 / Q 120]**. Recovering needs army room. **Next** continues.
- Also reachable from the Shop as a tab. **[v2: added so a full-army player can free room, then recover.]**
- `?` button explains the rule.

### F4 · Shop 2.0
- Existing: reroll (rising cost), lock, army cap upgrade, Next. Keep all.
- Add drag-to-buy onto a "Drag here to buy" drop zone; tap-to-buy stays (accessibility + mobile reliability).
- Graveyard tab (F3). Army rail shows piece slots `n/cap` like the reference side rails.

### F5 · Game Over 2.0 + seeds
- Stats grid (12): Pieces moved · Pieces captured · Tiles triggered · Passives bought · Pieces bought · Relics bought · Row · Fights won · Times rerolled · Most-used piece · Most-used tile · Pieces lost. **[v2: renamed "Gambit/Token purchased" to our nouns — passives/relics.]**
- Seed shown with **Copy**; "Start run" (new seed) / "Main menu".
- Start screen gets "Play a seed" input; the same seed gives the same map, shops, wheels and tiles. **[v2]** Seeds widen from `Date.now() % 100000` to a full 32-bit value.
- Existing win unlock + share buttons stay; share text includes the seed.

## 4. Data & tuning (all in `src/data/tuning.json`)
`wheels { reels, weights, rowWeightShift }` · `economy.winReward`, `economy.interest { per, max }` · `graveyard { size, prices }` · `save.version → 2`.

## 5. Success metrics (estimates, local playtest)
- Median run length unchanged ±10% (permadeath shouldn't wreck pacing).
- ≥1 Graveyard recovery in most runs that reach row 8.
- Nabil (≈400 Elo) can still clear Act 1 within ~5 attempts.

## 6. Code audit (main @ cb0c519)

| # | Finding | Where | Impact |
|---|---|---|---|
| A1 | Army never shrinks: each fight builds a fresh board from `run.army`; captured pieces return. | `App.tsx` fight `onEnd`, `newGame` | Graveyard needs a "pieces surviving" readout from the end `GameState`. |
| A2 | Piece ids are generated per fight, not per run, so we can't tell *which* army slot died. | `rules/board.ts` `newGame` | Map board piece ids → army index at setup (`armyIndex` on `Piece` or a map in state). |
| A3 | Payout already itemized (`fightPayout`), shown inline in the fight end card. No interest, no flat win reward. | `run/economy.ts`, `Fight.tsx:99` | Extend `Payout`; move display into a new Results screen. |
| A4 | Shop already has reroll, lock, cap upgrade, Next. | `run/run.ts`, `App.tsx` shop | F4 is UI-only. |
| A5 | No run stats tracked. | `RunState` | Add `run.stats`; fold per-fight counters in at fight end; shop/reroll increment directly. |
| A6 | Seed = `Date.now() % 100000`; in-session RNG is a `useRef`, and resume re-seeds from `seed + fightsWon*7919 + gold` — a run isn't reproducible from its seed. | `App.tsx` | Derive each node's RNG from `seed + nodeId` (already done for tiles) so wheels/shops are seed-stable. |
| A7 | `App.tsx` is 407 lines with every screen inline. | `ui/App.tsx` | Extract new screens to files (`Results.tsx`, `Wheels.tsx`, `Graveyard.tsx`, `GameOver.tsx`) instead of growing it. |
| A8 | Save is versioned (`save.version: 1`) and rejects mismatches. | `run/save.ts` | Bump to 2; old saves are dropped (acceptable; flag in release note). |
| A9 | `Screen` union drives everything and is persisted. | `App.tsx` | Add `results`, `wheels`, `graveyard` kinds; they're resumable for free. |

## 7. Implementation plan
**Pure logic (`src/run/`, with Vitest tests):**
- `wheels.ts` — `spinWheels(rand, row) → Kind[3]`, `resolveWheels(run, reels, pick)`.
- `economy.ts` — add `winReward`, `interest(gold)`; `fightPayout(start, end, bankedGold)`.
- `graveyard.ts` — `lostPieces(start, end, army) → Kind[]`, `bury(run, kinds)`, `recover(run, i)`.
- `run.ts` — `RunState` gains `graveyard: Kind[]`, `stats: RunStats`; reward roll emits `{ type: 'wheel' }` in place of `piece`.
- `rules/board.ts` — tag setup pieces with `armyIndex` (A2). Rules stay pure.

**UI (`src/ui/`):** `Wheels.tsx`, `Results.tsx`, `Graveyard.tsx`, `GameOver.tsx`, `useDragDrop.ts` (pointer events, works on touch; drop zone + tap fallback).

**Flow after a win:** Fight → Results → (Graveyard if non-empty) → Reward (wheel if piece) → Map. Loss: Fight → Game Over.

## 8. Sprints (estimates)
- **9a** Results + interest + stats tracking + seeds (A3, A5, A6). ~1 session.
- **9b** Permadeath + Graveyard (A1, A2, A8). ~1 session; balance pass after.
- **9c** Piece Wheels + Shop drag-to-buy + Game Over 2.0. ~1 session.

## 9. Definition of Done
Per `CLAUDE.md`: CI green · Vitest for every new `src/run` function and the `armyIndex` change · played at 375 px and desktop · AI still < 300 ms/move · no hard-coded tuning · pushed to main and deployed to chess-roguelite.netlify.app.

## 10. Open questions
1. Permadeath on a **lost** fight is moot (run ends) — but should elites/boss be exempt on wins? Default: no exemption.
2. Wheel at run start: replace the 4 starting pawns (default) or add on top?
3. Do we want the reference's deploy cap ("Max Piece on Board")? Out of scope for now; it's a bigger change to setup and AI.

## 11. Decisions (v3, Nabil 2026-11-25) — override §3 where they conflict
1. **Permadeath everywhere**, elites and boss included. Captured pieces go to the Graveyard.
2. **Opening wheel picks your whole army.** No free pawns. Draft runs start with your **King + the wheel results** (`wheels.opening`: 2 spins × 3 reels, keep all — estimate, tunable). Set runs keep their fixed army.
3. **Formation before every fight.** Arrange your army on your two home rows; it's remembered for the next fight.
4. **Promote to anything.** A pawn on the far rank promotes to your choice of Q/R/B/N, and the promotion **sticks** in your army after the fight. AI still promotes to a queen.
5. **Protect the President.** The King is always in your lineup; losing it ends the run (unchanged rule, now the core pitch).
6. **Look:** reference layout (titled panels, side army rails, big chunky buttons) built with Quiet Precision discipline (one type scale, hairlines, one accent). Uses the existing art-style tokens so all 3 styles keep working.

**Deviation:** `shop.capMax` 14 → 12. Formation has 12 home squares; a 13th piece couldn't be placed (today it's silently dropped).

## 12. Sprint plan

| Sprint | Scope | Done when |
|---|---|---|
| **9a · Economy & stats** | Results screen; win reward + interest; per-fight tally (moves, captures, tiles, piece use) in `GameState`; run stats; 32-bit seeds; seed-stable shops/rewards/events; "Play a seed"; Game Over 2.0 (12 stats, copy seed, Start run / Main menu); save v2 | Tests for `fightPayout` interest, tally, stats folding, seed-stable shop rolls |
| **9b · Stakes** | `slot` on pieces; `settleArmy` (permadeath + sticky promotions); Graveyard (store last 5, recover, after-Results + shop tab); promotion picker (`Move.promoteTo`); opening wheel + reward wheel | Tests for settleArmy, graveyard, promoteTo, wheel odds/triples, seed-stable wheels |
| **9c · Formation & feel** | Formation screen (home rows, tap to swap, remembered); `placeArmy` honours a formation; drag-to-buy (pointer events, tap fallback) in Shop + Graveyard; panel/rail styling pass on new screens; capMax 12 | Tests for formation placement + invalid-formation fallback; 360 px no-overflow check |

## 13. Definition of Done (every sprint)
- `npm test` and `npm run build` pass (CI green).
- New/changed logic in `src/rules` and `src/run` has Vitest coverage; `src/rules` stays pure.
- No hard-coded tuning: new numbers live in `tuning.json`.
- No horizontal scroll at 360 px; every new screen opens at the top; works on desktop.
- `prefers-reduced-motion` respected on wheels, count-ups and coin bursts.
- AI still < 300 ms/move (no engine changes beyond `promoteTo`).
- Committed and pushed to `main` (Netlify deploys from `main`).
