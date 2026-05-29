import { EditableText } from '../../../atoms/EditableText';
import { cn } from '../../../../utils/cn';
import type { CardTextSlot } from '../types';

export interface EditableTextSlotProps {
  slot?: CardTextSlot;
  fallback?: string;
  editable?: boolean;
  className?: string;
}

const textVariantClassName = {
  title: 'font-display text-xl font-bold leading-tight text-text-primary',
  subtitle: 'text-xs font-semibold uppercase tracking-[0.14em] text-text-muted',
  description: 'text-sm leading-relaxed text-text-secondary',
  ribbon: 'text-inherit',
  metadata: 'text-sm font-semibold text-text-primary',
  label: 'text-[0.65rem] font-display uppercase tracking-widest text-text-muted',
};

export function EditableTextSlot({
  slot,
  fallback,
  editable = slot?.editable,
  className,
}: EditableTextSlotProps) {
  const value = slot?.value ?? slot?.fallback ?? fallback ?? '';
  const variant = slot?.variant || 'description';
  const slotClassName = cn(textVariantClassName[variant], className);

  if (editable && slot?.onChange) {
    return (
      <EditableText
        value={value}
        onChange={slot.onChange}
        placeholder={slot.placeholder}
        multiline={slot.multiline}
        truncate={false}
        className={slotClassName}
      />
    );
  }

  return <span className={slotClassName}>{value}</span>;
}

export default EditableTextSlot;
