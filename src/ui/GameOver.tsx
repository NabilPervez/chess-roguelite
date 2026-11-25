import { useState, type ReactNode } from 'react';
import tuning from '../data/tuning.json';
import { PASSIVES } from '../passives';
import { TILE_INFO } from '../rules/tiles';
import type { TileKind } from '../rules/types';
import { statsOf, topOf, type RunState } from '../run/run';
import { glyph, Panel } from './Panel';
import { buildRunShareText, smsHref, whatsappHref } from './share';

export function GameOver({ run, onNew, onMenu, army, passives, unlock }: { run: RunState; onNew: () => void; onMenu: () => void; army: ReactNode; passives: ReactNode; unlock: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const s = statsOf(run);
  const row = run.at ? Number(run.at.split('-')[0]) + 1 : 1;
  const piece = topOf(s.pieceUse), tile = topOf(s.tileUse);
  const won = run.status === 'won';
  const stats: [string, ReactNode][] = [
    ['Pieces moved', s.moved], ['Row', <>{row}<small>/{tuning.run.rows}</small></>],
    ['Pieces captured', s.captured], ['Fights won', run.fightsWon],
    ['Tiles triggered', s.tiles], ['Times rerolled', s.rerolls],
    ['Passives bought', s.passivesBought], ['Most used piece', piece ? glyph(piece) : '—'],
    ['Pieces bought', s.piecesBought], ['Most used tile', tile ? TILE_INFO[tile as TileKind]?.icon ?? '—' : '—'],
    ['Relics bought', s.relicsBought], ['Pieces lost', s.lost],
  ];
  const copy = async () => { try { await navigator.clipboard.writeText(String(run.seed)); setCopied(true); } catch { /* clipboard blocked */ } };
  const text = `${buildRunShareText({ won, row, rows: tuning.run.rows, fightsWon: run.fightsWon, gold: run.gold, passives: run.passives.map((id) => PASSIVES[id].name) })} Seed ${run.seed}.`;
  return (
    <main className={`stage end ${run.status}`}>
      <Panel title={won ? 'The Spire is yours' : 'Game over'} tone="paper">
        <p className="lede">{won ? 'The Iron Regent is checkmated.' : 'Your king has fallen.'} <span>{won ? 'Try a set run next.' : 'Every run teaches the map.'}</span></p>
        <div className="seed-line"><span className="eyebrow">Seed</span><code>{run.seed}</code>
          <button className="chip-btn" onClick={copy} aria-live="polite">{copied ? 'Copied' : 'Copy'}</button></div>
        <dl className="statgrid">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </Panel>
      {unlock}
      <section className="end-sec"><span className="eyebrow">Final army</span>{army}</section>
      {passives && <section className="end-sec"><span className="eyebrow">Passives</span>{passives}</section>}
      <section className="share" aria-label="Share your run"><span className="eyebrow">Share your run</span>
        <div className="share-row">
          <a className="share-btn" href={smsHref(text)}>Text</a>
          <a className="share-btn wa" href={whatsappHref(text)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </section>
      <div className="twin">
        <button className="big-btn" onClick={onNew}>Start run!</button>
        <button className="big-btn alt" onClick={onMenu}>Main menu</button>
      </div>
    </main>
  );
}
