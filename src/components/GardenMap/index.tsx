import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect, Line, Path } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType } from '@/models';
import { CompanionPair } from '@/data/companionPlanting';

export const CELL_CM = 30;
export const SCALE = 40;
export const GRID_COLS = 25;
export const GRID_ROWS = 25;
export const MAP_WIDTH = GRID_COLS * SCALE;
export const MAP_HEIGHT = GRID_ROWS * SCALE;

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

const POLYGON_COLORS: Record<GardenPolygonType, string> = {
  border: '#6b705c', lawn: '#52b788', patio: '#adb5bd', path: '#ced4da', bed: '#8b5e3c',
};

const toSvgPoints = (p: GardenPolygon) =>
  p.points.map((pt) => `${pt.x * SCALE},${pt.y * SCALE}`).join(' ');

// top-left pixel of a zone rect (1-indexed grid coords)
const rx = (col: number) => (col - 0.5) * SCALE;
const ry = (row: number) => (row - 0.5) * SCALE;

/** Centre pixel of a plant cell (single or zone) */
const plantCx = (plant: Plant): number => {
  const w = plant.width ?? 1;
  if (w > 1) return rx(plant.x) + (w * SCALE) / 2;
  return plant.x * SCALE;
};
const plantCy = (plant: Plant): number => {
  const h = plant.height ?? 1;
  if (h > 1) return ry(plant.y) + (h * SCALE) / 2;
  return plant.y * SCALE;
};

/** Quadratic bezier arc between two points with a gentle perpendicular curve */
const arcPath = (x1: number, y1: number, x2: number, y2: number): string => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular offset — 20% of distance, max 30px
  const bend = Math.min(len * 0.20, 30);
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
};

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

        {/* ── Companion overlay ── */}
        {showCompanionOverlay && companionPairs.map((pair, idx) => {
          const pA = garden.plants.find((p) => p.id === pair.plantIdA);
          const pB = garden.plants.find((p) => p.id === pair.plantIdB);
          if (!pA || !pB) return null;

          const x1 = plantCx(pA);
          const y1 = plantCy(pA);
          const x2 = plantCx(pB);
          const y2 = plantCy(pB);
          const color = pair.relation === 'good' ? '#2d6a4f' : '#e63946';
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          return (
            <G key={`companion-${idx}`}>
              <Path
                d={arcPath(x1, y1, x2, y2)}
                stroke={color}
                strokeWidth={2.5}
                strokeDasharray={pair.relation === 'good' ? '6,4' : '3,3'}
                fill="none"
                opacity={0.75}
              />
              {/* midpoint badge */}
              <Circle cx={midX} cy={midY} r={8} fill={color} opacity={0.9} />
              <SvgText
                x={midX} y={midY + 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="700"
                fill="#fff">
                {pair.relation === 'good' ? '♥' : '✕'}
              </SvgText>
            </G>
          );
        })}

        {garden.plants.map((plant) => {
          const isMoving = plant.id === movingPlantId;
          const w = plant.width ?? 1;
          const h = plant.height ?? 1;
          const isZone = w > 1 || h > 1;
          const color = plant.color ?? '#2d6a4f';

          if (isZone) {
            const cx = rx(plant.x) + (w * SCALE) / 2;
            const cy = ry(plant.y) + (h * SCALE) / 2;
            const fontSize = Math.max(9, Math.min(13, (w * SCALE) / Math.max(plant.commonName.length, 1)));
            return (
              <G key={plant.id}>
                <Rect
                  x={rx(plant.x)} y={ry(plant.y)}
                  width={w * SCALE} height={h * SCALE}
                  fill={color} opacity={isMoving ? 0.2 : 0.45}
                  stroke={color} strokeWidth={2} rx={5}
                  onPress={!isInteractive ? () => onPlantPress(plant) : undefined}
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

          return (
            <G key={plant.id}>
              <Circle
                cx={plant.x * SCALE} cy={plant.y * SCALE}
                r={isMoving ? 13 : 11}
                fill={isMoving ? '#ffb703' : color}
                opacity={isMoving ? 0.55 : 1}
                onPress={!isInteractive ? () => onPlantPress(plant) : undefined}
                onLongPress={!isInteractive ? () => onPlantLongPress?.(plant) : undefined}
              />
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
