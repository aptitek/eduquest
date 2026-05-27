import { useCallback, useEffect, useState } from 'react';
import type { CohortProgressData } from '@eduquest/shared';
import { fetchCohortProgressData } from './api';

export function useCohortProgressData(enabled = true, gameId?: string | null) {
  const [progressData, setProgressData] = useState<CohortProgressData | null>(null);
  const loadProgressData = useCallback(() => {
    const token = localStorage.getItem('eduquest_token');
    if (!enabled || !token) return undefined;

    let isMounted = true;
    fetchCohortProgressData(token, gameId)
      .then((data) => {
        if (isMounted) setProgressData(data);
      })
      .catch((error) => {
        console.warn('Could not load cohort progress data.', error);
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, gameId]);

  useEffect(() => {
    if (!enabled) {
      setProgressData(null);
      return undefined;
    }

    return loadProgressData();
  }, [enabled, loadProgressData]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleRewardCardsUpdated = () => {
      loadProgressData();
    };

    window.addEventListener('eduquest:reward-cards-updated', handleRewardCardsUpdated);
    return () => window.removeEventListener('eduquest:reward-cards-updated', handleRewardCardsUpdated);
  }, [enabled, loadProgressData]);

  return progressData;
}
