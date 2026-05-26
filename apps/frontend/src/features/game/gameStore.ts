import { create } from 'zustand';
import { User, Student, GameCharacter, Activity, GameBattle, GameCharacterClass } from '@eduquest/shared';

interface GameState {
  user: User | null;
  student: Student | null;
  character: GameCharacter | null;
  activities: Activity[];
  battles: GameBattle[];
  setUserSession: (
    user: User,
    student: Student,
    character: GameCharacter,
    battles?: GameBattle[]
  ) => void;
  patchUser: (patch: Partial<User>) => void;
  patchCharacter: (patch: Partial<GameCharacter>) => void;
  setCharacterClass: (characterClass: GameCharacterClass) => void;
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

  setUserSession: (user, student, character, battles = []) =>
    set({ user, student, character, battles }),
  patchUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
  patchCharacter: (patch) =>
    set((state) => (state.character ? { character: { ...state.character, ...patch } } : {})),
  setCharacterClass: (characterClass) =>
    set((state) =>
      state.character
        ? {
            character: {
              ...state.character,
              characterClass,
              updatedAt: new Date().toISOString(),
            },
          }
        : {}
    ),
  setActivities: (activities) => set({ activities }),
  setBattles: (battles) => set({ battles }),
  addBattle: (battle) => set((state) => ({ battles: [...state.battles, battle] })),
  logout: () => set({ user: null, student: null, character: null, battles: [] }),

  gainXp: () => set({}),
}));
