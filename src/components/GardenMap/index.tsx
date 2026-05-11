import React from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Polygon, Circle, G } from 'react-native-svg';
import { Garden, Plant, GardenPolygon, GardenPolygonType } from '@/models';

interface GardenMapProps {
  garden: Garden;
  onPlantPress: (plant: Plant) => void;
  viewMode: '2d' | 'isometric';
}

const POLYGON_COLORS: Record<GardenPolygonType, string> = {
  border: '#6b705c',
  lawn: '#52b788',
  patio: '#adb5bd',
  path: '#ced4da',
  bed: '#8b5e3c',
};

const SCALE = 50;

const toSvgPoints = (polygon: GardenPolygon): string =>
  polygon.points.map((p) => `${p.x * SCALE},${p.y * SCALE}`).join(' ');

export const GardenMap = ({ garden, onPlantPress, viewMode }: GardenMapProps): React.JSX.Element => {
  const [size, setSize] = React.useState({ width: 300, height: 300 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const groupTransform = viewMode === 'isometric' ? 'skewX(17) scale(1, 0.6)' : undefined;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Svg width={size.width} height={size.height}>
        <G transform={groupTransform}>
          {garden.polygons.map((polygon) => (
            <Polygon
              key={polygon.id}
              points={toSvgPoints(polygon)}
              fill={POLYGON_COLORS[polygon.type]}
            />
          ))}
          {garden.plants.map((plant) => (
            <Circle
              key={plant.id}
              cx={plant.x * SCALE}
              cy={plant.y * SCALE}
              r={10}
              fill="#2d6a4f"
              onPress={() => onPlantPress(plant)}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f8f3',
  },
});
