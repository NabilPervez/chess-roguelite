import tuning from '../data/tuning.json';
import type { Hook } from '../rules/types';

/** Captures made by pawns count extra toward the objective. */
export const bounty: Hook = {
  id: 'bounty', name: 'Bounty', desc: `Captures made by pawns count ×${tuning.passives.bounty.pawnCaptureWorth} toward the objective.`,
  objectiveWorth: (capturer, _c, worth) => (capturer.kind === 'P' ? worth * tuning.passives.bounty.pawnCaptureWorth : worth),
};
