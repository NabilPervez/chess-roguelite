import tuning from '../data/tuning.json';
import type { Board, GameState, Kind, ObjectiveKind, Piece, Side, Sq } from './types';

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
/** Home rows for a side: back rank first. */
export const homeRows = (side: Side) => (side === 'player' ? [0, 1] : [N - 1, N - 2]);

/** A formation is valid if it gives every army slot its own empty home square. */
export function validFormation(army: Kind[], formation: string[] | undefined, side: Side = 'player'): formation is string[] {
  if (!formation || formation.length !== army.length || new Set(formation).size !== formation.length) return false;
  const rows = homeRows(side);
  return formation.every((k) => { const [r, c] = k.split(',').map(Number); return rows.includes(r) && c >= 0 && c < N && Number.isInteger(c); });
}

/** The automatic layout as a formation ("r,c" per army slot). */
export function defaultFormation(army: Kind[]): string[] {
  const b = emptyBoard();
  placeArmy(b, 'player', army);
  const out: string[] = [];
  b.forEach((row, r) => row.forEach((p, c) => { if (p?.slot !== undefined) out[p.slot] = `${r},${c}`; }));
  return out;
}

export function placeArmy(b: Board, side: Side, army: Kind[], formation?: string[]): void {
  if (side === 'player' && validFormation(army, formation)) {
    formation.forEach((k, i) => { const [r, c] = k.split(',').map(Number); b[r][c] = { ...makePiece(side, army[i]), slot: i }; });
    return;
  }
  const back = side === 'player' ? 0 : N - 1;
  const front = side === 'player' ? 1 : N - 2;
  const backOrder = [3, 2, 1, 4, 0, 5];
  const frontOrder = [2, 3, 1, 4, 0, 5];
  const backQ = backOrder.filter((c) => !b[back][c]);
  const frontQ = frontOrder.filter((c) => !b[front][c]);
  // Player pieces remember their army slot so the run can tell who survived or promoted.
  const order = army.map((k, i) => i).sort((a, z) => 'KQRBNP'.indexOf(army[a]) - 'KQRBNP'.indexOf(army[z]));
  const mk = (i: number) => ({ ...makePiece(side, army[i]), ...(side === 'player' ? { slot: i } : {}) });
  for (const i of order) {
    const k = army[i];
    if (k === 'P' && frontQ.length) b[front][frontQ.shift()!] = mk(i);
    else if (backQ.length) b[back][backQ.shift()!] = mk(i);
    else if (frontQ.length) b[front][frontQ.shift()!] = mk(i);
  }
}

export interface FightOpts {
  playerArmy?: Kind[];
  enemyArmy?: Kind[];
  capturesToWin?: number;
  turnLimit?: number;
  checkmate?: boolean;
  aiElo?: number;
  objective?: ObjectiveKind;
  /** Player-chosen home squares per army slot. */
  playerFormation?: string[];
}

export function newGame(court: string | null, playerPassives: string[], enemyPassives: string[] = [], opts: FightOpts = {}): GameState {
  let board = initialBoard();
  if (opts.playerArmy || opts.enemyArmy) {
    board = emptyBoard();
    placeArmy(board, 'player', opts.playerArmy ?? [...tuning.setup.backRank, ...tuning.setup.pawnRank] as Kind[], opts.playerFormation);
    placeArmy(board, 'enemy', opts.enemyArmy ?? [...tuning.setup.backRank, ...tuning.setup.pawnRank] as Kind[]);
  }
  return {
    board, turn: 'player', turnNumber: 0, progress: 0, status: 'playing',
    capturesToWin: opts.capturesToWin ?? tuning.objective.capturesToWin,
    turnLimit: opts.turnLimit ?? tuning.objective.turnLimit,
    checkmate: opts.checkmate ?? false,
    aiElo: opts.aiElo,
    objective: opts.objective,
    court, playerPassives, enemyPassives, log: [],
  };
}

export function squaresOf(b: Board, side: Side): Sq[] {
  const out: Sq[] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c]?.side === side) out.push({ r, c });
  return out;
}
