import tuning from '../src/data/tuning.json';
import { chooseMove } from '../src/ai/greedy';
import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { applyMove } from '../src/rules/game';
import { allLegalMoves, inCheck, legalMoves } from '../src/rules/moves';
import { PASSIVES, resolveHooks } from '../src/passives';
import { generateMap } from '../src/run/map';
import { applyReward, buy, describeEvent, fightOpts, newRun, newSetRun, rollRewards, rollShop, SETS } from '../src/run/run';
import { decodeSave, encodeSave, loadSave, clearSave, writeSave } from '../src/run/save';
import { mulberry32 } from '../src/run/rng';
import type { GameState, Kind, Side } from '../src/rules/types';

function mate(pieces: [Side, Kind, number, number][], enemyPassives: string[] = []): GameState {
  const s = newGame(null, [], enemyPassives, { checkmate: true, capturesToWin: Infinity });
  s.board = emptyBoard();
  for (const [side, k, r, c] of pieces) s.board[r][c] = makePiece(side, k);
  return s;
}

describe('checkmate rules', () => {
  it('detects check', () => {
    const s = mate([['player', 'K', 0, 0], ['enemy', 'R', 5, 0], ['enemy', 'K', 5, 5]]);
    expect(inCheck(s, 'player', resolveHooks(s))).toBe(true);
  });

  it('forbids moves that leave your king in check', () => {
    // Player rook pinned on the a-file between king and enemy rook.
    const s = mate([['player', 'K', 0, 0], ['player', 'R', 2, 0], ['enemy', 'R', 5, 0], ['enemy', 'K', 5, 5]]);
    const d = legalMoves(s, { r: 2, c: 0 }, resolveHooks(s)).map((m) => `${m.to.r},${m.to.c}`);
    expect(d).not.toContain('2,3');
    expect(d).toContain('5,0');
  });

  it('non-checkmate fights still allow it (unchanged rules)', () => {
    const s = { ...mate([['player', 'K', 0, 0], ['player', 'R', 2, 0], ['enemy', 'R', 5, 0], ['enemy', 'K', 5, 5]]), checkmate: false };
    expect(legalMoves(s, { r: 2, c: 0 }, resolveHooks(s)).map((m) => `${m.to.r},${m.to.c}`)).toContain('2,3');
  });

  it('back-rank mate wins the fight', () => {
    // Enemy king boxed in by its own pawns; player rook delivers mate on row 5.
    const s = mate([['player', 'K', 0, 0], ['player', 'R', 1, 5], ['enemy', 'K', 5, 2], ['enemy', 'P', 4, 1], ['enemy', 'P', 4, 2], ['enemy', 'P', 4, 3]]);
    const next = applyMove(s, { from: { r: 1, c: 5 }, to: { r: 5, c: 5 }, capture: false }, resolveHooks(s));
    expect(next.status).toBe('won');
    expect(next.endReason).toMatch(/Checkmate/);
  });

  it('logs check', () => {
    const s = mate([['player', 'K', 0, 0], ['player', 'R', 1, 5], ['enemy', 'K', 5, 2]]);
    const next = applyMove(s, { from: { r: 1, c: 5 }, to: { r: 5, c: 5 }, capture: false }, resolveHooks(s));
    expect(next.status).toBe('playing');
    expect(next.log.at(-1)).toMatch(/check!/);
  });

  it('AI finds mate in one', () => {
    const s = { ...mate([['enemy', 'K', 5, 5], ['enemy', 'R', 4, 0], ['player', 'K', 0, 2], ['player', 'P', 1, 1], ['player', 'P', 1, 2], ['player', 'P', 1, 3]]), turn: 'enemy' as const };
    const h = resolveHooks(s);
    const m = chooseMove(s, h, mulberry32(1))!;
    expect(applyMove(s, m, h).status).toBe('lost');
  });

  it('boss AI move stays under the 300 ms budget', () => {
    const map = generateMap(mulberry32(3));
    const { court, enemyPassives, opts } = fightOpts(map.rows.at(-1)![0]);
    let s = newGame(court, ['phalanx', 'lancer', 'royalGuard'], enemyPassives, { ...opts, playerArmy: ['K', 'Q', 'R', 'R', 'B', 'N', 'P', 'P', 'P', 'P'] });
    const h = resolveHooks(s);
    const rand = mulberry32(9);
    let worst = 0;
    for (let i = 0; i < 16 && s.status === 'playing'; i++) {
      const t = performance.now();
      const m = chooseMove(s, h, rand)!;
      if (s.turn === 'enemy') worst = Math.max(worst, performance.now() - t);
      s = applyMove(s, m, h);
    }
    expect(worst).toBeLessThan(300);
  });
});

