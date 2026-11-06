# Gambit Spire (prototype)

A chess roguelite: short 6×6 fights on boards with a "court" rule, plus passives you pick. Current: **Sprint 3** — a full Act 1 run: Draft army, a connected branching map, fights, elites, shops, events, rest sites and a boss preview.

## Play
Pick a starting passive → climb a 15-row map → each fight node shows its court (⛰ Mud, ❄ Ice, ◎ Arena) → capture the objective count within 20 turns → pick 1 of 3 rewards (passive, piece, or gold). ☠ Elites are king hunts against a tougher army with an enemy passive — they reward two passive offers and bonus gold. ◈ Shops sell passives, pieces and passive removal. ? Events offer a two-way choice. ☾ Rest sites promote a pawn or drop a passive. Row 15 is the boss: capture its king. Lose your king and the run is over.

**Courts:** Mud (max 3 squares per move) · Ice (sliders can't stop early) · Arena (kings/pawns on the centre move 1 extra).

- Tap a piece to see moves: purple = move, red = capture, gold = unlocked by a passive.
- The result screen shows fight time — note it for playtests.

**Passives (12):** Phalanx · Cavalry Charge · Royal Stride · Bounty · Lancer · Sapper · Outflank · Zealot · Fortress · Headhunter · Skirmish · Amazon.

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
No check/checkmate (capturing the king ends the fight), no castling, en passant, or pawn double-step; pawns promote to queens.
