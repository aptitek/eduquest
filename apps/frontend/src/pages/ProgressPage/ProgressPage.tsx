import { Gift } from 'lucide-react';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { PlayingCard, type PlayingCardData } from '../../components/molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../components/molecules/ResponsiveCardGrid';
import { useTranslation } from '../../hooks/useTranslation';
import { buildProgressBonusCards } from '../../components/organisms/DashboardDock/dashboardDockData';
import { useDashboardData } from '../../features/game/useDashboardData';

export function ProgressPage() {
  const { t } = useTranslation();
  const dashboardData = useDashboardData();
  const fallbackBonusCards = dashboardData?.rewards.length
    ? (dashboardData.rewards.map((reward) => ({
        kind: 'guild' as const,
        title: t(reward.titleI18nKey),
        subtitle: reward.subtitleI18nKey ? t(reward.subtitleI18nKey) : undefined,
        accentToken: reward.accentToken,
        faceDown: reward.faceDown,
        ribbonLabel: t('dashboard.dock.newRibbon'),
        ribbonClassName: 'bg-status-quest',
      })) as [PlayingCardData, ...PlayingCardData[]])
    : ([
        {
          kind: 'guild' as const,
          id: 'empty-progress-reward',
          title: t('dashboard.rewards.empty.title'),
          subtitle: t('dashboard.rewards.empty.subtitle'),
          accentToken: 'neutral' as const,
          faceDown: true,
        },
      ] as [PlayingCardData, ...PlayingCardData[]]);
  const nextVoteCards = buildProgressBonusCards(fallbackBonusCards, 'progress-next-vote');

  return (
    <GameLayout>
      <GameHeader currentView="progress" />

      <div className="space-y-8 pb-8 pt-4">
        <h2 className="sr-only">{t('progress.title')}</h2>

        <section aria-labelledby="progress-active-title" className="space-y-4">
          <div className="flex items-center gap-3">
            <Gift className="text-status-campfire" size={22} aria-hidden />
            <h3 id="progress-active-title" className="text-xl font-bold">
              {t('progress.activeBonuses')}
            </h3>
          </div>
          <div id="progress-bonus-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
        </section>

        <div className="flex items-center gap-4" role="separator" aria-hidden>
          <div className="h-px flex-1 bg-gaming-border" />
          <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted">
            {t('progress.nextVote')}
          </span>
          <div className="h-px flex-1 bg-gaming-border" />
        </div>

        <section aria-labelledby="progress-next-vote-title" className="space-y-4">
          <h3 id="progress-next-vote-title" className="sr-only">
            {t('progress.nextVote')}
          </h3>
          <ResponsiveCardGrid
            items={nextVoteCards}
            getKey={(card, index) => card.id || `next-vote-${index}`}
            renderItem={(card) => <PlayingCard {...card} size="full" className="w-full" />}
          />
        </section>
      </div>
    </GameLayout>
  );
}

export default ProgressPage;
