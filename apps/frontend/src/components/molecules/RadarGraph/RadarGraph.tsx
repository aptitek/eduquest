import { useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';

export interface RadarGraphAxis {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export interface RadarGraphDataset {
  id: string;
  label: string;
  values: Record<string, number>;
  valueLabels?: Record<string, string>;
  color?: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface RadarGraphProps {
  axes: RadarGraphAxis[];
  datasets: RadarGraphDataset[];
  maxValue?: number;
  levels?: number;
  showLabels?: boolean;
  editable?: boolean;
  editableDatasetId?: string;
  remainingValue?: number;
  remainingValueLabel?: string;
  getEditableRange?: (axisId: string, currentValue: number) => { min: number; max: number };
  onValueChange?: (axisId: string, value: number) => void;
  className?: string;
}

const DEFAULT_COLORS = [
  'var(--color-solarized-blue)',
  'var(--color-solarized-cyan)',
  'var(--color-solarized-violet)',
  'var(--color-solarized-green)',
  'var(--color-solarized-orange)',
];
const VIEWBOX_SIZE = 100;
const VIEWBOX_MIN = -26;
const VIEWBOX_RENDER_SIZE = 152;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 50;
const LABEL_RADIUS = 56;
const ZERO_RING_RADIUS = 4;
const DATA_RADIUS = RADIUS - ZERO_RING_RADIUS;

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

function getValueRadius(ratio: number) {
  return ZERO_RING_RADIUS + DATA_RADIUS * Math.min(Math.max(ratio, 0), 1);
}

function clampValue(value: number, min: number, max: number) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? Math.max(max, safeMin) : safeMin;
  if (!Number.isFinite(value)) return safeMin;
  return Math.min(Math.max(Math.round(value), safeMin), safeMax);
}

export function RadarGraph({
  axes,
  datasets,
  maxValue,
  levels = 4,
  showLabels = true,
  editable = false,
  editableDatasetId,
  remainingValue,
  remainingValueLabel,
  getEditableRange,
  onValueChange,
  className,
}: RadarGraphProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeAxisId, setActiveAxisId] = useState<string | null>(null);
  const [hoveredAxisId, setHoveredAxisId] = useState<string | null>(null);
  const safeLevels = Math.max(Math.floor(levels), 1);
  const editableDataset =
    datasets.find((dataset) => dataset.id === editableDatasetId) || datasets[0];
  const canEdit = editable && Boolean(onValueChange) && Boolean(editableDataset);

  const chart = useMemo(() => {
    const usableAxes = axes.filter((axis) => axis.id);
    const axisCount = usableAxes.length;

    if (axisCount < 3) {
      return null;
    }

    const angles = usableAxes.map((_, index) => (Math.PI * 2 * index) / axisCount - Math.PI / 2);
    const gridPolygons = Array.from({ length: safeLevels }, (_, index) => {
      const levelRatio = (index + 1) / safeLevels;
      const levelRadius = getValueRadius(levelRatio);
      return {
        points: toPolygonPoints(angles.map((angle) => polarToCartesian(angle, levelRadius))),
        radius: levelRadius,
      };
    });

    const axisLines = angles.map((angle, index) => ({
      axis: usableAxes[index],
      angle,
      end: polarToCartesian(angle, RADIUS),
      label: polarToCartesian(angle, LABEL_RADIUS),
    }));

    const datasetPolygons = datasets.map((dataset, index) => {
      const color = dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
      const points = usableAxes.map((axis, axisIndex) => {
        const axisMax = axis.max ?? maxValue ?? 100;
        const ratio = clampRatio(dataset.values[axis.id] ?? 0, axisMax);
        return polarToCartesian(angles[axisIndex], getValueRadius(ratio));
      });

      return {
        id: dataset.id,
        label: dataset.label,
        color,
        fillOpacity: dataset.fillOpacity ?? 0.22,
        strokeOpacity: dataset.strokeOpacity ?? 1,
        strokeWidth: dataset.strokeWidth ?? 1,
        strokeDasharray: dataset.strokeDasharray,
        points: toPolygonPoints(points),
      };
    });
    const axisMarkers = usableAxes.map((axis, axisIndex) => {
      const axisMax = axis.max ?? maxValue ?? 100;
      const value = editableDataset?.values[axis.id] ?? 0;
      const ratio = editableDataset ? clampRatio(value, axisMax) : 1;
      const editableRange = getResolvedEditableRange(axis, value, getEditableRange);
      const pointRadius = getValueRadius(ratio);

      return {
        axis,
        angle: angles[axisIndex],
        value,
        valueLabel: editableDataset?.valueLabels?.[axis.id],
        min: editableRange.min,
        editableMax: editableRange.max,
        max: axisMax,
        ratio,
        point: polarToCartesian(angles[axisIndex], pointRadius),
        label: polarToCartesian(angles[axisIndex], LABEL_RADIUS),
      };
    });

    return {
      gridPolygons,
      axisLines,
      datasetPolygons,
      axisMarkers,
    };
  }, [axes, datasets, editableDataset, getEditableRange, maxValue, safeLevels]);

  const updateAxisFromPointer = (
    event: PointerEvent<SVGSVGElement | SVGCircleElement>,
    axis: RadarGraphAxis,
    angle: number
  ) => {
    if (!canEdit || !svgRef.current || !onValueChange) return;

    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const screenMatrix = svgRef.current.getScreenCTM();
    if (!screenMatrix) return;

    const cursor = svgPoint.matrixTransform(screenMatrix.inverse());
    const projectedRadius = (cursor.x - CENTER) * Math.cos(angle) + (cursor.y - CENTER) * Math.sin(angle);
    const axisMax = axis.max ?? maxValue ?? 100;
    const currentValue = editableDataset?.values[axis.id] ?? axis.min ?? 0;
    const range = getResolvedEditableRange(axis, currentValue, getEditableRange);

    onValueChange(
      axis.id,
      clampValue(((projectedRadius - ZERO_RING_RADIUS) / DATA_RADIUS) * axisMax, range.min, range.max)
    );
  };

  const updateAxisByStep = (axis: RadarGraphAxis, currentValue: number, step: number) => {
    if (!canEdit || !onValueChange) return;
    const range = getResolvedEditableRange(axis, currentValue, getEditableRange);
    onValueChange(axis.id, clampValue(currentValue + step, range.min, range.max));
  };

  const handleMarkerKeyDown = (
    event: KeyboardEvent<SVGCircleElement>,
    axis: RadarGraphAxis,
    currentValue: number
  ) => {
    if (!canEdit) return;

    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      updateAxisByStep(axis, currentValue, event.shiftKey ? 10 : 1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      updateAxisByStep(axis, currentValue, event.shiftKey ? -10 : -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      updateAxisByStep(axis, currentValue, -Number.MAX_SAFE_INTEGER);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateAxisByStep(axis, currentValue, Number.MAX_SAFE_INTEGER);
    }
  };

  if (!chart) {
    return (
      <div
        className={cn(
          'flex aspect-square min-h-32 items-center justify-center rounded-lg border border-dashed border-gaming-border text-xs text-text-muted',
          className
        )}
      >
        {t('graph.radarGraphNeedsAxes')}
      </div>
    );
  }

  return (
    <div className={cn('relative min-w-0 overflow-visible', className)}>
      <svg
        ref={svgRef}
        viewBox={`${VIEWBOX_MIN} ${VIEWBOX_MIN} ${VIEWBOX_RENDER_SIZE} ${VIEWBOX_RENDER_SIZE}`}
        role="img"
        aria-labelledby={titleId}
        className={cn('aspect-square w-full', canEdit && 'touch-none')}
        onPointerMove={(event) => {
          if (!activeAxisId || !canEdit) return;
          const marker = chart.axisMarkers.find(({ axis }) => axis.id === activeAxisId);
          if (marker) updateAxisFromPointer(event, marker.axis, marker.angle);
        }}
        onPointerUp={() => setActiveAxisId(null)}
        onPointerCancel={() => setActiveAxisId(null)}
      >
        <title id={titleId}>
          {datasets.map((dataset) => dataset.label).join(', ') || t('graph.radarGraph')}
        </title>

        <g className="fill-none" stroke="var(--color-solarized-base0)">
          {chart.gridPolygons.map((level, index) => (
            <polygon
              key={level.points}
              points={level.points}
              strokeWidth={index === chart.gridPolygons.length - 1 ? '0.85' : '0.55'}
              opacity={index === chart.gridPolygons.length - 1 ? 0.95 : 0.62}
            />
          ))}
          {chart.axisLines.map(({ axis, end }) => (
            <line key={axis.id} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} strokeWidth="0.5" opacity="0.58" />
          ))}
        </g>

        <circle
          cx={CENTER}
          cy={CENTER}
          r={ZERO_RING_RADIUS}
          fill="transparent"
          stroke="var(--color-solarized-cyan)"
          strokeOpacity="0.85"
          strokeWidth="0.85"
        />

        {chart.datasetPolygons.map((polygon) => (
          <g key={polygon.id}>
            <polygon
              points={polygon.points}
              fill={polygon.color}
              fillOpacity={polygon.fillOpacity}
              stroke={polygon.color}
              strokeOpacity={polygon.strokeOpacity}
              strokeWidth={polygon.strokeWidth}
              strokeDasharray={polygon.strokeDasharray}
              strokeLinejoin="round"
            />
          </g>
        ))}

        {remainingValue !== undefined ? (
          <g className="pointer-events-none">
            <circle
              cx={CENTER}
              cy={CENTER}
              r="11.25"
              fill="transparent"
              stroke="var(--color-solarized-yellow)"
              strokeOpacity="0.7"
              strokeWidth="0.65"
            />
            <text
              x={CENTER}
              y={CENTER - 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[1.05rem] font-black"
              fill="var(--color-solarized-yellow)"
            >
              {remainingValue}
            </text>
            {remainingValueLabel ? (
              <text
                x={CENTER}
                y={CENTER + 6.5}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[0.38rem] font-black uppercase tracking-widest"
                fill="var(--color-solarized-base1)"
              >
                {remainingValueLabel}
              </text>
            ) : null}
          </g>
        ) : null}

        {showLabels
          ? chart.axisMarkers.map(({ axis, angle, editableMax, min, max, point, value }) => (
              <circle
                key={axis.id}
                cx={point.x}
                cy={point.y}
                r={hoveredAxisId === axis.id || activeAxisId === axis.id ? '3.8' : canEdit ? '3.2' : '2.2'}
                className={cn(
                  canEdit
                    ? 'cursor-grab fill-transparent outline-none active:cursor-grabbing'
                    : 'fill-transparent'
                )}
                stroke={canEdit ? 'var(--color-solarized-cyan)' : 'var(--color-solarized-base1)'}
                strokeWidth={canEdit ? '1.15' : '0.55'}
                role={canEdit ? 'slider' : undefined}
                tabIndex={canEdit ? 0 : undefined}
                aria-label={
                  canEdit ? t('graph.axisValue').replace('{axis}', axis.label) : undefined
                }
                aria-valuemin={canEdit ? min : undefined}
                aria-valuemax={canEdit ? editableMax : undefined}
                aria-valuenow={canEdit ? clampValue(value, min, max) : undefined}
                onPointerDown={
                  canEdit
                    ? (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setActiveAxisId(axis.id);
                        updateAxisFromPointer(event, axis, angle);
                      }
                    : undefined
                }
                onPointerEnter={() => setHoveredAxisId(axis.id)}
                onPointerLeave={() => setHoveredAxisId((current) => (current === axis.id ? null : current))}
                onPointerUp={
                  canEdit
                    ? (event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        }
                        setActiveAxisId(null);
                      }
                    : undefined
                }
                onClick={canEdit ? (event) => event.stopPropagation() : undefined}
                onKeyDown={canEdit ? (event) => handleMarkerKeyDown(event, axis, value) : undefined}
              />
            ))
          : null}

        {showLabels ? (
          <g className="select-none font-display">
            {chart.axisMarkers.map(({ axis, label, value, valueLabel }) => {
              const isActive = hoveredAxisId === axis.id || activeAxisId === axis.id;
              const labelAnchor = getTextAnchor(label.x);
              const labelPosition = getLabelTextPosition(label);

              return (
                <g
                  key={`label-${axis.id}`}
                  className={canEdit ? 'pointer-events-none' : 'cursor-help'}
                  onPointerEnter={() => setHoveredAxisId(axis.id)}
                  onPointerLeave={() => setHoveredAxisId((current) => (current === axis.id ? null : current))}
                >
                  <text
                    x={labelPosition.x}
                    y={labelPosition.valueY}
                    textAnchor={labelAnchor}
                    dominantBaseline="central"
                    className="text-[0.82rem] font-black"
                    fill={isActive ? 'var(--color-solarized-yellow)' : 'var(--color-solarized-cyan)'}
                  >
                    {valueLabel || formatStatValue(value)}
                  </text>
                  <text
                    x={labelPosition.x}
                    y={labelPosition.labelY}
                    textAnchor={labelAnchor}
                    dominantBaseline="central"
                    className="text-[0.56rem] font-black uppercase tracking-[0.025em]"
                    fill={isActive ? 'var(--color-solarized-base3)' : 'var(--color-solarized-base2)'}
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function getResolvedEditableRange(
  axis: RadarGraphAxis,
  currentValue: number,
  getEditableRange?: RadarGraphProps['getEditableRange']
) {
  const axisMin = axis.min ?? 0;
  const axisMax = axis.max ?? 100;
  const customRange = getEditableRange?.(axis.id, currentValue);
  const min = Math.max(axisMin, customRange?.min ?? axisMin);
  const max = Math.min(axisMax, customRange?.max ?? axisMax);

  return {
    min,
    max: Math.max(min, max),
  };
}

function formatStatValue(value: number) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getTextAnchor(x: number): 'start' | 'middle' | 'end' {
  if (Math.abs(x - CENTER) < 3) return 'middle';
  return x > CENTER ? 'start' : 'end';
}

function getLabelTextPosition(point: { x: number; y: number }) {
  const horizontalOffset = Math.abs(point.x - CENTER) < 3 ? 0 : point.x > CENTER ? 2 : -2;
  const verticalBias = Math.abs(point.y - CENTER) < 3 ? 0 : point.y > CENTER ? 1.2 : -1.2;

  return {
    x: point.x + horizontalOffset,
    valueY: point.y - 4.8 + verticalBias,
    labelY: point.y + 2.6 + verticalBias,
  };
}

export default RadarGraph;
