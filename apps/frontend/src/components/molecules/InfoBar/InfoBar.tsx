import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { HoldToConfirmButton } from '../../atoms/HoldToConfirmButton';
import { cn } from '../../../utils/cn';

export type InfoBarTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface InfoBarAction {
  label: ReactNode;
  onSelect?: () => void;
}

export interface InfoBarProps {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  tone?: InfoBarTone;
  action?: InfoBarAction;
  dismissLabel?: string;
  onDismiss?: () => void;
  onAction?: () => void;
  className?: string;
}

const toneStyles: Record<
  InfoBarTone,
  {
    bar: string;
    icon: string;
    action: string;
  }
> = {
  neutral: {
    bar: 'border-gaming-border bg-gaming-card/95',
    icon: 'border-gaming-border bg-gaming-base/80 text-text-muted',
    action: 'border-gaming-border bg-gaming-base/80 text-text-primary hover:bg-gaming-base',
  },
  info: {
    bar: 'border-status-quest/35 bg-status-quest/10',
    icon: 'border-status-quest/45 bg-status-quest/15 text-status-quest',
    action: 'border-status-quest/40 bg-status-quest/15 text-status-quest hover:bg-status-quest/25',
  },
  success: {
    bar: 'border-status-completed/35 bg-status-completed/10',
    icon: 'border-status-completed/45 bg-status-completed/15 text-status-completed',
    action: 'border-status-completed/40 bg-status-completed/15 text-status-completed hover:bg-status-completed/25',
  },
  warning: {
    bar: 'border-status-campfire/40 bg-status-campfire/10',
    icon: 'border-status-campfire/50 bg-status-campfire/15 text-status-campfire',
    action:
      'border-status-campfire/45 bg-status-campfire/15 text-status-campfire hover:bg-status-campfire/25',
  },
  danger: {
    bar: 'border-status-danger/40 bg-status-danger/10',
    icon: 'border-status-danger/50 bg-status-danger/15 text-status-danger',
    action:
      'border-status-danger/45 bg-status-danger/15 text-status-danger hover:bg-status-danger/25',
  },
};

export function InfoBar({
  title,
  description,
  meta,
  icon,
  tone = 'neutral',
  action,
  dismissLabel = 'Dismiss',
  onDismiss,
  onAction,
  className,
}: InfoBarProps) {
  const styles = toneStyles[tone];
  const Icon = getDefaultIcon(tone);

  const handleAction = () => {
    action?.onSelect?.();
    onAction?.();
  };

  return (
    <article
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left shadow-xl backdrop-blur-xl sm:items-center sm:px-4',
        styles.bar,
        className
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-inset-highlight sm:mt-0',
          styles.icon
        )}
        aria-hidden="true"
      >
        {icon ?? <Icon size={18} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-sm font-black text-text-primary">{title}</h2>
          {meta ? (
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-text-muted">
              {meta}
            </span>
          ) : null}
        </div>
        {description ? <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p> : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {action ? (
          <button
            type="button"
            onClick={handleAction}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-primary/40',
              styles.action
            )}
          >
            {action.label}
          </button>
        ) : null}
        {onDismiss ? (
          <HoldToConfirmButton
            onConfirm={onDismiss}
            holdDuration={700}
            shape="round"
            variant=""
            className="h-8 min-h-0 w-8 border border-gaming-border/70 bg-gaming-base/60 text-text-muted hover:bg-gaming-base hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <span className="sr-only">{dismissLabel}</span>
            <X size={15} aria-hidden />
          </HoldToConfirmButton>
        ) : null}
      </div>
    </article>
  );
}

function getDefaultIcon(tone: InfoBarTone) {
  if (tone === 'success') return CheckCircle2;
  if (tone === 'warning') return AlertTriangle;
  if (tone === 'danger') return XCircle;
  return Info;
}

export default InfoBar;
