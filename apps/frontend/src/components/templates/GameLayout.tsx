import React from 'react';
import { DashboardDock } from '../organisms/DashboardDock';

interface GameLayoutProps {
  children: React.ReactNode;
  fitToViewport?: boolean;
}

export function GameLayout({ children, fitToViewport = false }: GameLayoutProps) {
  return (
    <div
      className={
        fitToViewport
          ? 'flex h-screen min-h-0 flex-col overflow-hidden bg-gaming-base pb-36 text-text-primary lg:pb-40'
          : 'flex min-h-screen flex-col bg-gaming-base pb-36 text-text-primary lg:pb-40'
      }
    >
      {/* Main page view */}
      <main
        className={
          fitToViewport
            ? 'mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden px-3 py-3 lg:px-4 lg:py-4'
            : 'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8'
        }
      >
        {children}
      </main>
      <DashboardDock />
    </div>
  );
}
export default GameLayout;
