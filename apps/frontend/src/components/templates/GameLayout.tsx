import React from 'react';
import { DashboardDock } from '../organisms/DashboardDock';

interface GameLayoutProps {
  children: React.ReactNode;
  fitToViewport?: boolean;
  hideDashboard?: boolean;
}

export function GameLayout({ children, fitToViewport = false, hideDashboard = false }: GameLayoutProps) {
  return (
    <div
      className={
        hideDashboard
          ? 'flex min-h-screen flex-col bg-gaming-base text-text-primary'
          : fitToViewport
          ? 'flex h-screen min-h-0 flex-col overflow-hidden bg-gaming-base pb-64 text-text-primary lg:pb-72'
          : 'flex min-h-screen flex-col bg-gaming-base pb-72 text-text-primary lg:pb-80'
      }
    >
      {/* Main page view */}
      <main
        className={
          fitToViewport
            ? 'mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 overflow-hidden px-3 pb-3 pt-2 lg:px-4 lg:pb-4 lg:pt-3'
            : 'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-4 pt-3'
        }
      >
        {children}
      </main>
      {hideDashboard ? null : <DashboardDock />}
    </div>
  );
}
export default GameLayout;
