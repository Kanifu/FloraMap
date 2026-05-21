import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garden, Plant, DiffProposal, GardenTask, MaintenanceTask } from '@/models';

interface GardenState {
  garden: Garden | null;
  isScanning: boolean;
  pendingDiffProposals: DiffProposal[];
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
}

export const useGardenStore = create<GardenState & GardenActions>()(
  persist(
    (set, get) => ({
      garden: null,
      isScanning: false,
      pendingDiffProposals: [],

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
        set({
          garden: {
            ...garden,
            plants: garden.plants.filter((p) => p.id !== plantId),
          },
        });
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
    }),
    {
      name: 'garden-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ garden: state.garden }),
    },
  ),
);
