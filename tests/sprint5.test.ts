import { describe, expect, it } from 'vitest';
import { chooseMoveElo, evaluate, scoreMoves } from '../src/ai/engine';
import { eloForNode, profileFor } from '../src/ai/elo';
import tuning from '../src/data/tuning.json';
import { resolveHooks } from '../src/passives';
import { emptyBoard, newGame } from '../src/rules/board';
import type { GameState, Kind, Side } from '../src/rules/types';
import { fightOpts } from '../src/run/run';
import { mulberry32 } from '../src/run/rng';

let n = 0;
const put = (g: GameState, r: number, c: number, side: Side, kind: Kind) => { g.board[r][c] = { id: `t${n++}`, side, kind, moved: true }; };
const blank = (over: Partial<GameState> = {}): GameState => ({ ...newGame(null, [], [], {}), board: emptyBoard(), turn: 'enemy', ...over });

describe('Elo scaling', () => {
  it('rises every row, elites above fights, boss fixed', () => {
    expect(eloForNode(0, 'fight')).toBe(tuning.ai.elo.start);
    expect(eloForNode(5, 'fight')).toBeGreaterThan(eloForNode(4, 'fight'));
    expect(eloForNode(5, 'elite')).toBeGreaterThan(eloForNode(5, 'fight'));
    expect(eloForNode(14, 'boss')).toBe(tuning.ai.elo.boss);
  });
  it('first fights sit below a 400 player and the boss stays beatable', () => {
    expect(eloForNode(0, 'fight')).toBeLessThan(400);
    expect(tuning.ai.elo.boss).toBeLessThanOrEqual(900);
  });
  it('profiles get deeper and cleaner as Elo rises', () => {
    const lo = profileFor(300), hi = profileFor(1000);
    expect(hi.depth).toBeGreaterThan(lo.depth);
    expect(hi.blunder).toBeLessThan(lo.blunder);
  });
  it('fightOpts attaches a rating', () => {
    expect(fightOpts({ id: 'x', row: 3, col: 0, type: 'fight', court: null, next: [] }).opts.aiElo).toBe(eloForNode(3, 'fight'));
  });
});

describe('Custom AI', () => {
  it('takes a free king (win in one) even at low Elo', () => {
    const g = blank({ capturesToWin: Infinity });
    put(g, 5, 0, 'enemy', 'K'); put(g, 3, 3, 'enemy', 'R'); put(g, 0, 3, 'player', 'K');
    const m = chooseMoveElo(g, resolveHooks(g), 200, mulberry32(1));
    expect(m?.to).toEqual({ r: 0, c: 3 });
  });
  it('knows Fortress rooks are safe at home (values immunity)', () => {
    const g = blank();
    put(g, 5, 0, 'enemy', 'K'); put(g, 0, 5, 'player', 'K');
    put(g, 5, 3, 'enemy', 'R');
    const home = evaluate({ ...g, enemyPassives: ['fortress'] }, resolveHooks({ ...g, enemyPassives: ['fortress'] }), 'enemy');
    const plain = evaluate(g, resolveHooks(g), 'enemy');
    expect(home).toBeGreaterThan(plain);
  });
  it('keeps Phalanx pawns paired', () => {
    const g = blank({ enemyPassives: ['phalanx'] });
    put(g, 5, 0, 'enemy', 'K'); put(g, 0, 5, 'player', 'K');
    put(g, 3, 2, 'enemy', 'P'); put(g, 3, 3, 'enemy', 'P');
    const h = resolveHooks(g);
    const paired = evaluate(g, h, 'enemy');
    const split = { ...g, board: g.board.map((r) => r.slice()) };
    split.board[2][3] = split.board[3][3]; split.board[3][3] = null;
    expect(paired).toBeGreaterThan(evaluate(split, h, 'enemy'));
  });
  it('values Arena centre squares for kings and pawns', () => {
    const g = blank({ court: 'arena' });
    put(g, 0, 5, 'player', 'K'); put(g, 2, 2, 'enemy', 'K');
    const h = resolveHooks(g);
    const off = { ...g, board: emptyBoard() };
    off.board[0][5] = g.board[0][5]; off.board[5][0] = g.board[2][2];
    expect(evaluate(g, h, 'enemy')).toBeGreaterThan(evaluate(off, h, 'enemy'));
  });
  it('at depth 2 avoids hanging its queen to a pawn', () => {
    const g = blank({ capturesToWin: 4 });
    put(g, 5, 0, 'enemy', 'K'); put(g, 0, 5, 'player', 'K');
    put(g, 3, 3, 'enemy', 'Q'); put(g, 0, 0, 'player', 'P');
    const best = scoreMoves(g, resolveHooks(g), 2, 2000)[0].move;
    // b2 (r1,c1) is attacked by the a1 pawn.
    expect(best.to).not.toEqual({ r: 1, c: 1 });
  });
  it('stays inside the time budget on the boss setup', () => {
    const b = tuning.run.boss;
    const g = { ...newGame(b.court, ['amazon'], b.passives, { enemyArmy: b.army as Kind[], checkmate: true, capturesToWin: Infinity }), turn: 'enemy' as Side };
    const t = performance.now();
    chooseMoveElo(g, resolveHooks(g), 1000, mulberry32(2));
    expect(performance.now() - t).toBeLessThan(tuning.ai.timeBudgetMs + 150);
  });
});

import { DEFAULT_SETTINGS, loadSettings, resolveTheme, saveSettings } from '../src/ui/settings';
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
describe('Settings', () => {
  it('round-trips style and theme', () => {
    const s = mem(); saveSettings({ style: 'toy', theme: 'light' }, s);
    expect(loadSettings(s)).toEqual({ style: 'toy', theme: 'light' });
  });
  it('falls back to Obsidian + System on missing or junk data', () => {
    expect(loadSettings(mem())).toEqual(DEFAULT_SETTINGS);
    const s = mem(); s.setItem(tuning.settings.key, '{bad json'); expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    s.setItem(tuning.settings.key, JSON.stringify({ style: 'neon', theme: 'pink' })); expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it('survives a storage that throws', () => {
    const bad = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadSettings(bad)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, bad)).not.toThrow();
  });
  it('System follows the OS', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });
});
