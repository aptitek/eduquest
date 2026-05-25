import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AdaptiveTooltipBadge } from '../../atoms/AdaptiveTooltipBadge';
import { cn } from '../../../utils/cn';

export interface RadarGraphAxis {
  id: string;
  label: string;
  max?: number;
}

export interface RadarGraphDataset {
  id: string;
  label: string;
  values: Record<string, number>;
  color?: string;
}

export interface RadarGraphProps {
  axes: RadarGraphAxis[];
  datasets: RadarGraphDataset[];
  maxValue?: number;
  levels?: number;
  showLabels?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  'var(--color-status-quest)',
  'var(--color-status-campfire)',
  'var(--color-accent-specialist)',
  'var(--color-status-completed)',
  'var(--color-status-danger)',
];
const VIEWBOX_SIZE = 100;
const VIEWBOX_MIN = -8;
const VIEWBOX_RENDER_SIZE = 116;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 39;
const LABEL_RADIUS = 44;

function polarToCartesian(angle: number, radius: number) {
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function toPolygonPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function clampRatio(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.min(Math.max(value / max, 0), 1);
}

export function RadarGraph({
  axes,
  datasets,
  maxValue,
  levels = 4,
  showLabels = true,
  className,
}: RadarGraphProps) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const safeLevels = Math.max(Math.floor(levels), 1);
  const showInlineAxisLabels = size.width >= 180;

  const chart = useMemo(() => {
    const usableAxes = axes.filter((axis) => axis.id);
    const axisCount = usableAxes.length;

    if (axisCount < 3) {
      return null;
    }

    const angles = usableAxes.map((_, index) => (Math.PI * 2 * index) / axisCount - Math.PI / 2);
    const gridPolygons = Array.from({ length: safeLevels }, (_, index) => {
      const levelRadius = RADIUS * ((index + 1) / safeLevels);
      return toPolygonPoints(angles.map((angle) => polarToCartesian(angle, levelRadius)));
    });

    const axisLines = angles.map((angle, index) => ({
      axis: usableAxes[index],
      end: polarToCartesian(angle, RADIUS),
      label: polarToCartesian(angle, LABEL_RADIUS),
    }));

    const datasetPolygons = datasets.map((dataset, index) => {
      const color = dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
      const points = usableAxes.map((axis, axisIndex) => {
        const axisMax = axis.max ?? maxValue ?? 100;
        const ratio = clampRatio(dataset.values[axis.id] ?? 0, axisMax);
        return polarToCartesian(angles[axisIndex], RADIUS * ratio);
      });

      return {
        id: dataset.id,
        label: dataset.label,
        color,
        points: toPolygonPoints(points),
      };
    });
    const primaryDataset = datasets[0];
    const axisMarkers = usableAxes.map((axis, axisIndex) => {
      const axisMax = axis.max ?? maxValue ?? 100;
      const ratio = primaryDataset ? clampRatio(primaryDataset.values[axis.id] ?? 0, axisMax) : 1;

      return {
        axis,
        point: polarToCartesian(angles[axisIndex], RADIUS * ratio),
      };
    });

    return {
      gridPolygons,
      axisLines,
      datasetPolygons,
      axisMarkers,
    };
  }, [axes, datasets, maxValue, safeLevels]);

  if (!chart) {
    return (
      <div
        className={cn(
          'flex aspect-square min-h-32 items-center justify-center rounded-lg border border-dashed border-gaming-border text-xs text-text-muted',
          className
        )}
      >
        Radar graph needs at least 3 axes.
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative min-w-0 overflow-visible', className)}>
      <svg
        viewBox={`${VIEWBOX_MIN} ${VIEWBOX_MIN} ${VIEWBOX_RENDER_SIZE} ${VIEWBOX_RENDER_SIZE}`}
        role="img"
        aria-labelledby={titleId}
        className="aspect-square w-full"
      >
        <title id={titleId}>
          {datasets.map((dataset) => dataset.label).join(', ') || 'Radar graph'}
        </title>

        <g className="fill-none stroke-gaming-border/70">
          {chart.gridPolygons.map((points) => (
            <polygon key={points} points={points} strokeWidth="0.45" />
          ))}
          {chart.axisLines.map(({ axis, end }) => (
            <line key={axis.id} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} strokeWidth="0.55" />
          ))}
          <circle cx={CENTER} cy={CENTER} r="1.2" className="fill-gaming-border stroke-none" />
        </g>

        {chart.datasetPolygons.map((polygon) => (
          <g key={polygon.id}>
            <polygon
              points={polygon.points}
              fill={polygon.color}
              fillOpacity="0.22"
              stroke={polygon.color}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {showLabels
          ? chart.axisMarkers.map(({ axis, point }) => (
              <circle
                key={axis.id}
                cx={point.x}
                cy={point.y}
                r="1.7"
                className="fill-transparent stroke-gaming-border"
                strokeWidth="0.55"
              />
            ))
          : null}
      </svg>

      {showLabels
        ? chart.axisMarkers.map(({ axis, point }) => {
            const position = getViewBoxPercent(point);
            const shortLabel = getCompactAxisLabel(axis.label);

            return (
              <span
                key={axis.id}
                className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <AdaptiveTooltipBadge
                  label={axis.label}
                  compactLabel={shortLabel}
                  mode={showInlineAxisLabels ? 'compact' : 'dot'}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                />
              </span>
            );
          })
        : null}
    </div>
  );
}

function useElementSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

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

function getViewBoxPercent(point: { x: number; y: number }) {
  return {
    x: ((point.x - VIEWBOX_MIN) / VIEWBOX_RENDER_SIZE) * 100,
    y: ((point.y - VIEWBOX_MIN) / VIEWBOX_RENDER_SIZE) * 100,
  };
}

function getCompactAxisLabel(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map((word) => word[0]).join('').slice(0, 2);
  return label.trim().slice(0, 2);
}

export default RadarGraph;
