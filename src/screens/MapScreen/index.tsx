import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

  const handleScanPress = () => {
    navigation.getParent()?.navigate('ScanTab');
  };

  if (!garden) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Welkom bij FloraMap</Text>
        <Text style={styles.emptySubtitle}>Je hebt nog geen tuin gescand.</Text>
        <TouchableOpacity style={styles.startButton} onPress={handleScanPress}>
          <Text style={styles.startButtonText}>Start je eerste scan</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.gardenName}>{garden.name}</Text>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>

      <GardenMap
        garden={garden}
        onPlantPress={handlePlantPress}
        viewMode="2d"
      />

      {pendingTaskCount > 0 && (
        <View style={styles.bottomHint}>
          <Text style={styles.bottomHintText}>
            {pendingTaskCount} onderhoudstaak{pendingTaskCount > 1 ? 'en' : ''} verlopen
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b705c',
    marginBottom: 32,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  gardenName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b4332',
  },
  scanButton: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomHint: {
    backgroundColor: '#ffb703',
    padding: 12,
    alignItems: 'center',
  },
  bottomHintText: {
    color: '#1b1b1b',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MapScreen;
