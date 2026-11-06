import { at } from './board';
import { allLegalMoves, inCheck, legalMoves, promotes, sideHooks } from './moves';
import { landTiles, tickSide } from './tiles';
import type { GameState, HookSet, Move } from './types';

const name = (k: string) => ({ P: 'Pawn', N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King' })[k] ?? k;
const sqName = (s: { r: number; c: number }) => `${'abcdef'[s.c]}${s.r + 1}`;

/** Apply a move. Throws on illegal input, so illegal moves are impossible by construction. */
export function applyMove(state: GameState, move: Move, hooks: HookSet): GameState {
  const legal = legalMoves(state, move.from, hooks).find((m) => m.to.r === move.to.r && m.to.c === move.to.c);
  if (!legal) throw new Error(`Illegal move ${sqName(move.from)}-${sqName(move.to)}`);

  const swap = legal.tag === 'swap';
  state = tickSide(state, state.board[move.from.r][move.from.c]!.side);
  const board = state.board.map((row) => row.slice());
  const mover = { ...board[move.from.r][move.from.c]!, moved: true };
  const captured = swap ? null : at(board, move.to);
  board[move.from.r][move.from.c] = swap ? board[move.to.r][move.to.c] : null;
  // Promotion: pawn reaching the far rank (or one early with Promotion Rush) becomes a queen.
  const promoted = promotes(mover, move.to, hooks);
  if (promoted) mover.kind = 'Q';
  board[move.to.r][move.to.c] = mover;

  let progress = state.progress;
  let status = state.status;
  let endReason = state.endReason;
  const log = [...state.log, `${mover.side === 'player' ? 'You' : 'Enemy'}: ${name(mover.kind)} ${sqName(move.from)}→${sqName(move.to)}${swap ? ' (swap)' : ''}${captured ? ` takes ${name(captured.kind)}` : ''}`];
  const used = swap ? [...(state.used ?? []), `swap:${mover.side}`] : state.used;

  if (captured) {
    if (captured.kind === 'K') {
      status = captured.side === 'enemy' ? 'won' : 'lost';
      endReason = captured.side === 'enemy' ? 'You captured the enemy king.' : 'Your king was captured.';
    } else if (mover.side === 'player') {
      let worth = 1;
      for (const h of sideHooks(hooks, 'player')) if (h.objectiveWorth) worth = h.objectiveWorth(mover, captured, worth);
      progress += worth;
    }
  }

  const turnNumber = mover.side === 'player' ? state.turnNumber + 1 : state.turnNumber;
  let next: GameState = { ...state, board, progress, status, endReason, log, used, turnNumber, turn: mover.side === 'player' ? 'enemy' : 'player' };
  next = landTiles(next, move);
  // Passives that react to moves (Martyr, Vengeance, Tithe, Silver Fork, …).
  for (const owner of ['player', 'enemy'] as const)
    for (const h of sideHooks(hooks, owner)) if (h.afterMove) next = h.afterMove(next, { prev: state, move, mover, captured, promoted, owner });
  if (next.status === 'playing' && next.progress >= state.capturesToWin) {
    next = { ...next, status: 'won', endReason: `Objective met: ${state.capturesToWin} captures.` };
  }
  if (next.status === 'playing' && next.turn === 'player' && turnNumber >= state.turnLimit) {
    next = { ...next, status: 'lost', endReason: `Out of turns (${state.turnLimit}).` };
  }
  const check = next.checkmate && next.status === 'playing' && inCheck(next, next.turn, hooks);
  if (check) next = { ...next, log: [...next.log.slice(0, -1), `${next.log[next.log.length - 1]} — check!`] };
  // No legal moves for whoever moves next ends the fight (checkmate, or stalemate counts against them).
  if (next.status === 'playing' && allLegalMoves(next, hooks).length === 0) {
    if (check) return { ...next, status: next.turn === 'player' ? 'lost' : 'won', endReason: next.turn === 'player' ? 'Checkmate. Your king is trapped.' : 'Checkmate! The enemy king is trapped.' };
    next = { ...next, status: next.turn === 'player' ? 'lost' : 'won', endReason: `${next.turn === 'player' ? 'You have' : 'Enemy has'} no legal moves.` };
  }
  return next;
}

/** Fight start: run every passive's onSetup for its owner. */
export function setupFight(state: GameState, hooks: HookSet): GameState {
  let s = state;
  for (const owner of ['player', 'enemy'] as const) for (const h of sideHooks(hooks, owner)) if (h.onSetup) s = h.onSetup(s, owner);
  return s;
}
