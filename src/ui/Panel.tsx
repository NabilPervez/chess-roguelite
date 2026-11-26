import type { ReactNode } from 'react';
import { defaultFormation, N, validFormation } from '../rules/board';

/** Titled panel: a tab label over a hairline card. Shared by Results, Wheels, Graveyard, Formation, Game Over. */
export function Panel({ title, tone = 'raised', children, className = '' }: { title: string; tone?: 'raised' | 'paper'; children: ReactNode; className?: string }) {
  return (
    <section className={`panel panel-${tone} ${className}`}>
      <h1 className="panel-tab">{title}</h1>
      <div className="panel-body">{children}</div>
    </section>
  );
}

const GLYPH: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
export const glyph = (k: string) => GLYPH[k] ?? k;

/** Side rail of army slots, like a roster strip. Empty slots show as dots. */
export function ArmyRail({ army, cap, label = 'Your army' }: { army: string[]; cap: number; label?: string }) {
  return (
    <aside className="rail" aria-label={`${label}: ${army.length} of ${cap}`}>
      {[...Array(cap).keys()].map((i) => <span key={i} className={army[i] ? 'slot full' : 'slot'}>{army[i] ? glyph(army[i]) : ''}</span>)}
    </aside>
  );
}

/** Read-only board preview of your army in its formation; the enemy half is hatched like the fight board. */
export function MiniBoard({ army, formation }: { army: string[]; formation?: string[] }) {
  const f = validFormation(army as never, formation) ? formation : defaultFormation(army as never);
  const at = new Map(f.map((k, i) => [k, army[i]]));
  return (
    <div className="board mini" aria-label={`Your army: ${army.length} pieces`}>
      {[...Array(N).keys()].reverse().map((r) => [...Array(N).keys()].map((c) => {
        const k = at.get(`${r},${c}`);
        return <span key={`${r}-${c}`} className={`sq ${(r + c) % 2 ? 'light' : 'dark'}${r >= N / 2 ? ' foe-half' : ''}`}>{k && <span className="pc player">{glyph(k)}</span>}</span>;
      }))}
    </div>
  );
}
