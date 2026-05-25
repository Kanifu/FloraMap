import { Plant } from '@/models';

/** Returns list of plant IDs that are too close to the given plant */
export const findOvercrowdedPlants = (
  newPlant: { x: number; y: number; estimatedSizeM?: number },
  allPlants: Plant[],
): string[] => {
  const minDistanceCells = Math.max(1, Math.round((newPlant.estimatedSizeM ?? 0.4) * 2));
  const tooClose: string[] = [];
  for (const p of allPlants) {
    const dist = Math.sqrt((newPlant.x - p.x) ** 2 + (newPlant.y - p.y) ** 2);
    const requiredDist = Math.max(
      minDistanceCells,
      Math.round(((p.estimatedSizeM ?? 0.4) + (newPlant.estimatedSizeM ?? 0.4)) * 2),
    );
    if (dist < requiredDist && dist > 0) {
      tooClose.push(p.id);
    }
  }
  return tooClose;
};
