import { useEffect, useState } from 'react';
import tuning from '../data/tuning.json';
import type { Kind } from '../rules/types';
import { isTriple } from '../run/wheels';
import { ArmyRail, glyph, Panel } from './Panel';

const STRIP: Kind[] = ['P', 'N', 'B', 'R', 'Q', 'P', 'B', 'N', 'R', 'P'];
const NAME: Record<string, string> = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn', K: 'King' };
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Slot-machine reveal. Results are rolled before the spin (seed-stable); STOP!! just lands the reels left to right.
 * Opening mode keeps every reel of every spin. Reward mode keeps one reel you tap, or all three on a triple.
 */
export function Wheels({ spins, mode, army, cap, onDone }: { spins: Kind[][]; mode: 'opening' | 'reward'; army: Kind[]; cap: number; onDone: (pick: number) => void }) {
  const [i, setI] = useState(0);
  const [landed, setLanded] = useState(0);
  const [stopping, setStopping] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const reels = spins[i];
  const done = landed >= reels.length;
  const triple = done && isTriple(reels);

  useEffect(() => {
    if (!stopping || done) return;
    const t = setTimeout(() => setLanded((n) => n + 1), reduced() ? 0 : tuning.wheels.stopStaggerMs);
    return () => clearTimeout(t);
  }, [stopping, landed, done]);

  const kept = mode === 'opening' ? ['K', ...spins.slice(0, i + (done ? 1 : 0)).flat()] : army;
  const next = () => { setI(i + 1); setLanded(0); setStopping(false); };
  const last = i === spins.length - 1;

  return (
    <main className="stage">
      <Panel title="Piece Wheels">
        <p className="lede">{mode === 'opening'
          ? <>Your King is in. <span>Spin for the rest of your army{spins.length > 1 ? ` (${i + 1}/${spins.length})` : ''}.</span></>
          : <>Spin, then keep one piece. <span>Three of a kind keeps all three.</span></>}</p>
        <div className="reels" role="group" aria-label="Reels">
          {reels.map((k, r) => {
            const isLanded = r < landed;
            const chosen = mode === 'reward' && done && !triple && pick === r;
            const Tag = mode === 'reward' && done && !triple ? 'button' : 'div';
            return (
              <Tag key={r} className={`reel${isLanded ? ' landed' : ''}${chosen ? ' chosen' : ''}${triple ? ' triple' : ''}`}
                {...(Tag === 'button' ? { onClick: () => setPick(r), 'aria-pressed': chosen, 'aria-label': `Keep ${NAME[k]}` } : { 'aria-label': isLanded ? NAME[k] : 'Spinning' })}>
                {isLanded ? <span className="reel-face" aria-hidden="true">{glyph(k)}</span>
                  : <span className="reel-strip" aria-hidden="true" style={{ animationDelay: `${-r * 90}ms` }}>{[...STRIP, ...STRIP].map((g, j) => <span key={j}>{glyph(g)}</span>)}</span>}
              </Tag>
            );
          })}
        </div>
        {triple && <p className="toast" role="status">Three of a kind! All three join you.</p>}
        {!stopping ? <button className="big-btn" onClick={() => setStopping(true)}>STOP!!</button>
          : !done ? <button className="big-btn" disabled>…</button>
          : mode === 'opening' ? <button className="big-btn" onClick={() => (last ? onDone(0) : next())}>{last ? 'Begin the climb' : 'Next spin'}</button>
          : <button className="big-btn" disabled={!triple && pick === null} onClick={() => onDone(pick ?? 0)}>{triple ? 'Take all three' : pick === null ? 'Tap a piece to keep' : `Keep the ${NAME[reels[pick]]}`}</button>}
      </Panel>
      <ArmyRail army={kept} cap={cap} />
    </main>
  );
}
