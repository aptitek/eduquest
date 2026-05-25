import { cn } from '../../../utils/cn';

export interface GlobalProgressMilestone {
  id: string;
  label: string;
  positionPercent: number;
  description?: string;
}

export interface GlobalProgressGaugeProps {
  currentPoints: number;
  targetPoints: number;
  milestones?: GlobalProgressMilestone[];
  label?: string;
  className?: string;
}

export function GlobalProgressGauge({
  currentPoints,
  targetPoints,
  milestones = [],
  label = 'Global progression',
  className,
}: GlobalProgressGaugeProps) {
  const progressPercent = clampPercent(targetPoints > 0 ? (currentPoints / targetPoints) * 100 : 0);

  return (
    <section
      aria-label={label}
      className={cn(
        'rounded-2xl border border-gaming-border bg-gaming-card p-4 shadow-xl',
        className
      )}
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-text-muted">
            {label}
          </p>
          <p className="mt-1 font-display text-xl font-bold text-text-primary">
            {currentPoints} / {targetPoints}
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          {Math.round(progressPercent)}%
        </span>
      </div>

      <div className="relative pb-12 pt-8">
        <div className="h-4 overflow-hidden rounded-full border border-gaming-border bg-gaming-base shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-solarized-blue via-solarized-cyan to-solarized-green transition-[width] duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {milestones.map((milestone) => {
          const positionPercent = clampPercent(milestone.positionPercent);
          const reached = progressPercent >= positionPercent;

          return (
            <div
              key={milestone.id}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${positionPercent}%` }}
            >
              <div
                className={cn(
                  'h-8 w-0.5 rounded-full',
                  reached ? 'bg-status-completed' : 'bg-text-muted'
                )}
              />
              <div
                className={cn(
                  'mt-1 h-4 w-4 rounded-full border-2 bg-gaming-card shadow-md',
                  reached ? 'border-status-completed' : 'border-text-muted'
                )}
              />
              <span className="mt-2 max-w-24 truncate text-center text-xs font-bold text-text-secondary">
                {milestone.label}
              </span>
              {milestone.description ? (
                <span className="mt-0.5 max-w-28 truncate text-center text-[0.65rem] text-text-muted">
                  {milestone.description}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default GlobalProgressGauge;
