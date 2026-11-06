export type Side = 'player' | 'enemy';
export type Kind = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';
export interface Sq { r: number; c: number }
export interface Piece { id: string; side: Side; kind: Kind; moved: boolean }
export type Board = (Piece | null)[][];
export interface Move { from: Sq; to: Sq; capture: boolean; tag?: string }
export type Status = 'playing' | 'won' | 'lost';

export interface GameState {
  board: Board;
  turn: Side;
  /** Player turns taken so far. */
  turnNumber: number;
  /** Objective progress (captures, possibly weighted by passives). */
  progress: number;
  /** Progress needed to win; Infinity means only a king capture wins. */
  capturesToWin: number;
  turnLimit: number;
  /** Checkmate fight: moves may not leave your king in check; win by mate. */
  checkmate?: boolean;
  /** Enemy AI rating for this fight. */
  aiElo?: number;
  status: Status;
  endReason?: string;
  court: string | null;
  playerPassives: string[];
  enemyPassives: string[];
  log: string[];
}

export interface MoveCtx { state: GameState; piece: Piece; from: Sq }

/** A court or passive. All hooks are pure. */
export interface Hook {
  id: string;
  name: string;
  desc: string;
  /** Adjust the max squares a piece may travel (Infinity = no cap). */
  moveCap?: (piece: Piece, cap: number) => number;
  /** Add or remove candidate moves for one piece. */
  onMoveGen?: (ctx: MoveCtx, moves: Move[]) => Move[];
  /** Return false to make a piece immune to capture at this square. */
  canBeCaptured?: (state: GameState, target: Piece, at: Sq) => boolean;
  /** Adjust how much one capture counts toward the objective. */
  objectiveWorth?: (capturer: Piece, captured: Piece, worth: number) => number;
}

export interface HookSet { court: Hook | null; player: Hook[]; enemy: Hook[] }
