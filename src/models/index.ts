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

/** Per-plant badge status — used by GardenMap to render action indicators */
export interface PlantStatus {
  needsWater: boolean;
  needsFertilize: boolean;
  needsPrune: boolean;
  harvestReady: boolean;
  overdueCount: number;
}

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

export interface HarvestEntry {
  id: string;
  date: string;           // ISO 8601
  amountGrams?: number;
  notes?: string;
}

export interface RotationRecord {
  plantFamily: string;
  x: number;
  y: number;
  removedDate: string;
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
  fillPattern?: 'solid' | 'grass' | 'forest' | 'gravel' | 'water'; // zone texture
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
  plantFamily?: string;    // voor gewasrotatie
  notes?: string;
  addedVia?: PlantAddedVia;
  photoLog?: PhotoLogEntry[];
  harvestLog?: HarvestEntry[];
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

export interface HarvestEntry {
  id: string;
  date: string;
  weightG?: number;
  count?: number;
  notes?: string;
}

export type SoilType = 'clay' | 'loam' | 'sand' | 'peat';

export interface SoilAmendment {
  id: string;
  date: string;
  type: string;
  notes?: string;
}

export interface SoilProfile {
  id: string;
  gardenId: string;
  zoneName: string;
  ph?: number;
  soilType?: SoilType;
  lastTestedDate?: string;
  amendments: SoilAmendment[];
}

export const ZONE_COLORS = [
  '#95d5b2', '#52b788', '#ffb703', '#e76f51',
  '#a8dadc', '#e9c46a', '#c9b1ff', '#ffd6e0',
];

/** @deprecated Zones are represented as Plants with width/height > 1. This interface is unused. */
export interface PlantZone {
  id: string;
  gardenId: string;
  commonName: string;
  species?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  careTips?: string[];
  notes?: string;
}

export type BoundaryType =
  | 'fence'       // 🪵 Schutting
  | 'wall'        // 🧱 Muur
  | 'hedge'       // 🌿 Haag
  | 'forest'      // 🌳 Bebossing
  | 'lawn'        // 🌾 Gras
  | 'patio'       // 🪨 Terras
  | 'pond'        // 🌊 Vijver
  | 'path';       // 🪵 Looppad

export interface GardenBoundary {
  id: string;
  type: BoundaryType;
  // Rechthoekig vlak (voor lawn, patio, pond, forest):
  x?: number; y?: number; width?: number; height?: number;
  // Lijn/looppad (voor fence, wall, hedge, path) — 2 punten:
  x1?: number; y1?: number; x2?: number; y2?: number;
}

export interface Garden {
  id: string;
  userId: string;
  name: string;
  gridCols?: number;  // default 25 (each cell = 30×30 cm)
  gridRows?: number;  // default 25
  polygons: GardenPolygon[];
  plants: Plant[];
  /** @deprecated Use Plants with width/height > 1 instead */
  zones?: PlantZone[];
  tasks?: GardenTask[];
  boundaries?: GardenBoundary[];
  lastScannedAt?: string;
  northOrientationDeg?: number;
  soilProfiles?: SoilProfile[];
}

export interface SeedPacket {
  id: string;
  commonName: string;
  species?: string;
  emoji?: string;
  purchaseDate?: string;   // ISO date
  expiryYear?: number;     // e.g. 2026
  amountGrams?: number;
  notes?: string;
  isUsedUp?: boolean;
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

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlockedAt?: string; // ISO date
}

export interface GardenStats {
  currentStreak: number;       // consecutive days with ≥1 task completed
  longestStreak: number;
  totalTasksCompleted: number;
  lastCompletionDate?: string;  // YYYY-MM-DD
  badges: Badge[];
}

export const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt'>[] = [
  { id: 'first_task',  name: 'Eerste stap',     emoji: '🌱', description: 'Eerste taak voltooid' },
  { id: 'streak_3',   name: 'Op dreef',          emoji: '🔥', description: '3 dagen op rij actief' },
  { id: 'streak_7',   name: 'Groene week',       emoji: '🌿', description: '7 dagen streak' },
  { id: 'streak_30',  name: 'Tuinmeester',       emoji: '🏆', description: '30 dagen streak' },
  { id: 'tasks_10',   name: 'Vlijtige tuinier',  emoji: '💪', description: '10 taken voltooid' },
  { id: 'tasks_50',   name: 'Doorgewinterd',     emoji: '⭐', description: '50 taken voltooid' },
  { id: 'tasks_100',  name: 'Groene duim',       emoji: '🎯', description: '100 taken voltooid' },
];
