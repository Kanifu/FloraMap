import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garden, Plant, DiffProposal, GardenTask } from '@/models';

interface GardenState {
  garden: Garden | null;
  isScanning: boolean;
  pendingDiffProposals: DiffProposal[];
}

interface GardenActions {
  setGarden: (garden: Garden) => void;
  updatePlant: (plant: Plant) => void;
  addPlant: (plant: Plant) => void;
  removePlant: (plantId: string) => void;
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
