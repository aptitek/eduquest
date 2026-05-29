import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type StackLayoutOrientation = 'horizontal' | 'vertical';
export type StackLayoutSide = 'left' | 'right';
export type StackLayoutOrder = 'normal' | 'reverse';
export type StackLayoutSpacing = 'default' | 'wide';

export interface StackLayoutRenderOptions<TItem> {
  item: TItem;
  index: number;
  stackIndex: number;
  isActive: boolean;
  isEmphasis: boolean;
}

export interface StackLayoutProps<TItem> {
  items: readonly [TItem, ...TItem[]];
  renderItem: (options: StackLayoutRenderOptions<TItem>) => ReactNode;
  orientation?: StackLayoutOrientation;
  side?: StackLayoutSide;
  order?: StackLayoutOrder;
  arcRadius?: number;
  messiness?: number;
  restStepRem?: number;
  openStepRem?: number;
  spacing?: StackLayoutSpacing;
  emphasisIndex?: number;
  activeIndex?: number;
  visibleStackCount?: number;
  expanded?: boolean;
  expandOnHover?: boolean;
  deferHoverForeground?: boolean;
  ariaLabel?: string;
  className?: string;
  emphasisClassName?: string;
  stackItemClassName?: string;
  activeItemClassName?: string;
}

type StackItemStyle = CSSProperties & {
  '--stack-rest-x': string;
  '--stack-rest-y': string;
  '--stack-rest-rotation': string;
  '--stack-rest-scale': number;
  '--stack-open-x': string;
  '--stack-open-y': string;
  '--stack-open-rotation': string;
  '--stack-open-scale': number;
  '--stack-hover-x': string;
  '--stack-hover-y': string;
  '--stack-hover-rotation': string;
};

const DEFAULT_VISIBLE_STACK_COUNT = 3;
const HOVER_FOREGROUND_DELAY_MS = 90;

