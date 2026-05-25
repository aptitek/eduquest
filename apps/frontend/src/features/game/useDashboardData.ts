import { useEffect, useState } from 'react';
import type { DashboardData } from '@eduquest/shared';
import { fetchDashboardData } from './api';

export function useDashboardData() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    let isMounted = true;
    fetchDashboardData(token)
      .then((data) => {
        if (isMounted) setDashboardData(data);
      })
      .catch((error) => {
        console.warn('Could not load dashboard data.', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return dashboardData;
}
