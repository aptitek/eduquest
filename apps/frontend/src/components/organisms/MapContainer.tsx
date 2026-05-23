import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface MapContainerProps {
  children: React.ReactNode;
}

export function MapContainer({ children }: MapContainerProps) {
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">{children}</div>;
}

export function MapArea({ children }: { children: React.ReactNode }) {
  return <div className="lg:col-span-2">{children}</div>;
}

export function LoadingMap() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-[600px] flex items-center justify-center bg-gaming-base/40 rounded-3xl border border-gaming-border animate-pulse text-text-muted font-display">
      {t('layout.loadingMap')}
    </div>
  );
}
