export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_plant',        title: 'Eerste plant',      description: 'Je eerste plant toegevoegd',        emoji: '🌱' },
  { id: 'five_plants',        title: 'Kleine tuin',       description: '5 planten in je tuin',              emoji: '🌿' },
  { id: 'ten_plants',         title: 'Groeiende tuin',    description: '10 planten in je tuin',             emoji: '🏡' },
  { id: 'twenty_five_plants', title: 'Tuinparadijs',      description: '25 planten in je tuin',             emoji: '🌸' },
  { id: 'first_task',         title: 'Eerste taak',       description: 'Je eerste onderhoudstaak afgerond', emoji: '✅' },
  { id: 'ten_tasks',          title: 'Ijverige tuinder',  description: '10 taken voltooid',                 emoji: '💪' },
  { id: 'fifty_tasks',        title: 'Tuinmeester',       description: '50 taken voltooid',                 emoji: '🏆' },
  { id: 'hundred_tasks',      title: 'Grootmeester',      description: '100 taken voltooid',                emoji: '🎖️' },
  { id: 'first_scan',         title: 'Eerste scan',       description: 'Je tuin voor het eerst gescand',   emoji: '📷' },
  { id: 'five_scans',         title: 'Scanexpert',        description: '5 keer gescand',                   emoji: '🔬' },
  { id: 'streak_3',           title: '3-daagse streak',   description: '3 dagen achter elkaar actief',     emoji: '🔥' },
  { id: 'streak_7',           title: 'Weekkampioen',      description: '7 dagen achter elkaar actief',     emoji: '⚡' },
  { id: 'streak_30',          title: 'Maandmeester',      description: '30 dagen achter elkaar actief',    emoji: '💎' },
  { id: 'first_soil',         title: 'Bodemexpert',       description: 'Eerste bodemprofiel aangemaakt',   emoji: '🧪' },
  { id: 'multi_garden',       title: 'Tuinier deluxe',    description: 'Meerdere tuinen aangemaakt',       emoji: '🏘️' },
];
