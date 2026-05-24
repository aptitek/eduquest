import React, { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface EditableTextProps {
  value: string;
  onChange: (newValue: string) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

export function EditableText({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  className,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      // Position cursor at the end of the text
      const length = tempValue.length;
      inputRef.current?.setSelectionRange(length, length);
    }
  }, [isEditing]);

  // Sync local state with prop changes when not in edit mode
  useEffect(() => {
    if (!isEditing) {
      setTempValue(value);
    }
  }, [value, isEditing]);

  const handleStartEdit = () => {
    setTempValue(value);
    setIsEditing(true);
  };

  const handleConfirm = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    const inputElement = (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        placeholder={placeholder}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleConfirm}
        onKeyDown={handleKeyDown}
        className={cn(
          'input input-bordered input-sm focus:outline-none',
          (prefix || suffix) && 'join-item'
        )}
      />
    );

    if (prefix || suffix) {
      return (
        <div className={cn('join inline-flex', className)}>
          {prefix && (
            <span className="join-item bg-base-200 border border-base-300 text-text-secondary px-3 flex items-center text-sm">
              {prefix}
            </span>
          )}
          {inputElement}
          {suffix && (
            <span className="join-item bg-base-200 border border-base-300 text-text-secondary px-3 flex items-center text-sm">
              {suffix}
            </span>
          )}
        </div>
      );
    }

    return <div className={cn('inline-block', className)}>{inputElement}</div>;
  }

  return (
    <div
      onClick={handleStartEdit}
      className={cn(
        'inline-flex items-center gap-2 cursor-pointer hover:bg-base-200 p-1 rounded transition-colors text-sm',
        className
      )}
    >
      {prefix && <span className="text-text-secondary font-medium">{prefix}</span>}
      <span className={cn(!value && 'text-text-muted italic')}>{value || placeholder || ''}</span>
      {suffix && <span className="text-text-secondary font-medium">{suffix}</span>}
      <Pencil size={14} className="text-text-muted hover:text-text-secondary" />
    </div>
  );
}
