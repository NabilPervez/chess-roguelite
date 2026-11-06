import { useEffect, useMemo, useRef, useState } from 'react';
import tuning from '../data/tuning.json';
import { chooseMove, mulberry32 } from '../ai/greedy';
import { COURTS, PASSIVES, resolveHooks } from '../passives';
import { newGame } from '../rules/board';
import { applyMove } from '../rules/game';
import { legalMoves } from '../rules/moves';
import type { GameState, Move, Sq } from '../rules/types';
import { Board } from './Board';

const COURT = 'mud';

export function App() {
  const [picked, setPicked] = useState<string[]>([]);
  const [game, setGame] = useState<GameState | null>(null);
  const [sel, setSel] = useState<Sq | null>(null);
  const [started, setStarted] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const rand = useRef(mulberry32(tuning.ai.seed));
  const hooks = useMemo(() => (game ? resolveHooks(game) : null), [game?.court, game?.playerPassives.join()]);

  const moves: Move[] = game && hooks && sel ? legalMoves(game, sel, hooks) : [];

  // Enemy turn.
  useEffect(() => {
    if (!game || !hooks || game.turn !== 'enemy' || game.status !== 'playing') return;
    const t = setTimeout(() => {
      const m = chooseMove(game, hooks, rand.current);
      if (m) setGame(applyMove(game, m, hooks));
    }, 380);
    return () => clearTimeout(t);
  }, [game, hooks]);

  useEffect(() => {
    if (game && game.status !== 'playing' && !elapsed) setElapsed(Date.now() - started);
  }, [game?.status]);

  function tap(sq: Sq) {
    if (!game || !hooks || game.turn !== 'player' || game.status !== 'playing') return;
    const m = moves.find((x) => x.to.r === sq.r && x.to.c === sq.c);
    if (m) { setGame(applyMove(game, m, hooks)); setSel(null); return; }
    const p = game.board[sq.r][sq.c];
    setSel(p?.side === 'player' && !(sel && sel.r === sq.r && sel.c === sq.c) ? sq : null);
  }

  function start() {
    rand.current = mulberry32(tuning.ai.seed + Date.now() % 1000);
    setGame(newGame(COURT, picked));
    setStarted(Date.now()); setElapsed(0); setSel(null);
  }

  if (!game) {
    const max = tuning.passives.maxActive;
    return (
      <main className="shell">
        <header className="title"><span className="eyebrow">Prototype · Fight 1</span><h1>Gambit Spire</h1></header>
        <section className="card court">
          <span className="eyebrow">Court</span>
          <h2>{COURTS[COURT].name}</h2>
          <p>{COURTS[COURT].desc}</p>
        </section>
        <section className="card">
          <span className="eyebrow">Choose up to {max} passives ({picked.length}/{max})</span>
          <div className="passive-grid">
            {Object.values(PASSIVES).map((p) => {
              const on = picked.includes(p.id);
              return (
                <button key={p.id} className={`passive ${on ? 'on' : ''}`} aria-pressed={on}
                  disabled={!on && picked.length >= max}
                  onClick={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}>
                  <strong>{p.name}</strong><span>{p.desc}</span>
                </button>
              );
            })}
          </div>
        </section>
        <p className="objective-note">Objective: capture {tuning.objective.capturesToWin} pieces within {tuning.objective.turnLimit} turns. Lose your king and the fight is over.</p>
        <button className="primary" onClick={start}>Start fight</button>
      </main>
    );
  }

  const turnsLeft = tuning.objective.turnLimit - game.turnNumber;
  return (
    <main className="shell">
      <section className="hud" aria-live="polite">
        <div className="stat"><span className="eyebrow">Objective</span><b>{Math.min(game.progress, tuning.objective.capturesToWin)}/{tuning.objective.capturesToWin}</b><small>captures</small></div>
        <div className="stat"><span className="eyebrow">Turns left</span><b className={turnsLeft <= 5 ? 'warn' : ''}>{turnsLeft}</b><small>of {tuning.objective.turnLimit}</small></div>
        <div className="stat"><span className="eyebrow">To move</span><b>{game.turn === 'player' ? 'You' : 'Enemy'}</b><small>{game.turn === 'enemy' ? 'thinking…' : 'tap a piece'}</small></div>
      </section>
      <div className="rules">
        <span className="chip court-chip" title={COURTS[COURT].desc}>⛰ {COURTS[COURT].name}: {COURTS[COURT].desc}</span>
        {game.playerPassives.map((id) => <span key={id} className="chip" title={PASSIVES[id].desc}>✦ {PASSIVES[id].name}: {PASSIVES[id].desc}</span>)}
      </div>
      <Board game={game} sel={sel} moves={moves} onTap={tap} />
      <p className="legend"><i className="dot move" /> move <i className="dot cap" /> capture <i className="dot tag" /> passive-powered</p>
      <ol className="log">{game.log.slice(-4).reverse().map((l, i) => <li key={i}>{l}</li>)}</ol>
      {game.status !== 'playing' && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="card result">
            <span className="eyebrow">{game.status === 'won' ? 'Victory' : 'Defeat'}</span>
            <h2>{game.status === 'won' ? 'Fight won' : 'Fight lost'}</h2>
            <p>{game.endReason}</p>
            <p className="meta">Fight time {Math.floor(elapsed / 60000)}m {Math.round((elapsed % 60000) / 1000)}s · {game.turnNumber} turns</p>
            <div className="row">
              <button className="primary" onClick={start}>Fight again</button>
              <button onClick={() => setGame(null)}>Change passives</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