describe('boss and elites', () => {
  const map = generateMap(mulberry32(5));
  it('boss has 3 passives, checkmate objective', () => {
    const f = fightOpts(map.rows.at(-1)![0]);
    expect(f.enemyPassives).toHaveLength(3);
    expect(new Set(f.enemyPassives).size).toBe(3);
    expect(f.opts.checkmate).toBe(true);
  });
  it('elites are checkmate fights; normal fights are not', () => {
    const elite = { id: 'x', row: 6, col: 0, type: 'elite' as const, court: null, next: [] };
    const fight = { ...elite, type: 'fight' as const };
    expect(fightOpts(elite).opts.checkmate).toBe(true);
    expect(fightOpts(fight).opts.checkmate).toBeFalsy();
  });
});

describe('set mode', () => {
  it('starts with the set army and passive', () => {
    const r = newSetRun(1, 'cavalry');
    expect(r.mode).toBe('set');
    expect(r.army).toEqual(SETS.cavalry.army);
    expect(r.passives).toEqual([SETS.cavalry.passive]);
  });
  it('every set references a real passive', () => {
    for (const s of Object.values(SETS)) {
      expect(PASSIVES[s.passive]).toBeDefined();
      expect(s.army.filter((k) => k === 'K')).toHaveLength(1);
    }
  });
  it('never gains pieces from rewards, shops or events', () => {
    const r = { ...newSetRun(2, 'bastion'), gold: 999 };
    for (let i = 0; i < 20; i++) expect(rollRewards(r, mulberry32(i)).some((o) => o.type === 'piece')).toBe(false);
    expect(rollShop(r, mulberry32(1)).some((o) => o.type === 'piece')).toBe(false);
    expect(applyReward(r, { type: 'piece', kind: 'Q' }).army).toEqual(r.army);
    expect(() => buy(r, { type: 'piece', kind: 'N', price: 1 })).toThrow();
    expect(describeEvent('deserter', r).choices[0].ok).toBe(false);
  });
  it('draft mode is unchanged', () => {
    const r = newRun(1, 'phalanx');
    expect(r.mode).toBe('draft');
    expect(r.army).toEqual(tuning.run.startArmy);
  });
});

describe('save / resume', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
  it('round-trips a run and a king-hunt fight (Infinity survives)', () => {
    const run = newRun(42, 'bounty');
    const game = newGame('mud', ['bounty'], ['phalanx'], { capturesToWin: Infinity, checkmate: true });
    const back = decodeSave(encodeSave({ run, screen: { kind: 'fight' }, fight: { nodeId: '3-1', game } }))!;
    expect(back.run).toEqual(run);
    expect(back.fight!.game.capturesToWin).toBe(Infinity);
    expect(allLegalMoves(back.fight!.game, resolveHooks(back.fight!.game)).length).toBeGreaterThan(0);
  });
  it('rejects junk, other versions and finished runs', () => {
    expect(decodeSave('not json')).toBeNull();
    expect(decodeSave(null)).toBeNull();
    expect(decodeSave(JSON.stringify({ version: 999 }))).toBeNull();
    expect(decodeSave(encodeSave({ run: { ...newRun(1, 'bounty'), status: 'lost' }, screen: {} }))).toBeNull();
  });
  it('write / load / clear through a store', () => {
    const s = mem();
    writeSave({ run: newRun(7, 'sapper'), screen: { kind: 'map' } }, s);
    expect(loadSave(s)?.run.seed).toBe(7);
    clearSave(s);
    expect(loadSave(s)).toBeNull();
  });
  it('survives a store that throws', () => {
    const bad = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); }, removeItem: () => { throw new Error('x'); } };
    expect(loadSave(bad)).toBeNull();
    expect(() => writeSave({ run: newRun(1, 'bounty'), screen: {} }, bad)).not.toThrow();
  });
});
