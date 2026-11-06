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

/** Place an army on its home ranks: king central, other non-pawns on the back rank, pawns in front, overflow behind. */
export function placeArmy(b: Board, side: Side, army: Kind[]): void {
  const back = side === 'player' ? 0 : N - 1;
  const front = side === 'player' ? 1 : N - 2;
  const backOrder = [3, 2, 1, 4, 0, 5];
  const frontOrder = [2, 3, 1, 4, 0, 5];
  const backQ = backOrder.filter((c) => !b[back][c]);
  const frontQ = frontOrder.filter((c) => !b[front][c]);
  const sorted = [...army].sort((a, z) => 'KQRBNP'.indexOf(a) - 'KQRBNP'.indexOf(z));
  for (const k of sorted) {
    if (k === 'P' && frontQ.length) b[front][frontQ.shift()!] = makePiece(side, k);
    else if (backQ.length) b[back][backQ.shift()!] = makePiece(side, k);
    else if (frontQ.length) b[front][frontQ.shift()!] = makePiece(side, k);
  }
}

export interface FightOpts {
  playerArmy?: Kind[];
  enemyArmy?: Kind[];
  capturesToWin?: number;
  turnLimit?: number;
}

export function newGame(court: string | null, playerPassives: string[], enemyPassives: string[] = [], opts: FightOpts = {}): GameState {
  let board = initialBoard();
  if (opts.playerArmy || opts.enemyArmy) {
    board = emptyBoard();
    placeArmy(board, 'player', opts.playerArmy ?? [...tuning.setup.backRank, ...tuning.setup.pawnRank] as Kind[]);
    placeArmy(board, 'enemy', opts.enemyArmy ?? [...tuning.setup.backRank, ...tuning.setup.pawnRank] as Kind[]);
  }
  return {
    board, turn: 'player', turnNumber: 0, progress: 0, status: 'playing',
    capturesToWin: opts.capturesToWin ?? tuning.objective.capturesToWin,
    turnLimit: opts.turnLimit ?? tuning.objective.turnLimit,
    court, playerPassives, enemyPassives, log: [],
  };
}

export function squaresOf(b: Board, side: Side): Sq[] {
  const out: Sq[] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c]?.side === side) out.push({ r, c });
  return out;
}
