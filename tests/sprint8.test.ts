import { clampFloor, eloForNode } from '../src/ai/elo';
import { loadSettings } from '../src/ui/settings';
import tuning from '../src/data/tuning.json';

const E = tuning.ai.elo;
const mem = (v: unknown) => ({ getItem: () => JSON.stringify(v), setItem: () => {} });

describe('Elo floor', () => {
  it('no floor keeps the default curve', () => {
    expect(eloForNode(0, 'fight')).toBe(E.start);
    expect(eloForNode(3, 'fight', null)).toBe(E.start + 3 * E.perRow);
    expect(eloForNode(14, 'boss')).toBe(E.boss);
  });
  it('floor sets row 1 and shifts the whole curve up', () => {
    const f = 1000, shift = f - E.start;
    expect(eloForNode(0, 'fight', f)).toBe(f);
    expect(eloForNode(4, 'elite', f)).toBe(f + 4 * E.perRow + E.eliteBonus);
    expect(eloForNode(14, 'boss', f)).toBe(E.boss + shift);
  });
  it('a floor below the default start changes nothing', () => {
    expect(eloForNode(0, 'fight', E.floor.min)).toBe(E.start);
  });
  it('never exceeds the ceiling', () => {
    expect(eloForNode(14, 'elite', E.floor.max)).toBeLessThanOrEqual(E.floor.ceiling);
    expect(eloForNode(14, 'boss', E.floor.max)).toBeLessThanOrEqual(E.floor.ceiling);
  });
  it('clamps and rejects bad input', () => {
    expect(clampFloor('')).toBeNull();
    expect(clampFloor('abc')).toBeNull();
    expect(clampFloor(50)).toBe(E.floor.min);
    expect(clampFloor(99999)).toBe(E.floor.max);
  });
  it('settings ignore a floor until the game is beaten', () => {
    expect(loadSettings(mem({ eloFloor: 900 })).eloFloor).toBeNull();
    expect(loadSettings(mem({ beaten: true, eloFloor: 900 })).eloFloor).toBe(900);
    expect(loadSettings(mem(null)).beaten).toBe(false);
  });
});
