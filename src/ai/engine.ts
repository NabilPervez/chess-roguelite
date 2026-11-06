import tuning from '../data/tuning.json';
import { inCenter } from '../passives/arena';
import { at, N } from '../rules/board';
import { applyMove } from '../rules/game';
import { allLegalMoves, inCheck, sideHooks } from '../rules/moves';
import type { GameState, HookSet, Move, Side, Sq } from '../rules/types';
import { profileFor, type AiProfile } from './elo';

const W = tuning.ai.weights;
const value = (k: string) => (tuning.pieceValues as Record<string, number>)[k] ?? 0;
const other = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');

class Timeout extends Error {}

/** Can `side`'s piece at `sq` currently be captured at all? Uses the real court + passive `canBeCaptured` hooks. */
function capturable(state: GameState, hooks: HookSet, sq: Sq): boolean {
  const p = at(state.board, sq)!;
  const guards = [...(hooks.court ? [hooks.court] : []), ...sideHooks(hooks, p.side)];
  return guards.every((h) => !h.canBeCaptured || h.canBeCaptured(state, p, sq));
}

/**
 * Static evaluation from `side`'s point of view (pawn units).
 * Material and mobility come from the real rules, so every passive and court is priced in automatically
 * (Amazon queens, Mud caps, Ice slides…). Extra terms teach the AI to *use* passives it owns:
 * keep Phalanx pawns paired, keep Fortress rooks home, hold Arena centre squares, and protect the objective.
 */
export function evaluate(state: GameState, hooks: HookSet, side: Side): number {
  if (state.status !== 'playing') {
    const winner: Side = state.status === 'won' ? 'player' : 'enemy';
    return winner === side ? W.win : -W.win;
  }
  let score = 0;
  const ids = (s: Side) => new Set(sideHooks(hooks, s).map((h) => h.id));
  const owned = { player: ids('player'), enemy: ids('enemy') };

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = state.board[r][c];
    if (!p) continue;
    const sign = p.side === side ? 1 : -1;
    let v = p.kind === 'K' ? 0 : value(p.kind);
    // Pieces a passive or the court makes immune are worth more while they stay immune.
    if (p.kind !== 'K' && !capturable(state, hooks, { r, c })) v += W.immune * value(p.kind);
    const mine = owned[p.side];
    if (mine.has('phalanx') && p.kind === 'P' && [-1, 1].some((dc) => { const n = at(state.board, { r, c: c + dc }); return n?.kind === 'P' && n.side === p.side; })) v += W.phalanxPair;
    if (mine.has('fortress') && p.kind === 'R' && r === (p.side === 'player' ? 0 : N - 1)) v += W.fortressHome;
    if (hooks.court?.id === 'arena' && (p.kind === 'K' || p.kind === 'P') && inCenter({ r, c })) v += W.arenaCenter;
    score += sign * v;
  }

  // Mobility under the real rules for both sides.
  const mob = (s: Side) => allLegalMoves({ ...state, turn: s }, hooks).length;
  score += W.mobility * (mob(side) - mob(other(side)));

  // Objective fights: every point of player progress brings the enemy closer to losing.
  if (isFinite(state.capturesToWin)) {
    const objective = W.objective * state.progress;
    score += side === 'enemy' ? -objective : objective;
    const stall = W.stall * state.turnNumber;
    score += side === 'enemy' ? stall : -stall;
  }
  if (state.checkmate && inCheck(state, side, hooks)) score -= W.inCheck;
  return score;
}

/** Captures first, biggest victim first (MVV) — makes alpha-beta prune far more. */
function ordered(state: GameState, moves: Move[]): Move[] {
  const key = (m: Move) => (m.capture ? 10 + value(at(state.board, m.to)!.kind) : 0) + (m.tag ? 0.5 : 0);
  return [...moves].sort((a, b) => key(b) - key(a));
}

function negamax(state: GameState, hooks: HookSet, depth: number, alpha: number, beta: number, deadline: number): number {
  if (performance.now() > deadline) throw new Timeout();
  const side = state.turn;
  if (depth === 0 || state.status !== 'playing') return evaluate(state, hooks, side);
  const moves = allLegalMoves(state, hooks);
  if (!moves.length) return evaluate(state, hooks, side);
  let best = -Infinity;
  for (const m of ordered(state, moves)) {
    const next = applyMove(state, m, hooks);
    // Prefer faster wins / slower losses.
    let s = -negamax(next, hooks, depth - 1, -beta, -alpha, deadline);
    if (Math.abs(s) >= W.win) s -= Math.sign(s);
    if (s > best) best = s;
    if (s > alpha) alpha = s;
    if (alpha >= beta) break;
  }
  return best;
}

export interface Scored { move: Move; score: number }

/** Scores every root move with iterative deepening up to `depth`, inside the time budget. */
export function scoreMoves(state: GameState, hooks: HookSet, depth: number, budgetMs = tuning.ai.timeBudgetMs): Scored[] {
  const moves = ordered(state, allLegalMoves(state, hooks));
  const deadline = performance.now() + budgetMs;
  let result: Scored[] = moves.map((move) => ({ move, score: 0 }));
  for (let d = 1; d <= depth; d++) {
    try {
      const pass = moves.map((move) => ({ move, score: -negamax(applyMove(state, move, hooks), hooks, d - 1, -Infinity, Infinity, deadline) }));
      result = pass;
    } catch (e) {
      if (e instanceof Timeout) break;
      throw e;
    }
  }
  return result.sort((a, b) => b.score - a.score);
}

/**
 * Elo-scaled move choice. Always takes a win in one; otherwise searches to the profile's depth,
 * adds noise, and sometimes "blunders" into a weaker but non-suicidal move — like a human at that rating.
 */
export function chooseMoveElo(state: GameState, hooks: HookSet, elo: number, rand: () => number, profile: AiProfile = profileFor(elo)): Move | null {
  const scored = scoreMoves(state, hooks, profile.depth);
  if (!scored.length) return null;
  if (scored[0].score >= W.win - 10) return scored[0].move;
  const noisy = scored
    .map((s) => ({ ...s, score: s.score + (rand() * 2 - 1) * profile.noise }))
    .sort((a, b) => b.score - a.score);
  if (rand() < profile.blunder && noisy.length > 1) {
    // Blunder: any move that doesn't lose on the spot.
    const ok = noisy.slice(1).filter((s) => s.score > -W.win + 10);
    if (ok.length) return ok[Math.floor(rand() * ok.length)].move;
  }
  return noisy[0].move;
}
