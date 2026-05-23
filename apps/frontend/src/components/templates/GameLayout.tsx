import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import logoUrl from '../../assets/logo.svg';

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
      <footer className="border-t border-gaming-border py-8 text-center text-xs text-text-muted bg-gaming-base mt-auto flex flex-col items-center justify-center gap-3">
        <a
          href="https://aptitek.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src={logoUrl} alt="Aptitek Logo" className="h-8 w-auto filter brightness-95" />
        </a>
        <p className="flex items-center gap-1.5 justify-center flex-wrap">
          <span>{t('layout.footer')}</span>
          <span>—</span>
          <a
            href="https://aptitek.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-solarized-blue hover:underline font-semibold"
          >
            aptitek.io
          </a>
        </p>
      </footer>
    </div>
  );
}
export default GameLayout;
