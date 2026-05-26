import { useEffect, useState } from 'react';
import type { CohortProgressData } from '@eduquest/shared';
import { fetchCohortProgressData } from './api';

export function useCohortProgressData() {
  const [progressData, setProgressData] = useState<CohortProgressData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    let isMounted = true;
    fetchCohortProgressData(token)
      .then((data) => {
        if (isMounted) setProgressData(data);
      })
      .catch((error) => {
        console.warn('Could not load cohort progress data.', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return progressData;
}
