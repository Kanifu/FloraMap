import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect, Path, Defs, Pattern, Line, ClipPath, Image as SvgImage } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType } from '@/models';
import { CompanionPair } from '@/data/companionPlanting';

export const CELL_CM    = 30;
export const SCALE      = 40;
export const GRID_COLS  = 25;   // default grid width in cells
export const GRID_ROWS  = 25;   // default grid height in cells
export const MAP_WIDTH  = GRID_COLS * SCALE;   // default map pixel width
export const MAP_HEIGHT = GRID_ROWS * SCALE;   // default map pixel height

// ── Plant emoji lookup ────────────────────────────────────────────────────────

const EMOJI_MAP: [string[], string][] = [
  [['tomaat', 'tomato', 'lycopersicon'],                  '🍅'],
  [['komkommer', 'cucumber', 'cucumis sativus'],          '🥒'],
  [['wortel', 'carrot', 'daucus'],                        '🥕'],
  [['aardappel', 'potato', 'solanum tuberosum'],          '🥔'],
  [['ui', 'onion', 'allium cepa', 'sjalot'],              '🧅'],
  [['knoflook', 'garlic', 'allium sativum'],              '🧄'],
  [['paprika', 'pepper', 'capsicum'],                     '🫑'],
  [['maïs', 'mais', 'corn', 'zea mays'],                  '🌽'],
  [['boon', 'bean', 'phaseolus'],                         '🫘'],
  [['erwt', 'pea', 'pisum'],                              '🫛'],
  [['broccoli', 'brassica oleracea'],                     '🥦'],
  [['sla', 'lettuce', 'lactuca', 'spinazie', 'spinach', 'boerenkool', 'kale'], '🥬'],
  [['radijs', 'radish', 'raphanus'],                      '🌸'],
  [['pompoen', 'pumpkin', 'courgette', 'squash', 'cucurbita'], '🎃'],
  [['aardbeien', 'aardbei', 'strawberry', 'fragaria'],    '🍓'],
  [['roos', 'rose', 'rosa'],                              '🌹'],
  [['zonnebloem', 'sunflower', 'helianthus'],             '🌻'],
  [['tulp', 'tulip', 'tulipa'],                           '🌷'],
  [['basilicum', 'basil', 'ocimum'],                      '🌿'],
  [['munt', 'mint', 'mentha'],                            '🌿'],
  [['kool', 'cabbage', 'bloemkool', 'spruitjes'],         '🥦'],
  [['peer', 'pear', 'pyrus'],                             '🍐'],
  [['appel', 'apple', 'malus'],                           '🍎'],
  [['druif', 'grape', 'vitis'],                           '🍇'],
  [['citroen', 'lemon', 'citrus limon'],                  '🍋'],
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
  thirstyPlantIds?: string[];
  plantStatuses?: Record<string, 'overdue' | 'soon' | 'water' | 'done_today' | 'ok'>;
  plantStatusMap?: unknown;
  boundaries?: unknown[];
  showNames?: boolean;
  renderScale?: number;
  onBoundaryPress?: (id: string) => void;
}

const LONG_PRESS_MS = 300;
const EMOJI_STEP    = 38;   // px between emoji centres in zone grid

