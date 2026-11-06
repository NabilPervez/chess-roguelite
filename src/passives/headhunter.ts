import tuning from '../data/tuning.json';
import type { Hook } from '../rules/types';

const bonus = tuning.passives.headhunter.bonus;

/** Capturing anything other than a pawn counts extra toward the objective. */
export const headhunter: Hook = {
  id: 'headhunter', name: 'Headhunter', desc: `Capturing a non-pawn counts +${bonus} toward the objective.`,
  objectiveWorth: (_m, captured, worth) => (captured.kind === 'P' ? worth : worth + bonus),
};
