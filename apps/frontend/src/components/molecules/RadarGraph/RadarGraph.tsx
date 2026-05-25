import { useId, useMemo } from 'react';
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

const DEFAULT_COLORS = ['#38bdf8', '#f97316', '#a78bfa', '#22c55e', '#f43f5e'];
const VIEWBOX_SIZE = 100;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 38;

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
  const safeLevels = Math.max(Math.floor(levels), 1);

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
      label: polarToCartesian(angle, RADIUS + 8),
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

    return {
      gridPolygons,
      axisLines,
      datasetPolygons,
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
    <div className={cn('min-w-0', className)}>
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        role="img"
        aria-labelledby={titleId}
        className="aspect-square w-full overflow-visible"
      >
        <title id={titleId}>
          {datasets.map((dataset) => dataset.label).join(', ') || 'Radar graph'}
        </title>

        <g className="fill-none stroke-gaming-border/70">
          {chart.gridPolygons.map((points) => (
            <polygon key={points} points={points} strokeWidth="0.45" />
          ))}
          {chart.axisLines.map(({ axis, end }) => (
            <line key={axis.id} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} strokeWidth="0.35" />
          ))}
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

        {showLabels && (
          <g className="fill-text-muted text-[0.32rem] font-bold uppercase tracking-widest">
            {chart.axisLines.map(({ axis, label }) => (
              <text
                key={axis.id}
                x={label.x}
                y={label.y}
                textAnchor={label.x < CENTER - 1 ? 'end' : label.x > CENTER + 1 ? 'start' : 'middle'}
                dominantBaseline="middle"
              >
                {axis.label}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

export default RadarGraph;
