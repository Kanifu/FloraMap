import React, { useRef } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect, Path, Line } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType, GardenBoundary, BoundaryType } from '@/models';
import { CompanionPair } from '@/data/companionPlanting';

export const CELL_CM  = 30;
export const SCALE    = 30;
export const GRID_COLS = 36;
export const GRID_ROWS = 36;
export const MAP_WIDTH  = GRID_COLS * SCALE;   // = 1080
export const MAP_HEIGHT = GRID_ROWS * SCALE;   // = 1080

// ── Plant emoji lookup — 100+ soorten ────────────────────────────────────────

const EMOJI_MAP: [string[], string][] = [
  // ── Groenten ──────────────────────────────────────────────────────────────
  [['tomaat', 'tomato', 'lycopersicon', 'cherrytomaatje'],         '🍅'],
  [['komkommer', 'cucumber', 'cucumis sativus'],                   '🥒'],
  [['aubergine', 'eggplant', 'solanum melongena'],                 '🍆'],
  [['wortel', 'carrot', 'daucus', 'pastinaak', 'parsnip'],        '🥕'],
  [['aardappel', 'potato', 'solanum tuberosum'],                   '🥔'],
  [['zoete aardappel', 'sweet potato', 'ipomoea batatas', 'yam'], '🍠'],
  [['ui', 'onion', 'allium cepa', 'sjalot', 'shallot'],           '🧅'],
  [['prei', 'leek', 'allium ampeloprasum'],                       '🧅'],
  [['knoflook', 'garlic', 'allium sativum'],                      '🧄'],
  [['paprika', 'sweet pepper', 'capsicum annuum'],                 '🫑'],
  [['chili', 'chilipeper', 'hot pepper', 'jalapeño', 'capsicum frutescens'], '🌶️'],
  [['maïs', 'mais', 'corn', 'zea mays'],                          '🌽'],
  [['boon', 'bean', 'phaseolus', 'tuinboon', 'broad bean', 'sperzieboon'], '🫘'],
  [['erwt', 'pea', 'pisum', 'sugarsnap', 'peul'],                 '🫛'],
  [['broccoli'],                                                   '🥦'],
  [['bloemkool', 'cauliflower', 'brassica oleracea botrytis'],     '🥦'],
  [['spruitjes', 'brussels sprout', 'brassica oleracea gemmifera'],'🥦'],
  [['kool', 'cabbage', 'brassica oleracea capitata', 'rode kool', 'savooie'], '🥬'],
  [['koolraap', 'kohlrabi', 'brassica oleracea gongylodes'],       '🥬'],
  [['sla', 'lettuce', 'lactuca sativa'],                          '🥬'],
  [['spinazie', 'spinach', 'spinacia oleracea'],                  '🥬'],
  [['boerenkool', 'kale', 'brassica oleracea acephala'],          '🥬'],
  [['paksoi', 'bok choy', 'chinese kool', 'brassica rapa chinensis'], '🥬'],
  [['snijbiet', 'chard', 'beta vulgaris cicla', 'mangold'],       '🥬'],
  [['rucola', 'arugula', 'eruca sativa', 'raketsla'],             '🥬'],
  [['veldsla', 'mâche', 'corn salad', 'valerianella'],            '🥬'],
  [['andijvie', 'endive', 'cichorium endivia'],                   '🥬'],
  [['postelein', 'purslane', 'portulaca oleracea'],               '🥬'],
  [['waterkers', 'watercress', 'nasturtium officinale'],          '🥬'],
  [['radijs', 'radish', 'raphanus sativus'],                      '🌸'],
  [['rettich', 'daikon', 'raphanus sativus longipinnatus'],       '🌸'],
  [['biet', 'beetroot', 'beta vulgaris', 'rode biet'],            '🍠'],
  [['knolselderij', 'celeriac', 'apium graveolens rapaceum'],     '🥕'],
  [['selderij', 'celery', 'apium graveolens'],                    '🌿'],
  [['venkel', 'fennel', 'foeniculum vulgare'],                    '🌿'],
  [['pompoen', 'pumpkin', 'cucurbita maxima'],                    '🎃'],
  [['courgette', 'zucchini', 'cucurbita pepo'],                   '🥒'],
  [['rabarber', 'rhubarb', 'rheum rhabarbarum'],                  '🌱'],
  [['asperge', 'asparagus', 'asparagus officinalis'],             '🌿'],
  [['artisjok', 'artichoke', 'cynara scolymus'],                  '🌸'],
  [['schorseneer', 'salsify', 'scorzonera hispanica'],            '🥕'],
  // ── Kruiden ───────────────────────────────────────────────────────────────
  [['basilicum', 'basil', 'ocimum basilicum'],                    '🌿'],
  [['munt', 'mint', 'mentha'],                                    '🌿'],
  [['rozemarijn', 'rosemary', 'salvia rosmarinus'],               '🌿'],
  [['tijm', 'thyme', 'thymus vulgaris'],                          '🌿'],
  [['peterselie', 'parsley', 'petroselinum crispum'],             '🌿'],
  [['bieslook', 'chives', 'allium schoenoprasum'],                '🌿'],
  [['dille', 'dill', 'anethum graveolens'],                      '🌿'],
  [['koriander', 'cilantro', 'coriandrum sativum'],              '🌿'],
  [['oregano', 'marjolein', 'origanum vulgare'],                  '🌿'],
  [['salie', 'sage', 'salvia officinalis'],                       '🌿'],
  [['lavendel', 'lavender', 'lavandula'],                         '🪻'],
  [['citroenmelisse', 'lemon balm', 'melissa officinalis'],      '🌿'],
  [['dragon', 'tarragon', 'artemisia dracunculus'],               '🌿'],
  [['bonenkruid', 'savory', 'satureja'],                         '🌿'],
  [['kervel', 'chervil', 'anthriscus cerefolium'],               '🌿'],
  [['stevia'],                                                    '🌿'],
  // ── Fruit ─────────────────────────────────────────────────────────────────
  [['aardbeien', 'aardbei', 'strawberry', 'fragaria'],           '🍓'],
  [['framboos', 'raspberry', 'rubus idaeus'],                    '🍓'],
  [['bramen', 'blackberry', 'rubus fruticosus'],                 '🫐'],
  [['blauwe bes', 'bosbes', 'blueberry', 'vaccinium'],           '🫐'],
  [['zwarte bes', 'blackcurrant', 'ribes nigrum'],               '🫐'],
  [['kruisbes', 'gooseberry', 'ribes uva-crispa'],               '🍇'],
  [['rode bes', 'redcurrant', 'ribes rubrum'],                   '🍒'],
  [['kers', 'cherry', 'prunus cerasus', 'prunus avium'],         '🍒'],
  [['appel', 'apple', 'malus domestica'],                        '🍎'],
  [['peer', 'pear', 'pyrus communis'],                           '🍐'],
  [['pruim', 'plum', 'prunus domestica'],                        '🍑'],
  [['perzik', 'peach', 'prunus persica'],                        '🍑'],
  [['abrikoos', 'apricot', 'prunus armeniaca'],                  '🍑'],
  [['nectarine', 'prunus persica nucipersica'],                  '🍑'],
  [['druif', 'grape', 'vitis vinifera'],                         '🍇'],
  [['vijg', 'fig', 'ficus carica'],                              '🍇'],
  [['citroen', 'lemon', 'citrus limon'],                         '🍋'],
  [['limoen', 'lime', 'citrus aurantiifolia'],                   '🍋'],
  [['sinaasappel', 'orange', 'citrus sinensis', 'mandarijn', 'mandarin'], '🍊'],
  [['mango', 'mangifera indica'],                                '🥭'],
  [['banaan', 'banana', 'musa'],                                 '🍌'],
  // ── Bloemen ───────────────────────────────────────────────────────────────
  [['roos', 'rose', 'rosa'],                                     '🌹'],
  [['tulp', 'tulip', 'tulipa'],                                  '🌷'],
  [['zonnebloem', 'sunflower', 'helianthus annuus'],             '🌻'],
  [['dahlia'],                                                    '🌸'],
  [['chrysant', 'chrysanthemum'],                                '🌼'],
  [['narcis', 'daffodil', 'narcissus'],                          '🌼'],
  [['kamille', 'chamomile', 'matricaria'],                       '🌼'],
  [['madelief', 'daisy', 'bellis perennis'],                     '🌼'],
  [['afrikaantje', 'marigold', 'tagetes'],                       '🌼'],
  [['gerbera'],                                                  '🌼'],
  [['hyacint', 'hyacinth', 'hyacinthus'],                        '🪻'],
  [['seringen', 'lilac', 'syringa'],                             '🪻'],
  [['lupine', 'lupinus'],                                        '🪻'],
  [['viooltje', 'pansy', 'viola'],                               '🌸'],
  [['hortensia', 'hydrangea'],                                   '🌸'],
  [['rododendron', 'rhododendron'],                              '🌸'],
  [['magnolia'],                                                 '🌸'],
  [['geranium', 'pelargonium'],                                  '🌸'],
  [['petunia'],                                                  '🌸'],
  [['begonia'],                                                  '🌸'],
  [['zinnia'],                                                   '🌸'],
  [['cosmo', 'cosmos'],                                          '🌸'],
  [['krokus', 'crocus'],                                         '🌸'],
  [['gladiool', 'gladiolus'],                                    '🌸'],
  [['pioenroos', 'peony', 'paeonia'],                            '🌸'],
  [['forsythia'],                                                '🌼'],
  // ── Gras & bodembedekkers ─────────────────────────────────────────────────
  [['gras', 'gazon', 'lawn', 'grass', 'lolium', 'poa'],         '🌾'],
  [['klaver', 'clover', 'trifolium'],                            '🍀'],
  [['varen', 'fern', 'pteridophyta'],                            '🌿'],
  // ── Struiken & hagen ──────────────────────────────────────────────────────
  [['buxus', 'boxwood', 'buxus sempervirens'],                   '🌿'],
  [['liguster', 'privet', 'ligustrum'],                          '🌿'],
  [['haag', 'hedge', 'haagbeuk', 'carpinus betulus'],            '🌿'],
  [['hulst', 'holly', 'ilex'],                                   '🌲'],
  [['taxus', 'yew', 'taxus baccata'],                            '🌲'],
  [['vlier', 'elder', 'sambucus'],                               '🌳'],
  [['bamboe', 'bamboo', 'bambusoideae'],                         '🎋'],
  [['struik', 'shrub', 'bush'],                                  '🌿'],
  // ── Bomen ─────────────────────────────────────────────────────────────────
  [['eik', 'oak', 'quercus'],                                    '🌳'],
  [['beuk', 'beech', 'fagus'],                                   '🌳'],
  [['berk', 'birch', 'betula'],                                  '🌳'],
  [['linde', 'linden', 'tilia'],                                 '🌳'],
  [['kastanje', 'chestnut', 'castanea'],                         '🌰'],
  [['walnoot', 'walnut', 'juglans'],                             '🌰'],
  [['hazelaar', 'hazel', 'corylus'],                             '🌰'],
  [['den', 'pine', 'pinus'],                                     '🌲'],
  [['spar', 'spruce', 'picea'],                                  '🌲'],
  [['thuja', 'levensboom'],                                      '🌲'],
  [['boom', 'tree', 'fruitboom'],                                '🌳'],
  // ── Graan & overig ────────────────────────────────────────────────────────
  [['tarwe', 'wheat', 'triticum'],                               '🌾'],
  [['gerst', 'barley', 'hordeum'],                               '🌾'],
  [['graan', 'grain', 'cereal'],                                 '🌾'],
  [['zonnekruid', 'sunflower', 'helios'],                        '🌻'],
];

