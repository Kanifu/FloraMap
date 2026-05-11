import { Plant, DiffProposal } from '@/models';

const DISTANCE_THRESHOLD = 0.5;

const euclidean = (a: Plant, b: Plant): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const detectDiff = (existing: Plant[], incoming: Plant[]): DiffProposal[] => {
  const proposals: DiffProposal[] = [];
  const matchedExistingIds = new Set<string>();
  const matchedIncomingIndices = new Set<number>();

  for (let i = 0; i < incoming.length; i++) {
    const incomingPlant = incoming[i];
    let bestMatchIndex = -1;
    let bestDistance = Infinity;

    for (let j = 0; j < existing.length; j++) {
      if (matchedExistingIds.has(existing[j].id)) continue;
      const dist = euclidean(incomingPlant, existing[j]);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatchIndex = j;
      }
    }

    if (bestMatchIndex >= 0 && bestDistance < DISTANCE_THRESHOLD) {
      const existingPlant = existing[bestMatchIndex];
      matchedExistingIds.add(existingPlant.id);
      matchedIncomingIndices.add(i);

      const hasChanged =
        existingPlant.species !== incomingPlant.species ||
        existingPlant.commonName !== incomingPlant.commonName;

      if (hasChanged) {
        proposals.push({
          id: `diff-update-${existingPlant.id}`,
          type: 'update',
          plant: { ...existingPlant, ...incomingPlant, id: existingPlant.id },
          confidence: incomingPlant.identificationConfidence,
        });
      }
    }
  }

  for (let i = 0; i < incoming.length; i++) {
    if (matchedIncomingIndices.has(i)) continue;
    proposals.push({
      id: `diff-add-${incoming[i].id}`,
      type: 'add',
      plant: incoming[i],
      confidence: incoming[i].identificationConfidence,
    });
  }

  for (const existingPlant of existing) {
    if (!matchedExistingIds.has(existingPlant.id)) {
      proposals.push({
        id: `diff-remove-${existingPlant.id}`,
        type: 'remove',
        plant: existingPlant,
        confidence: 1,
      });
    }
  }

  return proposals;
};
