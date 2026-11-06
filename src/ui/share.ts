// Ported from Component Library D4 (lift-moar-app/src/lib/share.js).
export const APP_URL = 'https://chess-roguelite.netlify.app/';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** sms: deep link pre-filled with a body; the user still hits send. */
export const smsHref = (text: string) => `sms:${isIos() ? '&' : '?'}body=${encodeURIComponent(text)}`;

/** wa.me deep link; opens WhatsApp (app or web) with the message drafted. */
export const whatsappHref = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export interface RunShare { won: boolean; row: number; rows: number; fightsWon: number; gold: number; passives: string[] }

export function buildRunShareText(r: RunShare): string {
  const head = r.won
    ? `I conquered the Spire in Gambit Spire and checkmated the Iron Regent!`
    : `My king fell on row ${r.row} of ${r.rows} in Gambit Spire.`;
  const lines = [head, `${r.fightsWon} fights won · ◈ ${r.gold} gold`];
  if (r.passives.length) lines.push(`Passives: ${r.passives.join(', ')}`);
  lines.push('', 'Think you can climb higher? Play free:', APP_URL);
  return lines.join('\n');
}
