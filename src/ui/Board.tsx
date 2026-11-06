import type { GameState, Move, Sq } from '../rules/types';

const GLYPH: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const NAME: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };

export function Board({ game, sel, moves, onTap }: { game: GameState; sel: Sq | null; moves: Move[]; onTap: (s: Sq) => void }) {
  const n = game.board.length;
  const rows = [...Array(n).keys()].reverse();
  return (
    <div className="board" role="grid" aria-label="Board">
      {rows.map((r) =>
        [...Array(n).keys()].map((c) => {
          const p = game.board[r][c];
          const m = moves.find((x) => x.to.r === r && x.to.c === c);
          const isSel = sel?.r === r && sel?.c === c;
          const cls = ['sq', (r + c) % 2 ? 'light' : 'dark', isSel && 'sel', m && (m.capture ? 'cap' : 'move'), m?.tag && 'tag'].filter(Boolean).join(' ');
          return (
            <button key={`${r}-${c}`} className={cls} onClick={() => onTap({ r, c })}
              aria-label={`${'abcdef'[c]}${r + 1}${p ? ` ${p.side} ${NAME[p.kind]}` : ''}${m ? (m.capture ? ', capture' : ', move here') : ''}`}>
              {p && <span className={`pc ${p.side}`}>{GLYPH[p.kind]}</span>}
            </button>
          );
        }),
      )}
    </div>
  );
}
