import { useEffect, useMemo, useRef, useState } from 'react';
import { chooseMove } from '../ai/greedy';
import { COURTS, PASSIVES, resolveHooks } from '../passives';
import { applyMove } from '../rules/game';
import { legalMoves } from '../rules/moves';
import type { GameState, Move, Sq } from '../rules/types';
import { mulberry32 } from '../run/rng';
import { Board } from './Board';

export function Fight({ initial, title, seed, onEnd }: { initial: GameState; title: string; seed: number; onEnd: (won: boolean) => void }) {
  const [game, setGame] = useState(initial);
  const [sel, setSel] = useState<Sq | null>(null);
  const [started] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const rand = useRef(mulberry32(seed));
  const hooks = useMemo(() => resolveHooks(game), [game.court, game.playerPassives.join(), game.enemyPassives.join()]);
  const moves: Move[] = sel ? legalMoves(game, sel, hooks) : [];

  useEffect(() => {
    if (game.turn !== 'enemy' || game.status !== 'playing') return;
    const t = setTimeout(() => {
      const m = chooseMove(game, hooks, rand.current);
      if (m) setGame(applyMove(game, m, hooks));
    }, 380);
    return () => clearTimeout(t);
  }, [game, hooks]);

  useEffect(() => { if (game.status !== 'playing') setElapsed(Date.now() - started); }, [game.status]);

  function tap(sq: Sq) {
    if (game.turn !== 'player' || game.status !== 'playing') return;
    const m = moves.find((x) => x.to.r === sq.r && x.to.c === sq.c);
    if (m) { setGame(applyMove(game, m, hooks)); setSel(null); return; }
    const p = game.board[sq.r][sq.c];
    setSel(p?.side === 'player' && !(sel && sel.r === sq.r && sel.c === sq.c) ? sq : null);
  }

  const court = game.court ? COURTS[game.court] : null;
  const kingHunt = !isFinite(game.capturesToWin);
  const turnsLeft = game.turnLimit - game.turnNumber;
  return (
    <main className="shell">
      <span className="eyebrow">{title}</span>
      <section className="hud" aria-live="polite">
        <div className="stat"><span className="eyebrow">Objective</span>
          {kingHunt ? <><b>King</b><small>capture it</small></> : <><b>{Math.min(game.progress, game.capturesToWin)}/{game.capturesToWin}</b><small>captures</small></>}</div>
        <div className="stat"><span className="eyebrow">Turns left</span><b className={turnsLeft <= 5 ? 'warn' : ''}>{turnsLeft}</b><small>of {game.turnLimit}</small></div>
        <div className="stat"><span className="eyebrow">To move</span><b>{game.turn === 'player' ? 'You' : 'Enemy'}</b><small>{game.turn === 'enemy' ? 'thinking…' : 'tap a piece'}</small></div>
      </section>
      <div className="rules">
        {court && <span className="chip court-chip">{COURT_ICON[court.id]} {court.name}: {court.desc}</span>}
        {game.playerPassives.map((id) => <span key={id} className="chip">✦ {PASSIVES[id].name}: {PASSIVES[id].desc}</span>)}
        {game.enemyPassives.map((id) => <span key={id} className="chip enemy-chip">☠ Enemy {PASSIVES[id].name}: {PASSIVES[id].desc}</span>)}
      </div>
      <Board game={game} sel={sel} moves={moves} onTap={tap} />
      <p className="legend"><i className="dot move" /> move <i className="dot cap" /> capture <i className="dot tag" /> passive or court</p>
      <ol className="log">{game.log.slice(-4).reverse().map((l, i) => <li key={i}>{l}</li>)}</ol>
      {game.status !== 'playing' && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="card result">
            <span className="eyebrow">{game.status === 'won' ? 'Victory' : 'Defeat'}</span>
            <h2>{game.status === 'won' ? 'Fight won' : 'Run over'}</h2>
            <p>{game.endReason}</p>
            <p className="meta">Fight time {Math.floor(elapsed / 60000)}m {Math.round((elapsed % 60000) / 1000)}s · {game.turnNumber} turns</p>
            <div className="row"><button className="primary" onClick={() => onEnd(game.status === 'won')}>{game.status === 'won' ? 'Claim reward' : 'Continue'}</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

export const COURT_ICON: Record<string, string> = { mud: '⛰', ice: '❄', arena: '◎' };
