import { create } from 'zustand';
import { User, Activity } from '@eduquest/shared';

interface GameState {
  player: User | null;
  activities: Activity[];
  setPlayer: (player: User) => void;
  gainXp: (amount: number) => void;
  completeActivity: (activityId: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  player: null,
  activities: [],
  setPlayer: (player) => set({ player }),
  
  gainXp: (amount) => set((state) => {
    if (!state.player) return {};
    
    let newXp = state.player.xp + amount;
    let newLevel = state.player.level;
    
    // Chaque niveau demande (Level * 100) XP
    let xpNeeded = newLevel * 100;
    while (newXp >= xpNeeded) {
      newXp -= xpNeeded;
      newLevel += 1;
      xpNeeded = newLevel * 100;
    }
    
    return {
      player: {
        ...state.player,
        level: newLevel,
        xp: newXp,
      },
    };
  }),
  
  completeActivity: (activityId) => set((state) => ({
    activities: state.activities.map((act) =>
      act.id === activityId ? { ...act, isCompleted: true } : act
    ),
  })),
}));
