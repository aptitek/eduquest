import {
  type CSSProperties,
  type ReactNode,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Coins, Milestone } from 'lucide-react';
import { SOLARIZED_GRADIENT_COLORS } from '../../../styles/colorTokens';
import { cn } from '../../../utils/cn';
import { GaugeIndicator } from '../../atoms/GaugeIndicator';

export interface GlobalProgressMilestone {
  id: string;
  label: string;
  positionPercent?: number;
  value?: number;
  description?: string;
  editor?: ReactNode;
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
  centerContent?: ReactNode;
  middleContent?: ReactNode;
  milestoneIndicator?: ReactNode;
  goldIndicator?: ReactNode;
  leftIndicator?: ReactNode;
  rightIndicator?: ReactNode;
  leftIndicatorCompactValue?: ReactNode;
  rightIndicatorCompactValue?: ReactNode;
  boostLabel?: ReactNode;
  milestoneBadgesExpanded?: boolean;
  gaugeActions?: ReactNode;
  className?: string;
  /**
   * Kept for compatibility with older call sites. The gauge now morphs from arch to
   * horseshoe from its rendered aspect ratio instead of switching by variant.
   */
  variant?: 'bar' | 'circle';
}

interface Size {
  width: number;
  height: number;
}

interface GaugeArcGeometry extends Size {
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  morph: number;
  path: string;
  middle: Point;
  leftIndicator: Point;
  rightIndicator: Point;
  indicatorStack: Point;
  indicatorsStacked: boolean;
  indicatorScale: number;
  showMilestoneLabels: boolean;
  usesConicGradient: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface NormalizedMilestone extends GlobalProgressMilestone {
  positionPercent: number;
  displayPercent: number;
  reached: boolean;
}

const MAX_MILESTONES = 8;
const TRACK_STROKE_WIDTH = 28;
const PROGRESS_STROKE_WIDTH = 18;
const MILESTONE_DOT_OFFSET = 0;
const MILESTONE_LABEL_OFFSET = 38;
const FALLBACK_SIZE = { width: 640, height: 208 };
const MILESTONE_GRADIENT_COLORS = SOLARIZED_GRADIENT_COLORS;

export function GlobalProgressGauge({
  currentPoints = 0,
  targetPoints = 0,
  progress,
  milestones = [],
  label = 'Global progression',
  centerContent,
  middleContent,
  milestoneIndicator,
  goldIndicator,
  leftIndicator,
  rightIndicator,
  leftIndicatorCompactValue,
  rightIndicatorCompactValue,
  boostLabel = 'boost',
  milestoneBadgesExpanded = false,
  gaugeActions,
  className,
}: GlobalProgressGaugeProps) {
  const gradientId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLElement>(null);
  const measuredSize = useElementSize(containerRef);
  const size = measuredSize.width > 0 && measuredSize.height > 0 ? measuredSize : FALLBACK_SIZE;
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
  const geometry = useMemo(() => getArcGeometry(size), [size]);
  const normalizedMilestones = useMemo(
    () => normalizeMilestones(milestones, progressData.target, progressPercent),
    [milestones, progressData.target, progressPercent]
  );
  const colorStops = useMemo(
    () => getProgressColors(normalizedMilestones.length),
    [normalizedMilestones.length]
  );
  const conicGradient = useMemo(
    () => getConicProgressGradient(progressPercent, colorStops),
    [colorStops, progressPercent]
  );
  const renderedLeftIndicator = leftIndicator ?? milestoneIndicator ?? (
    <GaugeIndicator label={progressData.label} value={displayValue} />
  );
  const renderedRightIndicator = rightIndicator ?? goldIndicator;
  const compactLeftIndicatorValue =
    leftIndicatorCompactValue ??
    progressData.valueLabel ??
    `${progressData.current}/${progressData.target}`;
  const compactRightIndicatorValue = rightIndicatorCompactValue;
  const renderedMiddle = middleContent ?? centerContent;

  return (
    <section
      ref={containerRef}
      aria-label={progressData.label}
      className={cn(
        'relative h-52 w-full overflow-visible rounded-[1.75rem] bg-gaming-card/95 shadow-xl',
        className
      )}
    >
      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${gradientId}-progress`} x1="0%" x2="100%" y1="0%" y2="0%">
            {colorStops.map((stop) => (
              <stop
                key={`${stop.color}-${stop.offset}`}
                offset={`${stop.offset}%`}
                stopColor={stop.color}
              />
            ))}
          </linearGradient>
        </defs>
        <path
          d={geometry.path}
          fill="none"
          pathLength={100}
          stroke="var(--color-bg-base)"
          strokeLinecap="round"
          strokeWidth={TRACK_STROKE_WIDTH}
          className="opacity-80"
        />
        {!geometry.usesConicGradient ? (
          <path
            d={geometry.path}
            fill="none"
            pathLength={100}
            stroke={`url(#${gradientId}-progress)`}
            strokeDasharray={`${progressPercent} 100`}
            strokeLinecap="round"
            strokeWidth={PROGRESS_STROKE_WIDTH}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        ) : null}
      </svg>

      {geometry.usesConicGradient ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full transition-[background] duration-700"
          style={{
            left: geometry.centerX - geometry.radius - PROGRESS_STROKE_WIDTH / 2,
            top: geometry.centerY - geometry.radius - PROGRESS_STROKE_WIDTH / 2,
            width: geometry.radius * 2 + PROGRESS_STROKE_WIDTH,
            height: geometry.radius * 2 + PROGRESS_STROKE_WIDTH,
            background: conicGradient,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${PROGRESS_STROKE_WIDTH}px), var(--color-mask-solid) calc(100% - ${PROGRESS_STROKE_WIDTH - 1}px))`,
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${PROGRESS_STROKE_WIDTH}px), var(--color-mask-solid) calc(100% - ${PROGRESS_STROKE_WIDTH - 1}px))`,
          }}
        />
      ) : null}

      {normalizedMilestones.map((milestone) => {
        const marker = getMarkerGeometry(geometry, milestone.displayPercent);
        const showFullMilestoneBadge = milestoneBadgesExpanded && geometry.showMilestoneLabels;

        return (
          <div
            key={milestone.id}
            className="group absolute z-40 h-4 w-4 -translate-x-1/2 -translate-y-1/2 hover:z-50"
            style={{ left: marker.dot.x, top: marker.dot.y }}
          >
            <span
              className={cn(
                'block h-full w-full rounded-full border bg-gaming-card shadow-marker transition group-hover:scale-125',
                milestone.reached ? 'border-status-completed' : 'border-text-muted'
              )}
            />
            {milestone.editor ? (
              <div
                className={cn(
                  'pointer-events-auto absolute z-50 w-max -translate-x-1/2 -translate-y-full',
                  geometry.showMilestoneLabels ? '' : 'bottom-full left-1/2 mb-2'
                )}
                style={
                  geometry.showMilestoneLabels
                    ? {
                        top: marker.label.y - marker.dot.y - 8,
                        left: marker.label.x - marker.dot.x + 8,
                      }
                    : undefined
                }
              >
                {milestone.editor}
              </div>
            ) : (
              <MilestoneBadge
                milestone={milestone}
                expandable={geometry.showMilestoneLabels}
                expanded={showFullMilestoneBadge}
                className={cn(
                  geometry.showMilestoneLabels
                    ? 'pointer-events-auto z-40 max-w-24 rounded-full px-2 py-1 text-[0.65rem] text-text-secondary opacity-90 shadow-sm group-hover:z-50 group-hover:max-w-36 group-hover:rounded-xl group-hover:px-3 group-hover:py-2 group-hover:text-xs group-hover:text-text-primary group-hover:opacity-100'
                    : 'bottom-full left-1/2 z-50 mb-2 max-w-36 -translate-x-1/2 opacity-0 shadow-xl group-hover:opacity-100',
                  showFullMilestoneBadge &&
                    'z-50 max-w-48 rounded-2xl px-3 py-2 text-xs text-text-primary opacity-100 shadow-xl'
                )}
                style={
                  geometry.showMilestoneLabels
                    ? {
                        top: marker.label.y - marker.dot.y,
                        left: marker.label.x - marker.dot.x + 8,
                      }
                    : undefined
                }
              />
            )}
          </div>
        );
      })}

      {gaugeActions ? (
        <div className="pointer-events-auto absolute right-2 top-2 z-50">
          {gaugeActions}
        </div>
      ) : null}

      <div
        className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: geometry.middle.x, top: geometry.middle.y }}
      >
        {renderedMiddle ?? (
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border border-gaming-border bg-gaming-base/85 text-center shadow-2xl">
            <span className="font-display text-2xl font-black text-text-primary">
              {Math.round(progressPercent)}%
            </span>
            <span className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-text-muted">
              {boostLabel}
            </span>
          </div>
        )}
      </div>

      {geometry.indicatorsStacked ? (
        <div
          className="pointer-events-none absolute z-30 flex min-w-28 -translate-x-1/2 -translate-y-full flex-col overflow-hidden rounded-2xl border border-gaming-border/70 bg-gaming-card/95 text-center shadow-xl backdrop-blur-md"
          style={{
            left: geometry.indicatorStack.x,
            top: geometry.indicatorStack.y,
          }}
        >
          <span className="flex items-center justify-center gap-2 px-3 py-2 font-display text-lg font-black leading-none text-text-primary">
            <Milestone size={15} aria-hidden className="text-text-muted" />
            <span>{compactLeftIndicatorValue}</span>
          </span>
          {compactRightIndicatorValue ? (
            <>
              <span className="h-px bg-gaming-border/80" />
              <span className="flex items-center justify-center gap-2 px-3 py-2 font-display text-lg font-black leading-none text-solarized-yellow">
                <Coins size={15} aria-hidden />
                <span>{compactRightIndicatorValue}</span>
              </span>
            </>
          ) : null}
        </div>
      ) : (
        <>
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: geometry.leftIndicator.x,
              top: geometry.leftIndicator.y,
              transform: `translate(-50%, -50%) scale(${geometry.indicatorScale})`,
            }}
          >
            {renderedLeftIndicator}
          </div>
          {renderedRightIndicator ? (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: geometry.rightIndicator.x,
                top: geometry.rightIndicator.y,
                transform: `translate(-50%, -50%) scale(${geometry.indicatorScale})`,
              }}
            >
              {renderedRightIndicator}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

