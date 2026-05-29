import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garden, Plant, DiffProposal, GardenTask, MaintenanceTask, SoilProfile, SoilAmendment, HarvestEntry } from '@/models';
import { Tier, TIER_RANK, FREE_PLANT_LIMIT } from '@/constants/tiers';

interface GardenState {
  garden: Garden | null;       // active garden (always in sync with gardens[activeGardenId])
  gardens: Garden[];           // all saved gardens
  activeGardenId: string | null;
  isScanning: boolean;
  pendingDiffProposals: DiffProposal[];
  // Gamification
  unlockedAchievements: Record<string, string>;  // id → ISO unlock date
  recentUnlockId: string | null;                 // cleared after display (not persisted)
  totalTasksCompleted: number;
  currentStreak: number;
  lastTaskDate: string | null;
  totalScans: number;
  userTier: Tier;
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
  // Harvest tracking
  recordHarvest: (plantId: string, entry: HarvestEntry) => void;
  deleteHarvestEntry: (plantId: string, entryId: string) => void;
  // Soil health actions
  setSoilProfile: (profile: SoilProfile) => void;
  addSoilAmendment: (profileId: string, amendment: SoilAmendment) => void;
  deleteSoilProfile: (profileId: string) => void;
  // Multi-garden actions
  createGarden: (name: string) => Garden;
  switchGarden: (id: string) => void;
  renameGarden: (id: string, name: string) => void;
  deleteGarden: (id: string) => void;
  // Achievement actions
  clearRecentUnlock: () => void;
  // Tier / freemium
  setUserTier: (tier: Tier) => void;
}

/** Sync updated active garden into the gardens array */
const syncActive = (state: GardenState, updated: Garden): Partial<GardenState> => ({
  garden: updated,
  gardens: state.gardens.map((g) => (g.id === updated.id ? updated : g)),
});

/** Attempt to unlock multiple achievements; returns updated map + last newly unlocked id */
const tryUnlockMany = (
  unlocked: Record<string, string>,
  ids: string[],
): { unlocked: Record<string, string>; recentUnlockId: string | null } => {
  const next = { ...unlocked };
  let recentUnlockId: string | null = null;
  for (const id of ids) {
    if (!next[id]) {
      next[id] = new Date().toISOString();
      recentUnlockId = id;
    }
  }
  return { unlocked: next, recentUnlockId };
};

