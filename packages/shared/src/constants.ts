// Seuil d'XP par niveau (Calcul simple : Level * 100)
export const XP_PER_LEVEL = 100;

export function getXpRequiredForLevel(level: number): number {
  return level * XP_PER_LEVEL;
}

// Configuration des guildes du jeu
export interface GuildConfig {
  id: string;
  name: string;
  color: string; // Design token CSS color value
  description: string;
  iconKey?: string;
}

export const GUILDS: GuildConfig[] = [
  {
    id: 'warriors',
    name: 'Guild des Guerriers du Code',
    color: 'var(--color-status-danger)',
    description: 'Spécialisés dans la résolution rapide de défis algorithmiques.',
    iconKey: 'Swords',
  },
  {
    id: 'mages',
    name: 'Cercle des Mages Frontend',
    color: 'var(--color-status-quest)',
    description: 'Maîtres des interfaces visuelles et des animations magiques.',
    iconKey: 'Sparkles',
  },
  {
    id: 'scouts',
    name: 'Éclaireurs de la Donnée',
    color: 'var(--color-status-completed)',
    description: "Experts dans l'exploration et la structuration des bases de données.",
    iconKey: 'Compass',
  },
];
