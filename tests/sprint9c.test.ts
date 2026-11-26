import { describe, expect, it } from 'vitest';
import tuning from '../src/data/tuning.json';
import { defaultFormation, newGame, validFormation } from '../src/rules/board';
import type { Kind } from '../src/rules/types';

const army: Kind[] = ['K', 'R', 'P', 'N'];
const posOf = (g: ReturnType<typeof newGame>, slot: number) => { for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (g.board[r][c]?.slot === slot) return `${r},${c}`; return null; };

describe('formation', () => {
  it('places each slot on its chosen home square', () => {
    const f = ['1,0', '0,5', '0,0', '1,5'];
    const g = newGame(null, [], [], { playerArmy: army, enemyArmy: ['K'], playerFormation: f });
    f.forEach((k, i) => expect(posOf(g, i)).toBe(k));
    expect(g.board[1][0]?.kind).toBe('K');
  });
  it('falls back to the default layout when invalid', () => {
    for (const bad of [['1,0'], ['1,0', '1,0', '0,0', '0,1'], ['3,0', '0,5', '0,0', '1,5'], ['0,9', '0,5', '0,0', '1,5']]) {
      expect(validFormation(army, bad)).toBe(false);
      const g = newGame(null, [], [], { playerArmy: army, enemyArmy: ['K'], playerFormation: bad });
      expect(posOf(g, 0)).toBe(defaultFormation(army)[0]);
    }
  });
  it('default formation is valid and matches the automatic layout', () => {
    const f = defaultFormation(army);
    expect(validFormation(army, f)).toBe(true);
    const g = newGame(null, [], [], { playerArmy: army, enemyArmy: ['K'] });
    army.forEach((_, i) => expect(posOf(g, i)).toBe(f[i]));
  });
  it('army cap fits on the two home rows', () => {
    expect(tuning.run.shop.capMax).toBeLessThanOrEqual(12);
    const full = Array(12).fill('P') as Kind[]; full[0] = 'K';
    expect(validFormation(full, defaultFormation(full))).toBe(true);
  });
});

import { eloForNode, profileFor } from '../src/ai/elo';
import { fightOpts } from '../src/run/run';
import { generateMap } from '../src/run/map';
import { mulberry32 } from '../src/run/rng';
import { fightPayout } from '../src/run/economy';

describe('warm-up rows', () => {
  const E = tuning.ai.elo;
  it('early plain fights use a very weak, blunder-heavy AI', () => {
    for (let r = 0; r < E.easyRows; r++) expect(eloForNode(r, 'fight')).toBe(E.easyElo);
    expect(profileFor(E.easyElo).blunder).toBeGreaterThanOrEqual(0.5);
    expect(eloForNode(0, 'fight', 600)).toBeGreaterThan(E.easyElo); // Elo floor overrides the warm-up
  });
  it('early enemies are a tiny army', () => {
    expect(fightOpts({ id: 'a', row: 0, col: 0, type: 'fight', court: null, next: [] }).opts.enemyArmy).toEqual(tuning.run.easy.army);
    expect(fightOpts({ id: 'b', row: tuning.run.easy.rows, col: 0, type: 'fight', court: null, next: [] }).opts.enemyArmy!.length).toBeGreaterThan(tuning.run.easy.army.length);
  });
  it('every map has a shop on the guaranteed row', () => {
    for (let s = 1; s < 30; s++) expect(generateMap(mulberry32(s)).rows[tuning.run.guaranteedShopRow].some((n) => n.type === 'shop')).toBe(true);
  });
  it('warm-up bonus adds to the win reward', () => {
    const g = newGame(null, []);
    expect(fightPayout(g, { ...g, status: 'won' }, 0, 7).winGold).toBe(tuning.economy.winReward + 7);
  });
});
