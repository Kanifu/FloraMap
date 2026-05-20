import React from 'react';
import { View, StyleSheet, LayoutChangeEvent, Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType, PlantZone } from '@/models';

interface GardenMapProps {
  garden: Garden;
  onPlantPress: (plant: Plant) => void;
  onPlantLongPress?: (plant: Plant) => void;
  onZoneLongPress?: (zone: PlantZone) => void;
  viewMode: '2d' | 'isometric';
  /** When set, taps on map background fire onMapPress */
  isInteractive?: boolean;
  /** Highlight a grid point during zone drawing (first tap marker) */
  highlightPoint?: { x: number; y: number } | null;
  /** ID of the plant currently being moved (shown in amber) */
  movingPlantId?: string | null;
  /** ID of the zone currently being moved (shown faded) */
  movingZoneId?: string | null;
  onMapPress?: (gridX: number, gridY: number) => void;
}

const POLYGON_COLORS: Record<GardenPolygonType, string> = {
  border: '#6b705c',
  lawn: '#52b788',
  patio: '#adb5bd',
  path: '#ced4da',
  bed: '#8b5e3c',
};

const SCALE = 50;
const GRID_COLS = 10;
const GRID_ROWS = 10;

const toSvgPoints = (polygon: GardenPolygon): string =>
  polygon.points.map((p) => `${p.x * SCALE},${p.y * SCALE}`).join(' ');

/** Convert grid cell (1-indexed) to SVG top-left pixel for a zone rect */
const zoneX = (col: number) => (col - 0.5) * SCALE;
const zoneY = (row: number) => (row - 0.5) * SCALE;

export const GardenMap = ({
  garden,
  onPlantPress,
  onPlantLongPress,
  onZoneLongPress,
  viewMode,
  isInteractive = false,
  highlightPoint,
  movingPlantId,
  movingZoneId,
  onMapPress,
}: GardenMapProps): React.JSX.Element => {
  const [size, setSize] = React.useState({ width: 300, height: 300 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const groupTransform = viewMode === 'isometric' ? 'skewX(17) scale(1, 0.6)' : undefined;

  const handleBgTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!onMapPress) return;
    const gridX = Math.max(1, Math.min(Math.round(e.nativeEvent.locationX / SCALE), GRID_COLS));
    const gridY = Math.max(1, Math.min(Math.round(e.nativeEvent.locationY / SCALE), GRID_ROWS));
    onMapPress(gridX, gridY);
  };

  const mapW = GRID_COLS * SCALE;
  const mapH = GRID_ROWS * SCALE;
  const zones = garden.zones ?? [];

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Pressable onPress={isInteractive ? handleBgTap : undefined} style={styles.pressable}>
        <Svg width={size.width} height={size.height}>
          <G transform={groupTransform}>
            {/* Base background */}
            <Rect x={0} y={0} width={mapW} height={mapH} fill="#e8f5e9" />

            {/* Grid lines shown when interactive */}
            {isInteractive && Array.from({ length: GRID_COLS + 1 }, (_, i) => (
              <Rect key={`vl${i}`} x={i * SCALE} y={0} width={1} height={mapH} fill="#b7e4c7" opacity={0.7} />
            ))}
            {isInteractive && Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
              <Rect key={`hl${i}`} x={0} y={i * SCALE} width={mapW} height={1} fill="#b7e4c7" opacity={0.7} />
            ))}

            {/* Garden polygons (lawn, bed, patio…) */}
            {garden.polygons.map((polygon) => (
              <Polygon key={polygon.id} points={toSvgPoints(polygon)} fill={POLYGON_COLORS[polygon.type]} />
            ))}

            {/* Plant zones */}
            {zones.map((zone) => {
              const isMoving = zone.id === movingZoneId;
              return (
                <G key={zone.id}>
                  <Rect
                    x={zoneX(zone.x)}
                    y={zoneY(zone.y)}
                    width={zone.width * SCALE}
                    height={zone.height * SCALE}
                    fill={zone.color}
                    opacity={isMoving ? 0.25 : 0.45}
                    stroke={zone.color}
                    strokeWidth={2}
                    rx={6}
                    onPress={!isInteractive ? undefined : undefined}
                    onLongPress={!isInteractive ? () => onZoneLongPress?.(zone) : undefined}
                  />
                  <SvgText
                    x={zoneX(zone.x) + (zone.width * SCALE) / 2}
                    y={zoneY(zone.y) + (zone.height * SCALE) / 2 + 4}
                    textAnchor="middle"
                    fontSize={Math.min(13, zone.width * 6)}
                    fill="#1b4332"
                    fontWeight="700"
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
                    cx={plant.x * SCALE}
                    cy={plant.y * SCALE}
                    r={isMoving ? 14 : 12}
                    fill={isMoving ? '#ffb703' : '#2d6a4f'}
                    opacity={isMoving ? 0.5 : 1}
                    onPress={!isInteractive ? () => onPlantPress(plant) : undefined}
                    onLongPress={!isInteractive ? () => onPlantLongPress?.(plant) : undefined}
                  />
                  <SvgText
                    x={plant.x * SCALE}
                    y={plant.y * SCALE + 24}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#1b4332"
                    fontWeight="600">
                    {plant.commonName.length > 12 ? plant.commonName.slice(0, 10) + '…' : plant.commonName}
                  </SvgText>
                </G>
              );
            })}

            {/* First-point marker when drawing a zone */}
            {highlightPoint && (
              <G>
                <Rect
                  x={zoneX(highlightPoint.x)}
                  y={zoneY(highlightPoint.y)}
                  width={SCALE}
                  height={SCALE}
                  fill="#2d6a4f"
                  opacity={0.35}
                  rx={4}
                />
                <Circle
                  cx={highlightPoint.x * SCALE}
                  cy={highlightPoint.y * SCALE}
                  r={6}
                  fill="#2d6a4f"
                  opacity={0.9}
                />
              </G>
            )}
          </G>
        </Svg>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8f3' },
  pressable: { flex: 1 },
});
