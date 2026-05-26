import React from 'react';
import { DashboardDock } from '../organisms/DashboardDock';

interface GameLayoutProps {
  children: React.ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-gaming-base pb-36 text-text-primary flex flex-col lg:pb-40">
      {/* Main page view */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {children}
      </main>
      <DashboardDock />
    </div>
  );
}
export default GameLayout;
