import React, { useRef } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect, Path } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType } from '@/models';
import { CompanionPair } from '@/data/companionPlanting';

export const CELL_CM = 30;
export const SCALE   = 40;
export const GRID_COLS = 25;
export const GRID_ROWS = 25;
export const MAP_WIDTH  = GRID_COLS * SCALE;
export const MAP_HEIGHT = GRID_ROWS * SCALE;

// ── Plant emoji lookup ────────────────────────────────────────────────────────

const EMOJI_MAP: [string[], string][] = [
  [['tomaat', 'tomato', 'lycopersicon'],            '🍅'],
  [['komkommer', 'cucumber', 'cucumis sativus'],    '🥒'],
  [['wortel', 'carrot', 'daucus'],                  '🥕'],
  [['aardappel', 'potato', 'solanum tuberosum'],    '🥔'],
  [['ui', 'onion', 'allium cepa', 'sjalot'],        '🧅'],
  [['knoflook', 'garlic', 'allium sativum'],        '🧄'],
  [['paprika', 'pepper', 'capsicum'],               '🫑'],
  [['maïs', 'mais', 'corn', 'zea mays'],            '🌽'],
  [['boon', 'bean', 'phaseolus'],                   '🫘'],
  [['erwt', 'pea', 'pisum'],                        '🫛'],
  [['broccoli', 'brassica oleracea'],               '🥦'],
  [['sla', 'lettuce', 'lactuca', 'spinazie', 'spinach', 'boerenkool', 'kale'], '🥬'],
  [['radijs', 'radish', 'raphanus'],                '🌸'],
  [['pompoen', 'pumpkin', 'courgette', 'squash', 'cucurbita'], '🎃'],
  [['aardbeien', 'aardbei', 'strawberry', 'fragaria'], '🍓'],
  [['roos', 'rose', 'rosa'],                        '🌹'],
  [['zonnebloem', 'sunflower', 'helianthus'],       '🌻'],
  [['tulp', 'tulip', 'tulipa'],                     '🌷'],
  [['basilicum', 'basil', 'ocimum'],                '🌿'],
  [['munt', 'mint', 'mentha'],                      '🌿'],
  [['kool', 'cabbage', 'bloemkool', 'spruitjes'],   '🥦'],
  [['peer', 'pear', 'pyrus'],                       '🍐'],
  [['appel', 'apple', 'malus'],                     '🍎'],
  [['druif', 'grape', 'vitis'],                     '🍇'],
  [['citroen', 'lemon', 'citrus limon'],            '🍋'],
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
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
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
}

