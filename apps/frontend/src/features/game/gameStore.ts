import { create } from 'zustand';
import {
  User,
  Student,
  GameCharacter,
  Activity,
  GameActivityCompletion,
  GameActivityEdge,
  GameCharacterMove,
  GameCharacterClass,
  GameMapData,
  GameMapRun,
} from '@eduquest/shared';

interface GameState {
  user: User | null;
  student: Student | null;
  character: GameCharacter | null;
  activities: Activity[];
  activityEdges: GameActivityEdge[];
  mapRun: GameMapRun | null;
  activityCompletions: GameActivityCompletion[];
  currentActivityId: string | null;
  currentMove: GameCharacterMove | null;
  setUserSession: (
    user: User,
    student: Student,
    character: GameCharacter,
    activityCompletions?: GameActivityCompletion[]
  ) => void;
  patchUser: (patch: Partial<User>) => void;
  patchCharacter: (patch: Partial<GameCharacter>) => void;
  setCharacterClass: (characterClass: GameCharacterClass) => void;
  setActivities: (activities: Activity[]) => void;
  setMapData: (mapData: GameMapData) => void;
  setActivityCompletions: (activityCompletions: GameActivityCompletion[]) => void;
  addActivityCompletion: (completion: GameActivityCompletion) => void;
  setCurrentMove: (move: GameCharacterMove, currentActivityId: string) => void;
  gainXp: (amount: number) => void;
  logout: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  student: null,
  character: null,
  activities: [],
  activityEdges: [],
  mapRun: null,
  activityCompletions: [],
  currentActivityId: null,
  currentMove: null,

  setUserSession: (user, student, character, activityCompletions = []) =>
    set({ user, student, character, activityCompletions }),
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
  setMapData: (mapData) =>
    set({
      activities: mapData.activities,
      activityEdges: mapData.edges,
      mapRun: mapData.run,
      activityCompletions: mapData.completions,
      currentActivityId: mapData.currentActivityId || null,
      currentMove: mapData.currentMove || null,
    }),
  setActivityCompletions: (activityCompletions) => set({ activityCompletions }),
  addActivityCompletion: (completion) =>
    set((state) => ({
      activityCompletions: [
        ...state.activityCompletions.filter((item) => item.id !== completion.id),
        completion,
      ],
      activities: state.activities.map((activity) =>
        activity.id === completion.activityId
          ? { ...activity, isCompleted: true, isLocked: false, isRevealed: true }
          : activity
      ),
    })),
  setCurrentMove: (move, currentActivityId) =>
    set((state) => ({
      currentActivityId,
      currentMove: move,
      activities: state.activities.map((activity) => ({
        ...activity,
        isCurrent: activity.id === currentActivityId,
      })),
    })),
  logout: () =>
    set({
      user: null,
      student: null,
      character: null,
      activities: [],
      activityEdges: [],
      mapRun: null,
      activityCompletions: [],
      currentActivityId: null,
      currentMove: null,
    }),

  gainXp: () => set({}),
}));
