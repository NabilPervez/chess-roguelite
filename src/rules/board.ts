import tuning from '../data/tuning.json';
import type { Board, GameState, Kind, Piece, Side, Sq } from './types';

export const N = tuning.boardSize;
export const inBounds = (s: Sq) => s.r >= 0 && s.r < N && s.c >= 0 && s.c < N;
export const at = (b: Board, s: Sq) => (inBounds(s) ? b[s.r][s.c] : null);
export const dist = (a: Sq, b: Sq) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
export const forward = (side: Side) => (side === 'player' ? 1 : -1);
export const sqEq = (a: Sq, b: Sq) => a.r === b.r && a.c === b.c;

export function emptyBoard(): Board {
  return Array.from({ length: N }, () => Array<Piece | null>(N).fill(null));
}

let nextId = 0;
export const makePiece = (side: Side, kind: Kind): Piece => ({ id: `${side[0]}${kind}${nextId++}`, side, kind, moved: false });

export function initialBoard(): Board {
  const b = emptyBoard();
  tuning.setup.backRank.forEach((k, c) => {
    b[0][c] = makePiece('player', k as Kind);
    b[N - 1][c] = makePiece('enemy', k as Kind);
  });
  tuning.setup.pawnRank.forEach((k, c) => {
    b[1][c] = makePiece('player', k as Kind);
    b[N - 2][c] = makePiece('enemy', k as Kind);
  });
  return b;
}

export function newGame(court: string | null, playerPassives: string[], enemyPassives: string[] = []): GameState {
  return {
    board: initialBoard(), turn: 'player', turnNumber: 0, progress: 0, status: 'playing',
    court, playerPassives, enemyPassives, log: [],
  };
}

export function squaresOf(b: Board, side: Side): Sq[] {
  const out: Sq[] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c]?.side === side) out.push({ r, c });
  return out;
}
