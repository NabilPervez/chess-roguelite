# Gambit Spire (prototype)

A chess roguelite: short 6×6 fights on boards with a "court" rule, plus passives you pick. Current: **Sprint 4** — a full Act 1 run: Draft or Set army, a connected branching map, capture-goal fights, checkmate elites, shops, events, rest sites, and a real boss (The Iron Regent: 3 synergistic passives, checkmate to win). Runs autosave to the browser and resume mid-fight.

## Play
Pick a starting passive → climb a 15-row map → each fight node shows its court (⛰ Mud, ❄ Ice, ◎ Arena) → capture the objective count within 20 turns → pick 1 of 3 rewards (passive, piece, or gold). ☠ Elites are king hunts against a tougher army with an enemy passive — they reward two passive offers and bonus gold. ◈ Shops sell passives, pieces and passive removal. ? Events offer a two-way choice. ☾ Rest sites promote a pawn or drop a passive. Row 15 is the boss: capture its king. Lose your king and the run is over.

**Courts:** Mud (max 3 squares per move) · Ice (sliders can't stop early) · Arena (kings/pawns on the centre move 1 extra).

- Tap a piece to see moves: purple = move, red = capture, gold = unlocked by a passive.
- The result screen shows fight time — note it for playtests.

**Passives (12):** Phalanx · Cavalry Charge · Royal Stride · Bounty · Lancer · Sapper · Outflank · Zealot · Fortress · Headhunter · Skirmish · Amazon.

## Enemy AI (Sprint 5)
`src/ai/engine.ts` is a small alpha-beta search that plays through the real rules, so every court and passive
(Amazon, Mud, Ice, Phalanx…) is priced in. Its evaluation adds terms for *using* passives: keep Phalanx pawns paired,
keep Fortress rooks home, hold Arena centre squares, and protect against the player's capture objective.

Difficulty is an Elo per node (`src/ai/elo.ts`, numbers in `tuning.json → ai`): 300 on row 1, +30 per row, +75 for
elites, 800 for the boss. The rating picks search depth, a blunder rate and move noise. The fight header shows it.

## Settings
Gear button on the start and map screens: art style (Obsidian Court, Gilded Atlas, Paper Toy) and theme
(Light / Dark / System). Saved separately from the run save.

## Develop
```
npm install
npm run dev     # local
npm test        # rules + passive tests
npm run build   # production build in dist/
```

## Structure
`src/rules` pure engine · `src/passives` one file per court/passive · `src/ai` greedy AI · `src/run` seeded map, run state, rewards · `src/ui` React · `src/data/tuning.json` all tuning values.

## Prototype rule simplifications
Normal fights have no check (capturing the king ends them); elite and boss fights use check and checkmate (stalemate counts against the side that can't move). No castling, en passant, or pawn double-step; pawns promote to queens.
