/**
 * GardenMap — SVG garden grid.
 *
 * Changes in this version:
 * - Issue #3  (plant icons): plant dots show an emoji derived from species name,
 *             falling back to the first letter when no emoji matches.
 * - Issue #15 (companion planting): accepts `compatibility` + `showCompatibility`
 *             props and draws coloured dashed rings around single-cell plants.
 */

import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType } from '@/models';
import { CompatibilityResult } from '@/services/GardenAssistantService';

export const CELL_CM    = 30;
export const SCALE      = 40;
export const GRID_COLS  = 25;
export const GRID_ROWS  = 25;
export const MAP_WIDTH  = GRID_COLS * SCALE;
export const MAP_HEIGHT = GRID_ROWS * SCALE;

interface GardenMapProps {
  garden: Garden;
  onPlantPress:      (plant: Plant) => void;
  onPlantLongPress?: (plant: Plant) => void;
  viewMode: '2d' | 'isometric';
  isInteractive?:    boolean;
  highlightPoint?:   { x: number; y: number } | null;
  movingPlantId?:    string | null;
  onMapPress?:       (gridX: number, gridY: number) => void;
  /** Companion-planting compatibility scores per plantId. Issue #15. */
  compatibility?:     CompatibilityResult[];
  /** When true, draw coloured rings around plants based on compatibility. */
  showCompatibility?: boolean;
}

const POLYGON_COLORS: Record<GardenPolygonType, string> = {
  border: '#6b705c', lawn: '#52b788', patio: '#adb5bd', path: '#ced4da', bed: '#8b5e3c',
};

const toSvgPoints = (p: GardenPolygon) =>
  p.points.map((pt) => `${pt.x * SCALE},${pt.y * SCALE}`).join(' ');

// top-left pixel of a zone rect (1-indexed grid coords)
const rx = (col: number) => (col - 0.5) * SCALE;
const ry = (row: number) => (row - 0.5) * SCALE;

// ── Emoji mapping for plant species ───────────────────────────────────────────────────
const EMOJI_MAP: [RegExp, string][] = [
  [/rosa|rose/i,                    '🌹'],  // 🌹
  [/tulip|tulipa/i,                 '🌷'],  // 🌷
  [/sunflower|helianthus/i,         '🌻'],  // 🌻
  [/daisy|bellis|chrysanth/i,       '🌼'],  // 🌼
  [/cactus|succulent|aloe/i,        '🌵'],  // 🌵
  [/tree|arbor|quercus|betula/i,    '🌳'],  // 🌳
  [/tomato|solanum lyco/i,          '🍅'],  // 🍅
  [/pepper|capsicum/i,              '🌶️'], // 🌶️
  [/strawberr|fragaria/i,           '🍓'],  // 🍓
  [/carrot|daucus/i,                '🥕'],  // 🥕
  [/lettuce|lactuca/i,              '🥬'],  // 🥬
  [/onion|allium cepa/i,            '🧅'],  // 🧅
  [/garlic|allium sativ/i,          '🧄'],  // 🧄
  [/cucumber|cucumis/i,             '🥒'],  // 🥒
  [/pumpkin|cucurbita/i,            '🎃'],  // 🎃
  [/corn|zea mays/i,                '🌽'],  // 🌽
  [/apple|malus/i,                  '🍎'],  // 🍎
  [/mint|mentha/i,                  '🌿'],  // 🌿
  [/basil|ocimum/i,                 '🌿'],  // 🌿
  [/herb|herb/i,                    '🌿'],  // 🌿
];

function getPlantEmoji(species: string, commonName: string): string {
  const haystack = `${species} ${commonName}`.toLowerCase();
  for (const [pattern, emoji] of EMOJI_MAP) {
    if (pattern.test(haystack)) return emoji;
  }
  return '';
}

// ── Compatibility ring colour ────────────────────────────────────────────────────────────
const COMPAT_COLORS: Record<'good' | 'bad', string> = {
  good: '#52b788',   // green
  bad:  '#e63946',   // red
};

