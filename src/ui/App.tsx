import { useEffect, useRef, useState } from 'react';
import tuning from '../data/tuning.json';
import { COURTS, PASSIVES } from '../passives';
import { newGame } from '../rules/board';
import type { Kind } from '../rules/types';
import type { MapNode } from '../run/map';
import { mulberry32 } from '../run/rng';
import { applyReward, dropPassive, fightOpts, newRun, promotePawn, rollRewards, startingPassiveChoices, type Reward, type RunState } from '../run/run';
import { COURT_ICON, Fight } from './Fight';
import { MapView } from './MapView';

type Screen = { kind: 'start' } | { kind: 'map' } | { kind: 'fight'; node: MapNode } | { kind: 'reward'; offers: Reward[] } | { kind: 'rest' } | { kind: 'end' };
const PIECE: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const PIECE_NAME: Record<string, string> = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };

export function App() {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [screen, setScreen] = useState<Screen>({ kind: 'start' });
  const [run, setRun] = useState<RunState | null>(null);
  const [replacing, setReplacing] = useState<Reward | null>(null);
  const rand = useRef(mulberry32(seed));
  const [choices, setChoices] = useState(() => startingPassiveChoices(mulberry32(seed)));
  useEffect(() => { rand.current = mulberry32(seed); setChoices(startingPassiveChoices(mulberry32(seed))); }, [seed]);

  const army = run && (
    <div className="army" aria-label="Your army">
      {run.army.map((k, i) => <span key={i} title={PIECE_NAME[k]} className="pc player small">{PIECE[k]}</span>)}
      <span className="gold">◈ {run.gold}</span>
    </div>
  );

  if (screen.kind === 'start') return (
    <main className="shell">
      <header className="title"><span className="eyebrow">New run · Act 1</span><h1>Gambit Spire</h1></header>
      <section className="card">
        <span className="eyebrow">Army mode</span>
        <div className="passive-grid">
          <button className="passive on" aria-pressed="true"><strong>Draft</strong><span>Start with a king and 4 pawns. Win pieces as you climb.</span></button>
          <button className="passive" disabled><strong>Set</strong><span>Prebuilt armies — coming in a later sprint.</span></button>
        </div>
      </section>
      <section className="card">
        <span className="eyebrow">Pick a starting passive</span>
        <div className="passive-grid one">
          {choices.map((id) => (
            <button key={id} className="passive" onClick={() => { setRun(newRun(seed, id)); setScreen({ kind: 'map' }); }}>
              <strong>{PASSIVES[id].name}</strong><span>{PASSIVES[id].desc}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );

  if (!run) return null;

  if (screen.kind === 'map') return (
    <main className="shell">
      <header className="title"><span className="eyebrow">Act 1 · choose your path</span><h1>The Spire</h1></header>
      {army}
      <div className="rules">{run.passives.map((id) => <span key={id} className="chip">✦ {PASSIVES[id].name}: {PASSIVES[id].desc}</span>)}</div>
      <p className="legend">{Object.values(COURTS).map((c) => <span key={c.id} title={c.desc}>{COURT_ICON[c.id]} {c.name}</span>)}<span>☾ Rest</span><span>♛ Boss</span></p>
      <MapView run={run} onPick={(n) => {
        setRun({ ...run, at: n.id });
        setScreen(n.type === 'rest' ? { kind: 'rest' } : { kind: 'fight', node: n });
      }} />
    </main>
  );

  if (screen.kind === 'fight') {
    const { court, enemyPassives, opts } = fightOpts(screen.node);
    const initial = newGame(court, run.passives, enemyPassives, { ...opts, playerArmy: run.army });
    return <Fight key={screen.node.id} initial={initial} seed={seed + screen.node.row * 31 + screen.node.col}
      title={screen.node.type === 'boss' ? 'Boss · The Iron Regent (preview)' : `Row ${screen.node.row + 1} · Fight`}
      onEnd={(won) => {
        if (!won) { setRun({ ...run, status: 'lost' }); setScreen({ kind: 'end' }); return; }
        const r = { ...run, fightsWon: run.fightsWon + 1 };
        if (screen.node.type === 'boss') { setRun({ ...r, status: 'won' }); setScreen({ kind: 'end' }); return; }
        setRun(r); setScreen({ kind: 'reward', offers: rollRewards(r, rand.current) });
      }} />;
  }

  if (screen.kind === 'reward') return (
    <main className="shell">
      <header className="title"><span className="eyebrow">Victory</span><h1>Choose a reward</h1></header>
      {army}
      {!replacing ? (
        <div className="passive-grid one">
          {screen.offers.map((o, i) => (
            <button key={i} className="passive" onClick={() => {
              if (o.type === 'passive' && run.passives.length >= tuning.passives.maxActive) { setReplacing(o); return; }
              setRun(applyReward(run, o)); setScreen({ kind: 'map' });
            }}>
              {o.type === 'passive' && <><span className="eyebrow">Passive</span><strong>{PASSIVES[o.id].name}</strong><span>{PASSIVES[o.id].desc}</span></>}
              {o.type === 'piece' && <><span className="eyebrow">Piece</span><strong>{PIECE[o.kind]} {PIECE_NAME[o.kind]}</strong><span>Joins your army ({run.army.length}/{tuning.run.pieceCap}).</span></>}
              {o.type === 'gold' && <><span className="eyebrow">Gold</span><strong>◈ {o.amount}</strong><span>Spend it at shops (coming next sprint).</span></>}
            </button>
          ))}
          <button className="ghost" onClick={() => setScreen({ kind: 'map' })}>Skip</button>
        </div>
      ) : (
        <section className="card">
          <span className="eyebrow">You can hold {tuning.passives.maxActive} passives — replace one</span>
          <div className="passive-grid one">
            {run.passives.map((id) => (
              <button key={id} className="passive" onClick={() => { setRun(applyReward(run, replacing, id)); setReplacing(null); setScreen({ kind: 'map' }); }}>
                <strong>Drop {PASSIVES[id].name}</strong><span>{PASSIVES[id].desc}</span>
              </button>
            ))}
            <button className="ghost" onClick={() => setReplacing(null)}>Back</button>
          </div>
        </section>
      )}
    </main>
  );

  if (screen.kind === 'rest') {
    const hasPawn = run.army.includes('P');
    const done = (r: RunState) => { setRun(r); setScreen({ kind: 'map' }); };
    return (
      <main className="shell">
        <header className="title"><span className="eyebrow">Rest site</span><h1>Catch your breath</h1></header>
        {army}
        <section className="card">
          <span className="eyebrow">Promote a pawn</span>
          <div className="passive-grid">
            {(['N', 'B', 'R'] as Kind[]).map((k) => (
              <button key={k} className="passive" disabled={!hasPawn} onClick={() => done(promotePawn(run, k))}><strong>{PIECE[k]} {PIECE_NAME[k]}</strong></button>
            ))}
          </div>
        </section>
        {run.passives.length > 0 && <section className="card">
          <span className="eyebrow">Or remove a passive</span>
          <div className="passive-grid one">
            {run.passives.map((id) => <button key={id} className="passive" onClick={() => done(dropPassive(run, id))}><strong>Drop {PASSIVES[id].name}</strong></button>)}
          </div>
        </section>}
        <button className="ghost" onClick={() => setScreen({ kind: 'map' })}>Leave</button>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="title"><span className="eyebrow">{run.status === 'won' ? 'Act 1 cleared' : 'Run over'}</span><h1>{run.status === 'won' ? 'You conquered the Spire' : 'Your king has fallen'}</h1></header>
      <section className="card"><p>Fights won: {run.fightsWon} · Army: {run.army.length} pieces · Gold: {run.gold}</p></section>
      <button className="primary" onClick={() => { setRun(null); setSeed(Date.now() % 100000); setScreen({ kind: 'start' }); }}>New run</button>
    </main>
  );
}
