import React, { useRef } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect, Path, Line } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType, GardenBoundary, BoundaryType } from '@/models';
import { CompanionPair } from '@/data/companionPlanting';

export const CELL_CM  = 30;
export const SCALE    = 40;
export const GRID_COLS = 25;
export const GRID_ROWS = 25;
export const MAP_WIDTH  = GRID_COLS * SCALE;
export const MAP_HEIGHT = GRID_ROWS * SCALE;

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
  fence:  { fill: 'none',      stroke: '#8d6e63', emoji: '🪵', isLine: true  },
  wall:   { fill: 'none',      stroke: '#9e9e9e', emoji: '🧱', isLine: true  },
  hedge:  { fill: 'none',      stroke: '#388e3c', emoji: '🌿', isLine: true  },
  forest: { fill: '#2e7d3222', stroke: '#2e7d32', emoji: '🌳', isLine: false },
  lawn:   { fill: '#81c78422', stroke: '#52b788', emoji: '🌾', isLine: false },
  patio:  { fill: '#bdbdbd22', stroke: '#9e9e9e', emoji: '🪨', isLine: false },
  pond:   { fill: '#64b5f622', stroke: '#1565c0', emoji: '🌊', isLine: false },
  path:   { fill: '#bcaaa422', stroke: '#8d6e63', emoji: '🪵', isLine: false },
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
  thirstyPlantIds?: string[];    // plants with overdue water tasks (#23)
  boundaries?: GardenBoundary[];
}

