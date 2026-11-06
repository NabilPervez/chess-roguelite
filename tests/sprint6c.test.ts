import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { newGame } from '../src/rules/board';
import { fightPayout } from '../src/run/economy';
import { applyRelics } from '../src/run/relics';
import { mulberry32 } from '../src/run/rng';
import { buy, capUpgradePrice, lockItem, newRun, pieceCap, reroll, rerollCost, rollShop, takeRelics, upgradeCap } from '../src/run/run';

const rich = () => ({ ...newRun(1, 'skirmish'), gold: 1000 });

describe('relics', () => {
  const g = newGame(null, [], []);
  it('hourglass adds turns', () => expect(applyRelics(g, ['hourglass']).turnLimit).toBe(g.turnLimit + tuning.relics.hourglass.turns));
  it('frost freezes the best enemy piece', () => {
    const f = applyRelics(g, ['frost']);
    const id = Object.keys(f.frozen ?? {})[0];
    expect(g.board.flat().find((p) => p?.id === id)?.kind).toBe('Q');
  });
  it('midas boosts the win payout', () => {
    const won = { ...g, status: 'won' as const, turnNumber: 3 };
    expect(fightPayout(g, { ...applyRelics(g, ['midas']), status: 'won', turnNumber: 3 }).total).toBeGreaterThan(fightPayout(g, won).total);
  });
  it('relics are bought into slots and used up', () => {
    const r = buy(rich(), { type: 'relic', id: 'hourglass', price: 35 });
    expect(r.relics).toEqual(['hourglass']);
    const t = takeRelics(r);
    expect(t.relics).toEqual(['hourglass']);
    expect(t.run.relics).toEqual([]);
  });
});

describe('shop economy', () => {
  it('reroll costs more each time and charges gold', () => {
    expect(rerollCost(1)).toBeGreaterThan(rerollCost(0));
    const out = reroll(rich(), mulberry32(2), 0);
    expect(out.run.gold).toBe(1000 - rerollCost(0));
  });
  it('a locked item shows up first in the next shop and unlocks when bought', () => {
    const r = rich();
    const item = rollShop(r, mulberry32(3))[0];
    const locked = lockItem(r, item);
    const next = rollShop(locked, mulberry32(9));
    expect(next[0]).toEqual(item);
    if (item.type !== 'remove') expect(buy(locked, item).locked).toBeNull();
  });
  it('army cap upgrade raises the cap and the next price', () => {
    const r = rich();
    const up = upgradeCap(r);
    expect(pieceCap(up)).toBe(pieceCap(r) + 1);
    expect(capUpgradePrice(up)).toBeGreaterThan(capUpgradePrice(r));
  });
});
