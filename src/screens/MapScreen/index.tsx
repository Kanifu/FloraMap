import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { GardenMap } from '@/components/GardenMap';
import { MapStackParamList } from '@/navigation/AppNavigator';
import { Plant } from '@/models';

type MapNavProp = StackNavigationProp<MapStackParamList, 'Map'>;

const MapScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MapNavProp>();
  const garden = useGardenStore((s) => s.garden);

  const pendingTaskCount = React.useMemo(() => {
    if (!garden) return 0;
    const now = new Date().toISOString();
    return garden.plants.reduce((acc, plant) => {
      const overdue = plant.maintenanceTasks.filter(
        (t) => !t.completedDate && t.dueDate < now,
      ).length;
      return acc + overdue;
    }, 0);
  }, [garden]);

  const handlePlantPress = (plant: Plant) => {
    navigation.navigate('PlantCard', { plantId: plant.id });
  };

  if (!garden || garden.plants.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌳</Text>
        <Text style={styles.emptyTitle}>Je tuin is nog leeg</Text>
        <Text style={styles.emptySubtitle}>
          Ga naar de Assistent tab om je eerste plant te scannen en toe te voegen.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.gardenName}>{garden.name}</Text>
          <Text style={styles.plantCount}>{garden.plants.length} planten</Text>
        </View>
        {pendingTaskCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingTaskCount} verlopen</Text>
          </View>
        )}
      </View>

      <GardenMap
        garden={garden}
        onPlantPress={handlePlantPress}
        viewMode="2d"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 32,
    gap: 12,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1b4332' },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b705c',
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  gardenName: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  plantCount: { fontSize: 13, color: '#6b705c', marginTop: 2 },
  badge: {
    backgroundColor: '#ffb703',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: '#1b1b1b', fontWeight: '700', fontSize: 13 },
});

export default MapScreen;
