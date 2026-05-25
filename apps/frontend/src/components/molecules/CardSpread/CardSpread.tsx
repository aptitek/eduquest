import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type CardSpreadShape = 'horizontal' | 'vertical' | 'arc';
export type CardSpreadSide = 'left' | 'right';

export interface CardSpreadRenderOptions<TItem> {
  item: TItem;
  index: number;
  spreadIndex: number;
  isActive: boolean;
  isEmphasis: boolean;
}

export interface CardSpreadProps<TItem> {
  items: readonly [TItem, ...TItem[]];
  renderItem: (options: CardSpreadRenderOptions<TItem>) => ReactNode;
  shape?: CardSpreadShape;
  side?: CardSpreadSide;
  emphasisIndex?: number;
  activeIndex?: number;
  visibleSpreadCount?: number;
  expanded?: boolean;
  expandOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  emphasisClassName?: string;
  spreadCardClassName?: string;
  activeCardClassName?: string;
}

type CardSpreadStyle = CSSProperties & {
  '--card-rest-x': string;
  '--card-rest-y': string;
  '--card-rest-rotation': string;
  '--card-rest-scale': number;
  '--card-open-x': string;
  '--card-open-y': string;
  '--card-open-rotation': string;
  '--card-open-scale': number;
  '--card-hover-x': string;
  '--card-hover-y': string;
  '--card-hover-rotation': string;
};

const DEFAULT_VISIBLE_SPREAD_COUNT = 3;

export function CardSpread<TItem>({
  items,
  renderItem,
  shape = 'horizontal',
  side = 'right',
  emphasisIndex = 0,
  activeIndex,
  visibleSpreadCount = DEFAULT_VISIBLE_SPREAD_COUNT,
  expanded = false,
  expandOnHover = false,
  ariaLabel,
  className,
  emphasisClassName,
  spreadCardClassName,
  activeCardClassName,
}: CardSpreadProps<TItem>) {
  const resolvedEmphasisIndex = resolveIndex(emphasisIndex, items.length);
  const resolvedActiveIndex = activeIndex === undefined ? undefined : resolveIndex(activeIndex, items.length);
  const emphasisItem = items[resolvedEmphasisIndex];
  const spreadItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => index !== resolvedEmphasisIndex)
    .slice(0, Math.max(0, visibleSpreadCount));

  return (
    <div
      aria-label={ariaLabel}
      tabIndex={expandOnHover ? 0 : undefined}
      className={cn(
        'group relative overflow-visible outline-none',
        expandOnHover && 'transition-[width,height] duration-300 focus-visible:ring-2 focus-visible:ring-status-quest',
        className
      )}
    >
      <div
        className={cn(
          'absolute bottom-0 z-30 origin-bottom translate-y-0 transition-[transform,filter] duration-300',
          getEmphasisPositionClassName(shape, side),
          expandOnHover &&
            'group-hover:-translate-y-2 group-hover:scale-110 group-focus-within:-translate-y-2 group-focus-within:scale-110',
          resolvedActiveIndex === resolvedEmphasisIndex && activeCardClassName,
          emphasisClassName
        )}
      >
        {renderItem({
          item: emphasisItem,
          index: resolvedEmphasisIndex,
          spreadIndex: -1,
          isActive: resolvedActiveIndex === resolvedEmphasisIndex,
          isEmphasis: true,
        })}
      </div>

      {spreadItems.map(({ item, index }, spreadIndex) => {
        const depth = spreadIndex + 1;
        const style = getSpreadCardStyle({
          depth,
          spreadIndex,
          spreadCount: spreadItems.length,
          shape,
          side,
          isActive: resolvedActiveIndex === index,
        });

        return (
          <div
            key={getStableKey(item, index)}
            style={style}
            className={cn(
              'absolute bottom-0 origin-bottom shadow-xl transition-[transform,filter] duration-300 [--card-x:var(--card-rest-x)] [--card-y:var(--card-rest-y)] [--card-rotation:var(--card-rest-rotation)] [--card-scale:var(--card-rest-scale)] [transform:translateX(var(--card-x))_translateY(var(--card-y))_rotate(var(--card-rotation))_scale(var(--card-scale))]',
              getSpreadPositionClassName(shape, side),
              'hover:!z-50 hover:[--card-x:var(--card-hover-x)] hover:[--card-y:var(--card-hover-y)] hover:[--card-rotation:var(--card-hover-rotation)] hover:[--card-scale:1.05] hover:drop-shadow-2xl',
              'focus-within:!z-50 focus-within:[--card-x:var(--card-hover-x)] focus-within:[--card-y:var(--card-hover-y)] focus-within:[--card-rotation:var(--card-hover-rotation)] focus-within:[--card-scale:1.05] focus-within:drop-shadow-2xl',
              expanded && '[--card-x:var(--card-open-x)] [--card-y:var(--card-open-y)] [--card-rotation:var(--card-open-rotation)] [--card-scale:var(--card-open-scale)]',
              expandOnHover &&
                'group-hover:[--card-x:var(--card-open-x)] group-hover:[--card-y:var(--card-open-y)] group-hover:[--card-rotation:var(--card-open-rotation)] group-hover:[--card-scale:var(--card-open-scale)] group-focus:[--card-x:var(--card-open-x)] group-focus:[--card-y:var(--card-open-y)] group-focus:[--card-rotation:var(--card-open-rotation)] group-focus:[--card-scale:var(--card-open-scale)] group-focus-within:[--card-x:var(--card-open-x)] group-focus-within:[--card-y:var(--card-open-y)] group-focus-within:[--card-rotation:var(--card-open-rotation)] group-focus-within:[--card-scale:var(--card-open-scale)]',
              resolvedActiveIndex === index && activeCardClassName,
              spreadCardClassName
            )}
          >
            {renderItem({
              item,
              index,
              spreadIndex,
              isActive: resolvedActiveIndex === index,
              isEmphasis: false,
            })}
          </div>
        );
      })}
    </div>
  );
}

