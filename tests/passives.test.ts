import { emptyBoard, makePiece, newGame } from '../src/rules/board';
import { applyMove } from '../src/rules/game';
import { legalMoves } from '../src/rules/moves';
import { resolveHooks } from '../src/passives';
import type { GameState, Kind, Side } from '../src/rules/types';

function setup(court: string | null, passives: string[], pieces: [Side, Kind, number, number][]): GameState {
  const s = newGame(court, passives);
  s.board = emptyBoard();
  for (const [side, k, r, c] of pieces) s.board[r][c] = makePiece(side, k);
  return s;
}
const dests = (s: GameState, r: number, c: number) => legalMoves(s, { r, c }, resolveHooks(s)).map((m) => `${m.to.r},${m.to.c}`);

it('Mud caps a rook at 3 squares', () => {
  const s = setup('mud', [], [['player', 'R', 0, 0]]);
  expect(dests(s, 0, 0)).toHaveLength(6);
});
it('Sapper lets rooks ignore Mud', () => {
  const s = setup('mud', ['sapper'], [['player', 'R', 0, 0]]);
  expect(dests(s, 0, 0)).toHaveLength(10);
});
it('Phalanx protects paired pawns only', () => {
  const s = setup(null, ['phalanx'], [['enemy', 'P', 3, 1], ['player', 'P', 2, 2], ['player', 'P', 2, 3]]);
  s.turn = 'enemy';
  expect(dests(s, 3, 1)).not.toContain('2,2');
  s.board[2][3] = null;
  expect(dests(s, 3, 1)).toContain('2,2');
});
it('Cavalry Charge: unmoved knight double-jumps; moved knight does not', () => {
  const s = setup(null, ['cavalryCharge'], [['player', 'N', 0, 0]]);
  const d = dests(s, 0, 0);
  expect(d).toContain('4,2');
  expect(d.length).toBeGreaterThan(2);
  s.board[0][0]!.moved = true;
  expect(dests(s, 0, 0)).toHaveLength(2);
});
it('Royal Stride: king moves 2, not through pieces', () => {
  const s = setup(null, ['royalGuard'], [['player', 'K', 0, 0], ['player', 'P', 1, 1]]);
  const d = dests(s, 0, 0);
  expect(d).toContain('2,0');
  expect(d).not.toContain('2,2');
});
it('Lancer: pawn captures straight ahead', () => {
  const s = setup(null, ['lancer'], [['player', 'P', 1, 1], ['enemy', 'N', 2, 1]]);
  expect(dests(s, 1, 1)).toContain('2,1');
  s.playerPassives = [];
  expect(dests(s, 1, 1)).not.toContain('2,1');
});
it('Bounty: pawn capture counts double', () => {
  const s = setup(null, ['bounty'], [['player', 'P', 1, 1], ['enemy', 'N', 2, 2], ['player', 'K', 0, 0], ['enemy', 'K', 5, 5]]);
  const next = applyMove(s, { from: { r: 1, c: 1 }, to: { r: 2, c: 2 }, capture: true }, resolveHooks(s));
  expect(next.progress).toBe(2);
});
