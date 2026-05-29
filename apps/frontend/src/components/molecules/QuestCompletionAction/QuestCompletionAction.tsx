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
  progressTarget?: number;
  progressValue?: number;
  isPending?: boolean;
  pendingLabel?: string;
}

export function QuestCompletionAction({
  isCompleted,
  isResolving,
  error,
  onComplete,
  mode = 'solo',
  completeLabel,
  completedLabel,
  progressTarget,
  progressValue,
  isPending,
  pendingLabel,
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
        disabled={isResolving || isPending || !onComplete}
        progressTarget={progressTarget}
        progressValue={progressValue}
        className={
          isPending
            ? 'h-24 w-24 min-h-0 border-status-completed/50 bg-gaming-card text-status-completed font-display text-sm font-black uppercase leading-tight tracking-[0.08em] shadow-[0_0_18px_rgba(133,153,0,0.28)] opacity-100'
            : mode === 'guild'
            ? 'h-24 w-24 min-h-0 border-primary/40 bg-primary text-primary-content font-display text-sm font-black uppercase leading-tight tracking-[0.08em] shadow-glow-primary'
            : 'h-24 w-24 min-h-0 border-status-quest/40 bg-status-quest text-gaming-base font-display text-sm font-black uppercase leading-tight tracking-[0.08em] shadow-glow-primary'
        }
      >
        <span className="flex flex-col items-center gap-1">
          <Sparkles size={20} aria-hidden />
          <span>{isResolving ? t('activityCard.resolving') : resolvedCompleteLabel}</span>
        </span>
      </HoldToConfirmButton>
      {isPending && pendingLabel ? (
        <p className="mt-3 max-w-28 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-[0.14em] text-status-completed">
          {pendingLabel}
        </p>
      ) : null}
    </div>
  );
}

export default QuestCompletionAction;
