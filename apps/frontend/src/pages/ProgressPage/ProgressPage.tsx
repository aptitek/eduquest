import { Gift } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { GameBonusVoteState, GameRewardCard } from '@eduquest/shared';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { PlayingCard, type PlayingCardData } from '../../components/molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../components/molecules/ResponsiveCardGrid';
import { useTranslation } from '../../hooks/useTranslation';
import { useGameStore } from '../../features/game/gameStore';
import { GameRewardCardManager } from '../../components/organisms/GameRewardCardManager';
import { renderLucideIcon } from '../../features/game/lucideIconCatalog';
import {
  boostMilestoneBonusVote,
  castMilestoneBonusVote,
  fetchGameBonusVoteState,
} from '../../features/game/api';

export function ProgressPage() {
  const { t } = useTranslation();
  const { user, selectedGameId } = useGameStore();
  const [voteState, setVoteState] = useState<GameBonusVoteState | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const loadVoteState = () => {
    if (!selectedGameId || user?.isAdmin) return undefined;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    fetchGameBonusVoteState(token, selectedGameId)
      .then((state) => {
        if (!isMounted) return;
        setVoteState(state);
        setSelectedMilestoneId((current) => current || state.selectedMilestoneId || state.milestones[0]?.id || null);
      })
      .catch((error) => {
        console.warn('Could not load bonus vote state.', error);
      });

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => loadVoteState(), [selectedGameId, user?.isAdmin]);

  const selectedVoteState = voteState?.voteStates.find(
    (state) => state.milestone.id === selectedMilestoneId
  ) || voteState?.voteStates[0];
  const voteCards = useMemo(
    () => buildVoteCards(t, voteState?.bonusCards || []),
    [t, voteState?.bonusCards]
  );

  const castVote = async (bonusCardId: string) => {
    if (!selectedGameId || !selectedVoteState || isVoting) return;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsVoting(true);
    try {
      await castMilestoneBonusVote(token, selectedGameId, selectedVoteState.milestone.id, bonusCardId);
      await fetchGameBonusVoteState(token, selectedGameId).then(setVoteState);
    } catch (error) {
      console.warn('Could not cast bonus vote.', error);
    } finally {
      setIsVoting(false);
    }
  };

  const boostVote = async () => {
    if (!selectedGameId || !selectedVoteState || isVoting) return;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsVoting(true);
    try {
      await boostMilestoneBonusVote(token, selectedGameId, selectedVoteState.milestone.id, 1);
      await fetchGameBonusVoteState(token, selectedGameId).then(setVoteState);
    } catch (error) {
      console.warn('Could not boost bonus vote.', error);
    } finally {
      setIsVoting(false);
    }
  };

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

        {!user?.isAdmin ? (
          <BonusVotePanel
            t={t}
            selectedMilestoneId={selectedMilestoneId}
            voteState={voteState}
            selectedVoteState={selectedVoteState}
            voteCards={voteCards}
            isVoting={isVoting}
            onSelectMilestone={setSelectedMilestoneId}
            onVote={castVote}
            onBoost={boostVote}
          />
        ) : null}
      </div>
    </GameLayout>
  );
}

export default ProgressPage;

