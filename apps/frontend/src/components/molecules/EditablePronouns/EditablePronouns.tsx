import { cn } from '../../../utils/cn';
import { formatPronouns, parsePronouns } from '../../../utils/pronouns';
import { BadgeDropdown } from '../BadgeDropdown';

export interface EditablePronounsProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  removeLabel?: string;
  emptyFilterHint?: string;
  className?: string;
  showPencil?: boolean;
}

export function EditablePronouns({
  value,
  onChange,
  options,
  placeholder = '+',
  searchPlaceholder,
  removeLabel,
  emptyFilterHint,
  className,
  showPencil: showPencilProp,
}: EditablePronounsProps) {
  const selected = parsePronouns(value);

  return (
    <span className={cn('inline-flex items-center gap-1 max-w-full', className)}>
      <BadgeDropdown
        options={options}
        value={selected}
        onChange={(next) => onChange(formatPronouns(next))}
        multiple
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        removeLabel={removeLabel}
        emptyFilterHint={emptyFilterHint}
        badgeClassName="border-gaming-border"
        selectedMaxWidth="max-w-[7.5rem] sm:max-w-[9rem]"
        showArrow={showPencilProp}
      />
    </span>
  );
}
