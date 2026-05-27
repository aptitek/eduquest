import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { HoldToConfirmButton } from '../../atoms/HoldToConfirmButton';
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
                <HoldToConfirmButton
                  onConfirm={() => onRemove(item, index)}
                  holdDuration={900}
                  shape="round"
                  variant="border border-status-danger bg-status-danger/10 text-status-danger hover:bg-status-danger hover:text-gaming-base focus:outline-none focus:ring-2 focus:ring-status-danger"
                  className="h-7 w-7 shrink-0"
                >
                  <X size={14} aria-hidden />
                  <span className="sr-only">{removeLabel}</span>
                </HoldToConfirmButton>
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
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1 rounded-full border border-gaming-border px-3 py-1.5 text-xs font-bold text-text-secondary transition hover:border-status-quest hover:text-status-quest focus:outline-none focus:ring-2 focus:ring-status-quest"
            >
              <Plus size={14} aria-hidden />
              {addLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default EditableList;
