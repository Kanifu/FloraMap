/**
 * Companion Planting Database
 *
 * Each rule defines two keyword-sets (Dutch + English) and a relation.
 * Matching: a plant "matches" a keyword-set when its commonName or species
 * contains at least one keyword (case-insensitive).
 */

import { Plant } from '@/models';

export type CompanionRelation = 'good' | 'bad';

export interface CompanionRule {
  a: string[];         // keywords for plant A
  b: string[];         // keywords for plant B
  relation: CompanionRelation;
  reason: string;      // Dutch one-liner shown in legend/tooltip
}

export const COMPANION_RULES: CompanionRule[] = [
  // ── Goede combinaties ──────────────────────────────────────────────────────
  {
    a: ['tomaat', 'tomato', 'lycopersicon', 'solanum lyco'],
    b: ['basilicum', 'basil', 'ocimum'],
    relation: 'good',
    reason: 'Basilicum houdt trips en vliegjes bij tomaten weg',
  },
  {
    a: ['tomaat', 'tomato', 'lycopersicon', 'solanum lyco'],
    b: ['wortel', 'carrot', 'daucus'],
    relation: 'good',
    reason: 'Wortels luchten de grond op rondom tomatenrootels',
  },
  {
    a: ['tomaat', 'tomato', 'lycopersicon', 'solanum lyco'],
    b: ['peterselie', 'parsley', 'petroselinum'],
    relation: 'good',
    reason: 'Peterselie trekt zweefvliegen aan die bladluizen eten',
  },
  {
    a: ['komkommer', 'cucumber', 'cucumis sativus'],
    b: ['dille', 'dill', 'anethum'],
    relation: 'good',
    reason: 'Dille trekt nuttige insecten aan en verbetert de smaak',
  },
  {
    a: ['komkommer', 'cucumber', 'cucumis sativus'],
    b: ['boon', 'bean', 'phaseolus', 'sperzieboon', 'stamslaboon'],
    relation: 'good',
    reason: 'Bonen binden stikstof die komkommers goed kunnen gebruiken',
  },
  {
    a: ['sla', 'lettuce', 'lactuca'],
    b: ['radijs', 'radish', 'raphanus'],
    relation: 'good',
    reason: 'Radijs snel gewas, voorkomt bodemverdichting bij sla',
  },
  {
    a: ['prei', 'leek', 'allium porrum'],
    b: ['wortel', 'carrot', 'daucus'],
    relation: 'good',
    reason: 'Prei houdt wortelvlieg weg; wortels houden preimot op afstand',
  },
  {
    a: ['prei', 'leek', 'allium porrum'],
    b: ['selderi', 'selderij', 'celery', 'apium'],
    relation: 'good',
    reason: 'Selderi en prei beschermen elkaar tegen insecten',
  },
  {
    a: ['kool', 'cabbage', 'brassica', 'broccoli', 'bloemkool', 'spruitjes', 'boerenkool'],
    b: ['dille', 'dill', 'anethum'],
    relation: 'good',
    reason: 'Dille trekt sluipwespen aan die koolvlinders bestrijden',
  },
  {
    a: ['kool', 'cabbage', 'brassica', 'broccoli', 'bloemkool'],
    b: ['sla', 'lettuce', 'lactuca'],
    relation: 'good',
    reason: 'Sla als bodembedekker houdt grond vochtig bij kool',
  },
  {
    a: ['aardappel', 'potato', 'solanum tuberosum'],
    b: ['boon', 'bean', 'phaseolus'],
    relation: 'good',
    reason: 'Bonen binden stikstof en beschermen aardappels tegen coloradokever',
  },
  {
    a: ['maïs', 'mais', 'corn', 'zea mays'],
    b: ['pompoen', 'squash', 'pumpkin', 'cucurbita', 'courgette'],
    relation: 'good',
    reason: 'Pompoen als bodembedekker houdt onkruid weg bij maïs',
  },
  {
    a: ['maïs', 'mais', 'corn', 'zea mays'],
    b: ['boon', 'bean', 'phaseolus'],
    relation: 'good',
    reason: 'Bonen klimmen langs maïs op en geven stikstof terug',
  },
  {
    a: ['pompoen', 'squash', 'pumpkin', 'cucurbita', 'courgette'],
    b: ['boon', 'bean', 'phaseolus'],
    relation: 'good',
    reason: 'Klassieke "Three Sisters" combinatie: wederzijds voordeel',
  },
  {
    a: ['roos', 'rose', 'rosa'],
    b: ['knoflook', 'garlic', 'allium sativum'],
    relation: 'good',
    reason: 'Knoflookgeur houdt bladluizen en zwarte vlekkenziekte weg',
  },
  {
    a: ['paprika', 'pepper', 'capsicum'],
    b: ['basilicum', 'basil', 'ocimum'],
    relation: 'good',
    reason: 'Basilicum houdt bladluizen weg en verbetert de smaak',
  },
  {
    a: ['wortel', 'carrot', 'daucus'],
    b: ['ui', 'onion', 'allium cepa', 'sjalot', 'shallot'],
    relation: 'good',
    reason: 'Ui houdt wortelvlieg weg; wortelgeur stoot preimot af',
  },
  {
    a: ['erwt', 'pea', 'pisum'],
    b: ['wortel', 'carrot', 'daucus'],
    relation: 'good',
    reason: 'Erwten geven stikstof; wortels profiteren van lossere grond',
  },
  {
    a: ['spinazie', 'spinach', 'spinacia'],
    b: ['aardbeien', 'strawberry', 'fragaria'],
    relation: 'good',
    reason: 'Spinazie als bodembedekker houdt onkruid bij aardbeien weg',
  },

  // ── Extra goede combinaties ───────────────────────────────────────────────
  {
    a: ['tagetes', 'marigold', 'afrikaantje', 'goudsbloem', 'calendula'],
    b: ['tomaat', 'tomato', 'lycopersicon'],
    relation: 'good',
    reason: 'Tagetes houdt aaltjes en wittevlieg weg bij tomaten',
  },
  {
    a: ['tagetes', 'marigold', 'afrikaantje', 'goudsbloem', 'calendula'],
    b: ['komkommer', 'cucumber', 'cucumis sativus'],
    relation: 'good',
    reason: 'Tagetes trekt nuttige insecten aan en bestrijdt bodemaaltjes',
  },
  {
    a: ['tagetes', 'marigold', 'afrikaantje', 'goudsbloem', 'calendula'],
    b: ['aardappel', 'potato', 'solanum tuberosum'],
    relation: 'good',
    reason: 'Tagetes beschermt aardappels tegen aardappelcystenaaltjes',
  },
  {
    a: ['tijm', 'thyme', 'thymus'],
    b: ['kool', 'cabbage', 'brassica', 'broccoli', 'bloemkool'],
    relation: 'good',
    reason: 'Tijm verspreidt etherische oliën die koolvlieg afschrikken',
  },
  {
    a: ['tijm', 'thyme', 'thymus'],
    b: ['tomaat', 'tomato', 'lycopersicon'],
    relation: 'good',
    reason: 'Tijm houdt luis weg en trekt bestuivers aan voor tomaten',
  },
  {
    a: ['rozemarijn', 'rosemary', 'rosmarinus'],
    b: ['kool', 'cabbage', 'brassica', 'broccoli', 'bloemkool'],
    relation: 'good',
    reason: 'Rozemarijn houdt koolvlieg en rupsen weg bij koolsoorten',
  },
  {
    a: ['rozemarijn', 'rosemary', 'rosmarinus'],
    b: ['boon', 'bean', 'phaseolus'],
    relation: 'good',
    reason: 'Rozemarijn trekt bijen aan en verbetert de groei van bonen',
  },
  {
    a: ['lavendel', 'lavender', 'lavandula'],
    b: ['roos', 'rose', 'rosa'],
    relation: 'good',
    reason: 'Lavendel trekt bestuivers aan en houdt bladluizen bij rozen weg',
  },
  {
    a: ['lavendel', 'lavender', 'lavandula'],
    b: ['tomaat', 'tomato', 'lycopersicon'],
    relation: 'good',
    reason: 'Lavendel houdt wittevlieg weg bij tomaten',
  },
  {
    a: ['aubergine', 'eggplant', 'solanum melongena'],
    b: ['basilicum', 'basil', 'ocimum'],
    relation: 'good',
    reason: 'Basilicum verbetert smaak en houdt trips weg bij aubergine',
  },
  {
    a: ['biet', 'beetroot', 'beta vulgaris', 'rode biet', 'suikerbiet'],
    b: ['sla', 'lettuce', 'lactuca'],
    relation: 'good',
    reason: 'Bieten en sla gebruiken nutriënten op verschillende diepte',
  },
  {
    a: ['biet', 'beetroot', 'beta vulgaris', 'rode biet'],
    b: ['kool', 'cabbage', 'brassica'],
    relation: 'good',
    reason: 'Bieten voegen mineralen toe die kool goed kan gebruiken',
  },
  {
    a: ['nasturtium', 'oost-indische kers', 'tropaeolum'],
    b: ['komkommer', 'cucumber', 'cucumis sativus'],
    relation: 'good',
    reason: 'Oost-Indische kers trekt bladluizen weg van komkommer (lokvogel)',
  },
  {
    a: ['nasturtium', 'oost-indische kers', 'tropaeolum'],
    b: ['tomaat', 'tomato', 'lycopersicon'],
    relation: 'good',
    reason: 'Nasturtium lokt luis weg als lokvogel en trekt zweefvliegen aan',
  },
  {
    a: ['munt', 'mint', 'mentha'],
    b: ['kool', 'cabbage', 'brassica', 'broccoli'],
    relation: 'good',
    reason: 'Munt verspreidt geur die koolvlieg en bladluizen afschrikt',
  },
  {
    a: ['munt', 'mint', 'mentha'],
    b: ['erwt', 'pea', 'pisum'],
    relation: 'good',
    reason: 'Munt houdt bladluizen weg bij erwten',
  },
  {
    a: ['zonnebloem', 'sunflower', 'helianthus'],
    b: ['komkommer', 'cucumber', 'cucumis sativus'],
    relation: 'good',
    reason: 'Zonnebloem geeft schaduw en trekt bestuivers aan voor komkommer',
  },
  {
    a: ['courgette', 'zucchini', 'cucurbita pepo'],
    b: ['boon', 'bean', 'phaseolus'],
    relation: 'good',
    reason: 'Klassieke "Three Sisters" — bonen binden stikstof voor courgette',
  },

  // ── Slechte combinaties ────────────────────────────────────────────────────
  {
    a: ['tomaat', 'tomato', 'lycopersicon', 'solanum lyco'],
    b: ['venkel', 'fennel', 'foeniculum'],
    relation: 'bad',
    reason: 'Venkel remt groei van tomaten door allelopathische stoffen',
  },
  {
    a: ['tomaat', 'tomato', 'lycopersicon', 'solanum lyco'],
    b: ['kool', 'cabbage', 'brassica', 'broccoli', 'bloemkool'],
    relation: 'bad',
    reason: 'Beide zijn gulzige planten en beconcurreren nutriënten',
  },
  {
    a: ['tomaat', 'tomato', 'lycopersicon', 'solanum lyco'],
    b: ['aardappel', 'potato', 'solanum tuberosum'],
    relation: 'bad',
    reason: 'Zelfde Solanum-familie; delen ziektes zoals Phytophthora',
  },
  {
    a: ['komkommer', 'cucumber', 'cucumis sativus'],
    b: ['aardappel', 'potato', 'solanum tuberosum'],
    relation: 'bad',
    reason: 'Aardappels remmen de groei van komkommers',
  },
  {
    a: ['ui', 'onion', 'allium cepa', 'sjalot', 'shallot'],
    b: ['boon', 'bean', 'phaseolus'],
    relation: 'bad',
    reason: 'Ui remt de wortelknolletjes van bonen (stikstofbinding)',
  },
  {
    a: ['ui', 'onion', 'allium cepa', 'sjalot', 'shallot'],
    b: ['erwt', 'pea', 'pisum'],
    relation: 'bad',
    reason: 'Ui remt de groei en stikstofbinding van erwten',
  },
  {
    a: ['knoflook', 'garlic', 'allium sativum'],
    b: ['erwt', 'pea', 'pisum'],
    relation: 'bad',
    reason: 'Knoflook onderdrukt de groei van peulvruchten',
  },
  {
    a: ['knoflook', 'garlic', 'allium sativum'],
    b: ['boon', 'bean', 'phaseolus'],
    relation: 'bad',
    reason: 'Knoflook is allelopathisch voor bonen',
  },
  {
    a: ['venkel', 'fennel', 'foeniculum'],
    b: [
      'tomaat', 'tomato', 'komkommer', 'cucumber', 'sla', 'lettuce',
      'boon', 'bean', 'aardappel', 'potato', 'kool', 'cabbage',
    ],
    relation: 'bad',
    reason: 'Venkel is allelopathisch en remt bijna alle tuinplanten',
  },
  {
    a: ['wortel', 'carrot', 'daucus'],
    b: ['dille', 'dill', 'anethum'],
    relation: 'bad',
    reason: 'Bloeiende dille kruist met wortelen en verslechtert oogst',
  },
  {
    a: ['munt', 'mint', 'mentha'],
    b: ['lavendel', 'lavender', 'lavandula'],
    relation: 'bad',
    reason: 'Munt is invasief en concurreert met lavendel om ruimte en water',
  },
  {
    a: ['aubergine', 'eggplant', 'solanum melongena'],
    b: ['venkel', 'fennel', 'foeniculum'],
    relation: 'bad',
    reason: 'Venkel is allelopathisch en remt de groei van aubergine',
  },
  {
    a: ['biet', 'beetroot', 'beta vulgaris', 'rode biet'],
    b: ['boon', 'bean', 'phaseolus'],
    relation: 'bad',
    reason: 'Bonen en bieten remmen elkaars groei door chemische uitscheiding',
  },
];

