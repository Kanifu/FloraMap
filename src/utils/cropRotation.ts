import { Plant, RotationRecord } from '@/models';

/**
 * Returns a warning string if the plant would repeat a family within 2 years and 3 cells.
 * Returns null if rotation looks fine.
 */
export const checkCropRotation = (
  plant: { x: number; y: number; plantFamily?: string },
  existingPlants: Plant[],
  rotationHistory: RotationRecord[],
): string | null => {
  if (!plant.plantFamily) return null;
  const family = plant.plantFamily;
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const distance = (ax: number, ay: number, bx: number, by: number) =>
    Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

  // Check existing living plants
  for (const p of existingPlants) {
    if (p.plantFamily === family && distance(plant.x, plant.y, p.x, p.y) <= 3) {
      return `⚠️ ${family}-gewas staat al op ${Math.round(distance(plant.x, plant.y, p.x, p.y))} cellen afstand — roteer voor betere bodemgezondheid.`;
    }
  }
  // Check rotation history
  for (const rec of rotationHistory) {
    if (rec.plantFamily === family && distance(plant.x, plant.y, rec.x, rec.y) <= 3 &&
        new Date(rec.removedDate) > twoYearsAgo) {
      return `⚠️ ${family}-gewas stond hier recent — wacht 2 jaar voor herhaalteelt om ziektes te voorkomen.`;
    }
  }
  return null;
};
