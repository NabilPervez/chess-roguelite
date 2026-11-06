export type Side = 'player' | 'enemy';
export type Kind = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';
export interface Sq { r: number; c: number }
export interface Piece { id: string; side: Side; kind: Kind; moved: boolean }
export type Board = (Piece | null)[][];
export interface Move { from: Sq; to: Sq; capture: boolean; tag?: string }
export type Status = 'playing' | 'won' | 'lost';
export type TileKind = 'protective' | 'trap' | 'phantom' | 'crumbling' | 'gold' | 'hole';

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
  /** Effect squares keyed "r,c". */
  tiles?: Record<string, TileKind>;
  /** Piece id -> own turns it must sit out. */
  frozen?: Record<string, number>;
  /** Piece ids that can't be captured until their side moves again. */
  shielded?: string[];
  /** Gold the player earned during this fight. */
  goldEarned?: number;
  /** Once-per-fight effects already spent, e.g. "swap:player". */
  used?: string[];
  /** Sides whose next capture is boosted by Vengeance. */
  vengeance?: Side[];
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
  /** Owner's pawns promote one rank early. */
  promoteEarly?: boolean;
  /** React to any move (either side) after it lands; `owner` is the side holding this passive. */
  afterMove?: (next: GameState, ctx: AfterCtx) => GameState;
  /** Adjust the board at fight start for the owner. */
  onSetup?: (state: GameState, owner: Side) => GameState;
}

export interface AfterCtx { prev: GameState; move: Move; mover: Piece; captured: Piece | null; promoted: boolean; owner: Side }

export interface HookSet { court: Hook | null; player: Hook[]; enemy: Hook[] }
