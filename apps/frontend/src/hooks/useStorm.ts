import { Activity } from '@eduquest/shared';

/**
 * Hook utilitaire pour vérifier si un nœud d'activité est englobé dans la tempête FTL.
 */
export function useStorm() {
  const isStormActive = (activity: Activity): boolean => Boolean(activity.isStormed);

  return { isStormActive };
}
