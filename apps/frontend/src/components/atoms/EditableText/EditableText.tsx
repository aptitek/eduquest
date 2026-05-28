import React, { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useEditableFieldContext } from './EditableFieldContext';

export interface EditableTextProps {
  value: string;
  onChange: (newValue: string) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  variant?: 'inline' | 'field';
  multiline?: boolean;
  inputType?: 'text' | 'email' | 'date';
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** Override context — show pencil hint */
  showPencil?: boolean;
  /** Truncate long display with ellipsis (…) */
  truncate?: boolean;
}

function EditPencil({ className }: { className?: string }) {
  return (
    <Pencil
      size={12}
      className={cn('shrink-0 text-text-muted/70 pointer-events-none', className)}
      aria-hidden
    />
  );
}

export function EditableText({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  className,
  inputClassName,
  variant = 'inline',
  multiline = false,
  inputType = 'text',
  isEditing: controlledEditing,
  onEditingChange,
  showPencil: showPencilProp,
  truncate = true,
}: EditableTextProps) {
  const { showPencil: showPencilContext } = useEditableFieldContext();
  const showPencil = showPencilProp ?? showPencilContext;

  const [internalEditing, setInternalEditing] = useState(false);
  const isControlled = controlledEditing !== undefined;
  const isEditing = isControlled ? controlledEditing : internalEditing;

  const setEditing = (editing: boolean) => {
    if (!isControlled) setInternalEditing(editing);
    onEditingChange?.(editing);
  };

  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const el = multiline ? textareaRef.current : inputRef.current;
    el?.focus();
    // date/email inputs do not support setSelectionRange
    if (
      el &&
      !multiline &&
      el instanceof HTMLInputElement &&
      (el.type === 'text' || el.type === 'password' || el.type === 'search')
    ) {
      const length = el.value.length;
      el.setSelectionRange(length, length);
    }
  }, [isEditing, multiline]);

  useEffect(() => {
    if (!isEditing) {
      setTempValue(value);
    }
  }, [value, isEditing]);

  const handleStartEdit = () => {
    setTempValue(value);
    setEditing(true);
  };

  const handleConfirm = () => {
    setEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
    setEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleConfirm();
    }
  };

  const displayText = value || placeholder || '';
  const isEmpty = !value;
  const textClass = cn(className, isEmpty && 'italic opacity-60');

  const inlineInputClass = cn(
    textClass,
    'bg-transparent border-0 outline-none p-0 m-0 shadow-none ring-0',
    'focus:ring-1 focus:ring-primary/25 rounded-sm min-w-[2ch] max-w-full'
  );

  const inlineTextareaClass = cn(inlineInputClass, 'w-full min-h-[4.5rem] resize-y block');

  const fieldInputClass = cn(
    'input input-bordered input-sm focus:outline-none w-full',
    (prefix || suffix) && 'join-item'
  );

  const editableSurfaceClass = cn(
    textClass,
    'cursor-text rounded-sm transition-[box-shadow,background-color]',
    'hover:bg-gaming-base/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gaming-border/60'
  );

  const wrapWithPencil = (content: React.ReactNode) => {
    if (!showPencil) return content;
    return (
      <span
        className={cn(
          'inline-flex max-w-full',
          multiline ? 'items-start gap-1.5 w-full' : 'items-baseline gap-1'
        )}
      >
        {content}
        <EditPencil className={multiline ? 'mt-1' : undefined} />
      </span>
    );
  };

  if (isEditing) {
    const control = multiline ? (
      <textarea
        ref={textareaRef}
        value={tempValue}
        placeholder={placeholder}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleConfirm}
        onKeyDown={handleTextareaKeyDown}
        rows={4}
        className={cn(variant === 'inline' ? inlineTextareaClass : cn(fieldInputClass, 'textarea'), inputClassName)}
      />
    ) : (
      <input
        ref={inputRef}
        type={inputType}
        value={tempValue}
        placeholder={placeholder}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleConfirm}
        onKeyDown={handleInputKeyDown}
        className={cn(
          variant === 'inline' ? inlineInputClass : fieldInputClass,
          variant === 'inline' && inputType === 'date' && 'min-w-[10.5rem]',
          variant === 'inline' && inputType === 'email' && 'min-w-48 max-w-full',
          variant === 'inline' && inputType === 'text' && 'w-auto min-w-[3ch]',
          inputClassName
        )}
      />
    );

    if (variant === 'field' && (prefix || suffix) && !multiline) {
      return wrapWithPencil(
        <div className={cn('join inline-flex w-full', className)}>
          {prefix && (
            <span className="join-item bg-gaming-base border border-gaming-border text-text-secondary px-3 flex items-center text-sm">
              {prefix}
            </span>
          )}
          {control}
          {suffix && (
            <span className="join-item bg-gaming-base border border-gaming-border text-text-secondary px-3 flex items-center text-sm">
              {suffix}
            </span>
          )}
        </div>
      );
    }

    const Wrapper = multiline ? 'div' : 'span';
    return wrapWithPencil(
      <Wrapper
        className={cn(
          multiline ? 'block w-full min-w-0 flex-1' : 'inline-flex items-baseline gap-1 min-w-0',
          variant === 'field' && 'block w-full'
        )}
      >
        {prefix && <span className={textClass}>{prefix}</span>}
        {control}
        {suffix && <span className={textClass}>{suffix}</span>}
      </Wrapper>
    );
  }

  const DisplayWrapper = multiline ? 'div' : 'span';

  return wrapWithPencil(
    <DisplayWrapper
      role="button"
      tabIndex={0}
      onClick={handleStartEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      className={cn(
        editableSurfaceClass,
        multiline && 'block w-full min-h-[3rem] min-w-0 flex-1',
        truncate &&
          !multiline &&
          'max-w-full truncate overflow-hidden text-ellipsis whitespace-nowrap align-bottom'
      )}
      title={value ? value : undefined}
    >
      {prefix}
      {displayText}
      {suffix}
    </DisplayWrapper>
  );
}