export const useGardenStore = create<GardenState & GardenActions>()(
  persist(
    (set, get) => ({
      garden: null,
      gardens: [],
      activeGardenId: null,
      isScanning: false,
      pendingDiffProposals: [],
      unlockedAchievements: {},
      recentUnlockId: null,
      totalTasksCompleted: 0,
      currentStreak: 0,
      lastTaskDate: null,
      totalScans: 0,
      userTier: 'free',

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
        const state = get();
        const { garden } = state;
        if (!garden) return;
        // Enforce free-tier plant limit
        if (TIER_RANK[state.userTier] < TIER_RANK['plus'] && garden.plants.length >= FREE_PLANT_LIMIT) return;
        const updated = { ...garden, plants: [...garden.plants, plant] };
        const count = updated.plants.length;
        const toUnlock: string[] = [];
        if (count === 1) toUnlock.push('first_plant');
        if (count >= 5) toUnlock.push('five_plants');
        if (count >= 10) toUnlock.push('ten_plants');
        if (count >= 25) toUnlock.push('twenty_five_plants');
        const { unlocked, recentUnlockId } = tryUnlockMany(state.unlockedAchievements, toUnlock);
        set({ ...syncActive(state, updated), unlockedAchievements: unlocked, ...(recentUnlockId ? { recentUnlockId } : {}) });
      },

      removePlant: (plantId) => {
        const { garden } = get();
        if (!garden) return;
        const updated = { ...garden, plants: garden.plants.filter((p) => p.id !== plantId) };
        set(syncActive(get(), updated));
      },

      completeMaintenanceTask: (plantId, taskId) => {
        const state = get();
        const { garden } = state;
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

        // Streak calculation
        const todayStr = now.toISOString().slice(0, 10);
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yesterdayStr = yest.toISOString().slice(0, 10);
        let newStreak = state.currentStreak;
        if (state.lastTaskDate === yesterdayStr) newStreak = state.currentStreak + 1;
        else if (state.lastTaskDate !== todayStr) newStreak = 1;

        const newTotal = state.totalTasksCompleted + 1;

        const toUnlock: string[] = [];
        if (newTotal === 1) toUnlock.push('first_task');
        if (newTotal >= 10) toUnlock.push('ten_tasks');
        if (newTotal >= 50) toUnlock.push('fifty_tasks');
        if (newTotal >= 100) toUnlock.push('hundred_tasks');
        if (newStreak >= 3) toUnlock.push('streak_3');
        if (newStreak >= 7) toUnlock.push('streak_7');
        if (newStreak >= 30) toUnlock.push('streak_30');
        const { unlocked, recentUnlockId } = tryUnlockMany(state.unlockedAchievements, toUnlock);

        set({
          ...syncActive(state, updated),
          totalTasksCompleted: newTotal,
          currentStreak: newStreak,
          lastTaskDate: todayStr,
          unlockedAchievements: unlocked,
          ...(recentUnlockId ? { recentUnlockId } : {}),
        });
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

      recordHarvest: (plantId, entry) => {
        const { garden } = get();
        if (!garden) return;
        const updated = {
          ...garden,
          plants: garden.plants.map((p) =>
            p.id === plantId ? { ...p, harvestLog: [...(p.harvestLog ?? []), entry] } : p,
          ),
        };
        set(syncActive(get(), updated));
      },

      deleteHarvestEntry: (plantId, entryId) => {
        const { garden } = get();
        if (!garden) return;
        const updated = {
          ...garden,
          plants: garden.plants.map((p) =>
            p.id === plantId ? { ...p, harvestLog: (p.harvestLog ?? []).filter((e) => e.id !== entryId) } : p,
          ),
        };
        set(syncActive(get(), updated));
      },

      setScanning: (isScanning) => {
        const state = get();
        if (!isScanning && state.isScanning) {
          // Scan just completed
          const newTotal = state.totalScans + 1;
          const toUnlock: string[] = [];
          if (newTotal === 1) toUnlock.push('first_scan');
          if (newTotal >= 5) toUnlock.push('five_scans');
          const { unlocked, recentUnlockId } = tryUnlockMany(state.unlockedAchievements, toUnlock);
          set({ isScanning: false, totalScans: newTotal, unlockedAchievements: unlocked, ...(recentUnlockId ? { recentUnlockId } : {}) });
        } else {
          set({ isScanning });
        }
      },

      setSoilProfile: (profile) => {
        const state = get();
        const { garden } = state;
        if (!garden) return;
        const profiles = garden.soilProfiles ?? [];
        const isNew = !profiles.some((p) => p.id === profile.id);
        const updated = {
          ...garden,
          soilProfiles: isNew ? [...profiles, profile] : profiles.map((p) => p.id === profile.id ? profile : p),
        };
        const toUnlock = isNew ? ['first_soil'] : [];
        const { unlocked, recentUnlockId } = tryUnlockMany(state.unlockedAchievements, toUnlock);
        set({ ...syncActive(state, updated), unlockedAchievements: unlocked, ...(recentUnlockId ? { recentUnlockId } : {}) });
      },

      addSoilAmendment: (profileId, amendment) => {
        const { garden } = get();
        if (!garden) return;
        const updated = {
          ...garden,
          soilProfiles: (garden.soilProfiles ?? []).map((p) =>
            p.id === profileId ? { ...p, amendments: [...p.amendments, amendment] } : p,
          ),
        };
        set(syncActive(get(), updated));
      },

      deleteSoilProfile: (profileId) => {
        const { garden } = get();
        if (!garden) return;
        const updated = { ...garden, soilProfiles: (garden.soilProfiles ?? []).filter((p) => p.id !== profileId) };
        set(syncActive(get(), updated));
      },

      createGarden: (name) => {
        const state = get();
        const id = `garden-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newGarden: Garden = { id, userId: 'local', name, polygons: [], plants: [], tasks: [] };
        const willHaveMultiple = state.gardens.length >= 1;
        const toUnlock = willHaveMultiple ? ['multi_garden'] : [];
        const { unlocked, recentUnlockId } = tryUnlockMany(state.unlockedAchievements, toUnlock);
        set({ gardens: [...state.gardens, newGarden], garden: newGarden, activeGardenId: id, unlockedAchievements: unlocked, ...(recentUnlockId ? { recentUnlockId } : {}) });
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

      clearRecentUnlock: () => set({ recentUnlockId: null }),

      setUserTier: (tier) => set({ userTier: tier }),
    }),
    {
      name: 'garden-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        garden: state.garden,
        gardens: state.gardens,
        activeGardenId: state.activeGardenId,
        unlockedAchievements: state.unlockedAchievements,
        totalTasksCompleted: state.totalTasksCompleted,
        currentStreak: state.currentStreak,
        lastTaskDate: state.lastTaskDate,
        totalScans: state.totalScans,
        userTier: state.userTier,
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