interface MilestoneBadgeProps {
  milestone: NormalizedMilestone;
  expandable: boolean;
  expanded?: boolean;
  className?: string;
  style?: CSSProperties;
}

function MilestoneBadge({
  milestone,
  expandable,
  expanded = false,
  className,
  style,
}: MilestoneBadgeProps) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute w-max -translate-x-1/2 overflow-hidden rounded-xl border border-gaming-border/70 bg-gaming-card/95 px-3 py-2 text-center text-xs font-bold text-text-primary backdrop-blur-md transition-all',
        className
      )}
      style={style}
    >
      <span className="block truncate">{milestone.label}</span>
      {milestone.description ? (
        <span
          className={cn(
            'block overflow-hidden text-[0.65rem] font-medium text-text-muted transition-all',
            expandable && !expanded
              ? 'max-h-0 opacity-0 group-hover:mt-0.5 group-hover:max-h-10 group-hover:opacity-100'
              : 'mt-0.5 max-h-10 opacity-100'
          )}
        >
          {milestone.description}
        </span>
      ) : null}
    </span>
  );
}

function useElementSize(ref: React.RefObject<HTMLElement>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function getArcGeometry(size: Size): GaugeArcGeometry {
  const width = Math.max(120, size.width);
  const height = Math.max(120, size.height);
  const aspect = width / height;
  const morph = clamp01((2.35 - aspect) / 1.25);
  const span = lerp(122, 270, morph);
  const startAngle = -90 - span / 2;
  const endAngle = -90 + span / 2;
  const startUnit = unitPoint(startAngle);
  const endUnit = unitPoint(endAngle);
  const maxAbsX = Math.max(Math.abs(startUnit.x), Math.abs(endUnit.x), 0.04);
  const minSin = -1;
  const maxSin = Math.max(startUnit.y, endUnit.y);
  const padding = lerp(22, 18, morph) + TRACK_STROKE_WIDTH / 2;
  const radiusByWidth = (width - padding * 2) / (maxAbsX * 2);
  const radiusByHeight = (height - padding * 2) / Math.max(0.1, maxSin - minSin);
  const radius = Math.max(1, Math.min(radiusByWidth, radiusByHeight));
  const centerX = width / 2;
  const centerY = padding - minSin * radius;
  const path = describeArc(centerX, centerY, radius, startAngle, endAngle);
  const middle = {
    x: centerX,
    y: lerp(height * 0.72, centerY, morph),
  };
  const indicatorsStacked = width < 360 || morph > 0.72;
  const usesConicGradient = morph > 0.62;
  const indicatorScale = indicatorsStacked ? 1 : lerp(1, 0.86, morph);
  const indicatorY = lerp(height * 0.76, height * 0.3, morph);
  const indicatorXOffset = Math.min(width * 0.16, 135);
  const availableLabelWidth = width / Math.max(1, MAX_MILESTONES);
  const showMilestoneLabels = availableLabelWidth >= lerp(74, 130, morph);

  return {
    width,
    height,
    centerX,
    centerY,
    radius,
    startAngle,
    endAngle,
    morph,
    path,
    middle,
    leftIndicator: {
      x: centerX - indicatorXOffset,
      y: indicatorY,
    },
    rightIndicator: {
      x: centerX + indicatorXOffset,
      y: indicatorY,
    },
    indicatorStack: {
      x: centerX,
      y: padding - 8,
    },
    indicatorsStacked,
    indicatorScale,
    showMilestoneLabels,
    usesConicGradient,
  };
}

function normalizeMilestones(
  milestones: GlobalProgressMilestone[],
  target: number,
  progressPercent: number
): NormalizedMilestone[] {
  const visibleMilestones = milestones.slice(0, MAX_MILESTONES);

  return visibleMilestones.map((milestone, index) => {
    const positionPercent = clampPercent(
      milestone.positionPercent ??
        (target > 0 && milestone.value !== undefined ? (milestone.value / target) * 100 : 0)
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

function getMarkerGeometry(geometry: GaugeArcGeometry, percent: number) {
  const dot = pointOnArc(geometry, percent, MILESTONE_DOT_OFFSET);
  const label = pointOnArc(geometry, percent, MILESTONE_LABEL_OFFSET);

  return {
    dot,
    label,
  };
}

function getProgressColors(milestoneCount: number) {
  const colorCount = Math.max(2, Math.min(MILESTONE_GRADIENT_COLORS.length, milestoneCount || 4));
  const colors = MILESTONE_GRADIENT_COLORS.slice(0, colorCount);

  return colors.map((color, index) => ({
    color,
    offset: colorCount === 1 ? 0 : (index / (colorCount - 1)) * 100,
  }));
}

function getConicProgressGradient(
  progressPercent: number,
  stops: Array<{ color: string; offset: number }>
) {
  const progressAngle = (clampPercent(progressPercent) / 100) * 270;
  const visibleStops = stops
    .map((stop) => ({
      color: stop.color,
      angle: (stop.offset / 100) * 270,
    }))
    .filter((stop) => stop.angle <= progressAngle);
  const currentColor =
    visibleStops[visibleStops.length - 1]?.color ?? stops[0]?.color ?? MILESTONE_GRADIENT_COLORS[0];
  const colorParts = [
    `${stops[0]?.color ?? MILESTONE_GRADIENT_COLORS[0]} 0deg`,
    ...visibleStops.slice(1).map((stop) => `${stop.color} ${stop.angle}deg`),
    `${currentColor} ${progressAngle}deg`,
  ];

  return `conic-gradient(from 225deg, ${colorParts.join(', ')}, transparent ${progressAngle}deg 360deg)`;
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

  return `M ${round(start.x)} ${round(start.y)} A ${round(radius)} ${round(radius)} 0 ${largeArcFlag} 1 ${round(end.x)} ${round(end.y)}`;
}

function pointOnArc(geometry: GaugeArcGeometry, percent: number, radiusOffset = 0): Point {
  const angle = lerp(geometry.startAngle, geometry.endAngle, percent / 100);
  return polarPoint(geometry.centerX, geometry.centerY, geometry.radius + radiusOffset, angle);
}

function polarPoint(cx: number, cy: number, radius: number, angleDegrees: number): Point {
  const unit = unitPoint(angleDegrees);
  return {
    x: cx + radius * unit.x,
    y: cy + radius * unit.y,
  };
}

function unitPoint(angleDegrees: number): Point {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * clamp01(amount);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

export default GlobalProgressGauge;
