import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export interface ResponsiveCardGridProps<T> {
  items: readonly T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
}

export function ResponsiveCardGrid<T>({
  items,
  getKey,
  renderItem,
  className,
  itemClassName,
}: ResponsiveCardGridProps<T>) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {items.map((item, index) => (
        <div key={getKey(item, index)} className={cn('mx-auto w-full max-w-xs', itemClassName)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

export default ResponsiveCardGrid;
