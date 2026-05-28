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
import { renderLucideIcon } from '../../features/game/lucideIconCatalog';

export function ProgressPage() {
  const { t } = useTranslation();
  const { user, selectedGameId } = useGameStore();
  const dashboardData = useCohortProgressData(true, selectedGameId);
  const milestones = dashboardData?.gauge.milestones || [];
  const fallbackBonusCards = milestones.length
    ? (milestones.map((milestone) => ({
        kind: 'reward' as const,
        id: milestone.reward.id,
        title: t(milestone.reward.titleI18nKey),
        subtitle: milestone.reward.subtitleI18nKey ? t(milestone.reward.subtitleI18nKey) : undefined,
        description: milestone.descriptionI18nKey ? t(milestone.descriptionI18nKey) : undefined,
        color: milestone.reward.color,
        accentToken: milestone.reward.accentToken,
        illustration: renderLucideIcon(milestone.reward.iconKey || 'Gift', 132, 'drop-shadow-lg'),
        ribbonIcon: renderLucideIcon(milestone.reward.iconKey || 'Gift', 18),
        ribbonLabel: `${milestone.cost} ${t('rewardCards.pointsShort')}`,
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
  const nextVoteCards = buildProgressBonusCards(t, fallbackBonusCards, 'progress-next-vote');

  return (
    <GameLayout>
      <GameHeader currentView="bonus" />

      <div className="space-y-8">
        <h2 className="sr-only">{t('bonus.title')}</h2>

        {user?.isAdmin ? (
          <>
            <section aria-labelledby="progress-active-title" className="space-y-4">
              <div className="flex items-center gap-3">
                <Gift className="text-status-campfire" size={22} aria-hidden />
                <h3 id="progress-active-title" className="text-xl font-bold">
                  {t('bonus.activeBonuses')}
                </h3>
              </div>
              <div id="bonus-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
            </section>

            <GameRewardCardManager gameId={selectedGameId} />
          </>
        ) : null}

        {!user?.isAdmin ? <section aria-labelledby="progress-active-title" className="relative z-0 space-y-4 pb-8">
          <div className="flex items-center gap-3">
            <Gift className="text-status-campfire" size={22} aria-hidden />
            <h3 id="progress-active-title" className="text-xl font-bold">
              {t('bonus.activeBonuses')}
            </h3>
          </div>
          <div id="bonus-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
        </section> : null}

        {!user?.isAdmin ? <section aria-labelledby="progress-next-vote-title" className="relative z-20 space-y-5">
          <div className="flex items-center gap-4 rounded-2xl bg-gaming-base/95 px-3 py-2 backdrop-blur">
            <div className="h-px flex-1 bg-gaming-border" aria-hidden />
            <h3
              id="progress-next-vote-title"
              className="shrink-0 font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted"
            >
              {t('bonus.nextVote')}
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
