import React from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Group,
  Circle,
  Text as SkiaText,
  useFont,
} from '@shopify/react-native-skia';
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

const buildPath = (polygon: GardenPolygon, scale: number): ReturnType<typeof Skia.Path.Make> => {
  const path = Skia.Path.Make();
  if (polygon.points.length === 0) return path;
  path.moveTo(polygon.points[0].x * scale, polygon.points[0].y * scale);
  for (let i = 1; i < polygon.points.length; i++) {
    path.lineTo(polygon.points[i].x * scale, polygon.points[i].y * scale);
  }
  path.close();
  return path;
};

const SCALE = 50;

export const GardenMap = ({ garden, onPlantPress, viewMode }: GardenMapProps): React.JSX.Element => {
  const [canvasSize, setCanvasSize] = React.useState({ width: 300, height: 300 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const isometricTransform = viewMode === 'isometric'
    ? [{ skewX: 0.3 }, { scaleY: 0.6 }]
    : [];

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Canvas style={{ width: canvasSize.width, height: canvasSize.height }}>
        <Group transform={isometricTransform}>
          {garden.polygons.map((polygon) => {
            const path = buildPath(polygon, SCALE);
            return (
              <Path
                key={polygon.id}
                path={path}
                color={POLYGON_COLORS[polygon.type]}
                style="fill"
              />
            );
          })}
          {garden.plants.map((plant) => (
            <React.Fragment key={plant.id}>
              <Circle
                cx={plant.x * SCALE}
                cy={plant.y * SCALE}
                r={10}
                color="#2d6a4f"
              />
            </React.Fragment>
          ))}
        </Group>
      </Canvas>
      {garden.plants.map((plant) => {
        const pressHandler = () => onPlantPress(plant);
        return (
          <View
            key={`touch-${plant.id}`}
            style={[
              styles.plantTouchable,
              {
                left: plant.x * SCALE - 14,
                top: plant.y * SCALE - 14,
              },
            ]}
            onTouchEnd={pressHandler}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f8f3',
  },
  plantTouchable: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
