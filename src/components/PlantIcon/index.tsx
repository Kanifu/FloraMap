import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Plant } from '@/models';

interface PlantIconProps {
  plant: Plant;
  onPress: () => void;
  size?: number;
}

const getPlantEmoji = (species: string): string => {
  const lower = species.toLowerCase();
  if (lower.includes('rosa') || lower.includes('rose')) return '🌹';
  if (lower.includes('tree') || lower.includes('arbor') || lower.includes('quercus')) return '🌳';
  if (lower.includes('tulip') || lower.includes('tulipa')) return '🌷';
  if (lower.includes('sunflower') || lower.includes('helianthus')) return '🌻';
  if (lower.includes('daisy') || lower.includes('bellis')) return '🌼';
  if (lower.includes('cactus') || lower.includes('succulent')) return '🌵';
  if (lower.includes('herb') || lower.includes('mint') || lower.includes('basil')) return '🌿';
  return '🌿';
};

const hasOverdueTasks = (plant: Plant): boolean => {
  const now = new Date().toISOString();
  return plant.maintenanceTasks.some(
    (task) => !task.completedDate && task.dueDate < now,
  );
};

export const PlantIcon = ({ plant, onPress, size = 40 }: PlantIconProps): React.JSX.Element => {
  const overdue = hasOverdueTasks(plant);
  const emoji = getPlantEmoji(plant.species);

  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      </View>
      {overdue && <View style={styles.badge} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: '#d8f3dc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2d6a4f',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e63946',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
