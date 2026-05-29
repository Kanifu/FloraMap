// Offline moon phase calculation using Julian Day Number arithmetic.
// Accurate to within ±1 day for dates within ±100 years of 2000.

export type MoonPhase =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export type MoonElement = 'fire' | 'water' | 'earth' | 'air';

export interface MoonInfo {
  phase: MoonPhase;
  element: MoonElement;
  illumination: number;  // 0-1
  emoji: string;
  phaseLabel: string;
  elementLabel: string;
  gardening: string;
}

/** Julian Day Number for a given Date */
const toJD = (d: Date): number => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate() + d.getUTCHours() / 24;
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return day
    + Math.floor((153 * mo + 2) / 5)
    + 365 * yr
    + Math.floor(yr / 4)
    - Math.floor(yr / 100)
    + Math.floor(yr / 400)
    - 32045;
};

/** Moon age in days (0 = new moon) */
export const moonAge = (d: Date = new Date()): number => {
  const knownNew = toJD(new Date('2000-01-06T18:14:00Z')); // known new moon
  const SYNODIC = 29.53058867;
  const age = ((toJD(d) - knownNew) % SYNODIC + SYNODIC) % SYNODIC;
  return age;
};

const PHASE_EMOJIS: Record<MoonPhase, string> = {
  new: '🌑',
  waxing_crescent: '🌒',
  first_quarter: '🌓',
  waxing_gibbous: '🌔',
  full: '🌕',
  waning_gibbous: '🌖',
  last_quarter: '🌗',
  waning_crescent: '🌘',
};

const PHASE_LABELS: Record<MoonPhase, string> = {
  new: 'Nieuwe maan',
  waxing_crescent: 'Wassende sikkel',
  first_quarter: 'Eerste kwartier',
  waxing_gibbous: 'Wassende maan',
  full: 'Volle maan',
  waning_gibbous: 'Afnemende maan',
  last_quarter: 'Laatste kwartier',
  waning_crescent: 'Afnemende sikkel',
};

// Biodynamic element cycle repeats every ~27 days (sidereal month), approximated here
// by using 4 equal segments of the synodic cycle for simplicity.
const ELEMENT_LABELS: Record<MoonElement, string> = {
  fire: '🔥 Vrucht/zaad (tomaat, paprika, mais)',
  water: '💧 Blad (sla, kool, kruiden)',
  earth: '🌍 Wortel/knol (wortel, aardappel, ui)',
  air: '🌬️ Bloem/zaad (bloemen, peulvruchten)',
};

const GARDENING_TIPS: Record<MoonPhase, string> = {
  new: 'Goede dag voor bodembewerking en composteren.',
  waxing_crescent: 'Begin met zaaien van snelgroeiende gewassen.',
  first_quarter: 'Zaai bovengrondse groenten en bloemen.',
  waxing_gibbous: 'Ideaal voor enten, snoeien en oogsten van fruit.',
  full: 'Beste dag om te zaaien — maximale kiemkracht.',
  waning_gibbous: 'Goed voor oogsten van wortelgroenten en bewaren.',
  last_quarter: 'Snoeien en verwijderen van zieke planten.',
  waning_crescent: 'Rust voor de tuin, voorbereiden voor nieuwe cyclus.',
};

export const getMoonInfo = (d: Date = new Date()): MoonInfo => {
  const age = moonAge(d);
  const SYNODIC = 29.53058867;
  const illumination = age < SYNODIC / 2
    ? age / (SYNODIC / 2)
    : (SYNODIC - age) / (SYNODIC / 2);

  let phase: MoonPhase;
  const pct = age / SYNODIC;
  if (pct < 0.02 || pct >= 0.98) phase = 'new';
  else if (pct < 0.23) phase = 'waxing_crescent';
  else if (pct < 0.27) phase = 'first_quarter';
  else if (pct < 0.48) phase = 'waxing_gibbous';
  else if (pct < 0.52) phase = 'full';
  else if (pct < 0.73) phase = 'waning_gibbous';
  else if (pct < 0.77) phase = 'last_quarter';
  else phase = 'waning_crescent';

  // Element: rotate through 4 elements each ~7 days
  const elements: MoonElement[] = ['fire', 'water', 'earth', 'air'];
  const element = elements[Math.floor((age / SYNODIC) * 4) % 4];

  return {
    phase,
    element,
    illumination,
    emoji: PHASE_EMOJIS[phase],
    phaseLabel: PHASE_LABELS[phase],
    elementLabel: ELEMENT_LABELS[element],
    gardening: GARDENING_TIPS[phase],
  };
};
