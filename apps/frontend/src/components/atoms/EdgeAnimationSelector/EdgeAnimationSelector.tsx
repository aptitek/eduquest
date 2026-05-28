import type { GameActivityEdgeAnimation } from '@eduquest/shared';
import { Activity as ActivityIcon, Ban, Route, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';

export interface EdgeAnimationSelectorProps {
  value?: GameActivityEdgeAnimation;
  onChange: (value: GameActivityEdgeAnimation) => void;
  className?: string;
}

const OPTIONS: Array<{
  value: GameActivityEdgeAnimation;
  labelKey: string;
  descriptionKey: string;
  icon: typeof Route;
}> = [
  {
    value: 'disabled',
    labelKey: 'edgeAnimationSelector.disabled',
    descriptionKey: 'edgeAnimationSelector.disabledDescription',
    icon: Ban,
  },
  {
    value: 'none',
    labelKey: 'edgeAnimationSelector.none',
    descriptionKey: 'edgeAnimationSelector.noneDescription',
    icon: Route,
  },
  {
    value: 'flow',
    labelKey: 'edgeAnimationSelector.flow',
    descriptionKey: 'edgeAnimationSelector.flowDescription',
    icon: ActivityIcon,
  },
  {
    value: 'pulse',
    labelKey: 'edgeAnimationSelector.pulse',
    descriptionKey: 'edgeAnimationSelector.pulseDescription',
    icon: Sparkles,
  },
];

export function EdgeAnimationSelector({ value = 'none', onChange, className }: EdgeAnimationSelectorProps) {
  const { t } = useTranslation();

  return (
    <fieldset className={cn('space-y-1.5', className)}>
      <legend className="font-bold text-text-secondary">{t('edgeAnimationSelector.label')}</legend>
      <div className="grid grid-cols-2 gap-1.5">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          const label = t(option.labelKey);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isSelected}
              title={t(option.descriptionKey)}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-status-quest',
                isSelected
                  ? 'border-status-quest bg-status-quest/15 text-status-quest shadow-glow-primary'
                  : 'border-gaming-border bg-gaming-base text-text-secondary hover:border-status-quest hover:text-status-quest'
              )}
            >
              <Icon size={16} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default EdgeAnimationSelector;
