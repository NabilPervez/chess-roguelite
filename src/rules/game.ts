import { at, N } from './board';
import { allLegalMoves, inCheck, legalMoves, sideHooks } from './moves';
import type { GameState, HookSet, Move } from './types';

const name = (k: string) => ({ P: 'Pawn', N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King' })[k] ?? k;
const sqName = (s: { r: number; c: number }) => `${'abcdef'[s.c]}${s.r + 1}`;

/** Apply a move. Throws on illegal input, so illegal moves are impossible by construction. */
export function applyMove(state: GameState, move: Move, hooks: HookSet): GameState {
  const legal = legalMoves(state, move.from, hooks).find((m) => m.to.r === move.to.r && m.to.c === move.to.c);
  if (!legal) throw new Error(`Illegal move ${sqName(move.from)}-${sqName(move.to)}`);

  const board = state.board.map((row) => row.slice());
  const mover = { ...board[move.from.r][move.from.c]!, moved: true };
  const captured = at(board, move.to);
  board[move.from.r][move.from.c] = null;
  // Promotion: pawn reaching the far rank becomes a queen.
  if (mover.kind === 'P' && (move.to.r === N - 1 || move.to.r === 0)) mover.kind = 'Q';
  board[move.to.r][move.to.c] = mover;

  let progress = state.progress;
  let status = state.status;
  let endReason = state.endReason;
  const log = [...state.log, `${mover.side === 'player' ? 'You' : 'Enemy'}: ${name(mover.kind)} ${sqName(move.from)}→${sqName(move.to)}${captured ? ` takes ${name(captured.kind)}` : ''}`];

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
  if (status === 'playing' && progress >= state.capturesToWin) {
    status = 'won';
    endReason = `Objective met: ${state.capturesToWin} captures.`;
  }
  let next: GameState = { ...state, board, progress, status, endReason, log, turnNumber, turn: mover.side === 'player' ? 'enemy' : 'player' };
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
