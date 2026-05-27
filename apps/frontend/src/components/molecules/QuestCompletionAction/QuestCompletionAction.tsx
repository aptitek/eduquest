import { CheckCircle2, Sparkles } from 'lucide-react';
import type { ActivityParticipationMode } from '@eduquest/shared';
import { HoldToConfirmButton } from '../../atoms/HoldToConfirmButton';
import { useTranslation } from '../../../hooks/useTranslation';

export interface QuestCompletionActionProps {
  isCompleted?: boolean;
  isResolving?: boolean;
  error?: string | null;
  onComplete?: () => void | Promise<void>;
  mode?: ActivityParticipationMode;
  completeLabel?: string;
  completedLabel?: string;
}

export function QuestCompletionAction({
  isCompleted,
  isResolving,
  error,
  onComplete,
  mode = 'solo',
  completeLabel,
  completedLabel,
}: QuestCompletionActionProps) {
  const { t } = useTranslation();
  const resolvedCompleteLabel = completeLabel || t('activityCard.completeQuest');
  const resolvedCompletedLabel = completedLabel || t('activityCard.questResolved');

  if (isCompleted) {
    return (
      <div
        aria-label={resolvedCompletedLabel}
        title={resolvedCompletedLabel}
        className="flex h-20 w-20 items-center justify-center text-status-completed drop-shadow-[0_0_14px_var(--color-status-completed)]"
      >
        <CheckCircle2 size={52} strokeWidth={3.5} aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {error ? (
        <div role="alert" className="mb-3 w-full rounded-xl border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-xs font-semibold text-status-danger">
          {error}
        </div>
      ) : null}

      <HoldToConfirmButton
        onConfirm={() => {
          void onComplete?.();
        }}
        holdDuration={1200}
        shape="round"
        variant="btn-primary"
        disabled={isResolving || !onComplete}
        className={
          mode === 'guild'
            ? 'h-24 w-24 min-h-0 border-primary/40 bg-primary text-primary-content font-display text-sm font-black uppercase leading-tight tracking-[0.08em] shadow-glow-primary'
            : 'h-24 w-24 min-h-0 border-status-quest/40 bg-status-quest text-gaming-base font-display text-sm font-black uppercase leading-tight tracking-[0.08em] shadow-glow-primary'
        }
      >
        <span className="flex flex-col items-center gap-1">
          <Sparkles size={20} aria-hidden />
          <span>{isResolving ? t('activityCard.resolving') : resolvedCompleteLabel}</span>
        </span>
      </HoldToConfirmButton>
    </div>
  );
}

export default QuestCompletionAction;