const getPlantEmoji = (name: string, species: string): string => {
  const hay = `${name} ${species}`.toLowerCase();
  for (const [keys, emoji] of EMOJI_MAP) {
    if (keys.some((k) => hay.includes(k))) return emoji;
  }
  return '🌱';
};

// ── Plant category color — soft background circle on dark soil ────────────────
// Colors are semi-transparent so soil shows through a little
const getPlantBgColor = (name: string, family?: string): string => {
  const hay = `${name} ${family ?? ''}`.toLowerCase();
  // Fruit (red/pink)
  if (/tomaat|aardbei|framboos|braam|rode bes|kers|appel|pruim|peer|druif|watermeloen|meloen/.test(hay)) return 'rgba(220,50,50,0.55)';
  // Root veg (orange/amber)
  if (/wortel|pastinaak|biet|knolselderij|radijs|schorseneer|koolraap|prei|ui|sjalot|knoflook/.test(hay)) return 'rgba(230,120,20,0.55)';
  // Fruit veg (yellow/gold)
  if (/komkommer|courgette|pompoen|augurk|mais|paprika|peper/.test(hay)) return 'rgba(210,160,0,0.55)';
  // Legumes (purple/violet)
  if (/erwt|boon|tuinboon|pronkboon|snijboon/.test(hay)) return 'rgba(130,70,180,0.55)';
  // Leafy greens (medium green)
  if (/sla|spinazie|snijbiet|mangold|boerenkool|kool|rucola|veldsla|andijvie|witlof|pak choi/.test(hay)) return 'rgba(50,150,70,0.55)';
  // Herbs (teal/mint)
  if (/basilicum|munt|dille|koriander|peterselie|bieslook|tijm|rozemarijn|salie|oregano|lavas|dragon|kervel|bonenkruid/.test(hay)) return 'rgba(30,160,140,0.55)';
  // Flowers (pink/rose)
  if (/zonnebloem|goudsbloem|nasturtium|lavendel|dahlia|roos|cosmea|afrikaantje|phacelia|borage/.test(hay)) return 'rgba(200,80,150,0.55)';
  // Brassica (blue-green)
  if (/broccoli|bloemkool|spruitjes|kool|brassica/.test(hay) || /brassicaceae/.test(hay)) return 'rgba(60,130,110,0.55)';
  // Default — earthy green
  return 'rgba(80,140,80,0.50)';
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

const POLYGON_COLORS: Record<GardenPolygonType, string> = {
  border: '#6b705c', lawn: '#52b788', patio: '#adb5bd', path: '#ced4da', bed: '#8b5e3c',
};

const toSvgPoints = (p: GardenPolygon) =>
  p.points.map((pt) => `${pt.x * SCALE},${pt.y * SCALE}`).join(' ');

/** Top-left pixel of a zone rect (1-indexed grid coords) */
const rx = (col: number) => (col - 0.5) * SCALE;
const ry = (row: number) => (row - 0.5) * SCALE;

/** Centre pixel of a plant (single cell or multi-cell zone) */
const plantCx = (plant: Plant): number => {
  const w = plant.width ?? 1;
  return w > 1 ? rx(plant.x) + (w * SCALE) / 2 : plant.x * SCALE;
};
const plantCy = (plant: Plant): number => {
  const h = plant.height ?? 1;
  return h > 1 ? ry(plant.y) + (h * SCALE) / 2 : plant.y * SCALE;
};

/** Quadratic bezier arc with a gentle perpendicular bend */
const arcPath = (x1: number, y1: number, x2: number, y2: number): string => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const bend = Math.min(len * 0.2, 30);
  const cpx = mx - (dy / len) * bend;
  const cpy = my + (dx / len) * bend;
  return `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
};

// ── Boundary config ───────────────────────────────────────────────────────────

const BOUNDARY_CONFIG: Record<BoundaryType, { fill: string; stroke: string; emoji: string; isLine: boolean }> = {
  fence:  { fill: 'none',      stroke: '#795548', emoji: '🪵', isLine: true  },
  wall:   { fill: 'none',      stroke: '#757575', emoji: '🧱', isLine: true  },
  hedge:  { fill: '#388e3c',   stroke: '#2e7d32', emoji: '🌿', isLine: false },
  forest: { fill: '#2e7d32',   stroke: '#1b5e20', emoji: '🌳', isLine: false },
  lawn:   { fill: '#66bb6a',   stroke: '#43a047', emoji: '🌾', isLine: false },
  patio:  { fill: '#bdbdbd',   stroke: '#9e9e9e', emoji: '🪨', isLine: false },
  pond:   { fill: '#42a5f5',   stroke: '#1565c0', emoji: '💧', isLine: false },
  path:   { fill: '#bcaaa4',   stroke: '#8d6e63', emoji: '🪨', isLine: false },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface GardenMapProps {
  garden: Garden;
  onPlantPress: (plant: Plant) => void;
  onPlantLongPress?: (plant: Plant) => void;
  viewMode: '2d' | 'isometric';
  isInteractive?: boolean;
  highlightPoint?: { x: number; y: number } | null;
  movingPlantId?: string | null;
  onMapPress?: (gridX: number, gridY: number) => void;
  companionPairs?: CompanionPair[];
  showCompanionOverlay?: boolean;
  plantStatuses?: Record<string, 'overdue' | 'soon' | 'done_today' | 'water' | 'ok'>;
  boundaries?: GardenBoundary[];
  showNames?: boolean;           // default true
  onBoundaryPress?: (boundaryId: string) => void;
  renderScale?: number;
}

const LONG_PRESS_MS = 300;
const EMOJI_STEP    = 28;   // px between emoji centres in zone grid

export const GardenMap = ({
  garden,
  onPlantPress,
  onPlantLongPress,
  isInteractive = false,
  highlightPoint,
  movingPlantId,
  onMapPress,
  companionPairs = [],
  showCompanionOverlay = false,
  plantStatuses,
  boundaries = [],
  showNames = true,
  onBoundaryPress,
  renderScale = 1,
}: GardenMapProps): React.JSX.Element => {

  const statusMap = plantStatuses ?? {};

  // ── Fast long-press via manual timer ────────────────────────────────────────
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lpFired = useRef(false);

  const startLP = (cb: () => void) => {
    lpFired.current = false;
    lpTimer.current = setTimeout(() => { lpFired.current = true; cb(); }, LONG_PRESS_MS);
  };
  const cancelLP = () => {
    if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; }
  };
  const handlePlantTap = (plant: Plant) => {
    cancelLP();
    if (!lpFired.current && !isInteractive) onPlantPress(plant);
    lpFired.current = false;
  };

  // ── Background tap (place/move mode) ────────────────────────────────────────
  // locationX/Y is in Pressable screen-pixels; divide by renderScale to get viewBox pixels
  const handleBgTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!onMapPress) return;
    const vx = e.nativeEvent.locationX / renderScale;
    const vy = e.nativeEvent.locationY / renderScale;
    const gridX = Math.max(1, Math.min(Math.round(vx / SCALE), GRID_COLS));
    const gridY = Math.max(1, Math.min(Math.round(vy / SCALE), GRID_ROWS));
    onMapPress(gridX, gridY);
  };

  return (
    <Pressable onPress={isInteractive ? handleBgTap : undefined}
      style={{ width: MAP_WIDTH * renderScale, height: MAP_HEIGHT * renderScale }}>
      <Svg width={MAP_WIDTH * renderScale} height={MAP_HEIGHT * renderScale}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>

        {/* Background — dark moestuin soil */}
        <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#1c1108" />

        {/* Grid lines — subtle light on dark soil */}
        {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
          <Rect key={`v${i}`} x={i * SCALE} y={0} width={0.5} height={MAP_HEIGHT}
            fill="#ffffff" opacity={isInteractive ? 0.18 : 0.08} />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
          <Rect key={`h${i}`} x={0} y={i * SCALE} width={MAP_WIDTH} height={0.5}
            fill="#ffffff" opacity={isInteractive ? 0.18 : 0.08} />
        ))}

        {/* Garden polygons */}
        {garden.polygons.map((polygon) => (
          <Polygon key={polygon.id} points={toSvgPoints(polygon)} fill={POLYGON_COLORS[polygon.type]} />
        ))}

        {/* ── Boundaries ────────────────────────────────────────────────────── */}
        {boundaries.map((b) => {
          const cfg = BOUNDARY_CONFIG[b.type];

          if (cfg.isLine) {
            const lx1 = (b.x1 ?? 0) * SCALE;
            const ly1 = (b.y1 ?? 0) * SCALE;
            const lx2 = (b.x2 ?? 0) * SCALE;
            const ly2 = (b.y2 ?? 0) * SCALE;
            const dx = lx2 - lx1;
            const dy = ly2 - ly1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            // perpendicular unit vector
            const px = -dy / len;
            const py = dx / len;
            const tickSpacing = 18;
            const numTicks = Math.floor(len / tickSpacing);
            const tickLen = b.type === 'fence' ? 8 : 5;
            const ticks = Array.from({ length: numTicks + 1 }, (_, i) => {
              const t = i / Math.max(1, numTicks);
              const tx = lx1 + dx * t;
              const ty = ly1 + dy * t;
              return { tx, ty };
            });

            return (
              <G key={b.id}>
                {/* Main line */}
                <Line x1={lx1} y1={ly1} x2={lx2} y2={ly2}
                  stroke={cfg.stroke} strokeWidth={b.type === 'wall' ? 8 : 5}
                  strokeLinecap="round" opacity={0.9} />
                {/* Fence posts / wall joints */}
                {b.type === 'fence' && ticks.map(({ tx, ty }, i) => (
                  <Line key={i}
                    x1={tx + px * tickLen} y1={ty + py * tickLen}
                    x2={tx - px * tickLen} y2={ty - py * tickLen}
                    stroke={cfg.stroke} strokeWidth={3}
                    strokeLinecap="round" opacity={0.85} />
                ))}
                {b.type === 'wall' && ticks.map(({ tx, ty }, i) => (
                  <Rect key={i}
                    x={tx - 4} y={ty - 4} width={8} height={8}
                    fill={cfg.stroke} opacity={0.6} />
                ))}
                {/* Transparent touch target for line boundary */}
                <Line
                  x1={lx1} y1={ly1} x2={lx2} y2={ly2}
                  stroke="transparent" strokeWidth={24}
                  strokeLinecap="round"
                  onPress={() => onBoundaryPress?.(b.id)}
                />
              </G>
            );
          }

          // Area boundaries — solid fills with distinctive patterns
          const bLeft = (b.x ?? 0) * SCALE;
          const bTop  = (b.y ?? 0) * SCALE;
          const bW    = (b.width  ?? 1) * SCALE;
          const bH    = (b.height ?? 1) * SCALE;

          if (b.type === 'lawn' || b.type === 'forest') {
            return (
              <G key={b.id}>
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill={cfg.fill} stroke={cfg.stroke}
                  strokeWidth={1.5} opacity={0.55} rx={4} />
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill="transparent" onPress={() => onBoundaryPress?.(b.id)} />
              </G>
            );
          }

          if (b.type === 'hedge') {
            const bumpSpacing = 16;
            const numBumps = Math.floor(bW / bumpSpacing);
            return (
              <G key={b.id}>
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill={cfg.fill} stroke={cfg.stroke}
                  strokeWidth={1.5} opacity={0.6} rx={6} />
                {Array.from({ length: numBumps }, (_, i) => (
                  <Circle key={i}
                    cx={bLeft + i * bumpSpacing + bumpSpacing / 2}
                    cy={bTop + 4}
                    r={bumpSpacing / 2 - 1}
                    fill={cfg.stroke} opacity={0.4} />
                ))}
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill="transparent" onPress={() => onBoundaryPress?.(b.id)} />
              </G>
            );
          }

          if (b.type === 'patio') {
            const tileSize = 20;
            const vLines = Math.floor(bW / tileSize) - 1;
            const hLines = Math.floor(bH / tileSize) - 1;
            return (
              <G key={b.id}>
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill={cfg.fill} stroke={cfg.stroke}
                  strokeWidth={1.5} opacity={0.55} rx={4} />
                {Array.from({ length: vLines }, (_, i) => (
                  <Line key={`v${i}`}
                    x1={bLeft + (i + 1) * tileSize} y1={bTop}
                    x2={bLeft + (i + 1) * tileSize} y2={bTop + bH}
                    stroke={cfg.stroke} strokeWidth={0.8} opacity={0.4} />
                ))}
                {Array.from({ length: hLines }, (_, i) => (
                  <Line key={`h${i}`}
                    x1={bLeft} y1={bTop + (i + 1) * tileSize}
                    x2={bLeft + bW} y2={bTop + (i + 1) * tileSize}
                    stroke={cfg.stroke} strokeWidth={0.8} opacity={0.4} />
                ))}
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill="transparent" onPress={() => onBoundaryPress?.(b.id)} />
              </G>
            );
          }

          if (b.type === 'path') {
            const cW = 22; const cH = 14; const gap = 3;
            const cols = Math.floor(bW / (cW + gap));
            const rows = Math.floor(bH / (cH + gap));
            const offX = (bW - cols * (cW + gap)) / 2;
            const offY = (bH - rows * (cH + gap)) / 2;
            return (
              <G key={b.id}>
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill={cfg.fill} stroke={cfg.stroke}
                  strokeWidth={1.5} opacity={0.55} rx={4} />
                {Array.from({ length: rows * cols }, (_, i) => {
                  const row = Math.floor(i / cols);
                  const col = i % cols;
                  const rowOffset = row % 2 === 0 ? 0 : (cW + gap) / 2;
                  return (
                    <Rect key={i}
                      x={bLeft + offX + col * (cW + gap) + rowOffset}
                      y={bTop  + offY + row * (cH + gap)}
                      width={cW} height={cH}
                      fill="none" stroke={cfg.stroke}
                      strokeWidth={0.8} opacity={0.4} rx={2} />
                  );
                })}
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill="transparent" onPress={() => onBoundaryPress?.(b.id)} />
              </G>
            );
          }

          if (b.type === 'pond') {
            const numWaves = Math.floor(bH / 14);
            return (
              <G key={b.id}>
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill={cfg.fill} stroke={cfg.stroke}
                  strokeWidth={1.5} opacity={0.55} rx={bH / 2} />
                {Array.from({ length: numWaves }, (_, i) => {
                  const wy = bTop + (i + 1) * 14;
                  if (wy > bTop + bH - 8) return null;
                  return (
                    <Path key={i}
                      d={`M ${bLeft + 6} ${wy} Q ${bLeft + bW * 0.25} ${wy - 5} ${bLeft + bW * 0.5} ${wy} Q ${bLeft + bW * 0.75} ${wy + 5} ${bLeft + bW - 6} ${wy}`}
                      stroke="#1565c0" strokeWidth={1.2} fill="none" opacity={0.35} />
                  );
                })}
                <Rect x={bLeft} y={bTop} width={bW} height={bH}
                  fill="transparent" onPress={() => onBoundaryPress?.(b.id)} />
              </G>
            );
          }

          // Fallback
          return (
            <G key={b.id}>
              <Rect x={bLeft} y={bTop} width={bW} height={bH}
                fill={cfg.fill} stroke={cfg.stroke}
                strokeWidth={1.5} opacity={0.5} rx={4} />
              <Rect x={bLeft} y={bTop} width={bW} height={bH}
                fill="transparent" onPress={() => onBoundaryPress?.(b.id)} />
            </G>
          );
        })}

        {/* ── Companion overlay (only pairs within 4 cells / ~120cm) ───────── */}
        {showCompanionOverlay && companionPairs.map((pair, idx) => {
          const pA = garden.plants.find((p) => p.id === pair.plantIdA);
          const pB = garden.plants.find((p) => p.id === pair.plantIdB);
          if (!pA || !pB) return null;
          // Draw an arc for every reported pair so the on-map lines match the
          // relations counted in the legend (no distance gate — #59)
          const x1 = plantCx(pA); const y1 = plantCy(pA);
          const x2 = plantCx(pB); const y2 = plantCy(pB);
          const col = pair.relation === 'good' ? '#2d6a4f' : '#e63946';
          const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
          return (
            <G key={`cp-${idx}`}>
              <Path d={arcPath(x1, y1, x2, y2)} stroke={col} strokeWidth={2}
                strokeDasharray={pair.relation === 'good' ? '6,4' : '3,3'}
                fill="none" opacity={0.7} />
              <Circle cx={mx} cy={my} r={8} fill={col} opacity={0.9} />
              <SvgText x={mx} y={my + 4} textAnchor="middle" fontSize={9} fontWeight="700" fill="#fff">
                {pair.relation === 'good' ? '♥' : '✕'}
              </SvgText>
            </G>
          );
        })}

        {/* ── Plants & zones ────────────────────────────────────────────────── */}
        {garden.plants.map((plant) => {
          const isMoving  = plant.id === movingPlantId;
          const w = plant.width  ?? 1;
          const h = plant.height ?? 1;
          const isZone = w > 1 || h > 1;
          const color  = plant.color ?? '#2d6a4f';
          const emoji  = getPlantEmoji(plant.commonName, plant.species);
          const alpha  = isMoving ? 0.35 : 1;

          // ── Zone (multi-cell rectangle) ────────────────────────────────────
          if (isZone) {
            const zLeft  = rx(plant.x);
            const zTop   = ry(plant.y);
            const zW     = w * SCALE;
            const zH     = h * SCALE;
            const cx     = zLeft + zW / 2;
            const cy     = zTop  + zH / 2;

            // Emoji tiling
            const cols    = Math.max(1, Math.floor(zW / EMOJI_STEP));
            const rows    = Math.max(1, Math.floor(zH / EMOJI_STEP));
            const padding = 4;
            const offX    = Math.max(padding, (zW - cols * EMOJI_STEP) / 2 + EMOJI_STEP / 2);
            const offY    = Math.max(padding, (zH - rows * EMOJI_STEP) / 2 + EMOJI_STEP / 2);
            const tileEmojis = Array.from({ length: rows * cols }, (_, i) => {
              const row = Math.floor(i / cols);
              const col = i % cols;
              return { key: i, ex: zLeft + offX + col * EMOJI_STEP, ey: zTop + offY + row * EMOJI_STEP };
            });

            // Label sizing
            const labelFontSize = Math.max(10, Math.min(18, Math.floor(Math.min(w, h) * SCALE / 5)));
            const labelChars    = Math.floor(zW / (labelFontSize * 0.65));
            const label = plant.commonName.length > labelChars
              ? plant.commonName.slice(0, labelChars - 1) + '…'
              : plant.commonName;
            const pillW = Math.min(label.length * labelFontSize * 0.62 + 16, zW - 8);
            const pillH = labelFontSize + 10;

            return (
              <G key={plant.id}>
                {/* Fully transparent background — zones defined by emoji tiling only */}
                {/* Subtle dashed border for zone boundary (no fill) */}
                {(() => {
                  const zoneStatus = statusMap[plant.id];
                  return (
                    <Rect x={zLeft} y={zTop} width={zW} height={zH}
                      fill="none"
                      stroke={
                        zoneStatus === 'overdue' ? '#e63946' :
                        zoneStatus === 'water'   ? '#3a86ff' :
                        zoneStatus === 'soon'    ? '#fb8500' :
                        zoneStatus === 'done_today' ? '#2d6a4f' :
                        color
                      }
                      strokeWidth={
                        zoneStatus === 'overdue' || zoneStatus === 'water' ? 2.5 :
                        zoneStatus === 'soon' ? 2 : 1.5
                      }
                      strokeDasharray={
                        zoneStatus === 'overdue' ? undefined :
                        zoneStatus === 'soon' || zoneStatus === 'water' ? '6,4' : '4,3'
                      }
                      opacity={isMoving ? 0.25 : 0.55} rx={10} />
                  );
                })()}

                {/* Tiled emoji pattern — dummy first to prevent react-native-svg first-element opacity artefact */}
                <SvgText key="__dummy" x={-9999} y={-9999} opacity={0}>{emoji}</SvgText>
                {tileEmojis.map(({ key, ex, ey }) => (
                  <SvgText key={key} x={ex} y={ey + 6}
                    textAnchor="middle" fontSize={EMOJI_STEP * 0.55}
                    opacity={isMoving ? 0.15 : 0.85}>
                    {emoji}
                  </SvgText>
                ))}

                {/* Label pill */}
                {showNames && (
                  <>
                    <Rect
                      x={cx - pillW / 2} y={cy - pillH / 2}
                      width={pillW} height={pillH}
                      fill="rgba(255,255,255,0.88)" rx={pillH / 2} />
                    <SvgText x={cx} y={cy + labelFontSize * 0.35}
                      textAnchor="middle" fontSize={labelFontSize}
                      fill="#1b4332" fontWeight="700"
                      opacity={isMoving ? 0.4 : 1}>
                      {label}
                    </SvgText>
                  </>
                )}

                {/* Transparent touch target */}
                <Rect x={zLeft} y={zTop} width={zW} height={zH} fill="transparent" rx={10}
                  onPressIn={!isInteractive ? () => startLP(() => onPlantLongPress?.(plant)) : undefined}
                  onPressOut={!isInteractive ? cancelLP : undefined}
                  onPress={!isInteractive ? () => handlePlantTap(plant) : undefined}
                />
              </G>
            );
          }

          // ── Single plant — color-coded circle + emoji ─────────────────────
          const cx      = plant.x * SCALE;
          const cy      = plant.y * SCALE;
          const name    = plant.commonName.length > 11
            ? plant.commonName.slice(0, 10) + '…'
            : plant.commonName;
          const bgColor = getPlantBgColor(plant.commonName, plant.plantFamily);

          return (
            <G key={plant.id}>
              {/* Category background circle */}
              <Circle cx={cx} cy={cy} r={14} fill={bgColor} opacity={isMoving ? 0.3 : 1} />

              {/* Status ring — outside the bg circle */}
              {(statusMap[plant.id] === 'overdue' || statusMap[plant.id] === 'water') && (
                <Circle cx={cx} cy={cy} r={18}
                  fill="none" stroke={statusMap[plant.id] === 'water' ? '#3a86ff' : '#e63946'}
                  strokeWidth={2.5} strokeDasharray={statusMap[plant.id] === 'water' ? '5,3' : undefined}
                  opacity={0.9} />
              )}
              {statusMap[plant.id] === 'soon' && (
                <Circle cx={cx} cy={cy} r={18}
                  fill="none" stroke="#fb8500" strokeWidth={2}
                  strokeDasharray="4,3" opacity={0.8} />
              )}
              {/* Moving indicator ring */}
              {isMoving && (
                <Circle cx={cx} cy={cy} r={17}
                  fill="none" stroke="#ffb703" strokeWidth={2.5} opacity={0.7} />
              )}
              {/* Emoji — centered on circle */}
              <SvgText x={cx} y={cy + 8} textAnchor="middle"
                fontSize={18} opacity={alpha}>
                {emoji}
              </SvgText>
              {/* Plant name — light on dark soil */}
              {showNames && (
                <SvgText x={cx} y={cy + 20} textAnchor="middle"
                  fontSize={7.5} fill="#e8f5e9" fontWeight="700"
                  opacity={isMoving ? 0.4 : 0.92}>
                  {name}
                </SvgText>
              )}
              {/* Done-today badge */}
              {statusMap[plant.id] === 'done_today' && (
                <G>
                  <Circle cx={cx + 11} cy={cy - 11} r={7} fill="#2d6a4f" opacity={0.95} />
                  <SvgText x={cx + 11} y={cy - 7} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="700">✓</SvgText>
                </G>
              )}
              {/* Transparent touch target */}
              <Circle cx={cx} cy={cy} r={17} fill="transparent"
                onPressIn={!isInteractive ? () => startLP(() => onPlantLongPress?.(plant)) : undefined}
                onPressOut={!isInteractive ? cancelLP : undefined}
                onPress={!isInteractive ? () => handlePlantTap(plant) : undefined}
              />
            </G>
          );
        })}

        {/* First-point marker during draw */}
        {highlightPoint && (
          <G>
            <Rect x={rx(highlightPoint.x)} y={ry(highlightPoint.y)}
              width={SCALE} height={SCALE} fill="#2d6a4f" opacity={0.22} rx={6} />
            <Circle cx={highlightPoint.x * SCALE} cy={highlightPoint.y * SCALE}
              r={7} fill="#2d6a4f" opacity={0.9} />
          </G>
        )}

      </Svg>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: { width: MAP_WIDTH, height: MAP_HEIGHT },  // fallback, overridden by renderScale inline style
});
