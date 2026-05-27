import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface MapContainerProps {
  children: React.ReactNode;
}

export function MapContainer({ children }: MapContainerProps) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      {children}
    </div>
  );
}

export function MapArea({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0">{children}</div>;
}

export function LoadingMap() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center rounded-3xl border border-gaming-border bg-gaming-base/40 font-display text-text-muted animate-pulse">
      {t('layout.loadingMap')}
    </div>
  );
}