export function StackLayout<TItem>({
  items,
  renderItem,
  orientation = 'horizontal',
  side = 'right',
  order = 'normal',
  arcRadius = 0,
  messiness = 0,
  restStepRem,
  openStepRem,
  spacing = 'default',
  emphasisIndex = 0,
  activeIndex,
  visibleStackCount = DEFAULT_VISIBLE_STACK_COUNT,
  expanded = false,
  expandOnHover = false,
  deferHoverForeground = false,
  ariaLabel,
  className,
  emphasisClassName,
  stackItemClassName,
  activeItemClassName,
}: StackLayoutProps<TItem>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const emphasisItemRef = useRef<HTMLDivElement>(null);
  const [dynamicHorizontalStep, setDynamicHorizontalStep] = useState<number | undefined>();
  const [hoveredItemIndex, setHoveredItemIndex] = useState<number | undefined>();
  const [foregroundItemIndex, setForegroundItemIndex] = useState<number | undefined>();
  const resolvedEmphasisIndex = resolveIndex(emphasisIndex, items.length);
  const resolvedActiveIndex = activeIndex === undefined ? undefined : resolveIndex(activeIndex, items.length);
  const emphasisItem = items[resolvedEmphasisIndex];
  const orderedItems = order === 'reverse' ? [...items].reverse() : items;
  const stackItems = orderedItems
    .map((item) => ({ item, index: items.indexOf(item) }))
    .filter(({ index }) => index !== resolvedEmphasisIndex)
    .slice(0, Math.max(0, visibleStackCount));

  useLayoutEffect(() => {
    if (spacing !== 'wide' || orientation !== 'horizontal') {
      setDynamicHorizontalStep(undefined);
      return undefined;
    }

    const container = containerRef.current;
    const emphasisItemElement = emphasisItemRef.current;
    if (!container || !emphasisItemElement || stackItems.length === 0) return undefined;

    const updateStep = () => {
      const containerWidth = container.getBoundingClientRect().width;
      const itemWidth = emphasisItemElement.getBoundingClientRect().width;
      const baseOffset = 56;
      const safetyGap = 24;
      const availableWidth = Math.max(containerWidth - itemWidth - baseOffset - safetyGap, 0);
      const fitStep = availableWidth / stackItems.length;
      const desiredStep = itemWidth * 0.72;
      setDynamicHorizontalStep(Math.max(0, Math.min(desiredStep, fitStep)));
    };

    updateStep();

    const resizeObserver = new ResizeObserver(updateStep);
    resizeObserver.observe(container);
    resizeObserver.observe(emphasisItemElement);

    return () => resizeObserver.disconnect();
  }, [orientation, spacing, stackItems.length]);

  useEffect(() => {
    if (!deferHoverForeground) {
      setForegroundItemIndex(undefined);
      return undefined;
    }

    if (hoveredItemIndex === undefined) {
      setForegroundItemIndex(undefined);
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setForegroundItemIndex(hoveredItemIndex);
    }, HOVER_FOREGROUND_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [deferHoverForeground, hoveredItemIndex]);

  return (
    <div
      ref={containerRef}
      aria-label={ariaLabel}
      tabIndex={expandOnHover ? 0 : undefined}
      className={cn(
        'group/stack-layout relative overflow-visible outline-none',
        expandOnHover && 'transition-[width,height] duration-300 focus-visible:ring-2 focus-visible:ring-status-quest',
        className
      )}
    >
      <div
        ref={emphasisItemRef}
        className={cn(
          'absolute bottom-0 z-30 origin-bottom translate-y-0 transition-[transform,filter] duration-300 ease-out',
          getEmphasisPositionClassName(orientation, arcRadius, side),
          expandOnHover &&
            'group-hover/stack-layout:-translate-y-2 group-hover/stack-layout:scale-110 group-focus-within/stack-layout:-translate-y-2 group-focus-within/stack-layout:scale-110',
          resolvedActiveIndex === resolvedEmphasisIndex && activeItemClassName,
          emphasisClassName
        )}
      >
        {renderItem({
          item: emphasisItem,
          index: resolvedEmphasisIndex,
          stackIndex: -1,
          isActive: resolvedActiveIndex === resolvedEmphasisIndex,
          isEmphasis: true,
        })}
      </div>

      {stackItems.map(({ item, index }, stackIndex) => {
        const style = getStackItemStyle({
          depth: stackIndex + 1,
          stackIndex,
          stackCount: stackItems.length,
          orientation,
          side,
          arcRadius,
          messiness,
          restStepRem,
          openStepRem,
          spacing,
          dynamicHorizontalStep,
          isActive: resolvedActiveIndex === index,
        });
        const resolvedStyle =
          deferHoverForeground && foregroundItemIndex === index ? { ...style, zIndex: 50 } : style;

        return (
          <div
            key={getStableKey(item, index)}
            ref={(element) => applyStackItemStyle(element, resolvedStyle)}
            onPointerEnter={deferHoverForeground ? () => setHoveredItemIndex(index) : undefined}
            onPointerLeave={
              deferHoverForeground
                ? () => setHoveredItemIndex((current) => (current === index ? undefined : current))
                : undefined
            }
            onFocus={deferHoverForeground ? () => setHoveredItemIndex(index) : undefined}
            onBlur={
              deferHoverForeground
                ? (event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setHoveredItemIndex((current) => (current === index ? undefined : current));
                  }
                : undefined
            }
            className={cn(
              'absolute bottom-0 origin-bottom shadow-xl transition-[transform,filter] duration-300 ease-out [--stack-x:var(--stack-rest-x)] [--stack-y:var(--stack-rest-y)] [--stack-rotation:var(--stack-rest-rotation)] [--stack-scale:var(--stack-rest-scale)] [transform:translateX(var(--stack-x))_translateY(var(--stack-y))_rotate(var(--stack-rotation))_scale(var(--stack-scale))]',
              getStackPositionClassName(orientation, arcRadius, side),
              expanded && '[--stack-x:var(--stack-open-x)] [--stack-y:var(--stack-open-y)] [--stack-rotation:var(--stack-open-rotation)] [--stack-scale:var(--stack-open-scale)]',
              expandOnHover &&
                'group-hover/stack-layout:[--stack-x:var(--stack-open-x)] group-hover/stack-layout:[--stack-y:var(--stack-open-y)] group-hover/stack-layout:[--stack-rotation:var(--stack-open-rotation)] group-hover/stack-layout:[--stack-scale:var(--stack-open-scale)] group-focus/stack-layout:[--stack-x:var(--stack-open-x)] group-focus/stack-layout:[--stack-y:var(--stack-open-y)] group-focus/stack-layout:[--stack-rotation:var(--stack-open-rotation)] group-focus/stack-layout:[--stack-scale:var(--stack-open-scale)] group-focus-within/stack-layout:[--stack-x:var(--stack-open-x)] group-focus-within/stack-layout:[--stack-y:var(--stack-open-y)] group-focus-within/stack-layout:[--stack-rotation:var(--stack-open-rotation)] group-focus-within/stack-layout:[--stack-scale:var(--stack-open-scale)]',
              !deferHoverForeground && 'hover:!z-50 focus-within:!z-50',
              'hover:[--stack-x:var(--stack-hover-x)] hover:[--stack-y:var(--stack-hover-y)] hover:[--stack-rotation:var(--stack-hover-rotation)] hover:[--stack-scale:1.05] hover:drop-shadow-2xl',
              'focus-within:[--stack-x:var(--stack-hover-x)] focus-within:[--stack-y:var(--stack-hover-y)] focus-within:[--stack-rotation:var(--stack-hover-rotation)] focus-within:[--stack-scale:1.05] focus-within:drop-shadow-2xl',
              resolvedActiveIndex === index && activeItemClassName,
              stackItemClassName
            )}
          >
            {renderItem({
              item,
              index,
              stackIndex,
              isActive: resolvedActiveIndex === index,
              isEmphasis: false,
            })}
          </div>
        );
      })}
    </div>
  );
}

interface StackItemStyleOptions {
  depth: number;
  stackIndex: number;
  stackCount: number;
  orientation: StackLayoutOrientation;
  side: StackLayoutSide;
  arcRadius: number;
  messiness: number;
  restStepRem?: number;
  openStepRem?: number;
  spacing: StackLayoutSpacing;
  dynamicHorizontalStep?: number;
  isActive: boolean;
}

function getStackItemStyle({
  depth,
  stackIndex,
  stackCount,
  orientation,
  side,
  arcRadius,
  messiness,
  restStepRem,
  openStepRem,
  spacing,
  dynamicHorizontalStep,
  isActive,
}: StackItemStyleOptions): StackItemStyle {
  const mess = getDeterministicMessiness(stackIndex, messiness);

  if (orientation === 'vertical') {
    const sign = side === 'left' ? -1 : 1;
    const restStep = restStepRem ?? 2.35;
    const openStep = openStepRem ?? 5.8;
    const restY = -depth * restStep - arcRadius * depth * 0.35 + mess.y;
    const openY = -depth * openStep - arcRadius * depth * 0.85 + mess.y;
    const rotation = sign * (mess.rotation + arcRadius * depth * 1.35);
    const openRotation = sign * (mess.rotation * 0.65 + arcRadius * depth * 0.9);

    return {
      zIndex: 20 - depth,
      '--stack-rest-x': `${sign * (0.15 * depth + mess.x)}rem`,
      '--stack-rest-y': `${restY}rem`,
      '--stack-rest-rotation': `${rotation}deg`,
      '--stack-rest-scale': 1 - depth * 0.05,
      '--stack-open-x': `${sign * (0.25 * depth + mess.x)}rem`,
      '--stack-open-y': `${openY}rem`,
      '--stack-open-rotation': `${openRotation}deg`,
      '--stack-open-scale': Math.max(1 - (depth - 1) * 0.05, 0.9),
      '--stack-hover-x': `${sign * (0.25 * depth + mess.x)}rem`,
      '--stack-hover-y': `${openY - 1.4}rem`,
      '--stack-hover-rotation': `${openRotation}deg`,
    };
  }

  const direction = side === 'left' ? -1 : 1;
  const centerOffset = stackIndex - (stackCount - 1) / 2;
  const distanceFromCenter = Math.abs(centerOffset);
  const isArc = arcRadius > 0;
  const openStep = openStepRem ?? (spacing === 'wide' ? 6.5 : 3.2);
  const restStep = restStepRem ?? (isArc ? 2.8 : 0.75);
  const restX = isArc
    ? `calc(-50% + ${centerOffset * restStep + mess.x}rem)`
    : `${direction * (depth * restStep + mess.x)}rem`;
  const openX =
    dynamicHorizontalStep !== undefined
      ? `${direction * dynamicHorizontalStep * depth}px`
      : isArc
        ? `calc(-50% + ${centerOffset * openStep + mess.x}rem)`
        : `${direction * (depth * (spacing === 'wide' ? 15 : 5) + mess.x)}rem`;
  const arcDrop = arcRadius * distanceFromCenter * distanceFromCenter * 0.95;
  const activeLift = isActive ? 1.2 : 0;
  const restRotation = isArc
    ? centerOffset * arcRadius * 7 + mess.rotation
    : direction * (depth * 4 + arcRadius * depth + mess.rotation);
  const openRotation = isArc
    ? centerOffset * arcRadius * 7.5 + mess.rotation
    : direction * (depth * 3 + arcRadius * depth * 0.7 + mess.rotation);

  return {
    zIndex: isArc ? 20 + stackIndex : 20 - depth,
    '--stack-rest-x': restX,
    '--stack-rest-y': `${arcDrop * 0.35 + mess.y}rem`,
    '--stack-rest-rotation': `${restRotation}deg`,
    '--stack-rest-scale': isArc && isActive ? 1.02 : 1 - depth * 0.035,
    '--stack-open-x': openX,
    '--stack-open-y': `${arcDrop - activeLift + mess.y}rem`,
    '--stack-open-rotation': `${openRotation}deg`,
    '--stack-open-scale': isArc && isActive ? 1.06 : Math.max(1 - (depth - 1) * 0.04, 0.9),
    '--stack-hover-x': openX,
    '--stack-hover-y': `${-1.2 + mess.y}rem`,
    '--stack-hover-rotation': `${isArc ? Math.sign(centerOffset) * Math.min(distanceFromCenter * 2, 6) : direction * 2}deg`,
  };
}

function applyStackItemStyle(element: HTMLDivElement | null, style: StackItemStyle) {
  if (!element) return;

  element.style.zIndex = String(style.zIndex);
  element.style.setProperty('--stack-rest-x', style['--stack-rest-x']);
  element.style.setProperty('--stack-rest-y', style['--stack-rest-y']);
  element.style.setProperty('--stack-rest-rotation', style['--stack-rest-rotation']);
  element.style.setProperty('--stack-rest-scale', String(style['--stack-rest-scale']));
  element.style.setProperty('--stack-open-x', style['--stack-open-x']);
  element.style.setProperty('--stack-open-y', style['--stack-open-y']);
  element.style.setProperty('--stack-open-rotation', style['--stack-open-rotation']);
  element.style.setProperty('--stack-open-scale', String(style['--stack-open-scale']));
  element.style.setProperty('--stack-hover-x', style['--stack-hover-x']);
  element.style.setProperty('--stack-hover-y', style['--stack-hover-y']);
  element.style.setProperty('--stack-hover-rotation', style['--stack-hover-rotation']);
}

function getEmphasisPositionClassName(
  orientation: StackLayoutOrientation,
  arcRadius: number,
  side: StackLayoutSide
) {
  if (orientation === 'vertical') return 'left-0';
  if (arcRadius > 0) return 'left-0';
  return side === 'left' ? 'right-0' : 'left-0';
}

function getStackPositionClassName(
  orientation: StackLayoutOrientation,
  arcRadius: number,
  side: StackLayoutSide
) {
  if (orientation === 'vertical') return 'left-0';
  if (arcRadius > 0) return 'left-1/2';
  return side === 'left' ? 'right-14' : 'left-14';
}

function getDeterministicMessiness(index: number, messiness: number) {
  if (messiness <= 0) return { x: 0, y: 0, rotation: 0 };

  const seed = Math.sin((index + 1) * 12.9898) * 43758.5453;
  const normalized = seed - Math.floor(seed);
  const secondary = Math.sin((index + 1) * 78.233) * 23454.123;
  const normalizedSecondary = secondary - Math.floor(secondary);
  const tertiary = Math.sin((index + 1) * 37.719) * 12432.53;
  const normalizedTertiary = tertiary - Math.floor(tertiary);

  return {
    x: (normalized - 0.5) * messiness,
    y: (normalizedSecondary - 0.5) * messiness * 0.5,
    rotation: (normalizedTertiary - 0.5) * messiness * 10,
  };
}

function resolveIndex(index: number, itemCount: number) {
  return Math.min(Math.max(index, 0), itemCount - 1);
}

function getStableKey<TItem>(item: TItem, index: number) {
  if (item && typeof item === 'object' && 'id' in item && item.id !== undefined) {
    return String(item.id);
  }

  return index;
}

export default StackLayout;
