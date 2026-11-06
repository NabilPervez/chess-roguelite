# Gambit Spire (prototype)

A chess roguelite: short 6×6 fights on boards with a "court" rule, plus passives you pick. This is **Sprint 1** — one playable fight to answer "is this fun?"

## Play
Pick up to 3 passives → fight on the **Mud** court (no piece moves more than 3 squares) → capture 4 enemy pieces within 20 turns. Lose your king and you lose.

- Tap a piece to see moves: purple = move, red = capture, gold = unlocked by a passive.
- The result screen shows fight time — note it for playtests.

**Passives:** Phalanx · Cavalry Charge · Royal Stride · Bounty · Lancer · Sapper.

## Develop
```
npm install
npm run dev     # local
npm test        # rules + passive tests
npm run build   # production build in dist/
```

## Structure
`src/rules` pure engine · `src/passives` one file per court/passive · `src/ai` greedy AI · `src/ui` React · `src/data/tuning.json` all tuning values.

## Prototype rule simplifications
No check/checkmate (capturing the king ends the fight), no castling, en passant, or pawn double-step; pawns promote to queens.