interface SpreadCardStyleOptions {
  depth: number;
  spreadIndex: number;
  spreadCount: number;
  shape: CardSpreadShape;
  side: CardSpreadSide;
  isActive: boolean;
}

function getSpreadCardStyle({
  depth,
  spreadIndex,
  spreadCount,
  shape,
  side,
  isActive,
}: SpreadCardStyleOptions): CardSpreadStyle {
  if (shape === 'vertical') {
    const sign = side === 'left' ? -1 : 1;
    const restY = [-3.5, -6, -8][Math.min(depth, 3) - 1] ?? -8;
    const openY = [-8, -14, -20][Math.min(depth, 3) - 1] ?? -20;
    const rotation = [-4, 4, -8][Math.min(depth, 3) - 1] ?? -8;
    const openRotation = [-3, 3, -5][Math.min(depth, 3) - 1] ?? -5;
    const hoverY = [-10, -16, -24][Math.min(depth, 3) - 1] ?? -24;

    return {
      zIndex: isActive ? 50 : 20 - depth,
      '--card-rest-x': `${sign * 0.15 * depth}rem`,
      '--card-rest-y': `${restY}rem`,
      '--card-rest-rotation': `${rotation}deg`,
      '--card-rest-scale': 1 - depth * 0.05,
      '--card-open-x': `${sign * 0.25 * depth}rem`,
      '--card-open-y': `${openY}rem`,
      '--card-open-rotation': `${openRotation}deg`,
      '--card-open-scale': Math.max(1 - (depth - 1) * 0.05, 0.9),
      '--card-hover-x': `${sign * 0.25 * depth}rem`,
      '--card-hover-y': `${hoverY}rem`,
      '--card-hover-rotation': `${openRotation}deg`,
    };
  }

  if (shape === 'arc') {
    const centerOffset = spreadIndex - (spreadCount - 1) / 2;
    const distanceFromCenter = Math.abs(centerOffset);
    const arcDrop = distanceFromCenter * distanceFromCenter * 0.95;
    const activeLift = isActive ? 1.2 : 0;

    return {
      zIndex: isActive ? 50 : 20 + spreadIndex,
      '--card-rest-x': `calc(-50% + ${centerOffset * 2.8}rem)`,
      '--card-rest-y': `${arcDrop * 0.35}rem`,
      '--card-rest-rotation': `${centerOffset * 7}deg`,
      '--card-rest-scale': isActive ? 1.02 : 1 - distanceFromCenter * 0.035,
      '--card-open-x': `calc(-50% + ${centerOffset * 6.5}rem)`,
      '--card-open-y': `${arcDrop - activeLift}rem`,
      '--card-open-rotation': `${centerOffset * 7.5}deg`,
      '--card-open-scale': isActive ? 1.06 : 1 - distanceFromCenter * 0.018,
      '--card-hover-x': `calc(-50% + ${centerOffset * 6.5}rem)`,
      '--card-hover-y': '-2.25rem',
      '--card-hover-rotation': '0deg',
    };
  }

  const direction = side === 'left' ? -1 : 1;
  const restX = [0.5, 1.25, 2][Math.min(depth, 3) - 1] ?? 2;
  const openX = side === 'left'
    ? [-4, -7, -10][Math.min(depth, 3) - 1] ?? -10
    : [5, 9, 13][Math.min(depth, 3) - 1] ?? 13;
  const rotation = direction * ([7, 11, 15][Math.min(depth, 3) - 1] ?? 15);
  const openRotation = direction * ([4, 8, 12][Math.min(depth, 3) - 1] ?? 12);
  const hoverX = side === 'left'
    ? [-6, -9, -12][Math.min(depth, 3) - 1] ?? -12
    : [7, 11, 15][Math.min(depth, 3) - 1] ?? 15;

  return {
    zIndex: isActive ? 50 : 20 - depth,
    '--card-rest-x': `${direction * restX}rem`,
    '--card-rest-y': '0rem',
    '--card-rest-rotation': `${rotation}deg`,
    '--card-rest-scale': 1 - depth * 0.05,
    '--card-open-x': `${openX}rem`,
    '--card-open-y': '0rem',
    '--card-open-rotation': `${openRotation}deg`,
    '--card-open-scale': Math.max(1 - (depth - 1) * 0.05, 0.9),
    '--card-hover-x': `${hoverX}rem`,
    '--card-hover-y': '0rem',
    '--card-hover-rotation': `${direction * ([2, 4, 6][Math.min(depth, 3) - 1] ?? 6)}deg`,
  };
}

function getEmphasisPositionClassName(shape: CardSpreadShape, side: CardSpreadSide) {
  if (shape === 'vertical') return 'left-0';
  if (shape === 'arc') return 'left-0';
  return side === 'left' ? 'right-0' : 'left-0';
}

function getSpreadPositionClassName(shape: CardSpreadShape, side: CardSpreadSide) {
  if (shape === 'vertical') return 'left-0';
  if (shape === 'arc') return 'left-1/2';
  return side === 'left' ? 'right-14' : 'left-14';
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

export default CardSpread;