const LONG_PRESS_MS = 300; // down from default 500ms

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
}: GardenMapProps): React.JSX.Element => {

  // ── Fast long-press via manual timer ────────────────────────────────────────
  const lpTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lpFired  = useRef(false);

  const startLP = (cb: () => void) => {
    lpFired.current = false;
    lpTimer.current = setTimeout(() => {
      lpFired.current = true;
      cb();
    }, LONG_PRESS_MS);
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

  return (
    <Pressable onPress={isInteractive ? handleBgTap : undefined} style={styles.pressable}>
      <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>

        {/* Background */}
        <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#eaf4ec" />

        {/* Grid lines */}
        {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
          <Rect key={`v${i}`} x={i * SCALE} y={0} width={0.5} height={MAP_HEIGHT}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.25} />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
          <Rect key={`h${i}`} x={0} y={i * SCALE} width={MAP_WIDTH} height={0.5}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.25} />
        ))}

        {/* Garden polygons */}
        {garden.polygons.map((polygon) => (
          <Polygon key={polygon.id} points={toSvgPoints(polygon)} fill={POLYGON_COLORS[polygon.type]} />
        ))}

        {/* ── Companion overlay ── */}
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
              <Path d={arcPath(x1, y1, x2, y2)} stroke={col} strokeWidth={2.5}
                strokeDasharray={pair.relation === 'good' ? '6,4' : '3,3'}
                fill="none" opacity={0.75} />
              <Circle cx={mx} cy={my} r={8} fill={col} opacity={0.92} />
              <SvgText x={mx} y={my + 4} textAnchor="middle" fontSize={9} fontWeight="700" fill="#fff">
                {pair.relation === 'good' ? '♥' : '✕'}
              </SvgText>
            </G>
          );
        })}

        {/* ── Plants & zones ── */}
        {garden.plants.map((plant) => {
          const isMoving = plant.id === movingPlantId;
          const w = plant.width  ?? 1;
          const h = plant.height ?? 1;
          const isZone = w > 1 || h > 1;
          const color  = plant.color ?? '#2d6a4f';
          const emoji  = getPlantEmoji(plant.commonName, plant.species);

          // ── Zone (multi-cell rectangle) ──────────────────────────────────
          if (isZone) {
            const cx = rx(plant.x) + (w * SCALE) / 2;
            const cy = ry(plant.y) + (h * SCALE) / 2;
            const maxChars = Math.floor((w * SCALE) / 8);
            const label = plant.commonName.length > maxChars
              ? plant.commonName.slice(0, maxChars - 1) + '…'
              : plant.commonName;
            const emojiX = rx(plant.x) + 14;
            const emojiY = ry(plant.y) + 18;

            return (
              <G key={plant.id}
                onPressIn={!isInteractive ? () => startLP(() => onPlantLongPress?.(plant)) : undefined}
                onPressOut={!isInteractive ? cancelLP : undefined}
                onPress={!isInteractive ? () => handlePlantTap(plant) : undefined}>
                {/* Drop shadow */}
                <Rect
                  x={rx(plant.x) + 2} y={ry(plant.y) + 3}
                  width={w * SCALE} height={h * SCALE}
                  fill="rgba(0,0,0,0.12)" rx={10} />
                {/* Fill */}
                <Rect
                  x={rx(plant.x)} y={ry(plant.y)}
                  width={w * SCALE} height={h * SCALE}
                  fill={color} opacity={isMoving ? 0.18 : 0.42}
                  stroke={color} strokeWidth={2} rx={10} />
                {/* Top-left emoji */}
                <SvgText x={emojiX} y={emojiY}
                  textAnchor="middle" fontSize={14} opacity={isMoving ? 0.3 : 0.9}>
                  {emoji}
                </SvgText>
                {/* Zone name */}
                <SvgText x={cx} y={cy + 5} textAnchor="middle"
                  fontSize={Math.max(10, Math.min(14, (w * SCALE) / Math.max(label.length, 1)))}
                  fill="#1b4332" fontWeight="700"
                  opacity={isMoving ? 0.3 : 1}>
                  {label}
                </SvgText>
              </G>
            );
          }

          // ── Single plant (circle + emoji + label) ─────────────────────────
          const cx = plant.x * SCALE;
          const cy = plant.y * SCALE;
          const r  = isMoving ? 20 : 18;
          const fillColor = isMoving ? '#ffb703' : color;
          const name = plant.commonName.length > 11
            ? plant.commonName.slice(0, 10) + '…'
            : plant.commonName;

          return (
            <G key={plant.id}
              onPressIn={!isInteractive ? () => startLP(() => onPlantLongPress?.(plant)) : undefined}
              onPressOut={!isInteractive ? cancelLP : undefined}
              onPress={!isInteractive ? () => handlePlantTap(plant) : undefined}>
              {/* Drop shadow */}
              <Circle cx={cx + 1.5} cy={cy + 2} r={r} fill="rgba(0,0,0,0.15)" />
              {/* Main circle */}
              <Circle cx={cx} cy={cy} r={r}
                fill={fillColor} stroke="#fff" strokeWidth={2.5}
                opacity={isMoving ? 0.6 : 1} />
              {/* Emoji icon */}
              <SvgText x={cx} y={cy + 6} textAnchor="middle"
                fontSize={15} opacity={isMoving ? 0.5 : 1}>
                {emoji}
              </SvgText>
              {/* Label below */}
              <SvgText x={cx} y={cy + r + 11} textAnchor="middle"
                fontSize={8.5} fill="#1b4332" fontWeight="700"
                opacity={isMoving ? 0.4 : 1}>
                {name}
              </SvgText>
            </G>
          );
        })}

        {/* First-point marker during draw */}
        {highlightPoint && (
          <G>
            <Rect x={rx(highlightPoint.x)} y={ry(highlightPoint.y)}
              width={SCALE} height={SCALE} fill="#2d6a4f" opacity={0.25} rx={6} />
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
