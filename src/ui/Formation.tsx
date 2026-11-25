import { useState } from 'react';
import { defaultFormation, N, validFormation } from '../rules/board';
import type { Kind } from '../rules/types';
import { glyph, Panel } from './Panel';

const NAME: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };

/** Arrange your army on your two home rows before a fight. Tap a piece, then a square, to move or swap. */
export function Formation({ army, initial, enemy, title, onFight }: { army: Kind[]; initial?: string[]; enemy: Kind[]; title: string; onFight: (f: string[]) => void }) {
  const [f, setF] = useState<string[]>(() => (validFormation(army, initial) ? initial : defaultFormation(army)));
  const [sel, setSel] = useState<string | null>(null);
  const slotAt = (k: string) => f.indexOf(k);
  const tap = (k: string) => {
    if (sel === null) { if (slotAt(k) >= 0) setSel(k); return; }
    if (sel === k) { setSel(null); return; }
    const a = slotAt(sel), b = slotAt(k);
    const next = [...f];
    next[a] = k; if (b >= 0) next[b] = sel;
    setF(next); setSel(null);
  };
  return (
    <main className="stage">
      <Panel title="Formation">
        <p className="lede">{title}. <span>Protect the King — if he falls, the run ends.</span></p>
        <div className="enemy-line" aria-label="Enemy army"><span className="eyebrow">Facing</span><span className="pcs">{enemy.map((k, i) => <span key={i} className="pc enemy small">{glyph(k)}</span>)}</span></div>
        <div className="form-board" role="grid" aria-label="Your home rows. Tap a piece, then a square.">
          {[1, 0].map((r) => [...Array(N).keys()].map((c) => {
            const k = `${r},${c}`, s = slotAt(k), kind = s >= 0 ? army[s] : null;
            return (
              <button key={k} className={`sq ${(r + c) % 2 ? 'light' : 'dark'}${sel === k ? ' sel' : ''}${sel && sel !== k ? ' move' : ''}`} onClick={() => tap(k)}
                aria-label={`${'abcdef'[c]}${r + 1}${kind ? ` ${NAME[kind]}` : ' empty'}${sel === k ? ', selected' : ''}`}>
                {kind && <span className={`pc player${kind === 'K' ? ' king' : ''}`}>{glyph(kind)}</span>}
              </button>
            );
          }))}
        </div>
        <div className="twin">
          <button className="big-btn alt" onClick={() => { setF(defaultFormation(army)); setSel(null); }}>Reset</button>
          <button className="big-btn" onClick={() => onFight(f)}>Fight!</button>
        </div>
      </Panel>
    </main>
  );
}
