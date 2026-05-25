/**
 * FloraMap Plantendatabase — Issue #29
 *
 * Een gecureerde lijst van de meest voorkomende moestuin- en tuinplanten
 * voor Nederland/België. Bevat zorg-parameters die direct aansluiten op
 * de MaintenanceTask-logica in GardenAssistantService.
 *
 * waterIntervalDays: hoe vaak begieten (dagen)
 * fertilizeIntervalDays: hoe vaak bemesten (0 = niet opgenomen)
 * harvestMonths: 0-indexed maanden (0=jan, 5=jun)
 * sunRequirement: 'vol' | 'half' | 'schaduw'
 * category: groep voor filtering
 */

export interface PlantEntry {
  id: string;
  commonName: string;         // Nederlandse naam (zoekterm)
  species: string;            // Latijnse naam
  emoji: string;
  category: 'groenten' | 'fruit' | 'kruiden' | 'bloemen' | 'bomen';
  waterIntervalDays: number;
  fertilizeIntervalDays?: number;
  harvestMonths?: number[];
  sunRequirement: 'vol' | 'half' | 'schaduw';
  careTips: string[];
  sow?: string;               // Nederlandse zaaitip
}

export const PLANT_DATABASE: PlantEntry[] = [
  // ── Groenten ──────────────────────────────────────────────────────────────
  {
    id: 'tomaat',
    commonName: 'Tomaat',
    species: 'Solanum lycopersicum',
    emoji: '🍅',
    category: 'groenten',
    waterIntervalDays: 2,
    fertilizeIntervalDays: 14,
    harvestMonths: [6, 7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Geef water aan de grond, niet de bladeren', 'Verwijder gijloten wekelijks', 'Steun met stokjes of draad'],
    sow: 'Februari–maart binnen, uitplanten na 15 mei',
  },
  {
    id: 'komkommer',
    commonName: 'Komkommer',
    species: 'Cucumis sativus',
    emoji: '🥒',
    category: 'groenten',
    waterIntervalDays: 2,
    fertilizeIntervalDays: 14,
    harvestMonths: [6, 7, 8],
    sunRequirement: 'vol',
    careTips: ['Houdt van warmte', 'Geef regelmatig water', 'Oogst vroeg voor nieuwe vruchten'],
    sow: 'April–mei binnen, half mei buiten',
  },
  {
    id: 'courgette',
    commonName: 'Courgette',
    species: 'Cucurbita pepo',
    emoji: '🥬',
    category: 'groenten',
    waterIntervalDays: 3,
    fertilizeIntervalDays: 21,
    harvestMonths: [6, 7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Neemt veel ruimte in', 'Dagelijks controleren op vruchten', 'Waterige bodem vermijden'],
    sow: 'April–mei, direct buitenzaaien na 15 mei',
  },
  {
    id: 'sla',
    commonName: 'Sla',
    species: 'Lactuca sativa',
    emoji: '🥬',
    category: 'groenten',
    waterIntervalDays: 2,
    harvestMonths: [4, 5, 6, 7, 8, 9],
    sunRequirement: 'half',
    careTips: ['Houdt van koele temperaturen', 'Niet in volle zon in zomer', 'Geef regelmatig water'],
    sow: 'Maart–augustus, elke 3 weken voor doorlopende oogst',
  },
  {
    id: 'wortel',
    commonName: 'Wortel',
    species: 'Daucus carota',
    emoji: '🥕',
    category: 'groenten',
    waterIntervalDays: 4,
    harvestMonths: [7, 8, 9, 10],
    sunRequirement: 'vol',
    careTips: ['Zaai direct — verdraagt geen verplanten', 'Losse, diepe grond nodig', 'Dunnen na opkomst'],
    sow: 'Maart–juli, direct buitenzaaien',
  },
  {
    id: 'paprika',
    commonName: 'Paprika',
    species: 'Capsicum annuum',
    emoji: '🫑',
    category: 'groenten',
    waterIntervalDays: 2,
    fertilizeIntervalDays: 14,
    harvestMonths: [7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Houdt van hitte', 'Begin binnen — lange kiemduur', 'Uitplanten na 15 mei'],
    sow: 'Januari–februari binnen',
  },
  {
    id: 'aardappel',
    commonName: 'Aardappel',
    species: 'Solanum tuberosum',
    emoji: '🥔',
    category: 'groenten',
    waterIntervalDays: 5,
    fertilizeIntervalDays: 30,
    harvestMonths: [7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Aanaarden voor meer opbrengst', 'Phytophthora risico bij nat weer', 'Poten op 30 cm afstand'],
    sow: 'Poten van maart–mei',
  },
  {
    id: 'boontje',
    commonName: 'Boon (stamboon)',
    species: 'Phaseolus vulgaris',
    emoji: '🫘',
    category: 'groenten',
    waterIntervalDays: 3,
    harvestMonths: [7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Zaai na 15 mei', 'Stikstofbinder — verbetert de bodem', 'Oogst regelmatig voor nieuwe peulen'],
    sow: 'Mei–juni, direct buitenzaaien',
  },
  {
    id: 'spinazie',
    commonName: 'Spinazie',
    species: 'Spinacia oleracea',
    emoji: '🥬',
    category: 'groenten',
    waterIntervalDays: 2,
    harvestMonths: [4, 5, 6, 9, 10],
    sunRequirement: 'half',
    careTips: ['Bolting bij hitte — zaai vroeg of laat', 'Goede voor koele periodes', 'Oogst buitenste bladeren'],
    sow: 'Maart–april en aug–sept',
  },
  {
    id: 'uien',
    commonName: 'Ui',
    species: 'Allium cepa',
    emoji: '🧅',
    category: 'groenten',
    waterIntervalDays: 7,
    harvestMonths: [7, 8],
    sunRequirement: 'vol',
    careTips: ['Loof weggeklapt = oogstklaar', 'Droog bewaren na oogst', 'Plant sets voor eenvoudig resultaat'],
    sow: 'Sets poten: maart–april',
  },
  {
    id: 'knoflook',
    commonName: 'Knoflook',
    species: 'Allium sativum',
    emoji: '🧄',
    category: 'groenten',
    waterIntervalDays: 10,
    harvestMonths: [6, 7],
    sunRequirement: 'vol',
    careTips: ['Herfst planten voor het beste resultaat', 'Droog bewaren', 'Verwijder bloemstengel (scape)'],
    sow: 'Plantteentjes: oktober–november',
  },
  {
    id: 'broccoli',
    commonName: 'Broccoli',
    species: 'Brassica oleracea var. italica',
    emoji: '🥦',
    category: 'groenten',
    waterIntervalDays: 3,
    fertilizeIntervalDays: 21,
    harvestMonths: [6, 7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Oogst voor de bloem opengaat', 'Zijscheuten geven tweede oogst', 'Let op rupsen (koolwit)'],
    sow: 'April–juni, eerst binnen dan uitplanten',
  },

  // ── Kruiden ───────────────────────────────────────────────────────────────
  {
    id: 'basilicum',
    commonName: 'Basilicum',
    species: 'Ocimum basilicum',
    emoji: '🌿',
    category: 'kruiden',
    waterIntervalDays: 2,
    harvestMonths: [5, 6, 7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Haat koude en tocht', 'Knijp bloemen weg voor meer blad', 'Nooit van bovenaf nat maken'],
    sow: 'April–mei binnen, dan uitplanten na 15 mei',
  },
  {
    id: 'peterselie',
    commonName: 'Peterselie',
    species: 'Petroselinum crispum',
    emoji: '🌿',
    category: 'kruiden',
    waterIntervalDays: 3,
    harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    sunRequirement: 'half',
    careTips: ['Langzame kiemer (3–4 weken)', 'Twee jaar productief', 'Snij aan de buitenkant'],
    sow: 'Maart–juli',
  },
  {
    id: 'munt',
    commonName: 'Munt',
    species: 'Mentha sp.',
    emoji: '🌿',
    category: 'kruiden',
    waterIntervalDays: 3,
    harvestMonths: [4, 5, 6, 7, 8, 9],
    sunRequirement: 'half',
    careTips: ['Invasief — plant liefst in pot', 'Snijden stimuleert groei', 'Kan voor/na zomer worden teruggesnoeid'],
    sow: 'Stekken of plant kopen — zaad is traag',
  },
  {
    id: 'rozemarijn',
    commonName: 'Rozemarijn',
    species: 'Salvia rosmarinus',
    emoji: '🌿',
    category: 'kruiden',
    waterIntervalDays: 7,
    harvestMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    sunRequirement: 'vol',
    careTips: ['Droogtebestendig', 'Goed drainerend', 'Half winterhard — dek af bij vorst'],
    sow: 'Plant kopen of via stek vermeerderen',
  },
  {
    id: 'tijm',
    commonName: 'Tijm',
    species: 'Thymus vulgaris',
    emoji: '🌿',
    category: 'kruiden',
    waterIntervalDays: 7,
    harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    sunRequirement: 'vol',
    careTips: ['Droogtebestendig', 'Snoeien na de bloei', 'Winterhard'],
    sow: 'Zaai: maart–april of koop een plant',
  },
  {
    id: 'bieslook',
    commonName: 'Bieslook',
    species: 'Allium schoenoprasum',
    emoji: '🌿',
    category: 'kruiden',
    waterIntervalDays: 4,
    harvestMonths: [3, 4, 5, 6, 7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Winterhard overblijvend', 'Terug laten groeien na snijden', 'Mooie paarse bloemen eetbaar'],
    sow: 'Zaai: maart–april of verdeel een pot',
  },
  {
    id: 'dille',
    commonName: 'Dille',
    species: 'Anethum graveolens',
    emoji: '🌿',
    category: 'kruiden',
    waterIntervalDays: 3,
    harvestMonths: [5, 6, 7, 8],
    sunRequirement: 'vol',
    careTips: ['Directzaaier — verdraagt geen verplanten', 'Goede buurman voor komkommer', 'Laat zaad staan voor zaadoogst'],
    sow: 'Mei–juli, elke 3 weken opvolgen',
  },

  // ── Fruit ─────────────────────────────────────────────────────────────────
  {
    id: 'aardbei',
    commonName: 'Aardbei',
    species: 'Fragaria × ananassa',
    emoji: '🍓',
    category: 'fruit',
    waterIntervalDays: 2,
    fertilizeIntervalDays: 14,
    harvestMonths: [5, 6, 7],
    sunRequirement: 'vol',
    careTips: ['Tussenplanten stro voor schone vruchten', 'Uitlopers verwijderen of bewortelen', 'Elke 3 jaar vernieuwen'],
    sow: 'Plant augustus–sept voor oogst volgend jaar',
  },
  {
    id: 'framboos',
    commonName: 'Framboos',
    species: 'Rubus idaeus',
    emoji: '🫐',
    category: 'fruit',
    waterIntervalDays: 4,
    fertilizeIntervalDays: 30,
    harvestMonths: [6, 7, 8],
    sunRequirement: 'vol',
    careTips: ['Snij oude scheuten terug na oogst', 'Steun met draad of palen', 'Neemt meerdere jaren om productief te worden'],
    sow: 'Plant: herfst of vroeg voorjaar',
  },
  {
    id: 'courgette-geel',
    commonName: 'Gele Courgette',
    species: 'Cucurbita pepo (geel)',
    emoji: '🌕',
    category: 'groenten',
    waterIntervalDays: 3,
    fertilizeIntervalDays: 21,
    harvestMonths: [6, 7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Zelfde zorg als groene courgette', 'Visueel mooi in combinatie met groen'],
    sow: 'Mei, direct of via pot',
  },

  // ── Bloemen (nuttig in de moestuin) ───────────────────────────────────────
  {
    id: 'goudsbloem',
    commonName: 'Goudsbloem',
    species: 'Calendula officinalis',
    emoji: '🌼',
    category: 'bloemen',
    waterIntervalDays: 4,
    harvestMonths: [5, 6, 7, 8, 9],
    sunRequirement: 'vol',
    careTips: ['Weert luis en vliegjes', 'Goede buurman voor tomaten', 'Zaait zichzelf opnieuw'],
    sow: 'Maart–mei, direct buitenzaaien',
  },
  {
    id: 'afrikaantje',
    commonName: 'Afrikaantje (Tagetes)',
    species: 'Tagetes patula',
    emoji: '🌻',
    category: 'bloemen',
    waterIntervalDays: 3,
    harvestMonths: [6, 7, 8, 9, 10],
    sunRequirement: 'vol',
    careTips: ['Houdt aaltjes weg', 'Goede buurman voor vrijwel alles', 'Snij verwelkte bloemen af'],
    sow: 'April–mei binnen, na 15 mei buiten',
  },
  {
    id: 'lavendel',
    commonName: 'Lavendel',
    species: 'Lavandula angustifolia',
    emoji: '💜',
    category: 'bloemen',
    waterIntervalDays: 10,
    harvestMonths: [6, 7, 8],
    sunRequirement: 'vol',
    careTips: ['Droogtebestendig', 'Trekt bijen en vlinders', 'Snoeien na de bloei — niet in oud hout'],
    sow: 'Plant kopen — zaad is lastig',
  },
  {
    id: 'zonnebloem',
    commonName: 'Zonnebloem',
    species: 'Helianthus annuus',
    emoji: '🌻',
    category: 'bloemen',
    waterIntervalDays: 3,
    harvestMonths: [8, 9],
    sunRequirement: 'vol',
    careTips: ['Zaai direct', 'Groot water geven — diep wortelstelsel', 'Laat zaad staan voor vogels'],
    sow: 'Mei, na 15 mei direct buiten',
  },
];

/**
 * Zoek planten in de database op naam of soort.
 * Returnt max 10 resultaten, gesorteerd op relevantie.
 */
export function searchPlantDatabase(query: string): PlantEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return PLANT_DATABASE
    .filter(
      (p) =>
        p.commonName.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
    .slice(0, 10);
}

export const PLANT_CATEGORIES = [
  { id: 'groenten', label: 'Groenten', emoji: '🥦' },
  { id: 'kruiden',  label: 'Kruiden',  emoji: '🌿' },
  { id: 'fruit',    label: 'Fruit',    emoji: '🍓' },
  { id: 'bloemen',  label: 'Bloemen',  emoji: '🌸' },
] as const;
