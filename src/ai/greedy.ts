import tuning from '../data/tuning.json';
import { at } from '../rules/board';
import { applyMove } from '../rules/game';
import { allLegalMoves } from '../rules/moves';
import type { GameState, HookSet, Move } from '../rules/types';

export { mulberry32 } from '../run/rng';

const value = (k: string) => (tuning.pieceValues as Record<string, number>)[k] ?? 0;

/** Greedy 1-move AI: best capture by value, else a random move to a square the player can't hit. */
export function chooseMove(state: GameState, hooks: HookSet, rand: () => number): Move | null {
  const moves = allLegalMoves(state, hooks);
  if (!moves.length) return null;
  const caps = moves.filter((m) => m.capture);
  if (caps.length) {
    caps.sort((a, b) => value(at(state.board, b.to)!.kind) - value(at(state.board, a.to)!.kind));
    return caps[0];
  }
  const safe = moves.filter((m) => {
    const next = applyMove(state, m, hooks);
    return next.status !== 'playing' || !allLegalMoves(next, hooks).some((r) => r.to.r === m.to.r && r.to.c === m.to.c);
  });
  const pool = safe.length ? safe : moves;
  return pool[Math.floor(rand() * pool.length)];
}
