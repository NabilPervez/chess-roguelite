import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { resolveHooks } from '../src/passives';
import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { applyMove } from '../src/rules/game';
import type { Kind } from '../src/rules/types';
import { bury, canRecover, recover, recoverPrice, settleArmy } from '../src/run/graveyard';
import { mulberry32, nodeRand } from '../src/run/rng';
import { newRun, rollRewards, statsOf } from '../src/run/run';
import { isTriple, openingArmy, openingSpins, spin, takeWheel, wheelWeights } from '../src/run/wheels';

const army: Kind[] = ['K', 'R', 'P', 'N'];
const fight = () => newGame(null, [], [], { playerArmy: army, enemyArmy: ['K', 'P'] });
const removeSlot = (g: ReturnType<typeof fight>, slot: number) => ({ ...g, board: g.board.map((row) => row.map((p) => (p?.side === 'player' && p.slot === slot ? null : p))) });

describe('army slots', () => {
  it('every player piece knows its army slot', () => {
    const slots = fight().board.flat().filter((p) => p?.side === 'player').map((p) => p!.slot).sort();
    expect(slots).toEqual([0, 1, 2, 3]);
  });
  it('enemy pieces have no slot', () => {
    expect(fight().board.flat().filter((p) => p?.side === 'enemy').every((p) => p!.slot === undefined)).toBe(true);
  });
});

describe('permadeath', () => {
  it('settleArmy drops captured slots and keeps order', () => {
    expect(settleArmy(army, removeSlot(fight(), 1))).toEqual({ army: ['K', 'P', 'N'], lost: ['R'] });
  });
  it('keeps promotions', () => {
    const g = fight();
    const promoted = { ...g, board: g.board.map((row) => row.map((p) => (p?.slot === 2 ? { ...p, kind: 'B' as Kind } : p))) };
    expect(settleArmy(army, promoted).army).toEqual(['K', 'R', 'B', 'N']);
  });
  it('bury fills the graveyard newest first, caps it, and counts losses', () => {
    let run = { ...newRun(1, 'phalanx'), army: [...army] };
    run = bury(run, removeSlot(removeSlot(fight(), 1), 3));
    expect(run.army).toEqual(['K', 'P']);
    expect(run.graveyard).toEqual(['N', 'R']);
    expect(statsOf(run).lost).toBe(2);
    run = { ...run, graveyard: ['P', 'P', 'P', 'P', 'P'] };
    run = bury({ ...run, army: [...army] }, removeSlot(fight(), 1));
    expect(run.graveyard).toHaveLength(tuning.graveyard.size);
    expect(run.graveyard![0]).toBe('R');
  });
});

describe('graveyard recovery', () => {
  const base = { ...newRun(1, 'phalanx'), army: ['K'] as Kind[], graveyard: ['Q', 'P'] as Kind[] };
  it('costs gold, needs room and returns the piece', () => {
    expect(canRecover({ ...base, gold: 0 }, 0)).toBe(false);
    const r = recover({ ...base, gold: 500 }, 0);
    expect(r.army).toEqual(['K', 'Q']);
    expect(r.gold).toBe(500 - recoverPrice('Q'));
    expect(r.graveyard).toEqual(['P']);
  });
  it('is blocked when the army is full', () => {
    expect(canRecover({ ...base, gold: 500, army: Array(tuning.run.pieceCap).fill('P') }, 1)).toBe(false);
  });
  it('works in Set runs', () => {
    expect(canRecover({ ...base, gold: 500, mode: 'set' }, 1)).toBe(true);
  });
});

describe('promote to anything', () => {
  const setup = () => {
    const b = emptyBoard();
    b[0][0] = makePiece('player', 'K'); b[4][3] = { ...makePiece('player', 'P'), slot: 1 };
    b[5][5] = makePiece('enemy', 'K'); b[3][5] = makePiece('enemy', 'P');
    const g = { ...newGame(null, []), board: b };
    return { g, h: resolveHooks(g) };
  };
  it('uses the chosen piece', () => {
    const { g, h } = setup();
    const n = applyMove(g, { from: { r: 4, c: 3 }, to: { r: 5, c: 3 }, capture: false, promoteTo: 'N' }, h);
    expect(n.board[5][3]).toMatchObject({ kind: 'N', slot: 1 });
  });
  it('defaults to a queen and never promotes to a king', () => {
    const { g, h } = setup();
    expect(applyMove(g, { from: { r: 4, c: 3 }, to: { r: 5, c: 3 }, capture: false }, h).board[5][3]?.kind).toBe('Q');
    expect(applyMove(g, { from: { r: 4, c: 3 }, to: { r: 5, c: 3 }, capture: false, promoteTo: 'K' }, h).board[5][3]?.kind).toBe('Q');
  });
});

describe('piece wheels', () => {
  it('spins the configured number of reels and is seed-stable', () => {
    expect(spin(nodeRand(9, '2-1', 'wheel'))).toEqual(spin(nodeRand(9, '2-1', 'wheel')));
    expect(spin(mulberry32(3))).toHaveLength(tuning.wheels.reels);
  });
  it('opening army is the King plus every reel — no free pawns', () => {
    const spins = openingSpins((i) => nodeRand(5, 'opening', `spin${i}`));
    const a = openingArmy(spins);
    expect(a[0]).toBe('K');
    expect(a).toHaveLength(1 + tuning.wheels.reels * tuning.wheels.openingSpins);
    expect(a.slice(1)).toEqual(spins.flat());
  });
  it('officers get likelier higher up', () => {
    expect(wheelWeights(10).Q).toBeGreaterThan(wheelWeights(0).Q);
    expect(wheelWeights(10).P).toBeLessThan(wheelWeights(0).P);
  });
  it('keeps one reel, or all three on a triple (within the cap)', () => {
    const run = { ...newRun(1, 'phalanx'), army: ['K'] as Kind[] };
    expect(takeWheel(run, ['N', 'B', 'R'], 2).army).toEqual(['K', 'R']);
    expect(isTriple(['B', 'B', 'B'])).toBe(true);
    expect(takeWheel(run, ['B', 'B', 'B'], 0).army).toEqual(['K', 'B', 'B', 'B']);
    expect(takeWheel({ ...run, army: Array(tuning.run.pieceCap - 1).fill('P') }, ['B', 'B', 'B'], 0).army).toHaveLength(tuning.run.pieceCap);
  });
  it('rewards offer a wheel instead of a flat piece', () => {
    const r = rollRewards({ ...newRun(1, 'phalanx'), army: ['K'] }, mulberry32(4));
    expect(r.some((x) => x.type === 'wheel')).toBe(true);
    expect(r.some((x) => x.type === 'piece')).toBe(false);
  });
});
