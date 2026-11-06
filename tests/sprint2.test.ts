import tuning from '../src/data/tuning.json';
import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { legalMoves } from '../src/rules/moves';
import { resolveHooks } from '../src/passives';
import { generateMap } from '../src/run/map';
import { applyReward, fightOpts, newRun, promotePawn, reachable, rollRewards } from '../src/run/run';
import { mulberry32 } from '../src/run/rng';
import type { GameState, Kind, Side } from '../src/rules/types';

function setup(court: string | null, pieces: [Side, Kind, number, number][]): GameState {
  const s = newGame(court, []);
  s.board = emptyBoard();
  for (const [side, k, r, c] of pieces) s.board[r][c] = makePiece(side, k);
  return s;
}
const dests = (s: GameState, r: number, c: number) => legalMoves(s, { r, c }, resolveHooks(s)).map((m) => `${m.to.r},${m.to.c}`).sort();

describe('courts', () => {
  it('Ice: rook slides to the end of each line only', () => {
    expect(dests(setup('ice', [['player', 'R', 0, 0]]), 0, 0)).toEqual(['0,5', '5,0']);
  });
  it('Ice: stops on a capture or before a friend', () => {
    const s = setup('ice', [['player', 'R', 0, 0], ['enemy', 'P', 3, 0], ['player', 'P', 0, 2]]);
    expect(dests(s, 0, 0)).toEqual(['0,1', '3,0']);
  });
  it('Ice leaves knights alone', () => {
    expect(dests(setup('ice', [['player', 'N', 2, 2]]), 2, 2)).toHaveLength(8);
  });
  it('Arena: centre king moves 2, edge king moves 1', () => {
    expect(dests(setup('arena', [['player', 'K', 2, 2]]), 2, 2)).toContain('4,4');
    expect(dests(setup('arena', [['player', 'K', 0, 0]]), 0, 0)).toHaveLength(3);
  });
  it('Arena: centre pawn steps 2 forward but never captures straight', () => {
    expect(dests(setup('arena', [['player', 'P', 2, 2]]), 2, 2)).toEqual(['3,2', '4,2']);
    expect(dests(setup('arena', [['player', 'P', 2, 2], ['enemy', 'N', 4, 2]]), 2, 2)).toEqual(['3,2']);
  });
});

describe('draft army placement', () => {
  it('K + 4 pawns: king on the back rank, pawns in front', () => {
    const s = newGame('mud', [], [], { playerArmy: ['K', 'P', 'P', 'P', 'P'], enemyArmy: ['K', 'P'] });
    expect(s.board[0].filter((p) => p?.kind === 'K')).toHaveLength(1);
    expect(s.board[1].filter((p) => p?.kind === 'P')).toHaveLength(4);
    expect(s.board.flat().filter((p) => p?.side === 'enemy')).toHaveLength(2);
  });
  it('a 10-piece army fits', () => {
    const army: Kind[] = ['K', 'Q', 'R', 'R', 'B', 'N', 'P', 'P', 'P', 'P'];
    expect(newGame(null, [], [], { playerArmy: army }).board.flat().filter((p) => p?.side === 'player')).toHaveLength(10);
  });
});

describe('map', () => {
  it('is seeded, has 15 rows of 2–4 nodes, one boss, and every node is reachable', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const m = generateMap(mulberry32(seed));
      expect(generateMap(mulberry32(seed))).toEqual(m);
      expect(m.rows).toHaveLength(tuning.run.rows);
      m.rows.slice(0, -1).forEach((row) => expect(row.length).toBeGreaterThanOrEqual(2));
      expect(m.rows.at(-1)![0].type).toBe('boss');
      for (let r = 1; r < m.rows.length; r++)
        for (const n of m.rows[r]) expect(m.rows[r - 1].some((p) => p.next.includes(n.id))).toBe(true);
      m.rows.flat().filter((n) => n.type === 'fight').forEach((n) => expect(n.court).toBeTruthy());
    }
  });
});

describe('run', () => {
  it('starts with K + 4 pawns and one passive; first row is reachable', () => {
    const run = newRun(7, 'phalanx');
    expect(run.army).toEqual(['K', 'P', 'P', 'P', 'P']);
    expect(reachable(run)).toEqual(run.map.rows[0]);
  });
  it('rewards: 3 offers, pieces respect the cap, passives need a replacement at 3', () => {
    let run = newRun(3, 'phalanx');
    expect(rollRewards(run, mulberry32(1))).toHaveLength(3);
    run = applyReward(run, { type: 'passive', id: 'lancer' });
    run = applyReward(run, { type: 'passive', id: 'bounty' });
    expect(() => applyReward(run, { type: 'passive', id: 'sapper' })).toThrow();
    expect(applyReward(run, { type: 'passive', id: 'sapper' }, 'bounty').passives).toEqual(['phalanx', 'lancer', 'sapper']);
    run = { ...run, army: Array(10).fill('P') };
    expect(applyReward(run, { type: 'piece', kind: 'Q' }).army).toHaveLength(10);
    expect(rollRewards(run, mulberry32(2)).some((r) => r.type === 'piece')).toBe(false);
  });
  it('rest promotes a pawn', () => {
    expect(promotePawn(newRun(1, 'phalanx'), 'R').army).toContain('R');
  });
  it('boss is a king hunt with enemy passives', () => {
    const run = newRun(9, 'phalanx');
    const f = fightOpts(run.map.rows.at(-1)![0]);
    expect(f.opts.capturesToWin).toBe(Infinity);
    expect(f.enemyPassives.length).toBeGreaterThan(0);
  });
});
