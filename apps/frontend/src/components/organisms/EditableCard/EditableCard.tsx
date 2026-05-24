import React, { useState } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface EditableCardProps {
  title?: string;
  renderAvatar?: (isEditing: boolean) => React.ReactNode;
  renderHeader?: (isEditing: boolean) => React.ReactNode;
  renderFields: (isEditing: boolean) => React.ReactNode;
  onSave: () => void;
  onCancel?: () => void;
  className?: string;
}

export function EditableCard({
  title,
  renderAvatar,
  renderHeader,
  renderFields,
  onSave,
  onCancel,
  className,
}: EditableCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    onCancel?.();
  };

  const handleSave = () => {
    setIsEditing(false);
    onSave();
  };

  return (
    <div className={cn('card bg-base-100 shadow-xl border border-base-300', className)}>
      <div className="card-body p-6 gap-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-4 items-center flex-1">
            {renderAvatar && <div>{renderAvatar(isEditing)}</div>}
            <div>
              {title && <h2 className="card-title text-xl font-bold">{title}</h2>}
              {renderHeader && <div>{renderHeader(isEditing)}</div>}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {isEditing ? (
              <>
                <button type="button" onClick={handleCancel} className="btn btn-ghost btn-sm gap-2">
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn btn-success btn-sm gap-2 text-success-content"
                >
                  <Check size={16} />
                  Save
                </button>
              </>
            ) : (
              <button type="button" onClick={handleEdit} className="btn btn-ghost btn-sm gap-2">
                <Pencil size={16} />
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="w-full">{renderFields(isEditing)}</div>
      </div>
    </div>
  );
}
