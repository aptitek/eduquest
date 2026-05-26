import { Activity } from '@eduquest/shared';
import { Sparkles, Target, CheckCircle, Award } from 'lucide-react';
import { getActivityVisualVariant, getActivityXpReward, isBossActivity } from '../../features/game/activityPresentation';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';

interface ActivityDetailPanelProps {
  selectedActivity: Activity | null;
  completedActivityIds: string[];
  onComplete: (activity: Activity) => void | Promise<void>;
  completingActivityId?: string | null;
  completionError?: string | null;
}

// Visual lookups mapping game node types to semantic design styles backed by Solarized Dark tokens
const TYPE_BADGE_STYLES = {
  boss: 'bg-status-boss/10 text-status-boss border border-status-boss/30',
  quest: 'bg-status-quest/10 text-status-quest border border-status-quest/30',
  campfire: 'bg-status-campfire/10 text-status-campfire border border-status-campfire/30',
};

function getMetadataUrl(metadata: Activity['metadata'], key: 'projectUrl' | 'gradingUrl' | 'geniallyUrl' | 'rubricUrl') {
  const directValue = metadata?.[key];
  if (typeof directValue === 'string') return directValue;

  const bossMetadata = metadata?.boss;
  if (bossMetadata && typeof bossMetadata === 'object' && key in bossMetadata) {
    const value = (bossMetadata as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
}

export function ActivityDetailPanel({
  selectedActivity,
  completedActivityIds,
  onComplete,
  completingActivityId,
  completionError,
}: ActivityDetailPanelProps) {
  const { t } = useTranslation();

  if (!selectedActivity) {
    return (
      <div className="bg-gaming-card border border-gaming-border p-6 rounded-lg flex flex-col items-center justify-center text-center text-text-muted gap-4 h-[600px] relative overflow-hidden">
        <Target size={48} className="text-text-muted animate-pulse" />
        <div>
          <h4 className="font-bold text-text-primary mb-1">{t('detailPanel.noSelectedTitle')}</h4>
          <p className="text-xs max-w-[200px]">{t('detailPanel.noSelectedDesc')}</p>
        </div>
      </div>
    );
  }

  const isCompleted = completedActivityIds.includes(selectedActivity.id);
  const isCompleting = completingActivityId === selectedActivity.id;
  const type = selectedActivity.type;
  const visualVariant = getActivityVisualVariant(type);

  // Prepare design states safely before rendering (KISS)
  const badgeStyle = TYPE_BADGE_STYLES[visualVariant];
  const description = t(`detailPanel.${type}Desc`);
  const xpReward = getActivityXpReward(selectedActivity);
  const projectUrl =
    getMetadataUrl(selectedActivity.metadata, 'projectUrl') ||
    getMetadataUrl(selectedActivity.metadata, 'geniallyUrl') ||
    getMetadataUrl(selectedActivity.metadata, 'rubricUrl');

  const buttonStyle = cn(
    'btn w-full border-none font-bold',
    isBossActivity(type)
      ? 'bg-status-boss text-gaming-base hover:bg-status-boss/80'
      : 'bg-gaming-base border border-gaming-border text-text-primary hover:bg-gaming-base/80'
  );

  return (
    <div className="bg-gaming-card border border-gaming-border p-6 rounded-lg flex flex-col justify-between h-[600px] relative overflow-hidden">
      <div className="flex flex-col gap-6 h-full justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <span
              className={cn(
                'px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider',
                badgeStyle
              )}
            >
              {t(`common.${type}`)}
            </span>

            {isCompleted ? (
              <div className="flex items-center gap-1.5 text-status-completed text-xs font-semibold">
                <CheckCircle size={14} /> {t('common.success')}
              </div>
            ) : (
              <div className="badge border-status-completed text-status-completed bg-status-completed/10 gap-1.5 px-3 py-2 text-xs font-bold uppercase">
                <Award size={14} className="text-status-completed" />
                <span>
                  +{xpReward} {t('common.xp')}
                </span>
              </div>
            )}
          </div>

          <h3 className="text-2xl font-bold font-display text-text-primary mb-2">
            {selectedActivity.title}
          </h3>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">{description}</p>

          {projectUrl ? (
            <div className="p-4 rounded-lg bg-status-boss/5 border border-status-boss/10 text-xs text-status-boss/80 mb-4">
              <Sparkles size={16} className="mb-1 text-status-boss" />
              <strong>{t('detailPanel.challengeLink')} :</strong>{' '}
              <a
                href={projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-all"
              >
                {projectUrl}
              </a>
            </div>
          ) : null}
        </div>

        {/* Action button container */}
        <div className="flex flex-col gap-3">
          {completionError ? (
            <div role="alert" className="alert alert-warning text-sm">
              {completionError}
            </div>
          ) : null}
          {!isCompleted ? (
            <button
              type="button"
              onClick={() => onComplete(selectedActivity)}
              disabled={isCompleting}
              className={buttonStyle}
            >
              {isCompleting
                ? t('detailPanel.completing')
                : isBossActivity(type)
                  ? t('detailPanel.startBoss')
                  : t('detailPanel.startQuest')}
            </button>
          ) : (
            <div className="text-center text-xs text-text-muted italic p-3 border border-dashed border-gaming-border rounded-lg">
              {t('detailPanel.completedSuccess')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivityDetailPanel;
