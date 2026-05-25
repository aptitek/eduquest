import { type ReactNode, useId } from 'react';
import { cn } from '../../../utils/cn';
import { GaugeIndicator } from '../../atoms/GaugeIndicator';

export interface GlobalProgressMilestone {
  id: string;
  label: string;
  positionPercent?: number;
  value?: number;
  description?: string;
}

export interface GlobalProgressData {
  current: number;
  target: number;
  label?: string;
  valueLabel?: ReactNode;
}

export interface GlobalProgressGaugeProps {
  currentPoints?: number;
  targetPoints?: number;
  progress?: GlobalProgressData;
  milestones?: GlobalProgressMilestone[];
  label?: string;
  variant?: 'bar' | 'circle';
  centerContent?: ReactNode;
  milestoneIndicator?: ReactNode;
  goldIndicator?: ReactNode;
  className?: string;
}

export function GlobalProgressGauge({
  currentPoints = 0,
  targetPoints = 0,
  progress,
  milestones = [],
  label = 'Global progression',
  variant = 'bar',
  centerContent,
  milestoneIndicator,
  goldIndicator,
  className,
}: GlobalProgressGaugeProps) {
  const gradientId = useId().replace(/:/g, '');
  const progressData = {
    current: progress?.current ?? currentPoints,
    target: progress?.target ?? targetPoints,
    label: progress?.label ?? label,
    valueLabel: progress?.valueLabel,
  };
  const progressPercent = clampPercent(
    progressData.target > 0 ? (progressData.current / progressData.target) * 100 : 0
  );
  const displayValue =
    progressData.valueLabel ?? `${progressData.current} / ${progressData.target}`;
  const normalizedMilestones = normalizeMilestones(milestones, progressData.target, progressPercent);
  const gradientStops = getGradientStops(normalizedMilestones.length);
  const circleProgressSegments = getProgressSegments(progressPercent, gradientStops);
  const renderedMilestoneIndicator =
    milestoneIndicator ?? (
      <GaugeIndicator label={progressData.label} value={displayValue} />
    );

  if (variant === 'circle') {
    return (
      <section
        aria-label={progressData.label}
        className={cn(
          'relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full border border-gaming-border bg-gaming-card/95 shadow-xl',
          className
        )}
      >
        <div className="pointer-events-none absolute left-0 top-0 z-20 -translate-x-1/4 -translate-y-1/4 scale-75">
          {renderedMilestoneIndicator}
        </div>
        {goldIndicator ? (
          <div className="pointer-events-none absolute right-0 top-0 z-20 -translate-y-1/4 translate-x-1/4 scale-75">
            {goldIndicator}
          </div>
        ) : null}

        <div className="absolute inset-2 overflow-visible">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
            <path
              d={HORSESHOE_PATH}
              fill="none"
              pathLength={100}
              stroke="var(--color-bg-base)"
              strokeWidth="8"
              strokeLinecap="round"
              className="opacity-80"
            />
            {normalizedMilestones.map((milestone) => {
              const point = getHorseshoePoint(milestone.displayPercent, CIRCLE_RADIUS);

              return (
                <line
                  key={milestone.id}
                  x1={point.innerX}
                  y1={point.innerY}
                  x2={point.outerX}
                  y2={point.outerY}
                  stroke="var(--color-border)"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  className="opacity-70"
                />
              );
            })}
            {circleProgressSegments.map((segment) => (
              <path
                key={`${segment.color}-${segment.start}`}
                d={HORSESHOE_PATH}
                fill="none"
                stroke={segment.color}
                strokeLinecap="round"
                strokeWidth="7"
                pathLength={100}
                strokeDasharray={`${segment.length} ${100 - segment.length}`}
                strokeDashoffset={-segment.start}
                className="transition-[stroke-dashoffset,stroke-dasharray] duration-700 ease-out"
              />
            ))}
          </svg>

          {normalizedMilestones.map((milestone) => {
            const point = getHorseshoePoint(milestone.displayPercent, CIRCLE_RADIUS);

            return (
              <div
                key={milestone.id}
                className="group absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${point.dotX}%`, top: `${point.dotY}%` }}
              >
                <span
                  className={cn(
                    'block h-full w-full rounded-full border bg-gaming-card/90 opacity-0 shadow-lg transition group-hover:scale-125 group-hover:opacity-100',
                    milestone.reached ? 'border-status-completed' : 'border-text-muted'
                  )}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-36 -translate-x-1/2 rounded-xl border border-gaming-border bg-gaming-card/95 px-3 py-2 text-center text-xs font-bold text-text-primary opacity-0 shadow-xl backdrop-blur-md transition group-hover:opacity-100">
                  {milestone.label}
                  {milestone.description ? (
                    <span className="mt-0.5 block text-[0.65rem] font-medium text-text-muted">
                      {milestone.description}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 flex h-24 w-24 items-center justify-center">
          {centerContent ?? (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-gaming-border bg-gaming-base/80 text-center shadow-inner">
              <span className="font-display text-xl font-black text-text-primary">
                {Math.round(progressPercent)}%
              </span>
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-text-muted">
                gauge
              </span>
            </div>
          )}
        </div>
      </section>
    );
  }

  const archMilestones = normalizedMilestones.map((milestone) => ({
    ...milestone,
    arch: getArchMarker(milestone.displayPercent),
  }));

  return (
    <section
      aria-label={progressData.label}
      className={cn(
        'relative h-52 overflow-visible rounded-[1.75rem] border border-gaming-border bg-gaming-card/95 p-4 shadow-xl',
        className
      )}
    >
      <div className="absolute inset-x-3 bottom-1 h-44 w-[calc(100%-1.5rem)] overflow-visible">
        <svg
          viewBox="0 0 1000 260"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${gradientId}-arch`} x1="0%" x2="100%" y1="0%" y2="0%">
              {gradientStops.map((stop) => (
                <stop key={`${stop.color}-${stop.offset}`} offset={`${stop.offset}%`} stopColor={stop.color} />
              ))}
            </linearGradient>
            <filter id={`${gradientId}-arch-glow`} x="-20%" y="-80%" width="140%" height="260%">
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
            strokeWidth="28"
            className="opacity-80"
          />
          <path
            d={ARCH_PATH}
            fill="none"
            pathLength={100}
            stroke={`url(#${gradientId}-arch)`}
            strokeDasharray={100}
            strokeDashoffset={100 - progressPercent}
            strokeLinecap="round"
            strokeWidth="18"
            filter={`url(#${gradientId}-arch-glow)`}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
          {archMilestones.map((milestone) => (
            <line
              key={`${milestone.id}-notch`}
              x1={milestone.arch.notchInnerX}
              y1={milestone.arch.notchInnerY}
              x2={milestone.arch.notchOuterX}
              y2={milestone.arch.notchOuterY}
              stroke="var(--color-border)"
              strokeLinecap="round"
              strokeWidth="3"
              className="opacity-70"
            />
          ))}
        </svg>

        {archMilestones.map((milestone) => (
          <div
            key={milestone.id}
            className="absolute flex -translate-x-1/2 flex-col items-center text-center"
            style={{
              left: `${(milestone.arch.dotX / ARCH_VIEWBOX_WIDTH) * 100}%`,
              top: `${(milestone.arch.dotY / ARCH_VIEWBOX_HEIGHT) * 100}%`,
            }}
          >
            <div
              className={cn(
                'h-4 w-4 rounded-full border bg-gaming-card/95 shadow-[inset_0_1px_2px_rgba(255,255,255,0.18),0_0_14px_rgba(0,0,0,0.28)]',
                milestone.reached ? 'border-status-completed' : 'border-text-muted'
              )}
            />
            <span className="mb-2 max-w-24 -translate-y-14 truncate rounded-full border border-gaming-border/60 bg-gaming-card/80 px-2 py-1 text-[0.65rem] font-bold text-text-secondary shadow-sm backdrop-blur-sm">
              {milestone.label}
            </span>
          </div>
        ))}

        <div className="absolute bottom-3 left-1/2 z-20 flex h-28 w-28 -translate-x-1/2 items-center justify-center">
          {centerContent ?? (
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border border-gaming-border bg-gaming-base/85 text-center shadow-2xl">
              <span className="font-display text-2xl font-black text-text-primary">
                {Math.round(progressPercent)}%
              </span>
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-text-muted">
                boost
              </span>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-8 left-[calc(50%-14rem)] z-20">
          {renderedMilestoneIndicator}
        </div>
        {goldIndicator ? (
          <div className="pointer-events-none absolute bottom-8 right-[calc(50%-14rem)] z-20">
            {goldIndicator}
          </div>
        ) : null}
      </div>
    </section>
  );
}

const MILESTONE_GRADIENT_COLORS = [
  'var(--color-solarized-violet)',
  'var(--color-solarized-blue)',
  'var(--color-solarized-cyan)',
  'var(--color-solarized-green)',
  'var(--color-solarized-yellow)',
  'var(--color-solarized-orange)',
  'var(--color-solarized-red)',
  'var(--color-solarized-magenta)',
];

const CIRCLE_RADIUS = 42;
const ARCH_PATH = 'M 70 186 C 250 34 750 34 930 186';
const HORSESHOE_PATH = 'M 20.3 79.7 A 42 42 0 1 1 79.7 79.7';
const ARCH_VIEWBOX_WIDTH = 1000;
const ARCH_VIEWBOX_HEIGHT = 260;

interface NormalizedMilestone extends GlobalProgressMilestone {
  positionPercent: number;
  displayPercent: number;
  reached: boolean;
}

function normalizeMilestones(
  milestones: GlobalProgressMilestone[],
  target: number,
  progressPercent: number
): NormalizedMilestone[] {
  const visibleMilestones = milestones.slice(0, 8);

  return visibleMilestones.map((milestone, index) => {
    const positionPercent = clampPercent(
      milestone.positionPercent ?? (target > 0 && milestone.value !== undefined ? (milestone.value / target) * 100 : 0)
    );
    const displayPercent =
      visibleMilestones.length <= 1 ? 50 : (index / (visibleMilestones.length - 1)) * 100;

    return {
      ...milestone,
      positionPercent,
      displayPercent,
      reached: progressPercent >= positionPercent,
    };
  });
}

function getGradientStops(milestoneCount: number) {
  const colorCount = Math.max(2, Math.min(MILESTONE_GRADIENT_COLORS.length, milestoneCount || 4));
  const colors = MILESTONE_GRADIENT_COLORS.slice(0, colorCount);

  return colors.map((color, index) => ({
    color,
    offset: colorCount === 1 ? 0 : (index / (colorCount - 1)) * 100,
  }));
}

function getProgressSegments(
  progressPercent: number,
  stops: Array<{ color: string; offset: number }>
) {
  return stops.flatMap((stop, index) => {
    const nextStop = stops[index + 1];
    const start = stop.offset;
    const end = nextStop?.offset ?? 100;
    const visibleEnd = Math.min(progressPercent, end);

    if (visibleEnd <= start) return [];

    return [
      {
        color: stop.color,
        start,
        length: visibleEnd - start,
      },
    ];
  });
}

function getHorseshoePoint(percent: number, radius: number) {
  const angle = ((135 + (percent / 100) * 270) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    innerX: 50 + cos * (radius - 7),
    innerY: 50 + sin * (radius - 7),
    outerX: 50 + cos * (radius + 5),
    outerY: 50 + sin * (radius + 5),
    dotX: 50 + cos * radius,
    dotY: 50 + sin * radius,
  };
}

function getArchPoint(percent: number) {
  const t = percent / 100;
  const start = { x: 70, y: 186 };
  const controlA = { x: 250, y: 34 };
  const controlB = { x: 750, y: 34 };
  const end = { x: 930, y: 186 };
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

function getArchMarker(percent: number) {
  const point = getArchPoint(percent);
  const delta = 0.001;
  const before = getArchPoint(clampPercent(percent - delta * 100));
  const after = getArchPoint(clampPercent(percent + delta * 100));
  const tangentX = after.x - before.x;
  const tangentY = after.y - before.y;
  const length = Math.hypot(tangentX, tangentY) || 1;
  const normalX = -tangentY / length;
  const normalY = tangentX / length;
  const outwardY = normalY > 0 ? -normalY : normalY;
  const outwardX = normalY > 0 ? -normalX : normalX;

  return {
    dotX: point.x + outwardX * 12,
    dotY: point.y + outwardY * 12,
    notchInnerX: point.x - outwardX * 9,
    notchInnerY: point.y - outwardY * 9,
    notchOuterX: point.x + outwardX * 15,
    notchOuterY: point.y + outwardY * 15,
  };
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default GlobalProgressGauge;