const LONG_PRESS_MS = 300;
const EMOJI_STEP    = 38;   // px between emoji centres in zone grid

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
  thirstyPlantIds = [],
  boundaries = [],
}: GardenMapProps): React.JSX.Element => {

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
  const handleBgTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!onMapPress) return;
    const gridX = Math.max(1, Math.min(Math.round(e.nativeEvent.locationX / SCALE), GRID_COLS));
    const gridY = Math.max(1, Math.min(Math.round(e.nativeEvent.locationY / SCALE), GRID_ROWS));
    onMapPress(gridX, gridY);
  };

  const thirstySet = new Set(thirstyPlantIds);

  return (
    <Pressable onPress={isInteractive ? handleBgTap : undefined} style={styles.pressable}>
      <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>

        {/* Background */}
        <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#eaf4ec" />

        {/* Grid lines */}
        {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
          <Rect key={`v${i}`} x={i * SCALE} y={0} width={0.5} height={MAP_HEIGHT}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.22} />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
          <Rect key={`h${i}`} x={0} y={i * SCALE} width={MAP_WIDTH} height={0.5}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.22} />
        ))}

        {/* Garden polygons */}
        {garden.polygons.map((polygon) => (
          <Polygon key={polygon.id} points={toSvgPoints(polygon)} fill={POLYGON_COLORS[polygon.type]} />
        ))}

        {/* ── Boundaries ────────────────────────────────────────────────────── */}
        {boundaries.map((b) => {
          const cfg = BOUNDARY_CONFIG[b.type];
          if (cfg.isLine) {
            // Lijn-boundaries: dikke lijn van (x1,y1) naar (x2,y2)
            const lx1 = (b.x1 ?? 0) * SCALE;
            const ly1 = (b.y1 ?? 0) * SCALE;
            const lx2 = (b.x2 ?? 0) * SCALE;
            const ly2 = (b.y2 ?? 0) * SCALE;
            return (
              <G key={b.id}>
                <Line
                  x1={lx1} y1={ly1}
                  x2={lx2} y2={ly2}
                  stroke={cfg.stroke} strokeWidth={6}
                  strokeLinecap="round"
                  opacity={0.8}
                />
                <SvgText
                  x={(lx1 + lx2) / 2} y={(ly1 + ly2) / 2 + 6}
                  textAnchor="middle" fontSize={14}
                  opacity={0.9}>
                  {cfg.emoji}
                </SvgText>
              </G>
            );
          } else {
            // Vlak-boundaries: rechthoek met fill + stroke
            const bLeft  = (b.x ?? 0) * SCALE;
            const bTop   = (b.y ?? 0) * SCALE;
            const bW     = (b.width  ?? 1) * SCALE;
            const bH     = (b.height ?? 1) * SCALE;
            const bCx    = bLeft + bW / 2;
            const bCy    = bTop  + bH / 2;
            const eCols  = Math.max(1, Math.floor(bW / EMOJI_STEP));
            const eRows  = Math.max(1, Math.floor(bH / EMOJI_STEP));
            const eOffX  = (bW - eCols * EMOJI_STEP) / 2 + EMOJI_STEP / 2;
            const eOffY  = (bH - eRows * EMOJI_STEP) / 2 + EMOJI_STEP / 2;
            return (
              <G key={b.id}>
                <Rect
                  x={bLeft} y={bTop} width={bW} height={bH}
                  fill={cfg.fill} stroke={cfg.stroke} strokeWidth={1.5}
                  strokeDasharray="6,4" opacity={0.45} rx={8}
                />
                {Array.from({ length: eRows * eCols }, (_, i) => {
                  const row = Math.floor(i / eCols);
                  const col = i % eCols;
                  return (
                    <SvgText
                      key={i}
                      x={bLeft + eOffX + col * EMOJI_STEP}
                      y={bTop  + eOffY + row * EMOJI_STEP + 6}
                      textAnchor="middle" fontSize={16}
                      opacity={0.45}>
                      {cfg.emoji}
                    </SvgText>
                  );
                })}
                <SvgText x={bCx} y={bCy + 5} textAnchor="middle" fontSize={10}
                  fill={cfg.stroke} fontWeight="700" opacity={0.8}>
                  {b.type}
                </SvgText>
              </G>
            );
          }
        })}

        {/* ── Companion overlay ─────────────────────────────────────────────── */}
        {showCompanionOverlay && companionPairs.map((pair, idx) => {
          const pA = garden.plants.find((p) => p.id === pair.plantIdA);
          const pB = garden.plants.find((p) => p.id === pair.plantIdB);
          if (!pA || !pB) return null;
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
          const isThirsty = thirstySet.has(plant.id);
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
            const offX    = (zW - cols * EMOJI_STEP) / 2 + EMOJI_STEP / 2;
            const offY    = (zH - rows * EMOJI_STEP) / 2 + EMOJI_STEP / 2;
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
                <Rect x={zLeft} y={zTop} width={zW} height={zH}
                  fill="none"
                  stroke={isThirsty ? '#3a86ff' : color}
                  strokeWidth={isThirsty ? 2.5 : 1.5}
                  strokeDasharray={isThirsty ? '6,4' : '4,3'}
                  opacity={isMoving ? 0.25 : 0.45} rx={10} />

                {/* Tiled emoji pattern — more opaque since no fill behind them */}
                {tileEmojis.map(({ key, ex, ey }) => (
                  <SvgText key={key} x={ex} y={ey + 6}
                    textAnchor="middle" fontSize={EMOJI_STEP * 0.55}
                    opacity={isMoving ? 0.15 : 0.65}>
                    {emoji}
                  </SvgText>
                ))}

                {/* Label pill */}
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

                {/* Transparent touch target */}
                <Rect x={zLeft} y={zTop} width={zW} height={zH} fill="transparent" rx={10}
                  onPressIn={!isInteractive ? () => startLP(() => onPlantLongPress?.(plant)) : undefined}
                  onPressOut={!isInteractive ? cancelLP : undefined}
                  onPress={!isInteractive ? () => handlePlantTap(plant) : undefined}
                />
              </G>
            );
          }

          // ── Single plant — emoji only, no circle ───────────────────────────
          const cx   = plant.x * SCALE;
          const cy   = plant.y * SCALE;
          const name = plant.commonName.length > 11
            ? plant.commonName.slice(0, 10) + '…'
            : plant.commonName;

          return (
            <G key={plant.id}>
              {/* Water-thirsty ring */}
              {isThirsty && (
                <Circle cx={cx} cy={cy} r={20}
                  fill="none" stroke="#3a86ff" strokeWidth={2.5}
                  strokeDasharray="5,3" opacity={0.8} />
              )}
              {/* Moving indicator ring */}
              {isMoving && (
                <Circle cx={cx} cy={cy} r={22}
                  fill="none" stroke="#ffb703" strokeWidth={2.5} opacity={0.7} />
              )}
              {/* Emoji — bigger, no background circle */}
              <SvgText x={cx} y={cy + 10} textAnchor="middle"
                fontSize={26} opacity={alpha}>
                {emoji}
              </SvgText>
              {/* Plant name */}
              <SvgText x={cx} y={cy + 27} textAnchor="middle"
                fontSize={8.5} fill="#1b4332" fontWeight="700"
                opacity={isMoving ? 0.4 : 1}>
                {name}
              </SvgText>
              {/* Transparent touch target */}
              <Circle cx={cx} cy={cy} r={22} fill="transparent"
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
  pressable: { width: MAP_WIDTH, height: MAP_HEIGHT },
});
