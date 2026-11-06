import { at, dist, forward, inBounds, N } from './board';
import type { Board, GameState, Hook, HookSet, Move, Piece, Side, Sq } from './types';

const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
export const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

function slide(b: Board, p: Piece, from: Sq, dirs: number[][], max = N): Move[] {
  const out: Move[] = [];
  for (const [dr, dc] of dirs) {
    for (let i = 1; i <= max; i++) {
      const to = { r: from.r + dr * i, c: from.c + dc * i };
      if (!inBounds(to)) break;
      const t = at(b, to);
      if (!t) { out.push({ from, to, capture: false }); continue; }
      if (t.side !== p.side) out.push({ from, to, capture: true });
      break;
    }
  }
  return out;
}

export function jumps(b: Board, p: Piece, from: Sq, offsets: number[][]): Move[] {
  const out: Move[] = [];
  for (const [dr, dc] of offsets) {
    const to = { r: from.r + dr, c: from.c + dc };
    if (!inBounds(to)) continue;
    const t = at(b, to);
    if (!t) out.push({ from, to, capture: false });
    else if (t.side !== p.side) out.push({ from, to, capture: true });
  }
  return out;
}

/** Standard moves on a 6×6 board (no castling, no en passant, no double pawn step). */
export function baseMoves(b: Board, from: Sq): Move[] {
  const p = at(b, from);
  if (!p) return [];
  switch (p.kind) {
    case 'R': return slide(b, p, from, ORTHO);
    case 'B': return slide(b, p, from, DIAG);
    case 'Q': return slide(b, p, from, [...ORTHO, ...DIAG]);
    case 'K': return slide(b, p, from, [...ORTHO, ...DIAG], 1);
    case 'N': return jumps(b, p, from, KNIGHT);
    case 'P': {
      const out: Move[] = [];
      const f = forward(p.side);
      const ahead = { r: from.r + f, c: from.c };
      if (inBounds(ahead) && !at(b, ahead)) out.push({ from, to: ahead, capture: false });
      for (const dc of [-1, 1]) {
        const to = { r: from.r + f, c: from.c + dc };
        const t = at(b, to);
        if (t && t.side !== p.side) out.push({ from, to, capture: true });
      }
      return out;
    }
  }
}

const allHooks = (h: HookSet): Hook[] => [...(h.court ? [h.court] : []), ...h.player, ...h.enemy];
export const sideHooks = (h: HookSet, side: Piece['side']) => (side === 'player' ? h.player : h.enemy);

/** Moves for the piece at `from` with hooks applied, ignoring whose turn it is and check. */
function pseudoMoves(state: GameState, from: Sq, hooks: HookSet): Move[] {
  const p = at(state.board, from);
  if (!p) return [];
  const own = sideHooks(hooks, p.side);
  let moves = baseMoves(state.board, from);
  for (const h of own) if (h.onMoveGen) moves = h.onMoveGen({ state, piece: p, from }, moves);
  // Court runs last so it shapes every move, including passive-granted ones.
  if (hooks.court?.onMoveGen) moves = hooks.court.onMoveGen({ state, piece: p, from }, moves);

  // Distance cap: court sets it, owner passives may adjust it.
  let cap = Infinity;
  if (hooks.court?.moveCap) cap = hooks.court.moveCap(p, cap);
  for (const h of own) if (h.moveCap) cap = h.moveCap(p, cap);
  moves = moves.filter((m) => dist(m.from, m.to) <= cap);

  // Capture immunity: the target's own passives (and the court) decide.
  moves = moves.filter((m) => {
    if (!m.capture) return true;
    const target = at(state.board, m.to)!;
    const guards = [...(hooks.court ? [hooks.court] : []), ...sideHooks(hooks, target.side)];
    return guards.every((h) => !h.canBeCaptured || h.canBeCaptured(state, target, m.to));
  });

  // De-duplicate identical destinations.
  const seen = new Set<string>();
  return moves.filter((m) => {
    const k = `${m.to.r},${m.to.c}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Board after a move, without bookkeeping (used for check tests). */
export function previewBoard(b: Board, m: Move): Board {
  const board = b.map((row) => row.slice());
  const mover = board[m.from.r][m.from.c]!;
  board[m.from.r][m.from.c] = null;
  board[m.to.r][m.to.c] = mover.kind === 'P' && (m.to.r === N - 1 || m.to.r === 0) ? { ...mover, kind: 'Q' } : mover;
  return board;
}

/** True if `side`'s king could be captured by the other side right now. */
export function inCheck(state: GameState, side: Side, hooks: HookSet): boolean {
  let king: Sq | null = null;
  for (let r = 0; r < N && !king; r++) for (let c = 0; c < N; c++) {
    const p = state.board[r][c];
    if (p?.side === side && p.kind === 'K') { king = { r, c }; break; }
  }
  if (!king) return false;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = state.board[r][c];
    if (p && p.side !== side && pseudoMoves(state, { r, c }, hooks).some((m) => m.to.r === king!.r && m.to.c === king!.c)) return true;
  }
  return false;
}

/** Legal moves for the piece at `from`. In checkmate fights, moves that leave your king in check are removed. */
export function legalMoves(state: GameState, from: Sq, hooks: HookSet): Move[] {
  const p = at(state.board, from);
  if (!p || p.side !== state.turn || state.status !== 'playing') return [];
  const moves = pseudoMoves(state, from, hooks);
  if (!state.checkmate) return moves;
  return moves.filter((m) => !inCheck({ ...state, board: previewBoard(state.board, m) }, p.side, hooks));
}

export function allLegalMoves(state: GameState, hooks: HookSet): Move[] {
  const out: Move[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (state.board[r][c]?.side === state.turn) out.push(...legalMoves(state, { r, c }, hooks));
  return out;
}

export { allHooks };
