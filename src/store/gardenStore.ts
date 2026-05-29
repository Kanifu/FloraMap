import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garden, Plant, DiffProposal, GardenTask, MaintenanceTask } from '@/models';

interface GardenState {
  garden: Garden | null;       // active garden (always in sync with gardens[activeGardenId])
  gardens: Garden[];           // all saved gardens
  activeGardenId: string | null;
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
  // Multi-garden actions
  createGarden: (name: string) => Garden;
  switchGarden: (id: string) => void;
  renameGarden: (id: string, name: string) => void;
  deleteGarden: (id: string) => void;
}

/** Sync updated active garden into the gardens array */
const syncActive = (state: GardenState, updated: Garden): Partial<GardenState> => ({
  garden: updated,
  gardens: state.gardens.map((g) => (g.id === updated.id ? updated : g)),
});

export const useGardenStore = create<GardenState & GardenActions>()(
  persist(
    (set, get) => ({
      garden: null,
      gardens: [],
      activeGardenId: null,
      isScanning: false,
      pendingDiffProposals: [],

      setGarden: (garden) => {
        const state = get();
        const existing = state.gardens.find((g) => g.id === garden.id);
        if (existing) {
          set({ garden, gardens: state.gardens.map((g) => g.id === garden.id ? garden : g), activeGardenId: garden.id });
        } else {
          set({ garden, gardens: [...state.gardens, garden], activeGardenId: garden.id });
        }
      },

      clearGarden: () => {
        const state = get();
        if (!state.garden) return;
        const cleared = { ...state.garden, plants: [], polygons: [], tasks: [] };
        set({ garden: cleared, gardens: state.gardens.map((g) => g.id === cleared.id ? cleared : g) });
      },

      updatePlant: (plant) => {
        const { garden } = get();
        if (!garden) return;
        const updated = { ...garden, plants: garden.plants.map((p) => (p.id === plant.id ? plant : p)) };
        set(syncActive(get(), updated));
      },

      addPlant: (plant) => {
        const { garden } = get();
        if (!garden) return;
        const updated = { ...garden, plants: [...garden.plants, plant] };
        set(syncActive(get(), updated));
      },

      removePlant: (plantId) => {
        const { garden } = get();
        if (!garden) return;
        const updated = { ...garden, plants: garden.plants.filter((p) => p.id !== plantId) };
        set(syncActive(get(), updated));
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

        const updated = {
          ...garden,
          plants: garden.plants.map((p) =>
            p.id === plantId
              ? { ...p, maintenanceTasks: updatedTasks, lastMaintenanceDate: now.toISOString() }
              : p,
          ),
        };
        set(syncActive(get(), updated));
      },

      addGardenTask: (task) => {
        const { garden } = get();
        if (!garden) return;
        const updated = { ...garden, tasks: [...(garden.tasks ?? []), task] };
        set(syncActive(get(), updated));
      },

      completeGardenTask: (taskId) => {
        const { garden } = get();
        if (!garden) return;
        const updated = {
          ...garden,
          tasks: (garden.tasks ?? []).map((t) =>
            t.id === taskId ? { ...t, completedDate: new Date().toISOString() } : t,
          ),
        };
        set(syncActive(get(), updated));
      },

      acceptDiffProposal: (proposalId) => {
        const { pendingDiffProposals, garden } = get();
        const proposal = pendingDiffProposals.find((p) => p.id === proposalId);
        if (!proposal || !garden) return;

        let updatedPlants = [...garden.plants];
        if (proposal.type === 'add') updatedPlants = [...updatedPlants, proposal.plant];
        else if (proposal.type === 'remove') updatedPlants = updatedPlants.filter((p) => p.id !== proposal.plant.id);
        else if (proposal.type === 'update') updatedPlants = updatedPlants.map((p) => p.id === proposal.plant.id ? proposal.plant : p);

        const updated = { ...garden, plants: updatedPlants };
        set({ ...syncActive(get(), updated), pendingDiffProposals: pendingDiffProposals.filter((p) => p.id !== proposalId) });
      },

      rejectDiffProposal: (proposalId) => {
        set((state) => ({
          pendingDiffProposals: state.pendingDiffProposals.filter((p) => p.id !== proposalId),
        }));
      },

      setScanning: (isScanning) => set({ isScanning }),

      createGarden: (name) => {
        const id = `garden-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newGarden: Garden = { id, userId: 'local', name, polygons: [], plants: [], tasks: [] };
        const state = get();
        set({ gardens: [...state.gardens, newGarden], garden: newGarden, activeGardenId: id });
        return newGarden;
      },

      switchGarden: (id) => {
        const { gardens } = get();
        const target = gardens.find((g) => g.id === id);
        if (target) set({ garden: target, activeGardenId: id });
      },

      renameGarden: (id, name) => {
        const state = get();
        const updated = state.gardens.map((g) => g.id === id ? { ...g, name } : g);
        const active = state.garden?.id === id ? { ...state.garden, name } : state.garden;
        set({ gardens: updated, garden: active });
      },

      deleteGarden: (id) => {
        const state = get();
        const remaining = state.gardens.filter((g) => g.id !== id);
        if (state.activeGardenId === id) {
          const next = remaining[remaining.length - 1] ?? null;
          set({ gardens: remaining, garden: next, activeGardenId: next?.id ?? null });
        } else {
          set({ gardens: remaining });
        }
      },
    }),
    {
      name: 'garden-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        garden: state.garden,
        gardens: state.gardens,
        activeGardenId: state.activeGardenId,
      }),
      onRehydrateStorage: () => (state) => {
        // Migrate old format: single garden → gardens array
        if (state && state.garden && state.gardens.length === 0) {
          state.gardens = [state.garden];
          state.activeGardenId = state.garden.id;
        }
      },
    },
  ),
);
