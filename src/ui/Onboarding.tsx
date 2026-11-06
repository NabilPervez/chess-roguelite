import { useEffect, useState } from 'react';
import tuning from '../data/tuning.json';

const STEPS = [
  { art: '♚ ♟ ♞', title: 'Chess, but a climb', body: `Every fight is chess on a small ${tuning.boardSize}×${tuning.boardSize} board against an AI. Win fights to climb ${tuning.run.rows} rows of the Spire. Lose your king and the run is over.` },
  { art: '◎ ⚑ ♛', title: 'Each fight has a goal', body: 'Normal fights are quick: hit the objective shown at the top (like a number of captures) before the turn limit. Elites and the boss must be checkmated.' },
  { art: '⛰ ❄ ◎', title: 'Courts change the board', body: 'Every fight is played on a court with its own rule that affects both sides, and some squares are effect tiles. Tap any chip in a fight to read what it does.' },
  { art: '✦ ◈ ♜', title: 'Build your run', body: 'Pick passives that bend the rules in your favor, win new pieces, and earn gold. Fewer turns and fewer lost pieces pay more. Spend gold in shops on pieces, passives and relics.' },
  { art: '☠ ? ☾', title: 'Choose your path', body: `Pick your route on the map: fights, elites, shops, events and rest stops. At the top waits ${tuning.run.boss.name}, with three passives that work together. Plan for it.` },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const next = () => (last ? onDone() : setI(i + 1));
  const back = () => setI(Math.max(0, i - 1));
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
      else if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  const s = STEPS[i];
  return (
    <main className="shell onboard" aria-labelledby="ob-title">
      <div className="ob-top">
        <span className="eyebrow">How to play · {i + 1} of {STEPS.length}</span>
        <button className="ghost ob-skip" onClick={onDone}>Skip</button>
      </div>
      <section className="ob-card card" key={i} aria-live="polite">
        <div className="ob-art" aria-hidden="true">{s.art}</div>
        <h1 id="ob-title">{s.title}</h1>
        <p>{s.body}</p>
      </section>
      <div className="ob-dots" role="tablist" aria-label="Steps">
        {STEPS.map((x, j) => <button key={j} role="tab" aria-selected={j === i} aria-label={`Step ${j + 1}: ${x.title}`} className={j === i ? 'on' : ''} onClick={() => setI(j)} />)}
      </div>
      <div className="ob-nav">
        <button className="ghost" onClick={back} disabled={i === 0}>Back</button>
        <button className="primary" onClick={next}>{last ? 'Start climbing' : 'Next'}</button>
      </div>
    </main>
  );
}
