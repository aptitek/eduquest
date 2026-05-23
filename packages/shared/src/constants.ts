// Seuil d'XP par niveau (Calcul simple : Level * 100)
export const XP_PER_LEVEL = 100;

export function getXpRequiredForLevel(level: number): number {
  return level * XP_PER_LEVEL;
}

// Configuration des guildes du jeu
export interface GuildConfig {
  id: string;
  name: string;
  color: string; // Code couleur hexadécimal
  description: string;
}

export const GUILDS: GuildConfig[] = [
  {
    id: 'warriors',
    name: 'Guild des Guerriers du Code',
    color: '#ef4444', // Rouge
    description: 'Spécialisés dans la résolution rapide de défis algorithmiques.',
  },
  {
    id: 'mages',
    name: 'Cercle des Mages Frontend',
    color: '#3b82f6', // Bleu
    description: 'Maîtres des interfaces visuelles et des animations magiques.',
  },
  {
    id: 'scouts',
    name: 'Éclaireurs de la Donnée',
    color: '#10b981', // Vert
    description: "Experts dans l'exploration et la structuration des bases de données.",
  },
];
