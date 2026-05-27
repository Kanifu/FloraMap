import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garden, Plant, DiffProposal, GardenTask, MaintenanceTask, GardenBoundary, GardenStats, BADGE_DEFINITIONS, HarvestEntry, RotationRecord, SeedPacket } from '@/models';

const DEFAULT_STATS: GardenStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalTasksCompleted: 0,
  lastCompletionDate: undefined,
  badges: [],
};

interface GardenState {
  garden: Garden | null;
  isScanning: boolean;
  pendingDiffProposals: DiffProposal[];
  gardenStats: GardenStats;
  rotationHistory: RotationRecord[];
  seedPackets: SeedPacket[];
}

interface GardenActions {
  setGarden: (garden: Garden) => void;
  clearGarden: () => void;
  updatePlant: (plant: Plant) => void;
  addPlant: (plant: Plant) => void;
  removePlant: (plantId: string) => void;
  completeMaintenanceTask: (plantId: string, taskId: string) => void;
  addGardenTask: (task: GardenTask) => void;
  completeGardenTask: (taskId: string) => void;
  acceptDiffProposal: (proposalId: string) => void;
  rejectDiffProposal: (proposalId: string) => void;
  setScanning: (isScanning: boolean) => void;
  addBoundary: (boundary: GardenBoundary) => void;
  removeBoundary: (boundaryId: string) => void;
  updateBoundary: (boundary: GardenBoundary) => void;
  recordTaskCompletion: () => void;
  recordHarvest: (plantId: string, entry: HarvestEntry) => void;
  addRotationRecord: (record: RotationRecord) => void;
  addSeedPacket: (packet: SeedPacket) => void;
  updateSeedPacket: (packet: SeedPacket) => void;
  removeSeedPacket: (id: string) => void;
}

