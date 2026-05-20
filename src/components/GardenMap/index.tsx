import React from 'react';
import { View, StyleSheet, LayoutChangeEvent, Pressable } from 'react-native';
import Svg, { Polygon, Circle, G, Text as SvgText, Rect } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType } from '@/models';

interface GardenMapProps {
  garden: Garden;
  onPlantPress: (plant: Plant) => void;
  onPlantLongPress?: (plant: Plant) => void;
  viewMode: '2d' | 'isometric';
  movingPlantId?: string | null;
  onMapPress?: (x: number, y: number) => void;
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

export const GardenMap = ({
  garden,
  onPlantPress,
  onPlantLongPress,
  viewMode,
  movingPlantId,
  onMapPress,
}: GardenMapProps): React.JSX.Element => {
  const [size, setSize] = React.useState({ width: 300, height: 300 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const groupTransform = viewMode === 'isometric' ? 'skewX(17) scale(1, 0.6)' : undefined;

  const handleMapTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!onMapPress) return;
    const gridX = Math.max(1, Math.round(e.nativeEvent.locationX / SCALE));
    const gridY = Math.max(1, Math.round(e.nativeEvent.locationY / SCALE));
    onMapPress(gridX, gridY);
  };

  const mapWidth = GRID_COLS * SCALE;
  const mapHeight = GRID_ROWS * SCALE;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Pressable onPress={movingPlantId ? handleMapTap : undefined} style={styles.pressable}>
        <Svg width={size.width} height={size.height}>
          <G transform={groupTransform}>
            {/* Background */}
            <Rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#e8f5e9" />

            {/* Grid lines when in move mode */}
            {movingPlantId && Array.from({ length: GRID_COLS + 1 }, (_, i) => (
              <Rect
                key={`vl-${i}`}
                x={i * SCALE}
                y={0}
                width={1}
                height={mapHeight}
                fill="#b7e4c7"
                opacity={0.6}
              />
            ))}
            {movingPlantId && Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
              <Rect
                key={`hl-${i}`}
                x={0}
                y={i * SCALE}
                width={mapWidth}
                height={1}
                fill="#b7e4c7"
                opacity={0.6}
              />
            ))}

            {garden.polygons.map((polygon) => (
              <Polygon
                key={polygon.id}
                points={toSvgPoints(polygon)}
                fill={POLYGON_COLORS[polygon.type]}
              />
            ))}

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
                    onPress={() => !movingPlantId && onPlantPress(plant)}
                    onLongPress={() => onPlantLongPress?.(plant)}
                  />
                  <SvgText
                    x={plant.x * SCALE}
                    y={plant.y * SCALE + 22}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#1b4332"
                    fontWeight="600">
                    {plant.commonName.length > 12
                      ? plant.commonName.slice(0, 10) + '…'
                      : plant.commonName}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f8f3',
  },
  pressable: {
    flex: 1,
  },
});
