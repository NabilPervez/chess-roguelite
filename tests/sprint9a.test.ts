import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { resolveHooks } from '../src/passives';
import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { applyMove } from '../src/rules/game';
import { fightPayout, interest } from '../src/run/economy';
import { nodeRand } from '../src/run/rng';
import { buy, emptyStats, foldFight, newRun, reroll, rollShop, statsOf, topOf } from '../src/run/run';

const I = tuning.economy.interest;

describe('interest', () => {
  it('pays 1 per `per` banked, capped', () => {
    expect(interest(0)).toBe(0);
    expect(interest(I.per * 3 + 1)).toBe(3);
    expect(interest(I.per * 1000)).toBe(I.max);
  });
  it('is added to a win payout but not a loss', () => {
    const g = newGame(null, []);
    expect(fightPayout(g, { ...g, status: 'won' }, I.per * 2).interestGold).toBe(2);
    expect(fightPayout(g, { ...g, status: 'lost' }, I.per * 2).total).toBe(0);
  });
  it('win reward is always paid on a win', () => {
    const g = newGame(null, []);
    expect(fightPayout(g, { ...g, status: 'won' }).winGold).toBe(tuning.economy.winReward);
  });
});

describe('fight tally', () => {
  it('counts player moves, captures and piece use only', () => {
    const b = emptyBoard();
    b[0][0] = makePiece('player', 'K'); b[1][2] = makePiece('player', 'R');
    b[5][5] = makePiece('enemy', 'K'); b[4][2] = makePiece('enemy', 'P'); b[5][0] = makePiece('enemy', 'P');
    let g = { ...newGame(null, []), board: b };
    const h = resolveHooks(g);
    g = applyMove(g, { from: { r: 1, c: 2 }, to: { r: 4, c: 2 }, capture: true }, h);
    expect(g.tally).toMatchObject({ moved: 1, captured: 1, pieceUse: { R: 1 } });
    g = applyMove(g, { from: { r: 5, c: 0 }, to: { r: 4, c: 0 }, capture: false }, h);
    expect(g.tally?.moved).toBe(1);
  });
  it('payout uses the tally for captures (survives reloads)', () => {
    const g = newGame(null, []);
    const end = { ...g, status: 'won' as const, tally: { moved: 5, captured: 3, tiles: 0, pieceUse: {}, tileUse: {} } };
    expect(fightPayout(end, end).captured).toBe(3);
  });
});

describe('run stats', () => {
  it('folds a fight tally into the run', () => {
    const run = newRun(1, 'phalanx');
    const g = { ...newGame(null, []), tally: { moved: 4, captured: 2, tiles: 1, pieceUse: { P: 3, N: 1 }, tileUse: { gold: 1 } } };
    const r = foldFight(foldFight(run, g), g);
    expect(statsOf(r)).toMatchObject({ moved: 8, captured: 4, tiles: 2, pieceUse: { P: 6, N: 2 }, tileUse: { gold: 2 } });
    expect(topOf(statsOf(r).pieceUse)).toBe('P');
    expect(topOf(emptyStats().tileUse)).toBeNull();
  });
  it('counts purchases and rerolls', () => {
    let run = { ...newRun(1, 'phalanx'), gold: 10000 };
    run = reroll(run, nodeRand(1, '3-1', 'r'), 0).run;
    run = buy(run, { type: 'relic', id: 'midas', price: 10 });
    run = buy(run, { type: 'piece', kind: 'N', price: 10 });
    expect(statsOf(run)).toMatchObject({ rerolls: 1, relicsBought: 1, piecesBought: 1, passivesBought: 0 });
  });
});

describe('seeds', () => {
  it('nodeRand is stable per seed + node and differs across nodes', () => {
    const a = nodeRand(42, '3-1', 'shop'), b = nodeRand(42, '3-1', 'shop'), c = nodeRand(42, '3-2', 'shop');
    const x = [a(), a()], y = [b(), b()];
    expect(x).toEqual(y);
    expect(c()).not.toBe(x[0]);
  });
  it('the same seed rolls the same shop', () => {
    const run = newRun(777, 'phalanx');
    expect(rollShop(run, nodeRand(777, '4-0', 'shop'))).toEqual(rollShop(run, nodeRand(777, '4-0', 'shop')));
  });
});
