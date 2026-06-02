import React from 'react';

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
    <aside className="flex min-h-[32rem] min-w-[min(100%,30rem)] flex-[1_0_30rem] lg:min-h-0">
      {children}
    </aside>
  );
}

export function LoadingMap() {
  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden rounded-3xl border border-gaming-border bg-gaming-base/40"
      aria-hidden="true"
    >
      <div className="absolute inset-6 rounded-[2rem] border border-dashed border-gaming-border/70" />
      <div className="absolute left-[16%] top-[24%] h-16 w-16 animate-pulse rounded-full border border-gaming-border bg-gaming-card/80 shadow-card" />
      <div className="absolute left-[42%] top-[16%] h-20 w-20 animate-pulse rounded-full border border-gaming-border bg-gaming-card/80 shadow-card [animation-delay:120ms]" />
      <div className="absolute left-[68%] top-[36%] h-14 w-14 animate-pulse rounded-full border border-gaming-border bg-gaming-card/80 shadow-card [animation-delay:240ms]" />
      <div className="absolute left-[30%] top-[62%] h-16 w-16 animate-pulse rounded-full border border-gaming-border bg-gaming-card/80 shadow-card [animation-delay:360ms]" />
      <div className="absolute left-[56%] top-[66%] h-20 w-20 animate-pulse rounded-full border border-gaming-border bg-gaming-card/80 shadow-card [animation-delay:480ms]" />
      <div className="absolute left-[24%] top-[31%] h-1 w-[23%] rotate-[-10deg] animate-pulse rounded-full bg-gaming-border/70" />
      <div className="absolute left-[52%] top-[29%] h-1 w-[18%] rotate-[18deg] animate-pulse rounded-full bg-gaming-border/70 [animation-delay:180ms]" />
      <div className="absolute left-[37%] top-[55%] h-1 w-[22%] rotate-[12deg] animate-pulse rounded-full bg-gaming-border/70 [animation-delay:300ms]" />
      <div className="absolute bottom-6 left-6 right-6 h-12 animate-pulse rounded-2xl border border-gaming-border bg-gaming-card/60" />
    </div>
  );
}