function BonusVotePanel({
  t,
  selectedMilestoneId,
  voteState,
  selectedVoteState,
  voteCards,
  isVoting,
  onSelectMilestone,
  onVote,
  onBoost,
}: {
  t: (path: string) => string;
  selectedMilestoneId: string | null;
  voteState: GameBonusVoteState | null;
  selectedVoteState?: GameBonusVoteState['voteStates'][number];
  voteCards: PlayingCardData[];
  isVoting: boolean;
  onSelectMilestone: (milestoneId: string) => void;
  onVote: (bonusCardId: string) => void;
  onBoost: () => void;
}) {
  const guildVote = selectedVoteState?.guildVote;
  const boostCost = voteState?.boostCostPreview?.finalCost ?? 0;

  return (
    <section aria-labelledby="progress-next-vote-title" className="relative z-20 space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gaming-base/95 px-3 py-2 backdrop-blur">
        <h3
          id="progress-next-vote-title"
          className="font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted"
        >
          {t('bonus.nextVote')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(voteState?.milestones || []).map((milestone) => (
            <button
              key={milestone.id}
              type="button"
              onClick={() => onSelectMilestone(milestone.id)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                selectedMilestoneId === milestone.id
                  ? 'border-status-quest bg-status-quest text-gaming-base'
                  : 'border-gaming-border bg-gaming-card text-text-secondary hover:border-status-quest'
              }`}
            >
              {milestone.labelI18nKey}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onBoost}
          disabled={!guildVote || isVoting}
          className="btn btn-primary btn-sm ml-auto font-display text-xs font-black uppercase tracking-[0.14em]"
        >
          Booster +1 vote{boostCost ? ` (${boostCost} or)` : ''}
        </button>
      </div>

      {selectedVoteState?.hasTie ? (
        <p className="rounded-xl border border-status-warning/50 bg-status-warning/10 px-4 py-2 text-sm font-semibold text-status-warning">
          Égalité en cours : la majorité relative n’est pas encore tranchée.
        </p>
      ) : null}

      <ResponsiveCardGrid
        items={voteCards}
        getKey={(card, index) => card.id || `next-vote-${index}`}
        renderItem={(card) => {
          const result = selectedVoteState?.results.find((item) => item.bonusCardId === card.id);
          const isSelected = guildVote?.bonusCardId === card.id;
          return (
            <button
              type="button"
              onClick={() => card.id && onVote(card.id)}
              disabled={isVoting || !card.id || card.faceDown}
              className={`group relative w-full text-left transition ${
                isSelected ? 'rounded-[1.4rem] ring-4 ring-status-quest ring-offset-4 ring-offset-gaming-base' : ''
              }`}
            >
              <PlayingCard {...card} size="full" className="w-full" />
              <span className="absolute right-4 top-4 z-50 rounded-full border border-gaming-border bg-gaming-base/95 px-3 py-1 text-sm font-black text-text-primary shadow-card">
                {result?.voteCount || 0} vote{(result?.voteCount || 0) > 1 ? 's' : ''}
              </span>
              {result?.isLeader ? (
                <span className="absolute left-4 top-4 z-50 rounded-full bg-status-completed px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-gaming-base shadow-card">
                  Leader
                </span>
              ) : null}
            </button>
          );
        }}
        className="pt-2"
      />
    </section>
  );
}

function buildVoteCards(t: (path: string) => string, bonusCards: GameRewardCard[]) {
  const cards: PlayingCardData[] = bonusCards.length
    ? bonusCards.map((card) => ({
        kind: 'reward' as const,
        id: card.id,
        title: card.title,
        subtitle: card.subtitle,
        description: card.description,
        color: card.color,
        accentToken: card.accentToken as PlayingCardData['accentToken'],
        illustrationUrl: card.illustrationUrl,
        illustration: card.illustrationUrl
          ? undefined
          : renderLucideIcon(card.iconKey || 'Gift', 132, 'drop-shadow-lg'),
      }))
    : [
        {
          kind: 'reward' as const,
          id: 'empty-progress-reward',
          title: t('dashboard.rewards.empty.title'),
          subtitle: t('dashboard.rewards.empty.subtitle'),
          description: t('dashboard.rewards.fallbackDescription'),
          accentToken: 'neutral' as const,
          faceDown: true,
        },
      ];

  return cards.map((card) => ({
    ...card,
    layoutId: `progress-next-vote-${card.id}`,
    front: {
      title: card.title || t('dashboard.rewards.fallbackTitle').replace('{index}', '1'),
      subtitle: card.subtitle,
      description: card.description || card.subtitle || t('dashboard.rewards.fallbackDescription'),
      color: card.color,
      illustrationUrl: card.illustrationUrl,
      illustrationAlt: card.title,
      illustration: card.illustration,
    },
  })) as PlayingCardData[];
}
