import tuning from '../data/tuning.json';
import { inBounds, makePiece, N } from './board';
import type { GameState, Move, Piece, Side, Sq, TileKind } from './types';

export const key = (s: Sq) => `${s.r},${s.c}`;
export const tileAt = (state: GameState, s: Sq): TileKind | undefined => state.tiles?.[key(s)];

export const TILE_INFO: Record<TileKind, { name: string; icon: string; desc: string }> = {
  protective: { name: 'Protective', icon: '⛨', desc: 'A piece that lands here can’t be captured until its side moves again.' },
  trap: { name: 'Trap', icon: '⌧', desc: 'Any piece that lands here is frozen for its next turn. Used up.' },
  phantom: { name: 'Phantom', icon: '◌', desc: 'A non-king that lands here gains a copy beside it. Used up.' },
  crumbling: { name: 'Crumbling', icon: '⁂', desc: 'When a piece leaves, the square collapses into a hole.' },
  gold: { name: 'Gold', icon: '◈', desc: `Your piece that lands here earns ◈${tuning.tiles.goldValue}. Used up.` },
  hole: { name: 'Hole', icon: '▢', desc: 'Nothing can stand here.' },
};

/** True if `p` may not move this turn. */
export const isFrozen = (state: GameState, p: Piece) => (state.frozen?.[p.id] ?? 0) > 0;
export const isShielded = (state: GameState, p: Piece) => !!state.shielded?.includes(p.id);

/** Start of a side's move: its old shields end and its frozen counters tick down. */
export function tickSide(state: GameState, side: Side): GameState {
  const ids = new Set<string>();
  for (const row of state.board) for (const p of row) if (p?.side === side) ids.add(p.id);
  const frozen = { ...(state.frozen ?? {}) };
  for (const id of Object.keys(frozen)) if (ids.has(id)) { frozen[id] -= 1; if (frozen[id] <= 0) delete frozen[id]; }
  return { ...state, frozen, shielded: (state.shielded ?? []).filter((id) => !ids.has(id)) };
}

/** Square effects after `move` lands. `state.board` already shows the move. */
export function landTiles(state: GameState, move: Move): GameState {
  if (!state.tiles) return state;
  const tiles = { ...state.tiles };
  const log = [...state.log];
  let { board } = state;
  let frozen = state.frozen ?? {};
  let shielded = state.shielded ?? [];
  let goldEarned = state.goldEarned ?? 0;
  const mover = board[move.to.r][move.to.c]!;

  if (tiles[key(move.from)] === 'crumbling') { tiles[key(move.from)] = 'hole'; log.push('A crumbling square collapses.'); }
  const t = tiles[key(move.to)];
  if (t === 'protective') shielded = [...shielded, mover.id];
  if (t === 'trap') { frozen = { ...frozen, [mover.id]: 1 }; delete tiles[key(move.to)]; log.push('Trapped! That piece sits out a turn.'); }
  if (t === 'gold') {
    delete tiles[key(move.to)];
    if (mover.side === 'player') { goldEarned += tuning.tiles.goldValue; log.push(`+◈${tuning.tiles.goldValue} from a gold square.`); }
  }
  if (t === 'phantom') {
    delete tiles[key(move.to)];
    if (mover.kind !== 'K') {
      const back = mover.side === 'player' ? -1 : 1;
      const spots = [[back, 0], [0, -1], [0, 1], [-back, 0]].map(([dr, dc]) => ({ r: move.to.r + dr, c: move.to.c + dc }));
      const spot = spots.find((s) => inBounds(s) && !board[s.r][s.c] && tiles[key(s)] !== 'hole');
      if (spot) {
        board = board.map((row) => row.slice());
        board[spot.r][spot.c] = { ...makePiece(mover.side, mover.kind), moved: true };
        log.push('A phantom copy appears.');
      }
    }
  }
  return { ...state, board, tiles, frozen, shielded, goldEarned, log };
}

/** Seed effect tiles on empty middle squares. */
export function seedTiles(state: GameState, rand: () => number, count: number, pool: TileKind[]): GameState {
  const empty: Sq[] = [];
  for (let r = 2; r < N - 2; r++) for (let c = 0; c < N; c++) if (!state.board[r][c] && !state.tiles?.[key({ r, c })]) empty.push({ r, c });
  const tiles = { ...(state.tiles ?? {}) };
  for (let i = 0; i < count && empty.length; i++) {
    const [sq] = empty.splice(Math.floor(rand() * empty.length), 1);
    tiles[key(sq)] = pool[Math.floor(rand() * pool.length)];
  }
  return { ...state, tiles };
}
