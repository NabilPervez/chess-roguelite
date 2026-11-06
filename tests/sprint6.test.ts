import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { applyMove, setupFight } from '../src/rules/game';
import { legalMoves } from '../src/rules/moves';
import { resolveHooks } from '../src/passives';
import { seedTiles } from '../src/rules/tiles';
import { chooseMoveElo } from '../src/ai/engine';
import { mulberry32 } from '../src/run/rng';
import type { GameState, Kind, Side, TileKind } from '../src/rules/types';

function setup(passives: string[], pieces: [Side, Kind, number, number][], enemy: string[] = [], tiles: Record<string, TileKind> = {}): GameState {
  const s = newGame(null, passives, enemy, { capturesToWin: 9 });
  s.board = emptyBoard();
  for (const [side, k, r, c] of pieces) s.board[r][c] = makePiece(side, k);
  s.tiles = tiles;
  return s;
}
const H = resolveHooks;
const mv = (s: GameState, fr: number, fc: number, tr: number, tc: number) => applyMove(s, { from: { r: fr, c: fc }, to: { r: tr, c: tc }, capture: false }, H(s));
const dests = (s: GameState, r: number, c: number) => legalMoves(s, { r, c }, H(s)).map((m) => `${m.to.r},${m.to.c}`);
const kings: [Side, Kind, number, number][] = [['player', 'K', 0, 0], ['enemy', 'K', 5, 5]];

describe('tiles', () => {
  it('Trap freezes the piece for its next turn, then is used up', () => {
    let s = setup([], [...kings, ['player', 'R', 0, 3]], [], { '3,3': 'trap' });
    s = mv(s, 0, 3, 3, 3);
    expect(s.tiles!['3,3']).toBeUndefined();
    s = mv(s, 5, 5, 5, 4);
    expect(dests(s, 3, 3)).toHaveLength(0);
    s = mv(s, 0, 0, 0, 1);
    s = mv(s, 5, 4, 5, 5);
    expect(dests(s, 3, 3).length).toBeGreaterThan(0);
  });
  it('Protective shields a piece until its side moves again', () => {
    let s = setup([], [...kings, ['player', 'N', 0, 2], ['enemy', 'R', 5, 1]], [], { '2,1': 'protective' });
    s = mv(s, 0, 2, 2, 1);
    expect(dests(s, 5, 1)).not.toContain('2,1');
    s = mv(s, 5, 5, 5, 4);
    s = mv(s, 0, 0, 0, 1);
    expect(dests(s, 5, 1)).toContain('2,1');
  });
  it('Crumbling becomes a hole when left', () => {
    let s = setup([], [...kings, ['player', 'R', 2, 2]], [], { '2,2': 'crumbling' });
    s = mv(s, 2, 2, 2, 4);
    expect(s.tiles!['2,2']).toBe('hole');
    s = mv(s, 5, 5, 5, 4);
    expect(dests(s, 2, 4)).not.toContain('2,2');
  });
  it('Phantom adds a copy; Gold pays the player', () => {
    let s = setup([], [...kings, ['player', 'R', 0, 3]], [], { '3,3': 'phantom', '3,5': 'gold' });
    s = mv(s, 0, 3, 3, 3);
    expect(s.board.flat().filter((p) => p?.side === 'player' && p.kind === 'R')).toHaveLength(2);
    s = mv(s, 5, 5, 5, 4);
    s = mv(s, 3, 3, 3, 5);
    expect(s.goldEarned).toBe(10);
  });
  it('seedTiles only uses empty middle squares', () => {
    const s = seedTiles(newGame(null, []), mulberry32(1), 3, ['trap']);
    const keys = Object.keys(s.tiles!);
    expect(keys).toHaveLength(3);
    for (const k of keys) expect([2, 3]).toContain(Number(k.split(',')[0]));
  });
});

