import { useState } from 'react';
import tuning from '../data/tuning.json';
import type { RunState } from '../run/run';
import { pieceCap } from '../run/run';
import { canRecover, recoverPrice } from '../run/graveyard';
import { ArmyRail, glyph, Panel } from './Panel';
import { useDrag } from './useDrag';

/** Buy back recently captured pieces. Drag onto the drop zone, or tap a piece then the zone. */
export function Graveyard({ run, onRecover, onNext }: { run: RunState; onRecover: (i: number) => void; onNext: () => void }) {
  const [help, setHelp] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const grave = run.graveyard ?? [];
  const full = run.army.length >= pieceCap(run);
  const drag = useDrag<number>((i) => { if (canRecover(run, i)) { onRecover(i); setSel(null); } });
  return (
    <main className="stage">
      <span className="gold-pill corner">◈ {run.gold}</span>
      <Panel title="Graveyard" tone="paper">
        <p className="lede">The last {tuning.graveyard.size} captured pieces rest here. <span>Buy one back before it's gone.</span></p>
        {grave.length === 0 ? <p className="lede"><span>No one is buried here. Keep it that way.</span></p> : (
          <div className="tray">
            {grave.map((k, i) => (
              <button key={`${i}-${k}`} className={`tray-item${sel === i ? ' sel' : ''}`} disabled={!canRecover(run, i)} {...drag.source(i)}
                onClick={() => setSel(sel === i ? null : i)} aria-pressed={sel === i} aria-label={`${k} for ${recoverPrice(k)} gold`}>
                <span className="tray-glyph" aria-hidden="true">{glyph(k)}</span><span className="price-chip">◈{recoverPrice(k)}</span>
              </button>
            ))}
          </div>
        )}
        <button className={`dropzone${drag.over ? ' over' : ''}`} {...drag.target()} disabled={sel === null || !canRecover(run, sel)}
          onClick={() => { if (sel !== null && canRecover(run, sel)) { onRecover(sel); setSel(null); } }}>
          {full ? 'Army full' : sel !== null ? `Recover for ◈${recoverPrice(grave[sel])}` : 'Drag here to recover'}
        </button>
        <div className="twin">
          <button className="big-btn alt" onClick={() => setHelp(!help)} aria-expanded={help}>?</button>
          <button className="big-btn" onClick={onNext}>Next</button>
        </div>
        {help && <p className="tip">Pieces captured in a fight are gone for good — elites and the boss included. Only your last {tuning.graveyard.size} losses are kept here. Recovering needs gold and a free army slot.</p>}
      </Panel>
      <ArmyRail army={run.army} cap={pieceCap(run)} />
      {drag.ghost}
    </main>
  );
}
