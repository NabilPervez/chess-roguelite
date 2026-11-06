import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { applyMove } from '../src/rules/game';
import { allLegalMoves, legalMoves } from '../src/rules/moves';
import type { GameState, Kind, Side } from '../src/rules/types';
import { resolveHooks } from '../src/passives';
import { chooseMove, mulberry32 } from '../src/ai/greedy';

const noHooks = { court: null, player: [], enemy: [] };
function solo(kind: Kind, r: number, c: number, side: Side = 'player'): GameState {
  const s = newGame(null, []);
  s.board = emptyBoard();
  s.board[r][c] = makePiece(side, kind);
  s.turn = side;
  return s;
}
const count = (s: GameState, r: number, c: number) => legalMoves(s, { r, c }, noHooks).length;

describe('piece movement on an empty 6×6 board', () => {
  it('rook from corner: 10', () => expect(count(solo('R', 0, 0), 0, 0)).toBe(10));
  it('bishop from c3 (r2,c2): 9', () => expect(count(solo('B', 2, 2), 2, 2)).toBe(9));
  it('queen from c3: 19', () => expect(count(solo('Q', 2, 2), 2, 2)).toBe(19));
  it('knight from corner: 2, center: 8', () => {
    expect(count(solo('N', 0, 0), 0, 0)).toBe(2);
    expect(count(solo('N', 2, 2), 2, 2)).toBe(8);
  });
  it('king from center: 8', () => expect(count(solo('K', 2, 2), 2, 2)).toBe(8));
  it('pawn moves one forward; enemy pawn moves down', () => {
    expect(legalMoves(solo('P', 1, 1), { r: 1, c: 1 }, noHooks).map((m) => m.to)).toEqual([{ r: 2, c: 1 }]);
    expect(legalMoves(solo('P', 4, 1, 'enemy'), { r: 4, c: 1 }, noHooks).map((m) => m.to)).toEqual([{ r: 3, c: 1 }]);
  });
  it('pawn captures diagonally, not forward; promotes to queen', () => {
    const s = solo('P', 4, 1);
    s.board[5][1] = makePiece('enemy', 'R');
    s.board[5][2] = makePiece('enemy', 'R');
    s.board[0][5] = makePiece('enemy', 'K');
    const moves = legalMoves(s, { r: 4, c: 1 }, noHooks);
    expect(moves).toHaveLength(1);
    const next = applyMove(s, moves[0], noHooks);
    expect(next.board[5][2]?.kind).toBe('Q');
  });
  it('blocked by own pieces; cannot move on enemy turn', () => {
    const s = newGame(null, []);
    expect(count(s, 0, 0)).toBe(0);
    s.turn = 'enemy';
    expect(count(s, 1, 0)).toBe(0);
  });
});

describe('game flow', () => {
  it('rejects illegal moves', () => {
    const s = newGame(null, []);
    expect(() => applyMove(s, { from: { r: 0, c: 0 }, to: { r: 3, c: 0 }, capture: false }, noHooks)).toThrow();
  });
  it('capturing the king wins', () => {
    const s = solo('R', 0, 0);
    s.board[5][0] = makePiece('enemy', 'K');
    const next = applyMove(s, { from: { r: 0, c: 0 }, to: { r: 5, c: 0 }, capture: true }, noHooks);
    expect(next.status).toBe('won');
  });
  it('random full games never produce illegal states (property)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rand = mulberry32(seed);
      const ids = ['phalanx', 'cavalryCharge', 'royalGuard', 'bounty', 'lancer', 'sapper'];
      const passives = ids.filter(() => rand() < 0.5).slice(0, 3);
      let s = newGame(rand() < 0.5 ? 'mud' : null, passives, ids.filter(() => rand() < 0.3).slice(0, 3));
      const hooks = resolveHooks(s);
      for (let i = 0; i < 80 && s.status === 'playing'; i++) {
        const moves = allLegalMoves(s, hooks);
        for (const m of moves) {
          const target = s.board[m.to.r][m.to.c];
          expect(target?.side).not.toBe(s.turn);
          expect(!!target).toBe(m.capture);
        }
        const m = moves[Math.floor(rand() * moves.length)];
        s = applyMove(s, m, hooks);
        const kings = s.board.flat().filter((p) => p?.kind === 'K').length;
        expect(kings === 2 || s.status !== 'playing').toBe(true);
      }
    }
  });
});

describe('greedy AI', () => {
  it('takes the most valuable capture', () => {
    const s = solo('R', 2, 2, 'enemy');
    s.board[2][0] = makePiece('player', 'P');
    s.board[2][5] = makePiece('player', 'Q');
    s.board[0][0] = makePiece('player', 'K');
    s.board[5][5] = makePiece('enemy', 'K');
    expect(chooseMove(s, noHooks, mulberry32(1))?.to).toEqual({ r: 2, c: 5 });
  });
  it('always returns a legal move, fast', () => {
    const s0 = newGame('mud', ['phalanx', 'lancer', 'sapper']);
    const hooks = resolveHooks(s0);
    let s = applyMove(s0, allLegalMoves(s0, hooks)[0], hooks);
    const t = performance.now();
    const m = chooseMove(s, hooks, mulberry32(2))!;
    const ms = performance.now() - t;
    expect(allLegalMoves(s, hooks)).toContainEqual(m);
    expect(ms).toBeLessThan(300);
  });
});
