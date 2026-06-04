export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: 'tuin' | 'onderhoud' | 'foto' | 'oogst' | 'scan' | 'special';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_plant',        title: 'Eerste plant',      description: 'Je eerste plant toegevoegd',        emoji: '🌱', category: 'tuin' },
  { id: 'five_plants',        title: 'Kleine tuin',       description: '5 planten in je tuin',              emoji: '🌿', category: 'tuin' },
  { id: 'ten_plants',         title: 'Groeiende tuin',    description: '10 planten in je tuin',             emoji: '🏡', category: 'tuin' },
  { id: 'twenty_five_plants', title: 'Tuinparadijs',      description: '25 planten in je tuin',             emoji: '🌸', category: 'tuin' },
  { id: 'fifty_plants',       title: 'Botanische kaart',  description: '50 planten in je tuinen',           emoji: '🗺️', category: 'tuin' },
  { id: 'first_task',         title: 'Eerste taak',       description: 'Je eerste onderhoudstaak afgerond', emoji: '✅', category: 'onderhoud' },
  { id: 'ten_tasks',          title: 'Ijverige tuinder',  description: '10 taken voltooid',                 emoji: '💪', category: 'onderhoud' },
  { id: 'fifty_tasks',        title: 'Tuinmeester',       description: '50 taken voltooid',                 emoji: '🏆', category: 'onderhoud' },
  { id: 'hundred_tasks',      title: 'Grootmeester',      description: '100 taken voltooid',                emoji: '🎖️', category: 'onderhoud' },
  { id: 'first_water',        title: 'Eerste slok',       description: 'Eerste begiettaak afgerond',        emoji: '💧', category: 'onderhoud' },
  { id: 'twenty_water',       title: 'Regendanser',       description: '20 begietmomenten voltooid',        emoji: '🌧️', category: 'onderhoud' },
  { id: 'first_fertilize',    title: 'Voeding gegeven',   description: 'Eerste bemesting afgerond',         emoji: '🌾', category: 'onderhoud' },
  { id: 'ten_fertilize',      title: 'Bodemchef',         description: '10 bemestingen afgerond',           emoji: '🧑‍🌾', category: 'onderhoud' },
  { id: 'first_prune',        title: 'Scherpe snoei',     description: 'Eerste snoeitaak afgerond',         emoji: '✂️', category: 'onderhoud' },
  { id: 'first_scan',         title: 'Eerste scan',       description: 'Je tuin voor het eerst gescand',    emoji: '📷', category: 'scan' },
  { id: 'five_scans',         title: 'Scanexpert',        description: '5 keer gescand',                    emoji: '🔬', category: 'scan' },
  { id: 'twenty_scans',       title: 'Plantendetective',  description: '20 scans uitgevoerd',               emoji: '🕵️', category: 'scan' },
  { id: 'first_photo',        title: 'Eerste foto',       description: 'Eerste groeifoto toegevoegd',       emoji: '🖼️', category: 'foto' },
  { id: 'ten_photos',         title: 'Groeidagboek',      description: '10 groeifoto’s toegevoegd',         emoji: '📔', category: 'foto' },
  { id: 'twenty_five_photos', title: 'Seizoensfotograaf', description: '25 groeifoto’s toegevoegd',         emoji: '📸', category: 'foto' },
  { id: 'first_harvest',      title: 'Eerste oogst',      description: 'Eerste oogst geregistreerd',        emoji: '🍓', category: 'oogst' },
  { id: 'ten_harvests',       title: 'Oogstmand',         description: '10 oogsten geregistreerd',          emoji: '🧺', category: 'oogst' },
  { id: 'kilo_harvest',       title: 'Een kilo groen',    description: '1 kilo oogst geregistreerd',        emoji: '⚖️', category: 'oogst' },
  { id: 'streak_3',           title: '3-daagse streak',   description: '3 dagen achter elkaar actief',      emoji: '🔥', category: 'special' },
  { id: 'streak_7',           title: 'Weekkampioen',      description: '7 dagen achter elkaar actief',      emoji: '⚡', category: 'special' },
  { id: 'streak_30',          title: 'Maandmeester',      description: '30 dagen achter elkaar actief',     emoji: '💎', category: 'special' },
  { id: 'first_soil',         title: 'Bodemexpert',       description: 'Eerste bodemprofiel aangemaakt',    emoji: '🧪', category: 'special' },
  { id: 'multi_garden',       title: 'Tuinier deluxe',    description: 'Meerdere tuinen aangemaakt',        emoji: '🏘️', category: 'special' },
];
