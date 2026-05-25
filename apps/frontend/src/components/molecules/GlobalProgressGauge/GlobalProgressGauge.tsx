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
  variant?: 'bar' | 'circle';
  className?: string;
}

export function GlobalProgressGauge({
  currentPoints,
  targetPoints,
  milestones = [],
  label = 'Global progression',
  variant = 'bar',
  className,
}: GlobalProgressGaugeProps) {
  const progressPercent = clampPercent(targetPoints > 0 ? (currentPoints / targetPoints) * 100 : 0);

  if (variant === 'circle') {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference - (progressPercent / 100) * circumference;

    return (
      <section
        aria-label={label}
        className={cn(
          'flex h-36 w-36 shrink-0 flex-col items-center justify-center rounded-full border border-gaming-border bg-gaming-card shadow-xl',
          className
        )}
      >
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--color-bg-base)"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--color-solarized-cyan)"
              strokeLinecap="round"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-xl font-black text-text-primary">
              {Math.round(progressPercent)}%
            </span>
            <span className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-text-muted">
              gauge
            </span>
          </div>
        </div>
      </section>
    );
  }

  const archMilestones = milestones.map((milestone) => ({
    ...milestone,
    point: getArchPoint(clampPercent(milestone.positionPercent)),
    reached: progressPercent >= clampPercent(milestone.positionPercent),
  }));

  return (
    <section
      aria-label={label}
      className={cn(
        'relative h-40 overflow-visible rounded-2xl border border-gaming-border bg-gaming-card/95 p-4 shadow-xl',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-4 top-3 z-10 flex items-start justify-between gap-4">
        <div className="min-w-0 rounded-xl border border-gaming-border/70 bg-gaming-base/50 px-3 py-2 shadow-lg backdrop-blur-sm">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-text-muted">{label}</p>
          <p className="mt-0.5 font-display text-lg font-bold text-text-primary">
            {currentPoints} / {targetPoints}
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-bold text-primary shadow-lg backdrop-blur-sm">
          {Math.round(progressPercent)}%
        </span>
      </div>

      <div className="absolute inset-x-3 bottom-2 h-32 w-[calc(100%-1.5rem)] overflow-visible">
        <svg
          viewBox="0 0 1000 220"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="global-progress-arch-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="var(--color-solarized-blue)" />
              <stop offset="55%" stopColor="var(--color-solarized-cyan)" />
              <stop offset="100%" stopColor="var(--color-solarized-green)" />
            </linearGradient>
            <filter id="global-progress-arch-glow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={ARCH_PATH}
            fill="none"
            pathLength={100}
            stroke="var(--color-bg-base)"
            strokeLinecap="round"
            strokeWidth="26"
            className="opacity-80"
          />
          <path
            d={ARCH_PATH}
            fill="none"
            pathLength={100}
            stroke="url(#global-progress-arch-gradient)"
            strokeDasharray={100}
            strokeDashoffset={100 - progressPercent}
            strokeLinecap="round"
            strokeWidth="18"
            filter="url(#global-progress-arch-glow)"
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>

        {archMilestones.map((milestone) => (
          <div
            key={milestone.id}
            className="absolute flex -translate-x-1/2 flex-col items-center text-center"
            style={{
              left: `${(milestone.point.x / ARCH_VIEWBOX_WIDTH) * 100}%`,
              top: `${(milestone.point.y / ARCH_VIEWBOX_HEIGHT) * 100}%`,
            }}
          >
            <div
              className={cn(
                '-mt-8 mb-2 h-5 w-1 rounded-full',
                milestone.reached ? 'bg-status-completed' : 'bg-text-muted'
              )}
            />
            <div
              className={cn(
                'h-4 w-4 rounded-full border-2 bg-gaming-card shadow-md',
                milestone.reached ? 'border-status-completed' : 'border-text-muted'
              )}
            />
            <span className="mt-2 max-w-24 truncate text-xs font-bold text-text-secondary">
              {milestone.label}
            </span>
            {milestone.description ? (
              <span className="mt-0.5 max-w-28 truncate text-[0.65rem] text-text-muted">
                {milestone.description}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

const ARCH_PATH = 'M 80 176 C 250 58 750 58 920 176';
const ARCH_VIEWBOX_WIDTH = 1000;
const ARCH_VIEWBOX_HEIGHT = 220;

function getArchPoint(percent: number) {
  const t = percent / 100;
  const start = { x: 80, y: 176 };
  const controlA = { x: 250, y: 58 };
  const controlB = { x: 750, y: 58 };
  const end = { x: 920, y: 176 };
  const inverse = 1 - t;

  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * t * controlA.x +
      3 * inverse * t ** 2 * controlB.x +
      t ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * t * controlA.y +
      3 * inverse * t ** 2 * controlB.y +
      t ** 3 * end.y,
  };
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default GlobalProgressGauge;
