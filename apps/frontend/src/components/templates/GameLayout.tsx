import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface GameLayoutProps {
  children: React.ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gaming-base text-text-primary flex flex-col">
      {/* Main page view */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {children}
      </main>

      {/* Footer global minimal */}
      <footer className="border-t border-gaming-border py-6 text-center text-xs text-text-muted bg-gaming-base mt-auto">
        {t('layout.footer')}
      </footer>
    </div>
  );
}
export default GameLayout;
