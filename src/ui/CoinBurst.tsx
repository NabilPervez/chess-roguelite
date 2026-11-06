import { useMemo } from 'react';
import tuning from '../data/tuning.json';

/** Gold coins fired up from the bottom edge like confetti. Pure CSS; hidden under reduced motion. */
export function CoinBurst() {
  const { coins, durationMs } = tuning.economy.coinBurst;
  const items = useMemo(() => Array.from({ length: coins }, (_, i) => ({
    x: Math.random() * 100, rise: 55 + Math.random() * 40, drift: (Math.random() - .5) * 30,
    spin: 360 + Math.random() * 1080, delay: Math.random() * 400, size: 14 + Math.random() * 14, key: i,
  })), [coins]);
  return (
    <div className="coin-burst" aria-hidden="true">
      {items.map((c) => <i key={c.key} style={{ left: `${c.x}%`, width: c.size, height: c.size, animationDuration: `${durationMs}ms`, animationDelay: `${c.delay}ms`,
        ['--rise' as string]: `-${c.rise}vh`, ['--drift' as string]: `${c.drift}vw`, ['--spin' as string]: `${c.spin}deg` }} />)}
    </div>
  );
}
