import { useState } from 'react';
import tuning from '../data/tuning.json';
import { clampFloor } from '../ai/elo';
import { STYLES, type Settings, type ThemePref } from './settings';

const PREVIEW = 'RNBKPP..pp..knbr'.split('');

export function SettingsPanel({ value, prefersDark, onChange, onClose }: { value: Settings; prefersDark: boolean; onChange: (s: Settings) => void; onClose: () => void }) {
  const F = tuning.ai.elo.floor;
  const [draft, setDraft] = useState(value.eloFloor?.toString() ?? '');
  const commit = (txt: string) => { const f = clampFloor(txt); setDraft(f?.toString() ?? ''); onChange({ ...value, eloFloor: f }); };
  const theme = value.theme === 'system' ? (prefersDark ? 'dark' : 'light') : value.theme;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <section className="card result">
        <span className="eyebrow">Settings</span>
        <h2>Art style</h2>
        <div className="style-grid">
          {STYLES.map((s) => (
            <button key={s.id} className={`style-card${value.style === s.id ? ' on' : ''}`} aria-pressed={value.style === s.id}
              data-style={s.id} data-theme={theme} onClick={() => onChange({ ...value, style: s.id })}>
              <div className="mini" aria-hidden="true">
                {PREVIEW.map((ch, i) => <i key={i} className={`${(Math.floor(i / 4) + i) % 2 ? 'l' : ''}${ch !== '.' && ch === ch.toLowerCase() ? ' e' : ''}`}>{ch === '.' ? '' : '♚♛♜♝♞♟'['kqrbnp'.indexOf(ch.toLowerCase())]}</i>)}
              </div>
              <b>{s.name}</b>
            </button>
          ))}
        </div>
        <h2 style={{ marginTop: 16 }}>Theme</h2>
        <div className="seg" role="radiogroup" aria-label="Theme">
          {(['light', 'dark', 'system'] as ThemePref[]).map((t) => (
            <button key={t} role="radio" aria-checked={value.theme === t} className={value.theme === t ? 'on' : ''} onClick={() => onChange({ ...value, theme: t })}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <h2 style={{ marginTop: 16 }}>Difficulty</h2>
        <div className={`elo-floor${value.beaten ? '' : ' locked'}`} aria-disabled={!value.beaten}>
          <label htmlFor="elo-floor">Your Elo (AI floor)</label>
          <div className="elo-row">
            <input id="elo-floor" type="number" inputMode="numeric" min={F.min} max={F.max} step={F.step} placeholder="Default"
              disabled={!value.beaten} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }} />
            {value.eloFloor !== null && <button className="ghost" disabled={!value.beaten} onClick={() => commit('')}>Reset</button>}
          </div>
          <small>{value.beaten
            ? `Enemies start at this rating (${F.min}–${F.max}) and climb from there, boss included. Leave blank for the default climb.`
            : '🔒 Unlocks after you beat the Iron Regent.'}</small>
        </div>
        <div className="row"><button className="primary" onClick={() => { commit(draft); onClose(); }}>Done</button></div>
      </section>
    </div>
  );
}