const GardenMapBase = ({
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
}: GardenMapProps): React.JSX.Element => {

  const effCols   = garden.gridCols ?? GRID_COLS;
  const effRows   = garden.gridRows ?? GRID_ROWS;
  const mapWidth  = effCols * SCALE;
  const mapHeight = effRows * SCALE;

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
    const gridX = Math.max(1, Math.min(Math.round(e.nativeEvent.locationX / SCALE), effCols));
    const gridY = Math.max(1, Math.min(Math.round(e.nativeEvent.locationY / SCALE), effRows));
    onMapPress(gridX, gridY);
  };

  const thirstySet = new Set(thirstyPlantIds);

  return (
    <Pressable onPress={isInteractive ? handleBgTap : undefined}
      style={{ width: mapWidth, height: mapHeight }}>
      <Svg width={mapWidth} height={mapHeight}>

        {/* SVG fill patterns for zones */}
        <Defs>
          <Pattern id="pat-grass" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <Line x1="0" y1="10" x2="10" y2="0" stroke="#2d6a4f" strokeWidth={1.5} opacity={0.55} />
          </Pattern>
          <Pattern id="pat-forest" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <Line x1="0" y1="8" x2="8" y2="0" stroke="#1b4332" strokeWidth={1.5} opacity={0.5} />
            <Line x1="0" y1="0" x2="8" y2="8" stroke="#1b4332" strokeWidth={1.5} opacity={0.5} />
          </Pattern>
          <Pattern id="pat-gravel" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <Circle cx={2} cy={2} r={1.2} fill="#888" opacity={0.55} />
            <Circle cx={6} cy={6} r={1.2} fill="#888" opacity={0.55} />
            <Circle cx={6} cy={2} r={0.8} fill="#aaa" opacity={0.4} />
            <Circle cx={2} cy={6} r={0.8} fill="#aaa" opacity={0.4} />
          </Pattern>
          <Pattern id="pat-water" x="0" y="0" width="20" height="8" patternUnits="userSpaceOnUse">
            <Path d="M 0 4 Q 5 0 10 4 Q 15 8 20 4" stroke="#3a86ff" strokeWidth={1.5} fill="none" opacity={0.6} />
          </Pattern>
          {/* Circular clip paths for plant photos */}
          {garden.plants.filter((p) => p.imageUri).map((plant) => {
            const w = plant.width ?? 1;
            const h = plant.height ?? 1;
            const isZone = w > 1 || h > 1;
            if (isZone) {
              const zLeft = rx(plant.x);
              const zTop  = ry(plant.y);
              const zW    = w * SCALE;
              return (
                <ClipPath key={`clipz-${plant.id}`} id={`imgclip-z-${plant.id}`}>
                  <Circle cx={zLeft + zW - 16} cy={zTop + 16} r={14} />
                </ClipPath>
              );
            }
            return (
              <ClipPath key={`clips-${plant.id}`} id={`imgclip-s-${plant.id}`}>
                <Circle cx={plant.x * SCALE} cy={plant.y * SCALE} r={18} />
              </ClipPath>
            );
          })}
        </Defs>

        {/* Background */}
        <Rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#eaf4ec" />

        {/* Grid lines */}
        {Array.from({ length: effCols + 1 }, (_, i) => (
          <Rect key={`v${i}`} x={i * SCALE} y={0} width={0.5} height={mapHeight}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.22} />
        ))}
        {Array.from({ length: effRows + 1 }, (_, i) => (
          <Rect key={`h${i}`} x={0} y={i * SCALE} width={mapWidth} height={0.5}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.22} />
        ))}

        {/* Garden polygons */}
        {garden.polygons.map((polygon) => (
          <Polygon key={polygon.id} points={toSvgPoints(polygon)} fill={POLYGON_COLORS[polygon.type]} />
        ))}

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
              <Path d={arcPath(x1, y1, x2, y2)} stroke={col} strokeWidth={3}
                strokeDasharray={pair.relation === 'good' ? '8,4' : '4,3'}
                fill="none" opacity={0.9} />
              <Circle cx={mx} cy={my} r={10} fill={col} opacity={0.95} />
              <SvgText x={mx} y={my + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill="#fff">
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

            const patId = plant.fillPattern && plant.fillPattern !== 'solid'
              ? `pat-${plant.fillPattern}` : null;

            return (
              <G key={plant.id}>
                {/* Subtle coloured background */}
                <Rect x={zLeft} y={zTop} width={zW} height={zH}
                  fill={color} opacity={isMoving ? 0.06 : 0.14} rx={10} />
                {/* Fill pattern overlay */}
                {patId && (
                  <Rect x={zLeft} y={zTop} width={zW} height={zH}
                    fill={`url(#${patId})`} opacity={isMoving ? 0.25 : 1} rx={10} />
                )}
                {/* Coloured border */}
                <Rect x={zLeft} y={zTop} width={zW} height={zH}
                  fill="none" stroke={color} strokeWidth={isThirsty ? 0 : 2}
                  opacity={isMoving ? 0.3 : 0.6} rx={10} />
                {/* Water-thirsty dashed border */}
                {isThirsty && (
                  <Rect x={zLeft} y={zTop} width={zW} height={zH}
                    fill="none" stroke="#3a86ff" strokeWidth={2.5}
                    strokeDasharray="6,4" opacity={0.75} rx={10} />
                )}

                {/* Tiled emoji pattern */}
                {tileEmojis.map(({ key, ex, ey }) => (
                  <SvgText key={key} x={ex} y={ey + 6}
                    textAnchor="middle" fontSize={EMOJI_STEP * 0.55}
                    opacity={isMoving ? 0.15 : 0.42}>
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

                {/* Scan photo badge top-right */}
                {plant.imageUri && (
                  <G>
                    <Circle cx={zLeft + zW - 16} cy={zTop + 16} r={15} fill="rgba(255,255,255,0.9)" />
                    <SvgImage
                      x={zLeft + zW - 30} y={zTop + 2}
                      width={28} height={28}
                      href={{ uri: plant.imageUri }}
                      clipPath={`url(#imgclip-z-${plant.id})`}
                      preserveAspectRatio="xMidYMid slice"
                      opacity={isMoving ? 0.3 : 1}
                    />
                    <Circle cx={zLeft + zW - 16} cy={zTop + 16} r={15}
                      fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
                  </G>
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

          // ── Single plant — emoji only, no circle ───────────────────────────
          const cx   = plant.x * SCALE;
          const cy   = plant.y * SCALE;
          const name = plant.commonName.length > 11
            ? plant.commonName.slice(0, 10) + '…'
            : plant.commonName;

          const hasPhoto = !!plant.imageUri;

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

              {hasPhoto ? (
                /* Circular photo */
                <G>
                  <Circle cx={cx} cy={cy} r={18} fill="#fff" opacity={0.92} />
                  <SvgImage
                    x={cx - 18} y={cy - 18}
                    width={36} height={36}
                    href={{ uri: plant.imageUri! }}
                    clipPath={`url(#imgclip-s-${plant.id})`}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={alpha}
                  />
                  <Circle cx={cx} cy={cy} r={18}
                    fill="none" stroke={color} strokeWidth={2}
                    opacity={isMoving ? 0.35 : 0.8} />
                </G>
              ) : (
                /* Emoji */
                <SvgText x={cx} y={cy + 10} textAnchor="middle"
                  fontSize={26} opacity={alpha}>
                  {emoji}
                </SvgText>
              )}

              {/* Plant name */}
              <SvgText x={cx} y={hasPhoto ? cy + 31 : cy + 27} textAnchor="middle"
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

export const GardenMap = React.memo(GardenMapBase);
