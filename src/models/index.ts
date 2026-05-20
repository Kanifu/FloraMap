export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface UserPreferences {
  notificationFrequency: 'daily' | 'weekly' | 'off';
  distanceUnit: 'm' | 'ft';
}

export interface User {
  id: string;
  location?: GeoCoordinates;
  preferences: UserPreferences;
}

export type GardenPolygonType = 'border' | 'lawn' | 'patio' | 'path' | 'bed';

export interface GardenPolygon {
  id: string;
  type: GardenPolygonType;
  points: { x: number; y: number }[];
}

export type MaintenanceTaskType = 'water' | 'prune' | 'fertilize' | 'repot' | 'treat';

export interface MaintenanceTask {
  id: string;
  plantId: string;
  type: MaintenanceTaskType;
  dueDate: string;
  completedDate?: string;
  notes?: string;
}

export type LightExposure = 'full_sun' | 'partial_shade' | 'full_shade';

export interface Plant {
  id: string;
  gardenId: string;
  species: string;
  commonName: string;
  x: number;
  y: number;
  z: number;
  plantedDate?: string;
  lastMaintenanceDate?: string;
  maintenanceTasks: MaintenanceTask[];
  lightExposure?: LightExposure;
  estimatedSizeM?: number;
  identificationConfidence: number;
  imageUri?: string;
  careTips?: string[];
}

export type GardenTaskUrgency = 'high' | 'medium' | 'low';

export interface GardenTask {
  id: string;
  description: string;
  dueDate: string;
  completedDate?: string;
  urgency: GardenTaskUrgency;
  plantName?: string;
}

export interface Garden {
  id: string;
  userId: string;
  name: string;
  polygons: GardenPolygon[];
  plants: Plant[];
  tasks?: GardenTask[];
  lastScannedAt?: string;
  northOrientationDeg?: number;
}

export interface ScanResult {
  gardenSnapshot: Garden;
  newPlants: Plant[];
  removedPlantIds: string[];
  updatedPlants: Plant[];
}

export interface DiffProposal {
  id: string;
  type: 'add' | 'remove' | 'update';
  plant: Plant;
  confidence: number;
}
