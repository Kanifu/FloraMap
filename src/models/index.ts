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
  intervalDays?: number; // if set, a new task is auto-created when this one is completed
}

export type LightExposure = 'full_sun' | 'partial_shade' | 'full_shade';
export type PlantAddedVia = 'scan' | 'manual' | 'seed' | 'seedling' | 'cutting';

export interface PhotoLogEntry {
  id: string;
  uri: string;       // local file path
  date: string;      // ISO 8601
  note?: string;
}

export interface Plant {
  id: string;
  gardenId: string;
  species: string;
  commonName: string;
  x: number;
  y: number;
  z: number;
  width?: number;   // cells wide;  1 = single dot (default)
  height?: number;  // cells tall;  1 = single dot (default)
  color?: string;   // fill colour when width>1 or height>1
  plantedDate?: string;
  sowDate?: string;
  lastMaintenanceDate?: string;
  maintenanceTasks: MaintenanceTask[];
  lightExposure?: LightExposure;
  estimatedSizeM?: number;
  identificationConfidence: number;
  imageUri?: string;
  careTips?: string[];
  harvestMonths?: number[]; // 0-indexed months when harvest is expected (0=Jan, 5=Jun)
  notes?: string;
  addedVia?: PlantAddedVia;
  photoLog?: PhotoLogEntry[];
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

export const ZONE_COLORS = [
  '#95d5b2', '#52b788', '#ffb703', '#e76f51',
  '#a8dadc', '#e9c46a', '#c9b1ff', '#ffd6e0',
];

export interface PlantZone {
  id: string;
  gardenId: string;
  commonName: string;
  species?: string;
  x: number;       // top-left grid column (1-indexed)
  y: number;       // top-left grid row (1-indexed)
  width: number;   // cells wide  (≥1)
  height: number;  // cells tall  (≥1)
  color: string;
  careTips?: string[];
  notes?: string;
}

export interface Garden {
  id: string;
  userId: string;
  name: string;
  gridCols?: number;  // default 25 (each cell = 30×30 cm)
  gridRows?: number;  // default 25
  polygons: GardenPolygon[];
  plants: Plant[];
  zones?: PlantZone[];
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
