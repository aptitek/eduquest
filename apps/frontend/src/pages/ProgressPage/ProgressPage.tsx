import { Gift } from 'lucide-react';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { PlayingCard, type PlayingCardData } from '../../components/molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../components/molecules/ResponsiveCardGrid';
import { useTranslation } from '../../hooks/useTranslation';
import { buildProgressBonusCards } from '../../components/organisms/DashboardDock/dashboardDockData';
import { useCohortProgressData } from '../../features/game/useCohortProgressData';
import { useGameStore } from '../../features/game/gameStore';
import { GameRewardCardManager } from '../../components/organisms/GameRewardCardManager';

export function ProgressPage() {
  const { t } = useTranslation();
  const { user, selectedGameId } = useGameStore();
  const dashboardData = useCohortProgressData(true, selectedGameId);
  const milestoneRewards = dashboardData?.gauge.milestones.map((milestone) => milestone.reward) || [];
  const fallbackBonusCards = milestoneRewards.length
    ? (milestoneRewards.map((reward) => ({
        kind: 'reward' as const,
        id: reward.id,
        title: t(reward.titleI18nKey),
        subtitle: reward.subtitleI18nKey ? t(reward.subtitleI18nKey) : undefined,
        accentToken: reward.accentToken,
      })) as [PlayingCardData, ...PlayingCardData[]])
    : ([
        {
          kind: 'reward' as const,
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

      <div className="space-y-8">
        <h2 className="sr-only">{t('progress.title')}</h2>

        {user?.isAdmin ? (
          <>
            <section aria-labelledby="progress-active-title" className="space-y-4">
              <div className="flex items-center gap-3">
                <Gift className="text-status-campfire" size={22} aria-hidden />
                <h3 id="progress-active-title" className="text-xl font-bold">
                  {t('progress.activeBonuses')}
                </h3>
              </div>
              <div id="progress-bonus-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
            </section>

            <GameRewardCardManager gameId={selectedGameId} />
          </>
        ) : null}

        {!user?.isAdmin ? <section aria-labelledby="progress-active-title" className="relative z-0 space-y-4 pb-8">
          <div className="flex items-center gap-3">
            <Gift className="text-status-campfire" size={22} aria-hidden />
            <h3 id="progress-active-title" className="text-xl font-bold">
              {t('progress.activeBonuses')}
            </h3>
          </div>
          <div id="progress-bonus-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
        </section> : null}

        {!user?.isAdmin ? <section aria-labelledby="progress-next-vote-title" className="relative z-20 space-y-5">
          <div className="flex items-center gap-4 rounded-2xl bg-gaming-base/95 px-3 py-2 backdrop-blur">
            <div className="h-px flex-1 bg-gaming-border" aria-hidden />
            <h3
              id="progress-next-vote-title"
              className="shrink-0 font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted"
            >
              {t('progress.nextVote')}
            </h3>
            <div className="h-px flex-1 bg-gaming-border" aria-hidden />
          </div>
          <ResponsiveCardGrid
            items={nextVoteCards}
            getKey={(card, index) => card.id || `next-vote-${index}`}
            renderItem={(card) => <PlayingCard {...card} size="full" className="w-full" />}
            className="pt-2"
          />
        </section> : null}
      </div>
    </GameLayout>
  );
}

export default ProgressPage;
