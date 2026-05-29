import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface MapContainerProps {
  children: React.ReactNode;
}

export function MapContainer({ children }: MapContainerProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:flex-row lg:flex-wrap">
      {children}
    </div>
  );
}

export function MapArea({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[24rem] min-w-0 flex-[999_1_36rem] lg:min-h-0">{children}</div>;
}

export function MapSidePanel({ children }: { children: React.ReactNode }) {
  return (
    <aside className="flex min-h-[30rem] min-w-[min(100%,24rem)] flex-[1_0_24rem] lg:min-h-0">
      {children}
    </aside>
  );
}

export function LoadingMap() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center rounded-3xl border border-gaming-border bg-gaming-base/40 font-display text-text-muted animate-pulse">
      {t('layout.loadingMap')}
    </div>
  );
}