export const useGardenStore = create<GardenState & GardenActions>()(
  persist(
    (set, get) => ({
      garden: null,
      isScanning: false,
      pendingDiffProposals: [],
      gardenStats: DEFAULT_STATS,
      rotationHistory: [],
      seedPackets: [],

      setGarden: (garden) => set({ garden }),

      clearGarden: () => set({ garden: null }),

      updatePlant: (plant) => {
        const { garden } = get();
        if (!garden) return;
        set({
          garden: {
            ...garden,
            plants: garden.plants.map((p) => (p.id === plant.id ? plant : p)),
          },
        });
      },

      addPlant: (plant) => {
        const { garden } = get();
        if (!garden) return;
        set({
          garden: {
            ...garden,
            plants: [...garden.plants, plant],
          },
        });
      },

      removePlant: (plantId) => {
        const { garden } = get();
        if (!garden) return;
        const removedPlant = garden.plants.find((p) => p.id === plantId);
        const updatedGarden = { ...garden, plants: garden.plants.filter((p) => p.id !== plantId) };
        if (removedPlant?.plantFamily) {
          set({
            garden: updatedGarden,
            rotationHistory: [
              ...get().rotationHistory,
              { plantFamily: removedPlant.plantFamily, x: removedPlant.x, y: removedPlant.y, removedDate: new Date().toISOString() },
            ],
          });
        } else {
          set({ garden: updatedGarden });
        }
      },

      completeMaintenanceTask: (plantId, taskId) => {
        const { garden } = get();
        if (!garden) return;
        const plant = garden.plants.find((p) => p.id === plantId);
        if (!plant) return;

        const now = new Date();
        const completedTask = plant.maintenanceTasks.find((t) => t.id === taskId);

        const updatedTasks: MaintenanceTask[] = plant.maintenanceTasks.map((t) =>
          t.id === taskId ? { ...t, completedDate: now.toISOString() } : t,
        );

        // Auto-schedule next occurrence for recurring tasks
        if (completedTask?.intervalDays && !completedTask.completedDate) {
          const nextDue = new Date(now);
          nextDue.setDate(nextDue.getDate() + completedTask.intervalDays);
          updatedTasks.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            plantId,
            type: completedTask.type,
            dueDate: nextDue.toISOString(),
            intervalDays: completedTask.intervalDays,
            notes: completedTask.notes,
          });
        }

        set({
          garden: {
            ...garden,
            plants: garden.plants.map((p) =>
              p.id === plantId
                ? { ...p, maintenanceTasks: updatedTasks, lastMaintenanceDate: now.toISOString() }
                : p,
            ),
          },
        });
      },

      addGardenTask: (task) => {
        const { garden } = get();
        if (!garden) return;
        set({
          garden: {
            ...garden,
            tasks: [...(garden.tasks ?? []), task],
          },
        });
      },

      completeGardenTask: (taskId) => {
        const { garden } = get();
        if (!garden) return;
        set({
          garden: {
            ...garden,
            tasks: (garden.tasks ?? []).map((t) =>
              t.id === taskId ? { ...t, completedDate: new Date().toISOString() } : t,
            ),
          },
        });
      },

      acceptDiffProposal: (proposalId) => {
        const { pendingDiffProposals, garden } = get();
        const proposal = pendingDiffProposals.find((p) => p.id === proposalId);
        if (!proposal || !garden) return;

        let updatedPlants = [...garden.plants];
        if (proposal.type === 'add') {
          updatedPlants = [...updatedPlants, proposal.plant];
        } else if (proposal.type === 'remove') {
          updatedPlants = updatedPlants.filter((p) => p.id !== proposal.plant.id);
        } else if (proposal.type === 'update') {
          updatedPlants = updatedPlants.map((p) =>
            p.id === proposal.plant.id ? proposal.plant : p,
          );
        }

        set({
          garden: { ...garden, plants: updatedPlants },
          pendingDiffProposals: pendingDiffProposals.filter((p) => p.id !== proposalId),
        });
      },

      rejectDiffProposal: (proposalId) => {
        set((state) => ({
          pendingDiffProposals: state.pendingDiffProposals.filter(
            (p) => p.id !== proposalId,
          ),
        }));
      },

      setScanning: (isScanning) => set({ isScanning }),

      addBoundary: (boundary) => set((s) => ({
        garden: s.garden ? { ...s.garden, boundaries: [...(s.garden.boundaries ?? []), boundary] } : null,
      })),

      removeBoundary: (id) => set((s) => ({
        garden: s.garden ? { ...s.garden, boundaries: (s.garden.boundaries ?? []).filter(b => b.id !== id) } : null,
      })),

      updateBoundary: (boundary) => set((s) => ({
        garden: s.garden ? { ...s.garden, boundaries: (s.garden.boundaries ?? []).map(b => b.id === boundary.id ? boundary : b) } : null,
      })),

      recordTaskCompletion: () => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const stats = get().gardenStats;

        // Already counted today
        if (stats.lastCompletionDate === todayStr) return;

        // Check if yesterday to continue streak
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        const newStreak = stats.lastCompletionDate === yesterdayStr
          ? stats.currentStreak + 1
          : 1;

        const newTotal = stats.totalTasksCompleted + 1;
        const newLongest = Math.max(stats.longestStreak, newStreak);

        // Check badge criteria
        const badgeCriteria: Record<string, boolean> = {
          first_task: newTotal >= 1,
          streak_3:   newStreak >= 3,
          streak_7:   newStreak >= 7,
          streak_30:  newStreak >= 30,
          tasks_10:   newTotal >= 10,
          tasks_50:   newTotal >= 50,
          tasks_100:  newTotal >= 100,
        };

        const existingBadgeIds = new Set(stats.badges.map((b) => b.id));
        const newBadges = [...stats.badges];
        for (const def of BADGE_DEFINITIONS) {
          if (!existingBadgeIds.has(def.id) && badgeCriteria[def.id]) {
            newBadges.push({ ...def, unlockedAt: now.toISOString() });
          }
        }

        set({
          gardenStats: {
            currentStreak: newStreak,
            longestStreak: newLongest,
            totalTasksCompleted: newTotal,
            lastCompletionDate: todayStr,
            badges: newBadges,
          },
        });
      },

      recordHarvest: (plantId, entry) => set((s) => ({
        garden: s.garden ? {
          ...s.garden,
          plants: s.garden.plants.map((p) =>
            p.id === plantId ? { ...p, harvestLog: [...(p.harvestLog ?? []), entry] } : p
          ),
        } : null,
      })),

      addRotationRecord: (record) => set((s) => ({
        rotationHistory: [...s.rotationHistory, record],
      })),

      addSeedPacket: (packet) => set((s) => ({
        seedPackets: [...s.seedPackets, packet],
      })),

      updateSeedPacket: (packet) => set((s) => ({
        seedPackets: s.seedPackets.map((p) => (p.id === packet.id ? packet : p)),
      })),

      removeSeedPacket: (id) => set((s) => ({
        seedPackets: s.seedPackets.filter((p) => p.id !== id),
      })),
    }),
    {
      name: 'garden-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ garden: state.garden, gardenStats: state.gardenStats, rotationHistory: state.rotationHistory, seedPackets: state.seedPackets }),
    },
  ),
);
