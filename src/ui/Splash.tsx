import { useEffect } from 'react';

/** Welcome splash. Whole screen is the button; copy says "Tap" on touch/narrow screens, "Click" on desktop. */
export function Splash({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStart(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onStart]);
  return (
    <main className="splash">
      <button className="splash-hit" onClick={onStart} aria-label="Start Gambit Spire">
        <img className="splash-logo" src="/icons/icon.svg" alt="" width={120} height={120} />
        <span className="eyebrow">Chess roguelite</span>
        <h1>Gambit Spire</h1>
        <p className="splash-tag">Draft your army. Climb the spire. Checkmate the Regent.</p>
        <span className="splash-cta">
          <span className="cta-touch">Tap to start</span>
          <span className="cta-mouse">Click to start</span>
        </span>
      </button>
    </main>
  );
}
