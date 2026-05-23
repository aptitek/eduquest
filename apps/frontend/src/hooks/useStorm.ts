import { Activity } from '@eduquest/shared';

/**
 * Hook utilitaire pour vérifier si un nœud d'activité est
 * englobé dans la "Tempête" (c'est-à-dire verrouillé pour le joueur).
 */
export function useStorm() {
  const isStormActive = (activity: Activity, playerLevel: number): boolean => {
    if (activity.unlockRule?.requiredLevel && playerLevel < activity.unlockRule.requiredLevel) {
      return true;
    }
    return false;
  };

  return { isStormActive };
}
