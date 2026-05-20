import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
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
  const removePlant = useGardenStore((s) => s.removePlant);
  const updatePlant = useGardenStore((s) => s.updatePlant);

  const [movingPlant, setMovingPlant] = React.useState<Plant | null>(null);

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

  const handlePlantLongPress = (plant: Plant) => {
    Alert.alert(
      plant.commonName,
      'Wat wil je doen met deze plant?',
      [
        {
          text: 'Verplaatsen',
          onPress: () => setMovingPlant(plant),
        },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Plant verwijderen',
              `${plant.commonName} verwijderen uit je tuin?`,
              [
                { text: 'Annuleren', style: 'cancel' },
                {
                  text: 'Verwijderen',
                  style: 'destructive',
                  onPress: () => removePlant(plant.id),
                },
              ],
            );
          },
        },
        { text: 'Annuleren', style: 'cancel' },
      ],
    );
  };

  const handleMapPress = (x: number, y: number) => {
    if (!movingPlant) return;
    updatePlant({ ...movingPlant, x, y });
    setMovingPlant(null);
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

      {movingPlant ? (
        <View style={styles.moveBanner}>
          <Text style={styles.moveBannerText}>
            Tik op de kaart om {movingPlant.commonName} te verplaatsen
          </Text>
          <TouchableOpacity onPress={() => setMovingPlant(null)}>
            <Text style={styles.moveBannerCancel}>Annuleer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>Lang indrukken om een plant te verplaatsen of verwijderen</Text>
        </View>
      )}

      <GardenMap
        garden={garden}
        onPlantPress={handlePlantPress}
        onPlantLongPress={handlePlantLongPress}
        viewMode="2d"
        movingPlantId={movingPlant?.id}
        onMapPress={handleMapPress}
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
  moveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffb703',
    gap: 8,
  },
  moveBannerText: { flex: 1, fontSize: 13, color: '#1b1b1b', fontWeight: '600' },
  moveBannerCancel: { fontSize: 13, color: '#e63946', fontWeight: '700' },
  hintBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  hintText: { fontSize: 11, color: '#aaa', textAlign: 'center' },
});

export default MapScreen;