// ── Matching & pairing ────────────────────────────────────────────────────────

/** Does a plant's name/species contain any of the given keywords? */
export const plantMatchesKeywords = (plant: Plant, keywords: string[]): boolean => {
  const haystack = `${plant.commonName} ${plant.species}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
};

export interface CompanionPair {
  plantIdA: string;
  plantIdB: string;
  relation: CompanionRelation;
  reason: string;
}

/** Find all companion pairs between all plants in the garden. */
export const findCompanionPairs = (plants: Plant[]): CompanionPair[] => {
  const results: CompanionPair[] = [];

  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      const pA = plants[i];
      const pB = plants[j];

      for (const rule of COMPANION_RULES) {
        const abMatch =
          plantMatchesKeywords(pA, rule.a) && plantMatchesKeywords(pB, rule.b);
        const baMatch =
          plantMatchesKeywords(pA, rule.b) && plantMatchesKeywords(pB, rule.a);

        if (abMatch || baMatch) {
          // Don't duplicate if multiple rules match the same pair + relation
          const alreadyAdded = results.some(
            (r) =>
              r.relation === rule.relation &&
              ((r.plantIdA === pA.id && r.plantIdB === pB.id) ||
                (r.plantIdA === pB.id && r.plantIdB === pA.id)),
          );
          if (!alreadyAdded) {
            results.push({
              plantIdA: pA.id,
              plantIdB: pB.id,
              relation: rule.relation,
              reason: rule.reason,
            });
          }
          break; // First matching rule wins for this pair
        }
      }
    }
  }

  return results;
};
