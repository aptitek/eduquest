import type { ReactNode } from 'react';

export function DetailItem({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-lg border border-gaming-border bg-gaming-base/30 p-3">
      <div className="text-[0.65rem] font-display uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-text-primary">
        {value || '-'}
      </div>
    </div>
  );
}