describe('sprint 6a passives', () => {
  it('Promotion Rush promotes one rank early', () => {
    const s = mv(setup(['promotionRush'], [...kings, ['player', 'P', 3, 2]]), 3, 2, 4, 2);
    expect(s.board[4][2]!.kind).toBe('Q');
  });
  it('Martyr freezes the capturer of your pawn', () => {
    let s = setup(['martyr'], [...kings, ['player', 'P', 2, 2], ['enemy', 'R', 4, 2]]);
    s = mv(s, 0, 0, 0, 1);
    s = applyMove(s, { from: { r: 4, c: 2 }, to: { r: 2, c: 2 }, capture: true }, H(s));
    s = mv(s, 0, 1, 0, 0);
    expect(dests(s, 2, 2)).toHaveLength(0);
  });
  it('Vengeance boosts the next capture after a loss', () => {
    let s = setup(['vengeance'], [...kings, ['player', 'P', 2, 2], ['player', 'R', 0, 4], ['enemy', 'R', 4, 2], ['enemy', 'P', 4, 4]]);
    s = mv(s, 0, 0, 0, 1);
    s = applyMove(s, { from: { r: 4, c: 2 }, to: { r: 2, c: 2 }, capture: true }, H(s));
    s = applyMove(s, { from: { r: 0, c: 4 }, to: { r: 4, c: 4 }, capture: true }, H(s));
    expect(s.progress).toBe(2);
  });
  it('Swap trades king with a friendly piece once per fight', () => {
    let s = setup(['swap'], [...kings, ['player', 'R', 0, 4]]);
    expect(dests(s, 0, 0)).toContain('0,4');
    s = mv(s, 0, 0, 0, 4);
    expect(s.board[0][4]!.kind).toBe('K');
    expect(s.board[0][0]!.kind).toBe('R');
    s = mv(s, 5, 5, 5, 4);
    expect(dests(s, 0, 4)).not.toContain('0,0');
  });
  it('Tithe, Scavenger and Coronation Purse pay gold', () => {
    let s = setup(['tithe', 'scavenger'], [...kings, ['player', 'R', 0, 3], ['enemy', 'P', 4, 3]]);
    s = applyMove(s, { from: { r: 0, c: 3 }, to: { r: 4, c: 3 }, capture: true }, H(s));
    expect(s.goldEarned).toBe(5);
    let t = setup(['coronation'], [...kings, ['player', 'P', 4, 2]]);
    t = mv(t, 4, 2, 5, 2);
    expect(t.goldEarned).toBe(5);
  });
  it('Fork Strike skips the enemy turn once', () => {
    let s = setup(['forkStrike'], [['player', 'K', 0, 0], ['player', 'N', 1, 2], ['enemy', 'K', 5, 5], ['enemy', 'R', 4, 1], ['enemy', 'B', 4, 5]]);
    s = mv(s, 1, 2, 3, 3);
    expect(s.turn).toBe('player');
  });
  it('Siege Rook captures diagonally', () => {
    const s = setup(['siegeRook'], [...kings, ['player', 'R', 2, 2], ['enemy', 'P', 3, 3]]);
    expect(dests(s, 2, 2)).toContain('3,3');
  });
  it('Caltrops and Bulwark place tiles at setup; Snare drops a trap', () => {
    const g = newGame(null, ['caltrops', 'bulwark'], [], { playerArmy: ['K', 'R', 'P', 'P'] });
    const s = setupFight(g, H(g));
    const vals = Object.values(s.tiles ?? {});
    expect(vals.filter((t) => t === 'trap')).toHaveLength(2);
    expect(vals).toContain('protective');
    let n = setup(['snare'], [...kings, ['player', 'P', 2, 2], ['enemy', 'R', 4, 2]]);
    n = mv(n, 0, 0, 0, 1);
    n = applyMove(n, { from: { r: 4, c: 2 }, to: { r: 2, c: 2 }, capture: true }, H(n));
    expect(n.tiles!['4,2']).toBe('trap');
  });
  it('AI stays within budget on a tiled board', () => {
    const g = seedTiles(newGame(null, ['tithe', 'forkStrike'], ['martyr', 'vengeance']), mulberry32(3), 4, ['trap', 'protective', 'phantom', 'crumbling', 'gold']);
    const s = { ...g, turn: 'enemy' as const };
    const t = performance.now();
    chooseMoveElo(s, H(s), 800, mulberry32(1));
    expect(performance.now() - t).toBeLessThan(300);
  });
});
