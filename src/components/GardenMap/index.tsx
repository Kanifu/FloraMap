import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType, PlantZone } from '@/models';

// 1 cell = 30 cm × 30 cm (ideal plant spacing)
export const CELL_CM = 30;
export const SCALE = 40;       // pixels per cell — good touch target
export const GRID_COLS = 25;   // 7.5 m wide
export const GRID_ROWS = 25;   // 7.5 m deep

export const MAP_WIDTH = GRID_COLS * SCALE;
export const MAP_HEIGHT = GRID_ROWS * SCALE;

interface GardenMapProps {
  garden: Garden;
  onPlantPress: (plant: Plant) => void;
  onPlantLongPress?: (plant: Plant) => void;
  onZoneLongPress?: (zone: PlantZone) => void;
  viewMode: '2d' | 'isometric';
  isInteractive?: boolean;
  highlightPoint?: { x: number; y: number } | null;
  movingPlantId?: string | null;
  movingZoneId?: string | null;
  onMapPress?: (gridX: number, gridY: number) => void;
}

const POLYGON_COLORS: Record<GardenPolygonType, string> = {
  border: '#6b705c',
  lawn:   '#52b788',
  patio:  '#adb5bd',
  path:   '#ced4da',
  bed:    '#8b5e3c',
};

const toSvgPoints = (polygon: GardenPolygon): string =>
  polygon.points.map((p) => `${p.x * SCALE},${p.y * SCALE}`).join(' ');

/** Top-left pixel of a zone rectangle (grid coords are 1-indexed cell centres) */
const zX = (col: number) => (col - 0.5) * SCALE;
const zY = (row: number) => (row - 0.5) * SCALE;

export const GardenMap = ({
  garden,
  onPlantPress,
  onPlantLongPress,
  onZoneLongPress,
  isInteractive = false,
  highlightPoint,
  movingPlantId,
  movingZoneId,
  onMapPress,
}: GardenMapProps): React.JSX.Element => {

  const handleBgTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!onMapPress) return;
    const gridX = Math.max(1, Math.min(Math.round(e.nativeEvent.locationX / SCALE), GRID_COLS));
    const gridY = Math.max(1, Math.min(Math.round(e.nativeEvent.locationY / SCALE), GRID_ROWS));
    onMapPress(gridX, gridY);
  };

  const zones = garden.zones ?? [];

  return (
    <Pressable
      onPress={isInteractive ? handleBgTap : undefined}
      style={styles.pressable}>
      <Svg width={MAP_WIDTH} height={MAP_HEIGHT}>
        {/* Background */}
        <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#e8f5e9" />

        {/* Grid lines — subtle always, more visible when interactive */}
        {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
          <Rect
            key={`v${i}`}
            x={i * SCALE} y={0} width={0.5} height={MAP_HEIGHT}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.35}
          />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
          <Rect
            key={`h${i}`}
            x={0} y={i * SCALE} width={MAP_WIDTH} height={0.5}
            fill="#b7e4c7" opacity={isInteractive ? 0.8 : 0.35}
          />
        ))}

        {/* Garden polygons */}
        {garden.polygons.map((polygon) => (
          <Polygon key={polygon.id} points={toSvgPoints(polygon)} fill={POLYGON_COLORS[polygon.type]} />
        ))}

        {/* Plant zones */}
        {zones.map((zone) => {
          const isMoving = zone.id === movingZoneId;
          const cx = zX(zone.x) + (zone.width * SCALE) / 2;
          const cy = zY(zone.y) + (zone.height * SCALE) / 2;
          return (
            <G key={zone.id}>
              <Rect
                x={zX(zone.x)} y={zY(zone.y)}
                width={zone.width * SCALE} height={zone.height * SCALE}
                fill={zone.color} opacity={isMoving ? 0.2 : 0.45}
                stroke={zone.color} strokeWidth={2} rx={5}
                onLongPress={!isInteractive ? () => onZoneLongPress?.(zone) : undefined}
              />
              <SvgText
                x={cx} y={cy + 4}
                textAnchor="middle"
                fontSize={Math.max(9, Math.min(13, zone.width * SCALE / zone.commonName.length))}
                fill="#1b4332" fontWeight="700"
                opacity={isMoving ? 0.3 : 1}>
                {zone.commonName}
              </SvgText>
            </G>
          );
        })}

        {/* Individual plants */}
        {garden.plants.map((plant) => {
          const isMoving = plant.id === movingPlantId;
          return (
            <G key={plant.id}>
              <Circle
                cx={plant.x * SCALE} cy={plant.y * SCALE}
                r={isMoving ? 13 : 11}
                fill={isMoving ? '#ffb703' : '#2d6a4f'}
                opacity={isMoving ? 0.55 : 1}
                onPress={!isInteractive ? () => onPlantPress(plant) : undefined}
                onLongPress={!isInteractive ? () => onPlantLongPress?.(plant) : undefined}
              />
              <SvgText
                x={plant.x * SCALE} y={plant.y * SCALE + 22}
                textAnchor="middle" fontSize={8} fill="#1b4332" fontWeight="600">
                {plant.commonName.length > 10
                  ? plant.commonName.slice(0, 9) + '…'
                  : plant.commonName}
              </SvgText>
            </G>
          );
        })}

        {/* First-point marker during zone drawing */}
        {highlightPoint && (
          <G>
            <Rect
              x={zX(highlightPoint.x)} y={zY(highlightPoint.y)}
              width={SCALE} height={SCALE}
              fill="#2d6a4f" opacity={0.3} rx={4}
            />
            <Circle
              cx={highlightPoint.x * SCALE} cy={highlightPoint.y * SCALE}
              r={6} fill="#2d6a4f" opacity={0.9}
            />
          </G>
        )}
      </Svg>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: { width: MAP_WIDTH, height: MAP_HEIGHT },
});
