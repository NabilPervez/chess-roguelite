import type { ReactNode } from 'react';

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
