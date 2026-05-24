import { create } from 'zustand';
import { User, Student, GameCharacter, Activity, GameBattle } from '@eduquest/shared';

interface GameState {
  user: User | null;
  student: Student | null;
  character: GameCharacter | null;
  activities: Activity[];
  battles: GameBattle[];
  setUserSession: (user: User, student: Student, character: GameCharacter, battles?: GameBattle[]) => void;
  patchUser: (patch: Partial<User>) => void;
  setActivities: (activities: Activity[]) => void;
  setBattles: (battles: GameBattle[]) => void;
  addBattle: (battle: GameBattle) => void;
  gainXp: (amount: number) => void;
  logout: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  student: null,
  character: null,
  activities: [],
  battles: [],

  setUserSession: (user, student, character, battles = []) => set({ user, student, character, battles }),
  patchUser: (patch) =>
    set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
  setActivities: (activities) => set({ activities }),
  setBattles: (battles) => set({ battles }),
  addBattle: (battle) => set((state) => ({ battles: [...state.battles, battle] })),
  logout: () => set({ user: null, student: null, character: null, battles: [] }),

  gainXp: (amount) =>
    set((state) => {
      if (!state.character) return {};

      const currentXp = state.character.stats.xp || 0;
      let newXp = currentXp + amount;
      let newLevel = state.character.currentLevel;

      // Chaque niveau demande (Level * 100) XP
      let xpNeeded = newLevel * 100;
      while (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel += 1;
        xpNeeded = newLevel * 100;
      }

      return {
        character: {
          ...state.character,
          currentLevel: newLevel,
          stats: {
            ...state.character.stats,
            xp: newXp,
          },
        },
      };
    }),
}));
