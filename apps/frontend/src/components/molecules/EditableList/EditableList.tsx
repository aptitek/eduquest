import type { ReactNode } from 'react';
import { AddButton } from '../../atoms/AddButton';
import { DeleteButton } from '../../atoms/DeleteButton';
import { cn } from '../../../utils/cn';

export interface EditableListProps<TItem> {
  items: TItem[];
  getKey: (item: TItem, index: number) => string;
  renderItem: (item: TItem, index: number) => ReactNode;
  onAdd?: () => void;
  onRemove?: (item: TItem, index: number) => void;
  addControl?: ReactNode;
  addLabel?: string;
  removeLabel?: string;
  emptyState?: ReactNode;
  className?: string;
  itemClassName?: string;
  actionsClassName?: string;
}

export function EditableList<TItem>({
  items,
  getKey,
  renderItem,
  onAdd,
  onRemove,
  addControl,
  addLabel = 'Add',
  removeLabel = 'Remove',
  emptyState,
  className,
  itemClassName,
  actionsClassName,
}: EditableListProps<TItem>) {
  return (
    <div className={cn('space-y-2', className)}>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={getKey(item, index)}
              className={cn(
                'group/list-item flex min-w-0 items-start gap-2 rounded-xl border border-gaming-border bg-gaming-base/50 p-2',
                itemClassName
              )}
            >
              <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
              {onRemove ? (
                <DeleteButton
                  onConfirm={() => onRemove(item, index)}
                  holdDuration={900}
                  className="h-7 w-7 shrink-0"
                  aria-label={removeLabel}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : emptyState ? (
        <div className="rounded-xl border border-dashed border-gaming-border bg-gaming-base/40 p-3 text-sm text-text-muted">
          {emptyState}
        </div>
      ) : null}

      {addControl || onAdd ? (
        <div className={cn('pt-1', actionsClassName)}>
          {addControl || (
            <AddButton
              onClick={onAdd}
              className="rounded-full px-3 py-1.5 text-xs"
              iconSize={14}
            >
              {addLabel}
            </AddButton>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default EditableList;
