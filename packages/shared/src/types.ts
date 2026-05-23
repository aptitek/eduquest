// Rôles dans le LMS
export type UserRole = 'player' | 'gamemaster';

// Structure de base d'un utilisateur / joueur
export interface User {
  id: string;
  username: string;
  role: UserRole;
  level: number;
  xp: number;
  guildId?: string;
  inventory: string[];
}

// Règle de déverrouillage d'une activité
export interface UnlockRule {
  requiredLevel?: number;
  requiredCompletedActivities?: string[];
  requiredItems?: string[];
}

// Type d'activité pédagogique ou événement de jeu
export type ActivityType = 'lesson' | 'quiz' | 'boss_fight' | 'campfire';

// Structure d'une activité sur la carte
export interface Activity {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  xpReward: number;
  unlockRule: UnlockRule;
  isCompleted: boolean;
  position: { x: number; y: number };
}