export const GardenMap = ({
  garden,
  onPlantPress,
  onPlantLongPress,
  isInteractive = false,
  highlightPoint,
  movingPlantId,
  onMapPress,
  compatibility,
  showCompatibility,
}: GardenMapProps): React.JSX.Element => {
  const handleBgTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!onMapPress) return;
    const gridX = Math.max(1, Math.min(Math.round(e.nativeEvent.locationX / SCALE), GRID_COLS));
    const gridY = Math.max(1, Math.min(Math.round(e.nativeEvent.locationY / SCALE), GRID_ROWS));
    onMapPress(gridX, gridY);
  };

  return (
    <Pressable onPress={isInteractive ? handleBgTap : undefined} style={styles.pressable}>
      <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>
        <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#e8f5e9" />

        {/* Grid */}
        {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
          <Rect key={`v${i}`} x={i * SCALE} y={0} width={0.5} height={MAP_HEIGHT}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.35} />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
          <Rect key={`h${i}`} x={0} y={i * SCALE} width={MAP_WIDTH} height={0.5}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.35} />
        ))}

        {garden.polygons.map((polygon) => (
          <Polygon key={polygon.id} points={toSvgPoints(polygon)} fill={POLYGON_COLORS[polygon.type]} />
        ))}

        {garden.plants.map((plant) => {
          const isMoving = plant.id === movingPlantId;
          const w = plant.width  ?? 1;
          const h = plant.height ?? 1;
          const isZone  = w > 1 || h > 1;
          const color   = plant.color ?? '#2d6a4f';

          // Companion planting ring (single-cell plants only)
          const compatEntry = showCompatibility && compatibility
            ? compatibility.find((c) => c.plantId === plant.id)
            : undefined;
          const ringColor = compatEntry && compatEntry.score !== 'neutral'
            ? COMPAT_COLORS[compatEntry.score]
            : undefined;

          if (isZone) {
            const cx       = rx(plant.x) + (w * SCALE) / 2;
            const cy       = ry(plant.y) + (h * SCALE) / 2;
            const fontSize = Math.max(9, Math.min(13, (w * SCALE) / Math.max(plant.commonName.length, 1)));
            return (
              <G key={plant.id}>
                <Rect
                  x={rx(plant.x)} y={ry(plant.y)}
                  width={w * SCALE} height={h * SCALE}
                  fill={color} opacity={isMoving ? 0.2 : 0.45}
                  stroke={color} strokeWidth={2} rx={5}
                  onPress={!isInteractive ? () => onPlantPress(plant)      : undefined}
                  onLongPress={!isInteractive ? () => onPlantLongPress?.(plant) : undefined}
                />
                <SvgText x={cx} y={cy + 4} textAnchor="middle"
                  fontSize={fontSize} fill="#1b4332" fontWeight="700"
                  opacity={isMoving ? 0.3 : 1}>
                  {plant.commonName}
                </SvgText>
              </G>
            );
          }

          // Single-cell plant dot
          const emoji    = getPlantEmoji(plant.species, plant.commonName);
          const dotColor = isMoving ? '#ffb703' : color;
          const dotR     = isMoving ? 13 : 11;

          return (
            <G key={plant.id}>
              {/* Companion-planting ring (issue #15) */}
              {ringColor && (
                <Circle
                  cx={plant.x * SCALE} cy={plant.y * SCALE}
                  r={dotR + 5}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={2.5}
                  strokeDasharray="4,3"
                  opacity={0.85}
                />
              )}

              {/* Filled dot */}
              <Circle
                cx={plant.x * SCALE} cy={plant.y * SCALE}
                r={dotR}
                fill={dotColor}
                opacity={isMoving ? 0.55 : 1}
                onPress={!isInteractive ? () => onPlantPress(plant)      : undefined}
                onLongPress={!isInteractive ? () => onPlantLongPress?.(plant) : undefined}
              />

              {/* Plant emoji (issue #3) or fallback first letter */}
              {emoji ? (
                <SvgText
                  x={plant.x * SCALE} y={plant.y * SCALE + 5}
                  textAnchor="middle" fontSize={12}
                  opacity={isMoving ? 0.4 : 0.9}>
                  {emoji}
                </SvgText>
              ) : (
                <SvgText
                  x={plant.x * SCALE} y={plant.y * SCALE + 4}
                  textAnchor="middle" fontSize={10} fill="#fff" fontWeight="700"
                  opacity={isMoving ? 0.4 : 0.9}>
                  {plant.commonName.slice(0, 1).toUpperCase()}
                </SvgText>
              )}

              {/* Name label below dot */}
              <SvgText x={plant.x * SCALE} y={plant.y * SCALE + 22}
                textAnchor="middle" fontSize={8} fill="#1b4332" fontWeight="600">
                {plant.commonName.length > 10 ? plant.commonName.slice(0, 9) + '…' : plant.commonName}
              </SvgText>
            </G>
          );
        })}

        {/* First-point marker during draw */}
        {highlightPoint && (
          <G>
            <Rect x={rx(highlightPoint.x)} y={ry(highlightPoint.y)}
              width={SCALE} height={SCALE} fill="#2d6a4f" opacity={0.3} rx={4} />
            <Circle cx={highlightPoint.x * SCALE} cy={highlightPoint.y * SCALE}
              r={6} fill="#2d6a4f" opacity={0.9} />
          </G>
        )}
      </Svg>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: { width: MAP_WIDTH, height: MAP_HEIGHT },
});
