import tuning from '../data/tuning.json';
import type { Hook } from '../rules/types';

const bonus = tuning.passives.vengeance.bonus;

/** Losing a piece primes your next capture to count extra toward the objective. */
export const vengeance: Hook = {
  id: 'vengeance', name: 'Vengeance', desc: `After you lose a piece, your next capture counts +${bonus}.`,
  afterMove: (next, { captured, mover, owner }) => {
    if (!captured) return next;
    const primed = next.vengeance ?? [];
    if (captured.side === owner && captured.kind !== 'K') return primed.includes(owner) ? next : { ...next, vengeance: [...primed, owner] };
    if (mover.side === owner && primed.includes(owner)) {
      const rest = primed.filter((s) => s !== owner);
      return { ...next, vengeance: rest, progress: owner === 'player' && (next.objective ?? 'captures') === 'captures' ? next.progress + bonus : next.progress, log: [...next.log, 'Vengeance!'] };
    }
    return next;
  },
};
