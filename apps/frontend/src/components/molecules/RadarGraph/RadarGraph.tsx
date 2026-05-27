import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { AdaptiveTooltipBadge } from '../../atoms/AdaptiveTooltipBadge';
import { UI_COLOR_TOKENS } from '../../../styles/colorTokens';
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
  UI_COLOR_TOKENS.quest,
  UI_COLOR_TOKENS.campfire,
  UI_COLOR_TOKENS.specialist,
  UI_COLOR_TOKENS.completed,
  UI_COLOR_TOKENS.danger,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeAxisId, setActiveAxisId] = useState<string | null>(null);
  const size = useElementSize(containerRef);
  const safeLevels = Math.max(Math.floor(levels), 1);
  const showInlineAxisLabels = size.width >= 180;
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
      const levelRadius = RADIUS * ((index + 1) / safeLevels);
      return toPolygonPoints(angles.map((angle) => polarToCartesian(angle, levelRadius)));
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
        return polarToCartesian(angles[axisIndex], RADIUS * ratio);
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

      return {
        axis,
        angle: angles[axisIndex],
        value,
        min: editableRange.min,
        editableMax: editableRange.max,
        max: axisMax,
        point: polarToCartesian(angles[axisIndex], RADIUS * ratio),
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
    const projection =
      ((cursor.x - CENTER) * Math.cos(angle) + (cursor.y - CENTER) * Math.sin(angle)) / RADIUS;
    const axisMax = axis.max ?? maxValue ?? 100;
    const currentValue = editableDataset?.values[axis.id] ?? axis.min ?? 0;
    const range = getResolvedEditableRange(axis, currentValue, getEditableRange);

    onValueChange(axis.id, clampValue(projection * axisMax, range.min, range.max));
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
    <div ref={containerRef} className={cn('relative min-w-0 overflow-visible', className)}>
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
              r="9.5"
              className="fill-gaming-card/90 stroke-gaming-border"
              strokeWidth="0.55"
            />
            <text
              x={CENTER}
              y={CENTER - 1.4}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-text-primary text-[0.48rem] font-bold"
            >
              {remainingValue}
            </text>
            {remainingValueLabel ? (
              <text
                x={CENTER}
                y={CENTER + 5.2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-text-muted text-[0.18rem] font-bold uppercase tracking-widest"
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
                r={canEdit ? '3.2' : '1.7'}
                className={cn(
                  canEdit
                    ? 'cursor-grab fill-gaming-card stroke-[color:var(--color-status-quest)] outline-none focus-visible:stroke-primary active:cursor-grabbing'
                    : 'fill-transparent stroke-gaming-border'
                )}
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
      </svg>

      {showLabels
        ? chart.axisMarkers.map(({ axis, point }) => {
            const position = getViewBoxPercent(point);
            const shortLabel = getCompactAxisLabel(axis.label);

            return (
              <span
                key={axis.id}
                ref={(element) => applyAxisLabelPosition(element, position)}
                className={cn(
                  'absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2',
                  canEdit && 'pointer-events-none'
                )}
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
  if (words.length > 1)
    return words
      .map((word) => word[0])
      .join('')
      .slice(0, 2);
  return label.trim().slice(0, 2);
}

function applyAxisLabelPosition(
  element: HTMLSpanElement | null,
  position: { x: number; y: number }
) {
  if (!element) return;

  element.style.left = `${position.x}%`;
  element.style.top = `${position.y}%`;
}

export default RadarGraph;
